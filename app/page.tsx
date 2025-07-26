"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet, ShoppingBag, Shield, Zap, Globe } from "lucide-react";
import Navigation from "@/components/navigation";

export default function Home() {
	const { authenticated } = usePrivy();

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<Navigation />
			
			{/* Hero Section */}
			<section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="text-center">
						<h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent mb-6">
							Trade Synthetic Stocks
							<br />on Solana
						</h1>
						<p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
							Access traditional stock markets through blockchain technology. 
							Trade synthetic versions of your favorite stocks with the speed and efficiency of Solana.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							<Link href="/stocks">
								<Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg">
									<ShoppingBag className="w-5 h-5 mr-2" />
									Explore Marketplace
								</Button>
							</Link>
							{authenticated && (
								<Link href="/wallet">
									<Button variant="outline" size="lg" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 text-lg">
										<Wallet className="w-5 h-5 mr-2" />
										View Wallet
									</Button>
								</Link>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
							Why Choose SolanaStocks?
						</h2>
						<p className="text-xl text-gray-400 max-w-2xl mx-auto">
							Experience the future of stock trading with blockchain technology
						</p>
					</div>
					
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
							<div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
								<Zap className="w-6 h-6 text-blue-400" />
							</div>
							<h3 className="text-xl font-semibold text-white mb-4">Lightning Fast</h3>
							<p className="text-gray-400">
								Trade with the speed of Solana blockchain. Execute transactions in seconds, not minutes.
							</p>
						</div>
						
						<div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
							<div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6">
								<Shield className="w-6 h-6 text-purple-400" />
							</div>
							<h3 className="text-xl font-semibold text-white mb-4">Secure & Transparent</h3>
							<p className="text-gray-400">
								Built on blockchain technology with full transparency and security for all your trades.
							</p>
						</div>
						
						<div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
							<div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6">
								<Globe className="w-6 h-6 text-green-400" />
							</div>
							<h3 className="text-xl font-semibold text-white mb-4">Global Access</h3>
							<p className="text-gray-400">
								Access global stock markets 24/7 without traditional banking limitations.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-16 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
						<div>
							<div className="text-3xl font-bold text-blue-400 mb-2">50+</div>
							<div className="text-gray-400">Synthetic Stocks</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-purple-400 mb-2">$10M+</div>
							<div className="text-gray-400">Total Volume</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-green-400 mb-2">1000+</div>
							<div className="text-gray-400">Active Traders</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-yellow-400 mb-2">24/7</div>
							<div className="text-gray-400">Market Access</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
						Ready to Start Trading?
					</h2>
					<p className="text-xl text-gray-300 mb-8">
						Join thousands of traders already using SolanaStocks to access global markets.
					</p>
					<Link href="/stocks">
						<Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-4 text-lg">
							<TrendingUp className="w-5 h-5 mr-2" />
							Start Trading Now
						</Button>
					</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="flex items-center space-x-2 mb-4 md:mb-0">
							<div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
								<span className="text-white font-bold text-lg">S</span>
							</div>
							<span className="text-white font-semibold text-xl">SolanaStocks</span>
						</div>
						<div className="text-gray-400 text-sm">
							© 2024 SolanaStocks. Built on Solana blockchain.
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
