"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import { ArrowLeft, ArrowDown, ArrowUp, Send, Copy, Check, Clock, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { fetchTokenData, fetchMultipleTokensData, warmUpCache } from "@/utils/solanaData";
import { getCachedWalletData } from "@/utils/walletPrefetch";
import stocksData from '@/data/stocks.json';
import cryptoData from '@/data/crypto.json';
import Navigation from "@/components/navigation";
import { CashoutModal } from "@/components/modals/cashoutModal";
import { HoldingsChart } from "@/components/holdingsChart";

import { getAccount } from "@solana/spl-token";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

interface WalletAccount {
	address: string;
	chainType: string;
	walletClientType: string;
	connectorType: string;
	walletIndex?: number;
}

interface TokenAccount {
	mint: string;
	balance: number;
	decimals: number;
	symbol?: string;
	name?: string;
	price?: number;
	logoURI?: string;
}

interface Transaction {
	signature: string;
	timestamp: number;
	type: 'sent' | 'received' | 'failed';
	amount?: number;
	status: string;
	fee?: number;
	token?: string;
	tokenSymbol?: string;
}

export default function WalletPage() {
	const { user, authenticated } = usePrivy();
	const [balance, setBalance] = useState<number>(0);
	const [solPrice, setSolPrice] = useState<number>(0);
	const [tokens, setTokens] = useState<TokenAccount[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const [copied, setCopied] = useState(false);
	const [showCashoutModal, setShowCashoutModal] = useState(false);

	// Get the first Solana wallet
	const solanaWalletAccount = user?.linkedAccounts?.find(
		(account) => account.type === "wallet" && account.chainType === "solana"
	);

	// Transform to WalletAccount interface with proper type checking
	const solanaWallet: WalletAccount | null = solanaWalletAccount ? {
		address: (solanaWalletAccount as any).address || "",
		chainType: (solanaWalletAccount as any).chainType || "solana",
		walletClientType: (solanaWalletAccount as any).walletClientType || "unknown",
		connectorType: (solanaWalletAccount as any).connectorType || "unknown",
		walletIndex: (solanaWalletAccount as any).walletIndex,
	} : null;

	const fetchTokenMetadata = async (mint: string, _connection: Connection) => {
		// Offline-first: tiny known map; otherwise derived fallback. stocks.json override is applied below.
		const knownTokens: { [key: string]: { symbol: string; name: string; logoURI?: string } } = {
			'So11111111111111111111111111111111111111112': {
				symbol: 'SOL',
				name: 'Solana',
				logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
			},
			'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
				symbol: 'USDC',
				name: 'USD Coin',
				logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
			},
			'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
				symbol: 'USDT',
				name: 'Tether',
				logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
			},
			'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp': {
				symbol: 'TSLAx',
				name: 'Tesla Stock Token',
				logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp/logo.png'
			}
		};
		if (knownTokens[mint]) return knownTokens[mint];
		return {
			symbol: mint.slice(0, 6) + '...',
			name: 'Unknown Token',
			logoURI: undefined
		};
	};

	const fetchDetailedTransaction = async (connection: Connection, signature: string, walletAddress: string): Promise<Transaction | null> => {
		try {
			const txDetails = await connection.getParsedTransaction(signature, {
				maxSupportedTransactionVersion: 0
			});

			if (!txDetails || !txDetails.meta) {
				return null;
			}

			const { meta, blockTime, transaction } = txDetails;
			const walletPubkey = new PublicKey(walletAddress);

			// Check if transaction failed
			if (meta.err) {
				return {
					signature,
					timestamp: blockTime || 0,
					type: 'failed',
					status: 'failed',
					fee: meta.fee / LAMPORTS_PER_SOL
				};
			}

			// Check SOL balance changes
			const preBalances = meta.preBalances;
			const postBalances = meta.postBalances;
			const accountKeys = transaction.message.accountKeys;

			// Find wallet's account index
			let walletIndex = -1;
			for (let i = 0; i < accountKeys.length; i++) {
				if (accountKeys[i].pubkey.equals(walletPubkey)) {
					walletIndex = i;
					break;
				}
			}

			if (walletIndex === -1) {
				return null;
			}

			const preBalance = preBalances[walletIndex];
			const postBalance = postBalances[walletIndex];
			const balanceChange = (postBalance - preBalance) / LAMPORTS_PER_SOL;

			// Determine transaction type based on balance change
			let type: 'sent' | 'received' | 'failed';
			let amount = Math.abs(balanceChange);

			if (balanceChange > 0) {
				type = 'received';
			} else if (balanceChange < 0) {
				type = 'sent';
				// For sent transactions, subtract the fee to get the actual sent amount
				amount = amount - (meta.fee / LAMPORTS_PER_SOL);
			} else {
				// No SOL balance change, might be a token transaction or other operation
				type = 'received'; // Default to received for now
				amount = 0;
			}

			return {
				signature,
				timestamp: blockTime || 0,
				type,
				amount,
				status: 'confirmed',
				fee: meta.fee / LAMPORTS_PER_SOL,
				token: 'SOL',
				tokenSymbol: 'SOL'
			};
		} catch (error) {
			console.error('Error fetching transaction details:', error);
			return null;
		}
	};

	const fetchTokenPrices = async (tokenMints: string[]) => {
		try {
			// Warm up cache for all tokens we need (including SOL)
			const allTokens = ['So11111111111111111111111111111111111111112', ...tokenMints];
			await warmUpCache(allTokens);

			// Fetch SOL price using centralized function
			const solData = await fetchTokenData('So11111111111111111111111111111111111111112');
			const currentSolPrice = solData?.price || 0;
			setSolPrice(currentSolPrice);

			// Fetch token prices using centralized function
			const tokenPrices: { [key: string]: number } = {};
			
			if (tokenMints.length > 0) {
				try {
					const tokensData = await fetchMultipleTokensData(tokenMints);
					
					for (const mint of tokenMints) {
						const tokenData = tokensData.get(mint);
						tokenPrices[mint] = tokenData?.price || 0;
					}
				} catch (priceError) {
					console.error('Error fetching token prices:', priceError);
					// Fallback to 0 for all tokens
					for (const mint of tokenMints) {
						tokenPrices[mint] = 0;
					}
				}
			}

			return tokenPrices;
		} catch (error) {
			console.error('Error fetching token prices:', error);
			return {};
		}
	};

	const fetchWalletDataCached = async () => {
		try {
			// Try to get cached data first using the utility function
			const cachedData = getCachedWalletData(solanaWallet!.address);
			console.log('🔍 Checking for cached wallet data:', {
				address: solanaWallet!.address,
				hasCachedData: !!cachedData,
				cacheAge: cachedData ? (Date.now() - cachedData.timestamp) / 1000 : 'N/A'
			});
			
			if (cachedData) {
					console.log('✅ Using cached wallet data immediately:', cachedData);
					// Set cached data immediately to eliminate loading screen
					setBalance(cachedData.balance);
					setTokens(cachedData.tokens);
					setTransactions([]); // Skip transactions for faster loading
					setLoading(false); // Remove loading state immediately
					setError(null);
					
					// Then update with fresh data in the background
					setRefreshing(true);
					const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
					const connection = new Connection(rpcUrl as string);
					const publicKey = new PublicKey(solanaWallet!.address);
					
					// Update SOL balance in background
					connection.getBalance(publicKey).then(solBalance => {
						setBalance(solBalance / LAMPORTS_PER_SOL);
					}).catch(() => {
						// Keep cached balance if fresh fetch fails
					});
					
					// Update token prices in background
					const tokenMints = cachedData.tokens.map(token => token.mint);
					if (!tokenMints.includes('So11111111111111111111111111111111111111112')) {
						tokenMints.push('So11111111111111111111111111111111111111112');
					}
					
					fetchTokenPrices(tokenMints).then(tokenPrices => {
						const tokensWithUpdatedPrices = cachedData.tokens.map(token => ({
							...token,
							price: tokenPrices[token.mint] || token.price || 0
						}));
						setTokens(tokensWithUpdatedPrices);
					}).catch(() => {
						// Keep cached prices if fresh fetch fails
					}).finally(() => {
						setRefreshing(false);
					});
					
					return;
				}
			
			// If no valid cache, show loading and fetch fresh data
			setLoading(true);
			setError(null);
			await fetchWalletData();
		} catch (error) {
			console.error('Error in fetchWalletDataCached:', error);
			// Fall back to regular fetch on any error
			setLoading(true);
			setError(null);
			await fetchWalletData();
		}
	};

	const fetchWalletData = async (showLoading = true) => {
		try {
			if (showLoading) {
				setLoading(true);
			} else {
				setRefreshing(true);
			}
			setError(null);

			const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

			if (!rpcUrl) {
				throw new Error('RPC URL not configured. Please set NEXT_PUBLIC_SOLANA_RPC_URL in your environment variables.');
			}

			console.log('Connecting to Solana RPC...');
			const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
			const publicKey = new PublicKey(solanaWallet!.address);

			// Fetch SOL balance
			const solBalance = await connection.getBalance(publicKey);
			setBalance(solBalance / LAMPORTS_PER_SOL);

			// Fetch token accounts with on-chain balance verification
			console.log('Debug: About to fetch token accounts...');
			console.log('Debug: Public key:', publicKey.toString());
			console.log('Debug: TOKEN_PROGRAM_ID:', TOKEN_PROGRAM_ID.toString());
			console.log('Debug: TOKEN_2022_PROGRAM_ID:', TOKEN_2022_PROGRAM_ID.toString());

			interface TokenInfo {
			  mint: string;
			  tokenAmount: {
			    amount: string;
			    decimals: number;
			    uiAmount: number;
			    uiAmountString: string;
			  };
			}

			let tokenInfos: TokenInfo[] = [];
			const programIds = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];

			for (const programId of programIds) {
			  console.log(`Debug: Processing program: ${programId.toString()}`);
			  let currentTokenAccounts;
			  let currentRawAccounts;

			  // Method 1: getParsedTokenAccountsByOwner
			  try {
			    console.log('Debug: Trying getParsedTokenAccountsByOwner...');
			    currentTokenAccounts = await connection.getParsedTokenAccountsByOwner(
			      publicKey,
			      { programId }
			    );
			    console.log(`Method 1 found ${currentTokenAccounts.value.length} token accounts for ${programId.toString()}`);
			  } catch (error1) {
			    console.error('Debug: Method 1 failed:', error1);
			    currentTokenAccounts = { value: [] };
			  }

			  // Method 2: getTokenAccountsByOwner (raw)
			  try {
			    console.log('Debug: Trying getTokenAccountsByOwner...');
			    currentRawAccounts = await connection.getTokenAccountsByOwner(
			      publicKey,
			      { programId }
			    );
			    console.log(`Method 2 found ${currentRawAccounts.value.length} raw token accounts for ${programId.toString()}`);
			  } catch (error2) {
			    console.error('Debug: Method 2 failed:', error2);
			    currentRawAccounts = { value: [] };
			  }

			  // Process parsed
			  if (currentTokenAccounts.value.length > 0) {
			    console.log(`Debug: Processing ${currentTokenAccounts.value.length} parsed token accounts`);
			    const parsedInfos = currentTokenAccounts.value.map(acc => {
			      const info = acc.account.data.parsed.info as TokenInfo;
			      console.log(`Debug: Parsed token ${info.mint} with balance ${info.tokenAmount.uiAmount}`);
			      return info;
			    });
			    tokenInfos = [...tokenInfos, ...parsedInfos];
			  }

			  			// Process raw if needed
			  if (currentTokenAccounts.value.length === 0 && currentRawAccounts.value.length > 0) {
			    console.log('Debug: Processing raw token accounts...');
			    for (const rawAccount of currentRawAccounts.value) {
			      try {
			        const accountInfo = await getAccount(connection, rawAccount.pubkey, undefined, programId);
			        console.log(`Debug: Raw account ${rawAccount.pubkey.toString()} has amount: ${accountInfo.amount}`);
			        if (accountInfo.amount > 0) {
			          const mintInfo = await getMint(connection, accountInfo.mint, undefined, programId);
			          const decimals = mintInfo.decimals;
			          const amountStr = accountInfo.amount.toString();
			          const uiAmount = Number(accountInfo.amount) / Math.pow(10, decimals);
			          const tokenAmount = {
			            amount: amountStr,
			            decimals,
			            uiAmount,
			            uiAmountString: uiAmount.toString()
			          };
			          const info: TokenInfo = {
			            mint: accountInfo.mint.toString(),
			            tokenAmount,
			          };
			          console.log(`Debug: Added token ${info.mint} with balance ${uiAmount}`);
			          tokenInfos.push(info);
			        } else {
			          console.log(`Debug: Skipping token with zero balance: ${accountInfo.mint.toString()}`);
			        }
			      } catch (parseError) {
			        console.error('Error parsing raw account:', parseError);
			      }
			    }
			  }
			}

			// Remove duplicates by mint
			const processedTokens = tokenInfos.filter((token, index, self) =>
			  index === self.findIndex((t) => t.mint === token.mint)
			);

			console.log(`Final processed ${processedTokens.length} unique tokens`);

			// Now create tokenData from processedTokens in parallel
			const stockMap = new Map(stocksData.xStocks.map(stock => [stock.solanaAddress, stock]));
			const cryptoMap = new Map(cryptoData.crypto.map(crypto => [crypto.solanaAddress, crypto]));
			const filtered = processedTokens.filter(info => info.tokenAmount.uiAmount > 0);
			const tokenData: TokenAccount[] = await Promise.all(
				filtered.map(async (info) => {
					const balance = info.tokenAmount.uiAmount;

					// Check if it's a crypto asset first
					const cryptoInfo = cryptoMap.get(info.mint);
					if (cryptoInfo) {
						return {
							mint: info.mint,
							balance,
							decimals: info.tokenAmount.decimals,
							symbol: cryptoInfo.symbol,
							name: cryptoInfo.name,
							logoURI: cryptoInfo.logoUrl
						};
					}

					// Then check if it's a stock
					const stockInfo = stockMap.get(info.mint);
					if (stockInfo) {
						return {
							mint: info.mint,
							balance,
							decimals: info.tokenAmount.decimals,
							symbol: stockInfo.symbol,
							name: stockInfo.name,
							logoURI: stockInfo.logoUrl
						};
					}

					// Fallback to fetching metadata
					const metadata = await fetchTokenMetadata(info.mint, connection);
					return {
						mint: info.mint,
						balance,
						decimals: info.tokenAmount.decimals,
						symbol: metadata.symbol,
						name: metadata.name,
						logoURI: metadata.logoURI
					};
				})
			);

			console.log(`Final processed ${tokenData.length} tokens`);

			// Fetch prices for all tokens
			const tokenMints = tokenData.map(token => token.mint);
			// Always include SOL mint for price
			if (!tokenMints.includes('So11111111111111111111111111111111111111112')) {
				tokenMints.push('So11111111111111111111111111111111111111112');
			}
			const tokenPrices = await fetchTokenPrices(tokenMints);

			// Add prices to token data
			const tokensWithPrices = tokenData.map(token => ({
				...token,
				price: tokenPrices[token.mint] || 0
			}));

			console.log('Final token data with prices:', tokensWithPrices);
			setTokens(tokensWithPrices);

			// Defer recent transactions fetch to idle time (lightweight summary only)
			const loadTx = async () => {
				try {
					const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
					const transactionData: Transaction[] = signatures.map((sig) => ({
						signature: sig.signature,
						timestamp: sig.blockTime || 0,
						type: sig.err ? 'failed' : 'received',
						status: sig.err ? 'failed' : 'confirmed',
						token: 'SOL',
						tokenSymbol: 'SOL'
					}));
					setTransactions(transactionData);
				} catch {}
			};
			if (typeof (window as any).requestIdleCallback === 'function') {
				(window as any).requestIdleCallback(() => { loadTx(); });
			} else {
				setTimeout(loadTx, 0);
			}

			// Cache the wallet data for future use
			if (typeof window !== 'undefined') {
				const walletCacheData = {
					balance: balance,
					tokens: tokensWithPrices,
					transactions: [],
					timestamp: Date.now()
				};
				localStorage.setItem(`wallet_cache_${solanaWallet!.address}`, JSON.stringify(walletCacheData));
			}
		} catch (err) {
			console.error("Error fetching wallet data:", err);
			setError("Failed to fetch wallet data: " + (err as Error).message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
    if (solanaWallet?.address) {
      // Always try cache-first approach to utilize prefetched data
      fetchWalletDataCached();
    }
  }, [solanaWallet?.address]);

	if (!authenticated || !user) {
		return (
			<div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
				<Navigation />
				<div className="flex items-center justify-center min-h-[calc(100vh-4rem)] mt-16">
					<div className="text-center">
						<h1 className="text-2xl font-bold mb-4 text-gray-100">Access Denied</h1>
						<p className="text-gray-400 mb-6">Please log in to view your wallet</p>
						<Link
							href="/"
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Go Home
						</Link>
					</div>
				</div>
			</div>
		);
	}

	if (!solanaWallet) {
		return (
			<div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
				<Navigation />
				<div className="flex items-center justify-center min-h-[calc(100vh-4rem)] mt-16">
					<div className="text-center">
						<h1 className="text-2xl font-bold mb-4 text-gray-100">No Solana Wallet Found</h1>
						<p className="text-gray-400 mb-6">
							Please create a Solana wallet to view wallet information
						</p>
						<Link
							href="/"
							className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Go Home
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp * 1000).toLocaleDateString();
	};

	const openTransactionExplorer = (signature: string) => {
		// Default to Solscan, but you can add logic to choose between explorers
		const solscanUrl = `https://solscan.io/tx/${signature}`;
		const solanaFmUrl = `https://solana.fm/tx/${signature}`;
		
		// Open in new tab
		window.open(solscanUrl, '_blank');
	};

	const getTransactionIcon = (type: 'sent' | 'received' | 'failed') => {
		switch (type) {
			case 'sent':
				return <ArrowUp className="h-5 w-5 text-red-400" />;
			case 'received':
				return <ArrowDown className="h-5 w-5 text-green-400" />;
			case 'failed':
				return <Clock className="h-5 w-5 text-gray-400" />;
			default:
				return <TrendingUp className="h-5 w-5 text-gray-400" />;
		}
	};

	const getTransactionLabel = (type: 'sent' | 'received' | 'failed') => {
		switch (type) {
			case 'sent':
				return 'Sent';
			case 'received':
				return 'Received';
			case 'failed':
				return 'Failed';
			default:
				return 'Transaction';
		}
	};

	// Calculate total portfolio value (SPL tokens only)
	const calculateTotalPortfolioValue = () => {
		const tokenValues = tokens.reduce((total, token) => {
			return total + (token.balance * (token.price || 0));
		}, 0);
		return tokenValues;
	};

	return (
		<div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
			<Navigation />
			<div className="container mx-auto px-4 py-6">
				{/* Header with Back Button */}
				<div className="mb-8 pt-16">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-center gap-4 mb-6">
							<Link
								href="/stocks"
								className="p-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-105"
								style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
							>
								<ArrowLeft className="h-5 w-5 text-white" />
							</Link>
							<div className="flex-1">
								<div className="flex items-center gap-3">
									<h1 className="text-3xl font-bold text-gray-100 mb-2">Portfolio</h1>
									{refreshing && (
										<div className="flex items-center gap-2 text-sm text-blue-400">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
											<span>Updating...</span>
										</div>
									)}
								</div>
								<p className="text-gray-400">Manage your investments</p>
							</div>

						</div>
					</div>
				</div>

				{/* Portfolio Card */}
				<div className="max-w-4xl mx-auto mb-6">
					<div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
						style={{
							background: '#2A2A2A',
							border: '1px solid rgba(255, 255, 255, 0.1)',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
						}}>
						<div className="relative z-10">
							<div className="mb-4">
								<span className="text-sm text-gray-400 uppercase tracking-wide">TOTAL PORTFOLIO VALUE</span>
							</div>
							
							{loading ? (
								<div className="animate-pulse">
									<div className="h-12 bg-gray-700 rounded w-48 mb-2"></div>
									<div className="h-4 bg-gray-700 rounded w-32"></div>
								</div>
							) : (
							<div className="text-5xl font-bold mb-2 text-white">${calculateTotalPortfolioValue().toFixed(2)}</div>
							)}
							
							{/* Action Button */}
							<div className="mt-6">
								<button
									onClick={() => setShowCashoutModal(true)}
									className="w-full bg-[#D9FF66] text-black rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold hover:bg-[#B8E62E]"
								>
									<Send className="h-4 w-4" />
									<span>Cash Out</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Holdings Chart */}
				{solanaWallet && !loading && (
					<div className="max-w-4xl mx-auto mb-6">
						<HoldingsChart 
							walletAddress={solanaWallet.address}
							currentValue={calculateTotalPortfolioValue()}
						/>
					</div>
				)}



				{/* Content Area */}
				<div className="max-w-4xl mx-auto">
					{loading ? (
						<div className="space-y-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
									style={{
										background: '#2A2A2A',
										border: '1px solid rgba(255, 255, 255, 0.1)',
										boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
									}}>
									<div className="animate-pulse space-y-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gray-700 rounded-full"></div>
												<div>
													<div className="h-4 bg-gray-700 rounded w-20 mb-1"></div>
													<div className="h-3 bg-gray-700 rounded w-16"></div>
												</div>
											</div>
											<div className="text-right">
												<div className="h-4 bg-gray-700 rounded w-16 mb-1"></div>
												<div className="h-3 bg-gray-700 rounded w-12"></div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					) : error ? (
						<div className="relative overflow-hidden rounded-2xl p-6 text-center"
							style={{
								background: '#2A2A2A',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
							}}>
							<p className="text-red-400 mb-4">{error}</p>
							<button
								onClick={() => fetchWalletData(true)}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
							>
								Retry
							</button>
						</div>
					) : (
						<div className="space-y-4">
							{/* SPL Token Holdings - Grouped by type */}
							{tokens.length > 0 ? (
								<>
									{/* Crypto Assets Section */}
									{(() => {
										const cryptoTokens = tokens.filter(token =>
											cryptoData.crypto.some(crypto => crypto.solanaAddress === token.mint)
										);

										if (cryptoTokens.length === 0) return null;

										return (
											<div className="space-y-4">
												<h2 className="text-xl font-semibold text-white flex items-center gap-2">
													<span>Crypto Assets</span>
													<span className="text-sm text-gray-400 font-normal">({cryptoTokens.length})</span>
												</h2>
												{cryptoTokens.map((token, index) => (
													<div key={index} className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
														style={{
															background: '#2A2A2A',
															border: '1px solid rgba(255, 255, 255, 0.1)',
															boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
														}}>
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-3">
																{token.logoURI ? (
																	<img
																		src={token.logoURI}
																		alt={token.symbol || 'Token'}
																		className="w-10 h-10 rounded-full"
																		onError={(e) => {
																			const target = e.target as HTMLImageElement;
																			target.style.display = 'none';
																			const fallback = target.nextElementSibling as HTMLElement;
																			if (fallback) fallback.style.display = 'flex';
																		}}
																	/>
																) : null}
																<div
																	className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center"
																	style={{ display: token.logoURI ? 'none' : 'flex' }}
																>
																	<span className="text-white font-bold text-xs">
																		{token.symbol?.slice(0, 3) || "TKN"}
																	</span>
																</div>
																<div>
																	<p className="font-medium text-white">
																		{token.name || token.symbol || "Unknown Token"}
																	</p>
																	<p className="text-sm text-gray-400">
																		{token.symbol || formatAddress(token.mint)}
																	</p>
																</div>
															</div>
															<div className="text-right">
																<p className="font-medium text-white">
																	{(() => {
																		if (token.balance >= 1) {
																			return token.balance.toFixed(2);
																		} else if (token.balance >= 0.01) {
																			return token.balance.toFixed(4);
																		} else if (token.balance > 0) {
																			return token.balance.toFixed(6);
																		} else {
																			return '0';
																		}
																	})()} {token.symbol || 'TOKENS'}
																</p>
																<p className="text-sm text-gray-400">
																	{token.price && token.price > 0
																		? (() => {
																			const value = token.balance * token.price;
																			if (value >= 1) {
																				return `$${value.toFixed(2)}`;
																			} else if (value >= 0.01) {
																				return `$${value.toFixed(4)}`;
																			} else if (value > 0) {
																				return `$${value.toFixed(6)}`;
																			} else {
																				return '$0.00';
																			}
																		})()
																		: 'Price unavailable'
																	}
																</p>
															</div>
														</div>
													</div>
												))}
											</div>
										);
									})()}

									{/* Stock Assets Section */}
									{(() => {
										const stockTokens = tokens.filter(token =>
											stocksData.xStocks.some(stock => stock.solanaAddress === token.mint)
										);

										if (stockTokens.length === 0) return null;

										return (
											<div className="space-y-4 mt-8">
												<h2 className="text-xl font-semibold text-white flex items-center gap-2">
													<span>Stock Assets</span>
													<span className="text-sm text-gray-400 font-normal">({stockTokens.length})</span>
												</h2>
												{stockTokens.map((token, index) => (
													<div key={index} className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
									style={{
										background: '#2A2A2A',
										border: '1px solid rgba(255, 255, 255, 0.1)',
										boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
									}}>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											{token.logoURI ? (
												<img 
													src={token.logoURI} 
													alt={token.symbol || 'Token'}
													className="w-10 h-10 rounded-full"
													onError={(e) => {
														// Fallback to text if image fails to load
														const target = e.target as HTMLImageElement;
														target.style.display = 'none';
														const fallback = target.nextElementSibling as HTMLElement;
														if (fallback) fallback.style.display = 'flex';
													}}
												/>
											) : null}
											<div 
												className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center"
												style={{ display: token.logoURI ? 'none' : 'flex' }}
											>
												<span className="text-white font-bold text-xs">
													{token.symbol?.slice(0, 3) || "TKN"}
												</span>
											</div>
											<div>
												<p className="font-medium text-white">
													{token.name || token.symbol || "Unknown Token"}
												</p>
												<p className="text-sm text-gray-400">
													{token.symbol || formatAddress(token.mint)}
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="font-medium text-white">
											{(() => {
												if (token.balance >= 1) {
													return token.balance.toFixed(2);
												} else if (token.balance >= 0.01) {
													return token.balance.toFixed(4);
												} else if (token.balance > 0) {
													return token.balance.toFixed(6);
												} else {
													return '0';
												}
											})()} {token.symbol || 'TOKENS'}
										</p>
											<p className="text-sm text-gray-400">
												{token.price && token.price > 0 
													? (() => {
														const value = token.balance * token.price;
														if (value >= 1) {
															return `$${value.toFixed(2)}`;
														} else if (value >= 0.01) {
															return `$${value.toFixed(4)}`;
														} else if (value > 0) {
															return `$${value.toFixed(6)}`;
														} else {
															return '$0.00';
														}
													})()
													: 'Price unavailable'
												}
											</p>
										</div>
									</div>
								</div>
												))}
											</div>
										);
									})()}
								</>
							) : (
								<div className="relative overflow-hidden rounded-2xl p-6 text-center"
									style={{
										background: '#2A2A2A',
										border: '1px solid rgba(255, 255, 255, 0.1)',
										boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
									}}>
									<div className="mb-4">
										<div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
											<span className="text-white font-bold text-xl">💼</span>
										</div>
										<h3 className="text-lg font-semibold text-white mb-2">No Tokens Found</h3>
										<p className="text-gray-400 mb-4">
											Your wallet doesn't contain any SPL tokens yet.
										</p>
										<div className="text-sm text-gray-500 space-y-1">
											<p>• Only SPL tokens are displayed here</p>
											<p>• SOL balance is shown in the portfolio value above</p>
											<p>• Purchase tokens from the stocks page to see them here</p>
										</div>
									</div>
									<Link
										href="/stocks"
										className="inline-flex items-center gap-2 px-6 py-3 bg-[#D9FF66] text-black rounded-full font-semibold hover:bg-[#B8E62E] transition-colors"
									>
										<span>Browse Stocks</span>
										<ArrowLeft className="h-4 w-4 rotate-180" />
									</Link>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Cashout Modal */}
			<CashoutModal
				isOpen={showCashoutModal}
				onClose={() => setShowCashoutModal(false)}
				userBalance={balance}
				tokens={tokens}
			/>
		</div>
	);
}