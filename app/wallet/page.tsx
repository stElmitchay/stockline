"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { ArrowLeft, ArrowDown, ArrowUp, CreditCard, Coins, Send, Copy, Check, Clock, TrendingUp, ExternalLink } from "lucide-react";
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
	const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');
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
			// Try to fetch from Jupiter token list first
			const response = await fetch(`https://token.jup.ag/strict`);
			const tokenList = await response.json();
			const token = tokenList.find((t: any) => t.address === mint);
			
			if (token) {
				return {
					symbol: token.symbol,
					name: token.name,
					logoURI: token.logoURI
				};
			}
			
			return { symbol: 'UNKNOWN', name: 'Unknown Token' };
		} catch (error) {
			console.error('Error fetching token metadata:', error);
			return { symbol: 'UNKNOWN', name: 'Unknown Token' };
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

			// Fetch SOL balance
			const solBalance = await connection.getBalance(publicKey);
			setBalance(solBalance / LAMPORTS_PER_SOL);

			// Fetch token accounts with on-chain balance verification
			const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
				publicKey,
				{ programId: TOKEN_PROGRAM_ID }
			);

			console.log(`Found ${tokenAccounts.value.length} token accounts`);

			const tokenData: TokenAccount[] = [];
			
			for (const account of tokenAccounts.value) {
				const parsedInfo = account.account.data.parsed.info;
				const balance = parsedInfo.tokenAmount.uiAmount || 0;
				
				// Only include tokens with positive balance
				if (balance > 0) {
					console.log(`Token ${parsedInfo.mint}: balance = ${balance}`);
					
					// Fetch metadata for this token
					const metadata = await fetchTokenMetadata(parsedInfo.mint);
					
					tokenData.push({
						mint: parsedInfo.mint,
						balance: balance,
						decimals: parsedInfo.tokenAmount.decimals,
						symbol: metadata.symbol,
						name: metadata.name,
						logoURI: metadata.logoURI
					});
				}
			}

			console.log(`Filtered to ${tokenData.length} tokens with positive balances`);

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
			<div className="min-h-screen bg-black text-white">
				<Navigation />
				<div className="flex items-center justify-center min-h-[calc(100vh-4rem)] mt-16">
					<div className="text-center">
						<h1 className="text-2xl font-bold mb-4">Access Denied</h1>
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
			<div className="min-h-screen bg-black text-white">
				<Navigation />
				<div className="flex items-center justify-center min-h-[calc(100vh-4rem)] mt-16">
					<div className="text-center">
						<h1 className="text-2xl font-bold mb-4">No Solana Wallet Found</h1>
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

	return (
		<div className="min-h-screen bg-black text-white">
			<Navigation />
			<div className="container mx-auto px-4 py-6 mt-16">
				{/* Header */}
				<div className="flex items-center gap-4 mb-6">
					<h1 className="text-2xl font-bold">Portfolio</h1>
				</div>

				{/* Portfolio Card */}
				<div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 relative overflow-hidden">
					{/* Background Pattern */}
					<div className="absolute inset-0 opacity-10">
						<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500 to-purple-600 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
					</div>
					
					<div className="relative z-10">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-400 uppercase tracking-wide">BALANCE</span>
								<div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
									<span className="text-xs text-gray-300">i</span>
								</div>
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
					<div className="text-5xl font-bold mb-2">${(balance * solPrice).toFixed(2)}</div>
					<div className="text-sm text-gray-400">
						SOL: ${solPrice.toFixed(2)}
					</div>
				</>
						)}
						
						{/* Action Buttons */}
						<div className="flex gap-3 mt-6">
							<button className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors">
								<ArrowDown className="h-4 w-4" />
								<span className="font-medium">Receive</span>
							</button>
							<button className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors">
								<CreditCard className="h-4 w-4" />
								<span className="font-medium">Buy</span>
							</button>
							<button className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors">
								<Coins className="h-4 w-4" />
								<span className="font-medium">Stake</span>
							</button>
							<button className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-full py-3 px-4 flex items-center justify-center gap-2 transition-colors">
								<Send className="h-4 w-4" />
								<span className="font-medium">Send</span>
							</button>
						</div>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="flex bg-gray-900 rounded-lg p-1 mb-6">
					<button
						onClick={() => setActiveTab('holdings')}
						className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
							activeTab === 'holdings'
								? 'bg-gray-700 text-white'
								: 'text-gray-400 hover:text-white'
						}`}
					>
						Holdings
					</button>
					<button
						onClick={() => setActiveTab('history')}
						className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
							activeTab === 'history'
								? 'bg-gray-700 text-white'
								: 'text-gray-400 hover:text-white'
						}`}
					>
						Transaction History
					</button>
				</div>

				{/* Content Area */}
				{loading ? (
					<div className="bg-gray-900 rounded-lg p-6">
						<div className="animate-pulse space-y-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center justify-between">
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
							))}
						</div>
					</div>
				) : error ? (
					<div className="bg-gray-900 rounded-lg p-6 text-center">
						<p className="text-red-400 mb-4">{error}</p>
						<button
							onClick={fetchWalletData}
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
						>
							Retry
						</button>
					</div>
				) : activeTab === 'holdings' ? (
					<div className="space-y-4">
						{/* SOL Balance */}
						<div className="bg-gray-900 rounded-lg p-4">
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
							<div key={index} className="bg-gray-900 rounded-lg p-4">
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
								className="bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors"
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
											variant={tx.type === "failed" ? "outline" : tx.type === "sent" ? "secondary" : "default"}
											className={tx.type === "failed" ? "border-red-500 text-red-400" : ""}
										>
											{getTransactionLabel(tx.type)}
										</Badge>
										<ExternalLink className="h-4 w-4 text-gray-400" />
									</div>
								</div>
							</div>
						))
						) : (
							<div className="bg-gray-900 rounded-lg p-8 text-center">
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
	);
}