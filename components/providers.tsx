"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<PrivyProvider
			appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
			config={{
				appearance: {
					showWalletLoginFirst: true,
					walletChainType: "solana-only",
				},
				loginMethods: ["wallet", "email"],
				externalWallets: {
					solana: {
						connectors: toSolanaWalletConnectors(),
					},
				},
				embeddedWallets: {
					createOnLogin: "all-users",
				},
			}}
		>
			{children}
		</PrivyProvider>
	);
}
