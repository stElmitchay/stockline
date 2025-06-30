"use client";

import { ChevronDown } from "lucide-react";
import type React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dropdown, DropdownItem } from "./ui/dropdown";

interface WalletAccount {
	address: string;
	chainType: string;
	walletClientType: string;
	connectorType: string;
	walletIndex?: number;
}

interface ActionButtonProps {
	icon: React.ReactNode;
	label: string;
	wallets: WalletAccount[];
	onWalletSelect: (wallet: WalletAccount) => void;
}

export function ActionButton({
	icon,
	label,
	wallets,
	onWalletSelect,
}: ActionButtonProps) {
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

	const trigger = (
		<Button variant="outline" className="gap-2">
			{icon}
			{label}
			<ChevronDown className="h-4 w-4" />
		</Button>
	);

	return (
		<Dropdown trigger={trigger}>
			<div className="py-1">
				{wallets?.map((wallet, index) => (
					<DropdownItem
						key={`${wallet.address}-${index}`}
						onClick={() => onWalletSelect(wallet)}
					>
						<div className="flex items-center justify-between">
							<div className="flex flex-col">
								<span className="font-medium text-white">
									{getWalletDisplayName(wallet)}
								</span>
								<span className="text-sm text-gray-400">
									{formatAddress(wallet.address)}
								</span>
							</div>
							<Badge
								variant={
									wallet.chainType === "solana" ? "default" : "secondary"
								}
							>
								{wallet.chainType.toUpperCase()}
							</Badge>
						</div>
					</DropdownItem>
				))}
			</div>
		</Dropdown>
	);
}
