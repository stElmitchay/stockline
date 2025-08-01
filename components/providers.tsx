"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export function Providers({ children }: { children: React.ReactNode }) {
	// Suppress console errors for token metadata fetching
	if (typeof window !== 'undefined') {
		const originalConsoleError = console.error;
		console.error = (...args) => {
			// Filter out Privy token metadata errors
			const message = args.join(' ');
			if (
				message.includes('Unable to fetch token metadata') ||
				message.includes('spl_token_info') ||
				message.includes('404 (Not Found)')
			) {
				// Silently ignore these errors
				return;
			}
			// Log other errors normally
			originalConsoleError.apply(console, args);
		};
	}

	return (
		<PrivyProvider
			appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
			config={{
				embeddedWallets: {
					createOnLogin: "all-users",
				},
			}}
		>
			{children}
		</PrivyProvider>
	);
}
