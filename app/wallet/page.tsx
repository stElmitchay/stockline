"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { ArrowLeft, ArrowDown, ArrowUp, Send, Copy, Check, Clock, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { fetchTokenData, fetchMultipleTokensData } from "@/utils/solanaData";
import Navigation from "@/components/navigation";

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
	const [activeTab, setActiveTab] = useState<'tokens' | 'history'>('tokens');
	const [copied, setCopied] = useState(false);

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

	const fetchTokenMetadata = async (mint: string) => {
		try {
			// Known tokens mapping for reliable identification
			const knownTokens: { [key: string]: { symbol: string; name: string } } = {
				'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
				'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
				'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether' },
				'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp': { symbol: 'TSLAx', name: 'Tesla Stock Token' },
			};
			
			// Check if it's a known token first
			if (knownTokens[mint]) {
				return {
					symbol: knownTokens[mint].symbol,
					name: knownTokens[mint].name,
					logoURI: undefined
				};
			}
			
			// Try to get metadata from Birdeye API
			try {
				const birdeyeData = await fetchTokenData(mint);
				if (birdeyeData && birdeyeData.price > 0) {
					// If we can get price data, the token likely has metadata
					return {
						symbol: mint.slice(0, 6) + '...',
						name: 'Token',
						logoURI: undefined
					};
				}
			} catch (birdeyeError) {
				console.warn('Failed to fetch Birdeye data for metadata:', birdeyeError);
			}
			
			// Final fallback
			return { 
				symbol: mint.slice(0, 6) + '...', 
				name: 'Unknown Token',
				logoURI: undefined
			};
		} catch (error) {
			console.error('Error fetching token metadata:', error);
			return { 
				symbol: mint.slice(0, 6) + '...', 
				name: 'Unknown Token',
				logoURI: undefined
			};
		}
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

	const fetchWalletData = async () => {
		try {
			setLoading(true);
			setError(null);

			const connection = new Connection(
				process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string
			);
			const publicKey = new PublicKey(solanaWallet!.address);

			// Test RPC connection
			console.log('Debug: Testing RPC connection...');
			try {
				const slot = await connection.getSlot();
				console.log('Debug: RPC connection successful, current slot:', slot);
			} catch (rpcError) {
				console.error('Debug: RPC connection failed:', rpcError);
				throw new Error(`RPC connection failed: ${rpcError}`);
			}

			// Fetch SOL balance
			const solBalance = await connection.getBalance(publicKey);
			setBalance(solBalance / LAMPORTS_PER_SOL);

			// Fetch token accounts with on-chain balance verification
			console.log('Debug: About to fetch token accounts...');
			console.log('Debug: Public key:', publicKey.toString());
			console.log('Debug: TOKEN_PROGRAM_ID:', TOKEN_PROGRAM_ID.toString());
			
			let tokenAccounts;
			let rawTokenAccounts;
			
			// Try multiple methods to fetch token accounts
			try {
				// Method 1: getParsedTokenAccountsByOwner
				console.log('Debug: Trying getParsedTokenAccountsByOwner...');
				tokenAccounts = await connection.getParsedTokenAccountsByOwner(
					publicKey,
					{ programId: TOKEN_PROGRAM_ID }
				);
				console.log(`Method 1 found ${tokenAccounts.value.length} token accounts`);
			} catch (error1) {
				console.error('Debug: Method 1 failed:', error1);
				tokenAccounts = { value: [] };
			}
			
			try {
				// Method 2: getTokenAccountsByOwner (raw)
				console.log('Debug: Trying getTokenAccountsByOwner...');
				rawTokenAccounts = await connection.getTokenAccountsByOwner(
					publicKey,
					{ programId: TOKEN_PROGRAM_ID }
				);
				console.log(`Method 2 found ${rawTokenAccounts.value.length} raw token accounts`);
			} catch (error2) {
				console.error('Debug: Method 2 failed:', error2);
				rawTokenAccounts = { value: [] };
			}
			
			// If both methods return 0, try with different commitment
			if (tokenAccounts.value.length === 0 && rawTokenAccounts.value.length === 0) {
				console.log('Debug: Both methods returned 0, trying with confirmed commitment...');
				try {
					const confirmedConnection = new Connection(
						process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string,
						'confirmed'
					);
					
					const confirmedTokenAccounts = await confirmedConnection.getParsedTokenAccountsByOwner(
						publicKey,
						{ programId: TOKEN_PROGRAM_ID }
					);
					console.log(`Confirmed commitment found ${confirmedTokenAccounts.value.length} token accounts`);
					
					if (confirmedTokenAccounts.value.length > 0) {
						tokenAccounts = confirmedTokenAccounts;
					}
				} catch (error3) {
					console.error('Debug: Confirmed commitment method failed:', error3);
				}
			}
			
			// If still no accounts, try with finality commitment
			if (tokenAccounts.value.length === 0 && rawTokenAccounts.value.length === 0) {
				console.log('Debug: Still 0 accounts, trying with finalized commitment...');
				try {
					const finalizedConnection = new Connection(
						process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string,
						'finalized'
					);
					
					const finalizedTokenAccounts = await finalizedConnection.getParsedTokenAccountsByOwner(
						publicKey,
						{ programId: TOKEN_PROGRAM_ID }
					);
					console.log(`Finalized commitment found ${finalizedTokenAccounts.value.length} token accounts`);
					
					if (finalizedTokenAccounts.value.length > 0) {
						tokenAccounts = finalizedTokenAccounts;
					}
				} catch (error4) {
					console.error('Debug: Finalized commitment method failed:', error4);
				}
			}

			console.log(`Final result: Found ${tokenAccounts.value.length} token accounts`);
			console.log('Debug: Token accounts response:', tokenAccounts);

			// Debug: Log all token accounts first
			console.log('Debug: All token accounts:');
			tokenAccounts.value.forEach((account, index) => {
				const parsedInfo = account.account.data.parsed.info;
				console.log(`Account ${index}:`, {
					mint: parsedInfo.mint,
					uiAmount: parsedInfo.tokenAmount.uiAmount,
					amount: parsedInfo.tokenAmount.amount,
					decimals: parsedInfo.tokenAmount.decimals,
					owner: parsedInfo.owner
				});
			});

			const tokenData: TokenAccount[] = [];
			
			for (const account of tokenAccounts.value) {
				const parsedInfo = account.account.data.parsed.info;
				const balance = parsedInfo.tokenAmount.uiAmount || 0;
				
				console.log(`Processing token: ${parsedInfo.mint}, balance: ${balance}`);
				
				// Include ALL tokens found in the wallet
				console.log(`  ✅ INCLUDING - Token found in wallet`);
				
				// Fetch metadata for this token
				const metadata = await fetchTokenMetadata(parsedInfo.mint);
				console.log(`  - Metadata:`, metadata);
				
				tokenData.push({
					mint: parsedInfo.mint,
					balance: balance,
					decimals: parsedInfo.tokenAmount.decimals,
					symbol: metadata.symbol,
					name: metadata.name,
					logoURI: metadata.logoURI
				});
			}

			console.log(`Processed ${tokenData.length} tokens from wallet`);

			// Fetch prices for all tokens
			const tokenMints = tokenData.map(token => token.mint);
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
		} catch (err) {
			console.error("Error fetching wallet data:", err);
			setError("Failed to fetch wallet data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (solanaWallet?.address) {
			fetchWalletData();
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

	// Calculate total portfolio value
	const calculateTotalPortfolioValue = () => {
		const solValue = balance * solPrice;
		const tokenValues = tokens.reduce((total, token) => {
			return total + (token.balance * (token.price || 0));
		}, 0);
		return solValue + tokenValues;
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
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-400 uppercase tracking-wide">TOTAL PORTFOLIO VALUE</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="text-right">
										<p className="text-xs text-gray-400 mb-1">Wallet Address</p>
										<p className="font-mono text-xs text-gray-300">{formatAddress(solanaWallet.address)}</p>
									</div>
									<button
										onClick={copyToClipboard}
										className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
									>
										{copied ? (
											<Check className="h-4 w-4 text-green-500" />
										) : (
											<Copy className="h-4 w-4 text-gray-400" />
										)}
									</button>
								</div>
							</div>
							
							{loading ? (
								<div className="animate-pulse">
									<div className="h-12 bg-gray-700 rounded w-48 mb-2"></div>
									<div className="h-4 bg-gray-700 rounded w-32"></div>
								</div>
							) : (
								<>
									<div className="text-5xl font-bold mb-2 text-white">${calculateTotalPortfolioValue().toFixed(2)}</div>
									<div className="text-sm text-gray-400">
										SOL: ${solPrice.toFixed(2)}
									</div>
								</>
							)}
							
							{/* Action Button */}
							<div className="mt-6">
								<button 
									className="w-full bg-[#D9FF66] text-black rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors font-semibold hover:bg-[#B8E62E]"
								>
									<Send className="h-4 w-4" />
									<span>Cash Out</span>
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="max-w-4xl mx-auto mb-6">
					<div className="flex rounded-lg p-1"
						style={{
							background: '#1A1A1A',
							border: '1px solid rgba(255, 255, 255, 0.1)',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
						}}>
						<button
							onClick={() => setActiveTab('tokens')}
							className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
								activeTab === 'tokens'
									? 'bg-[#D9FF66] text-black'
									: 'text-gray-400 hover:text-white'
							}`}
							style={activeTab !== 'tokens' ? {
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
								border: '1px solid rgba(255, 255, 255, 0.2)'
							} : {}}
						>
							Tokens
						</button>
						<button
							onClick={() => setActiveTab('history')}
							className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
								activeTab === 'history'
									? 'bg-[#D9FF66] text-black'
									: 'text-gray-400 hover:text-white'
							}`}
							style={activeTab !== 'history' ? {
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
								border: '1px solid rgba(255, 255, 255, 0.2)'
							} : {}}
						>
							History
						</button>
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
					) : activeTab === 'tokens' ? (
						<div className="space-y-4">
							{/* SOL Balance */}
							<div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
								style={{
									background: '#1A1A1A',
									border: '1px solid rgba(255, 255, 255, 0.1)',
									boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
								}}>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
											<span className="text-white font-bold text-sm">SOL</span>
										</div>
										<div>
											<p className="font-medium text-white">Solana</p>
											<p className="text-sm text-gray-400">SOL</p>
										</div>
									</div>
									<div className="text-right">
										<p className="font-medium text-white">{balance.toFixed(2)} SOL</p>
										<p className="text-sm text-gray-400">${(balance * solPrice).toFixed(2)}</p>
									</div>
								</div>
							</div>

							{/* Token Holdings */}
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
												{token.balance.toFixed(2)} {token.symbol || 'TOKENS'}
											</p>
											<p className="text-sm text-gray-400">
												{token.price && token.price > 0 
													? `$${(token.balance * token.price).toFixed(2)}`
													: 'Price unavailable'
												}
											</p>
										</div>
									</div>
								</div>
							))
							) : null}
						</div>
					) : (
						<div className="space-y-4">
							{transactions.length > 0 ? (
							transactions.map((tx, index) => (
								<div 
									key={index} 
									className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-2xl"
									style={{
										background: '#1A1A1A',
										border: '1px solid rgba(255, 255, 255, 0.1)',
										boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
									}}
									onClick={() => openTransactionExplorer(tx.signature)}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
												{getTransactionIcon(tx.type)}
											</div>
											<div>
												<div className="flex items-center gap-2">
													<p className="font-medium text-white">
														{getTransactionLabel(tx.type)}
													</p>
													{tx.amount && tx.amount > 0 && (
														<span className={`text-sm font-medium ${
															tx.type === 'sent' ? 'text-red-400' : 'text-green-400'
														}`}>
															{tx.type === 'sent' ? '-' : '+'}{tx.amount.toFixed(2)} {tx.tokenSymbol || 'SOL'}
														</span>
													)}
												</div>
												<div className="flex items-center gap-2">
													<p className="text-sm text-gray-400">
														{tx.timestamp ? formatDate(tx.timestamp) : "Unknown date"}
													</p>
													<p className="text-xs text-gray-500">
														{formatAddress(tx.signature)}
													</p>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												variant="outline"
												className={
													tx.type === "failed" 
														? "border-red-500 text-red-400" 
														: tx.type === "sent"
														? "border-orange-500 text-orange-400"
														: "border-green-500 text-green-400"
												}
											>
												{getTransactionLabel(tx.type)}
											</Badge>
											<ExternalLink className="h-4 w-4 text-gray-400" />
										</div>
									</div>
								</div>
							))
							) : (
								<div className="relative overflow-hidden rounded-2xl p-8 text-center"
									style={{
										background: '#1A1A1A',
										border: '1px solid rgba(255, 255, 255, 0.1)',
										boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
									}}>
									<div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
										<Clock className="h-8 w-8 text-gray-600" />
									</div>
									<h3 className="text-xl font-semibold text-white mb-2">No Transactions Yet</h3>
									<p className="text-gray-400">
										Your transaction history will appear here once you start using your wallet.
									</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}