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
import Navigation from "@/components/navigation";
import { CashoutModal } from "@/components/modals/cashoutModal";

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

	const [copied, setCopied] = useState(false);
	const [showCashoutModal, setShowCashoutModal] = useState(false);
	const [pendingCashoutData, setPendingCashoutData] = useState<any>(null);

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

	const fetchTokenMetadata = async (mint: string, connection: Connection) => {
		try {
			// Known tokens mapping for reliable identification
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
				},
				// Add fallback for problematic pump.fun token
				'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn': {
					symbol: 'PUMP',
					name: 'Pump Token',
					logoURI: undefined
				},
			};
			
			// Check if it's a known token first
			if (knownTokens[mint]) {
				console.log(`Debug: Found known token for ${mint}:`, knownTokens[mint]);
				return knownTokens[mint];
			}

			// Try to fetch from Solana token list API
			try {
				console.log(`Debug: Fetching from Solana token list for ${mint}`);
				const response = await fetch(`https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json`);
				if (response.ok) {
					const tokenList = await response.json();
					const tokenInfo = tokenList.tokens.find((token: any) => token.address === mint);
					if (tokenInfo) {
						console.log(`Debug: Found token in Solana token list: ${tokenInfo.symbol}`);
						return {
							symbol: tokenInfo.symbol,
							name: tokenInfo.name,
							logoURI: tokenInfo.logoURI
						};
					}
				}
			} catch (tokenListError) {
				console.warn(`Failed to fetch from Solana token list for ${mint}:`, tokenListError);
				// Continue to next method, don't throw
			}

			// Try Metaplex metadata
			console.log(`Debug: Trying Metaplex for ${mint}`);
			const metaplex = Metaplex.make(connection);
			const mintPubkey = new PublicKey(mint);
			const nft = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });
			if (nft && nft.name && nft.symbol) {
				console.log(`Debug: Found Metaplex metadata for ${mint}:`, { name: nft.name, symbol: nft.symbol });
				return {
					symbol: nft.symbol,
					name: nft.name,
					logoURI: nft.json?.image
				};
			}
		} catch (metadataError) {
			console.warn(`Failed to fetch Metaplex metadata for ${mint}:`, metadataError);
		}

		// Try Jupiter API as fallback
		try {
			console.log(`Debug: Trying Jupiter API for ${mint}`);
			const response = await fetch(`https://token.jup.ag/all`);
			if (response.ok) {
				const tokens = await response.json();
				const tokenInfo = tokens.find((token: any) => token.address === mint);
				if (tokenInfo) {
					console.log(`Debug: Found token in Jupiter API: ${tokenInfo.symbol}`);
					return {
						symbol: tokenInfo.symbol,
						name: tokenInfo.name,
						logoURI: tokenInfo.logoURI
					};
				}
			}
		} catch (jupiterError) {
			console.warn(`Failed to fetch from Jupiter API for ${mint}:`, jupiterError);
		}

		// Try Birdeye as last resort
		try {
			console.log(`Debug: Trying Birdeye for ${mint}`);
			const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${mint}`, {
				method: 'GET',
				headers: {
					'X-Chain': 'solana'
				}
			});
			if (response.ok) {
				const birdeyeData = await response.json();
				if (birdeyeData.success && birdeyeData.data) {
					console.log(`Debug: Found Birdeye metadata for ${mint}:`, birdeyeData.data);
					return {
						symbol: birdeyeData.data.symbol || mint.slice(0, 6) + '...',
						name: birdeyeData.data.name || 'Unknown Token',
						logoURI: birdeyeData.data.logoURI
					};
				}
			}
		} catch (birdeyeError) {
			console.warn('Failed to fetch Birdeye data for metadata:', birdeyeError);
		}

		// If all else fails, return a generic name
		console.log(`Debug: No metadata found for ${mint}, using generic name`);
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
			setLoading(true);
			setError(null);

			// Try to get cached data first using the utility function
			const cachedData = getCachedWalletData(solanaWallet!.address);
			console.log('🔍 Checking for cached wallet data:', {
				address: solanaWallet!.address,
				hasCachedData: !!cachedData,
				cacheAge: cachedData ? (Date.now() - cachedData.timestamp) / 1000 : 'N/A'
			});
			
			if (cachedData) {
				console.log('✅ Using cached wallet data:', cachedData);
				// Use cached data but fetch fresh SOL balance
				const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
				const connection = new Connection(rpcUrl as string);
				const publicKey = new PublicKey(solanaWallet!.address);
				
				try {
					const solBalance = await connection.getBalance(publicKey);
					setBalance(solBalance / LAMPORTS_PER_SOL);
				} catch (balanceError) {
					// Use cached balance if fresh fetch fails
					setBalance(cachedData.balance);
				}
				
				// Update token prices from cache or fetch fresh
				const tokenMints = cachedData.tokens.map(token => token.mint);
				if (!tokenMints.includes('So11111111111111111111111111111111111111112')) {
					tokenMints.push('So11111111111111111111111111111111111111112');
				}
				
				try {
					const tokenPrices = await fetchTokenPrices(tokenMints);
					const tokensWithUpdatedPrices = cachedData.tokens.map(token => ({
						...token,
						price: tokenPrices[token.mint] || token.price || 0
					}));
					setTokens(tokensWithUpdatedPrices);
				} catch (priceError) {
					// Use cached prices if fresh fetch fails
					setTokens(cachedData.tokens);
				}
				
				// For transactions, we'll skip them in cached mode to make it faster
				// They will be loaded when the user does a full refresh
				setTransactions([]);
				setLoading(false);
				return;
			}
			
			// If no valid cache, fall back to full fetch
			await fetchWalletData();
		} catch (error) {
			console.error('Error in fetchWalletDataCached:', error);
			// Fall back to regular fetch on any error
			await fetchWalletData();
		}
	};

	const fetchWalletData = async () => {
		try {
			setLoading(true);
			setError(null);

			const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
			console.log('Debug: Using RPC URL:', rpcUrl);  // Log the RPC URL for verification

			const connection = new Connection(rpcUrl as string);
			const publicKey = new PublicKey(solanaWallet!.address);
			console.log('Debug: Wallet Address:', publicKey.toString());

			// Test RPC connection with version
			console.log('Debug: Testing RPC connection...');
			try {
				const version = await connection.getVersion();
				console.log('Debug: RPC connection successful, version:', version);
			} catch (rpcError) {
				console.error('Debug: RPC connection failed:', rpcError);
				throw new Error(`RPC connection failed: ${rpcError}`);
			}

			// Fetch SOL balance
			const solBalance = await connection.getBalance(publicKey);
			setBalance(solBalance / LAMPORTS_PER_SOL);
			console.log('Debug: SOL Balance:', solBalance / LAMPORTS_PER_SOL);

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
			    const parsedInfos = currentTokenAccounts.value.map(acc => acc.account.data.parsed.info as TokenInfo);
			    tokenInfos = [...tokenInfos, ...parsedInfos];
			  }

			  // Process raw if needed
			  if (currentTokenAccounts.value.length === 0 && currentRawAccounts.value.length > 0) {
			    console.log('Debug: Processing raw token accounts...');
			    for (const rawAccount of currentRawAccounts.value) {
			      try {
			        const accountInfo = await getAccount(connection, rawAccount.pubkey, undefined, programId);
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
			          tokenInfos.push(info);
			        }
			      } catch (parseError) {
			        console.error('Error parsing raw account:', parseError);
			      }
			    }
			  }
			}

			// Remove duplicates by mint
			let processedTokens = tokenInfos.filter((token, index, self) =>
			  index === self.findIndex((t) => t.mint === token.mint)
			);

			console.log(`Final processed ${processedTokens.length} unique tokens`);

			// Now create tokenData from processedTokens
			const tokenData: TokenAccount[] = [];
			const stockMap = new Map(stocksData.xStocks.map(stock => [stock.solanaAddress, stock]));
			for (const info of processedTokens) {
				const balance = info.tokenAmount.uiAmount;
				console.log(`Processing token: ${info.mint}, balance: ${balance}`);
				let metadata = await fetchTokenMetadata(info.mint, connection);
				console.log(`  - Initial Metadata:`, metadata);
				const stockInfo = stockMap.get(info.mint);
				if (stockInfo) {
					metadata = {
						symbol: stockInfo.symbol,
						name: stockInfo.name,
						logoURI: stockInfo.logoUrl
					};
					console.log(`  - Overridden with stocks.json:`, metadata);
				}
				tokenData.push({
					mint: info.mint,
					balance: balance,
					decimals: info.tokenAmount.decimals,
					symbol: metadata.symbol,
					name: metadata.name,
					logoURI: metadata.logoURI
				});
			}

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

			// Fetch recent transactions with detailed information
			const signatures = await connection.getSignaturesForAddress(
				publicKey,
				{ limit: 10 }
			);

			console.log(`Fetching details for ${signatures.length} transactions...`);
			const transactionData: Transaction[] = [];

			for (const sig of signatures) {
				const txDetail = await fetchDetailedTransaction(connection, sig.signature, solanaWallet!.address);
				if (txDetail) {
					transactionData.push(txDetail);
				}
			}

			console.log('Processed transaction data:', transactionData);
			setTransactions(transactionData);

			// Cache the wallet data for future use
			if (typeof window !== 'undefined') {
				const walletCacheData = {
					balance: balance,
					tokens: tokensWithPrices,
					transactions: transactionData,
					timestamp: Date.now()
				};
				localStorage.setItem(`wallet_cache_${solanaWallet!.address}`, JSON.stringify(walletCacheData));
			}
		} catch (err) {
			console.error("Error fetching wallet data:", err);
			setError("Failed to fetch wallet data: " + (err as Error).message);
		} finally {
			setLoading(false);
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

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(solanaWallet.address);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const handleCashoutFormSubmitted = (data: any) => {
		setPendingCashoutData(data);
	};

	const handleCancelPendingTransaction = () => {
		setPendingCashoutData(null);
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
								<h1 className="text-3xl font-bold text-gray-100 mb-2">Portfolio</h1>
								<p className="text-gray-400">Manage your investments</p>
							</div>
						</div>
					</div>
				</div>

				{/* Portfolio Card */}
				<div className="max-w-4xl mx-auto mb-6">
					<div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
						style={{
							background: '#1A1A1A',
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
							<div className="mt-6 space-y-3">
								{pendingCashoutData ? (
									<>
										<button 
											onClick={() => setShowCashoutModal(true)}
											className="w-full bg-orange-200 text-orange-800 rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold hover:bg-orange-300"
										>
											<Clock className="h-4 w-4" />
											<span>Complete Transaction</span>
										</button>
										<button 
											onClick={handleCancelPendingTransaction}
											className="w-full bg-gray-600 text-white rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold hover:bg-gray-700"
										>
											<span>Cancel Transaction</span>
										</button>
									</>
								) : (
									<button 
										onClick={() => setShowCashoutModal(true)}
										className="w-full bg-[#D9FF66] text-black rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold hover:bg-[#B8E62E]"
									>
										<Send className="h-4 w-4" />
										<span>Cash Out</span>
									</button>
								)}
							</div>
						</div>
					</div>
				</div>



				{/* Content Area */}
				<div className="max-w-4xl mx-auto">
					{loading ? (
						<div className="space-y-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
									style={{
										background: '#1A1A1A',
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
								background: '#1A1A1A',
								border: '1px solid rgba(255, 255, 255, 0.1)',
								boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
							}}>
							<p className="text-red-400 mb-4">{error}</p>
							<button
								onClick={fetchWalletData}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
							>
								Retry
							</button>
						</div>
					) : (
						<div className="space-y-4">
							{/* SPL Token Holdings Only */}
							{tokens.length > 0 ? (
								tokens.map((token, index) => (
								<div key={index} className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
									style={{
										background: '#1A1A1A',
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
							))
							) : null}
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
					onFormSubmitted={handleCashoutFormSubmitted}
					pendingCashoutData={pendingCashoutData}
				/>
		</div>
	);
}