"use client";

import { Wallet } from "lucide-react";
import { Badge } from "./ui/badge";

interface WalletAccount {
	address: string;
	chainType: string;
	walletClientType: string;
	connectorType: string;
	walletIndex?: number;
}

interface WalletCardProps {
	account: WalletAccount;
	isActive?: boolean;
	isCreateNew?: boolean;
	onCreateNew?: () => void;
}

export function WalletCard({
	account,
	isActive,
	isCreateNew,
	onCreateNew,
}: WalletCardProps) {
	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const getWalletDisplayName = (account: WalletAccount) => {
		if (account.walletClientType === "backpack") return "Backpack";
		if (account.walletClientType === "privy") {
			return `Privy ${account.chainType === "ethereum" ? "ETH" : "SOL"} ${account.walletIndex !== undefined ? `#${account.walletIndex + 1}` : ""}`;
		}
		return account.walletClientType;
	};

	if (isCreateNew) {
		return (
			<div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg p-6">
				<button
					onClick={onCreateNew}
					className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-white transition-colors"
					type="button"
				>
					<div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
						<span className="text-2xl">+</span>
					</div>
					<span className="text-sm font-medium">Create Embedded Wallet</span>
				</button>
			</div>
		);
	}

	return (
		<div
			className={`bg-gray-900 border rounded-lg p-6 ${isActive ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50" : "border-gray-700"}`}
		>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
							<Wallet className="h-5 w-5 text-gray-400" />
						</div>
						<div>
							<h3 className="font-semibold text-white">
								{getWalletDisplayName(account)}
							</h3>
							<p className="text-sm text-gray-400">
								{formatAddress(account.address)}
							</p>
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between">
					<Badge
						variant={account.chainType === "solana" ? "default" : "secondary"}
					>
						{account.chainType.toUpperCase()}
					</Badge>
					{isActive && <Badge variant="outline">Active</Badge>}
				</div>
			</div>
		</div>
	);
}
