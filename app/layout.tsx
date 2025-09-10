import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import ErrorBoundary from "@/components/errorBoundary";
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Stockline",
	description: "Own a piece of a company you use everyday",
	icons: {
		icon: '/favicon.svg',
	},
	// Open Graph / Facebook
	openGraph: {
		title: "Stockline",
		description: "Own a piece of a company you use everyday",
		url: "https://stockline.vercel.app",
		siteName: "Stockline",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Stockline - Own a piece of companies you use everyday",
			},
		],
		locale: "en_US",
		type: "website",
	},
	// Twitter
	twitter: {
		card: "summary_large_image",
		title: "Stockline",
		description: "Own a piece of a company you use everyday",
		images: ["/og-image.png"],
		creator: "@stockline",
	},
	// Additional metadata
	keywords: ["stocks", "investing", "fractional shares", "trading", "finance"],
	authors: [{ name: "Stockline Team" }],
	creator: "Stockline",
	publisher: "Stockline",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	verification: {
		google: "your-google-verification-code",
		yandex: "your-yandex-verification-code",
		yahoo: "your-yahoo-verification-code",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ErrorBoundary>
					<Providers>{children}</Providers>
				</ErrorBoundary>
			</body>
		</html>
	);
}
