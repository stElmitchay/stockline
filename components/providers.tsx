"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import dynamic from "next/dynamic";
const PwaInstallPrompt = dynamic(() => import("./pwaInstallPrompt"), { ssr: false });

function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // swallow errors silently in production
        });
    });
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
	if (typeof window !== 'undefined') {
		// Filter out browser extension errors in all environments
		const originalError = console.error;
		console.error = (...args: any[]) => {
			const message = args[0]?.toString() || '';
			// Suppress Chrome extension Privy origin errors
			if (message.includes('origins don\'t match') && message.includes('auth.privy.io')) {
				return;
			}
			originalError.apply(console, args);
		};

		// In production, silence ALL client console methods unless explicitly enabled
		if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEBUG !== 'true') {
			const noop = () => {};
			console.log = noop;
			console.info = noop;
			console.debug = noop;
			console.warn = noop;
			console.error = noop;
			console.trace = noop;
			console.group = noop;
			console.groupCollapsed = noop;
			console.groupEnd = noop;
			console.table = noop as any;
			console.time = noop as any;
			console.timeEnd = noop as any;
			console.timeLog = noop as any;
			console.dir = noop as any;
			console.dirxml = noop as any;
			console.assert = noop as any;
			console.count = noop as any;
			console.countReset = noop as any;
			console.profile = noop as any;
			console.profileEnd = noop as any;
			console.clear = noop as any;
		}

		// Register service worker in production
		registerServiceWorker();
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
			<PwaInstallPrompt />
		</PrivyProvider>
	);
}
