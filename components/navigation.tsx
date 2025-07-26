"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Wallet, ShoppingBag, LogIn, User } from "lucide-react";

export default function Navigation() {
  const { authenticated, login, logout, user } = usePrivy();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white font-semibold text-xl">SolanaStocks</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/stocks" 
              className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Marketplace</span>
            </Link>
            
            {authenticated && (
              <Link 
                href="/wallet" 
                className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Wallet</span>
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <Button 
                onClick={logout} 
                variant="outline" 
                size="sm"
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                Logout
              </Button>
            ) : (
              <Button 
                onClick={login} 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" className="text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}