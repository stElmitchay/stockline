"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Wallet, LogIn, User } from "lucide-react";

export default function Navigation() {
  const { authenticated, login, logout, user } = usePrivy();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/stocks" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white font-semibold text-xl">Stockline</span>
          </Link>

          {/* Navigation Links - Removed Marketplace */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Navigation links can be added here in the future if needed */}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            {authenticated && (
              <Link href="/wallet">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-800 p-2"
                  title="Wallet"
                >
                  <Wallet className="w-5 h-5" />
                </Button>
              </Link>
            )}
            
            {authenticated ? (
              <Button 
                onClick={logout} 
                variant="outline" 
                size="sm"
                className="text-gray-300 border-gray-600 hover:bg-gray-800 p-2"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            ) : (
              <Button 
                onClick={login} 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2"
                title="Login"
              >
                <LogIn className="w-5 h-5" />
              </Button>
            )}
          </div>


        </div>
      </div>
    </nav>
  );
}