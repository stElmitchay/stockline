"use client";

import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Wallet, TrendingUp, Clock, Coins } from "lucide-react";
import { Badge } from "./ui/badge";

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
}

interface Transaction {
	signature: string;
	timestamp: number;
	type: string;
	amount?: number;
	status: string;
}

interface WalletOverviewProps {
	wallet: WalletAccount;
}

export function WalletOverview({ wallet }: WalletOverviewProps) {
	const [balance, setBalance] = useState<number>(0);
	const [tokens, setTokens] = useState<TokenAccount[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (wallet.address) {
			fetchWalletData();
		}
	}, [wallet.address]);

	const fetchWalletData = async () => {
		try {
			setLoading(true);
			setError(null);

			const connection = new Connection(
				process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string
			);
			const publicKey = new PublicKey(wallet.address);

			// Fetch SOL balance
			const solBalance = await connection.getBalance(publicKey);
			setBalance(solBalance / LAMPORTS_PER_SOL);

			// Fetch token accounts
			const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
				publicKey,
				{ programId: TOKEN_PROGRAM_ID }
			);

			const tokenData: TokenAccount[] = tokenAccounts.value.map((account) => {
				const parsedInfo = account.account.data.parsed.info;
				return {
					mint: parsedInfo.mint,
					balance: parsedInfo.tokenAmount.uiAmount || 0,
					decimals: parsedInfo.tokenAmount.decimals,
				};
			});
			setTokens(tokenData.filter(token => token.balance > 0));

			// Fetch recent transactions
			const signatures = await connection.getSignaturesForAddress(
				publicKey,
				{ limit: 10 }
			);

			const transactionData: Transaction[] = signatures.map((sig) => ({
				signature: sig.signature,
				timestamp: sig.blockTime || 0,
				type: sig.err ? "Failed" : "Success",
				status: sig.err ? "failed" : "confirmed",
			}));

			setTransactions(transactionData);
		} catch (err) {
			console.error("Error fetching wallet data:", err);
			setError("Failed to fetch wallet data");
		} finally {
			setLoading(false);
		}
	};

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp * 1000).toLocaleDateString();
	};

	if (loading) {
		return (
			<div className="bg-gray-900 rounded-lg p-6">
				<div className="animate-pulse space-y-4">
					<div className="h-4 bg-gray-700 rounded w-1/4"></div>
					<div className="h-8 bg-gray-700 rounded w-1/2"></div>
					<div className="space-y-2">
						<div className="h-4 bg-gray-700 rounded"></div>
						<div className="h-4 bg-gray-700 rounded w-3/4"></div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-gray-900 rounded-lg p-6">
				<div className="text-red-400 text-center">
					<p>{error}</p>
					<button
						onClick={fetchWalletData}
						className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Wallet Balance Card */}
			<div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
				<div className="flex items-center gap-3 mb-4">
					<Wallet className="h-6 w-6 text-blue-500" />
					<h2 className="text-xl font-semibold text-white">Wallet Balance</h2>
				</div>
				<div className="space-y-2">
					<p className="text-sm text-gray-400">Address: {formatAddress(wallet.address)}</p>
					<div className="flex items-center gap-2">
						<span className="text-3xl font-bold text-white">{balance.toFixed(4)}</span>
						<Badge>SOL</Badge>
					</div>
					<p className="text-sm text-gray-400">
						≈ ${(balance * 100).toFixed(2)} USD {/* Placeholder price */}
					</p>
				</div>
			</div>

			{/* Token Holdings */}
			<div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
				<div className="flex items-center gap-3 mb-4">
					<Coins className="h-6 w-6 text-green-500" />
					<h2 className="text-xl font-semibold text-white">Token Holdings</h2>
				</div>
				{tokens.length > 0 ? (
					<div className="space-y-3">
						{tokens.map((token, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
							>
								<div>
									<p className="font-medium text-white">
										{token.symbol || "Unknown Token"}
									</p>
									<p className="text-sm text-gray-400">
										{formatAddress(token.mint)}
									</p>
								</div>
								<div className="text-right">
									<p className="font-medium text-white">{token.balance.toFixed(4)}</p>
									<p className="text-sm text-gray-400">{token.decimals} decimals</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-gray-400 text-center py-4">No tokens found</p>
				)}
			</div>

			{/* Transaction History */}
			<div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
				<div className="flex items-center gap-3 mb-4">
					<Clock className="h-6 w-6 text-purple-500" />
					<h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
				</div>
				{transactions.length > 0 ? (
					<div className="space-y-3">
						{transactions.map((tx, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
							>
								<div>
									<p className="font-medium text-white">
										{formatAddress(tx.signature)}
									</p>
									<p className="text-sm text-gray-400">
										{tx.timestamp ? formatDate(tx.timestamp) : "Unknown date"}
									</p>
								</div>
								<div className="text-right">
									<Badge
										variant={tx.status === "confirmed" ? "default" : "secondary"}
									>
										{tx.status}
									</Badge>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-gray-400 text-center py-4">No transactions found</p>
				)}
			</div>
		</div>
	);
}