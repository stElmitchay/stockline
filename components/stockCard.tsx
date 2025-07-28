"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Copy, ExternalLink, Eye, ShoppingCart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stock } from "@/types/stock";
import { formatPrice, formatMarketCap, formatVolume, formatAddress } from "@/utils/formatters";
import { API_CONFIG, EXTERNAL_URLS } from "@/constants";
import Link from "next/link";

interface StockCardProps {
  stock: Stock;
}

export function StockCard({ stock }: StockCardProps) {
  const [copied, setCopied] = useState(false);

  // Check if this stock has been loaded (has a valid price)
  const isLoaded = stock.price > 0;
  const isPositive = (stock.change24h ?? 0) >= 0;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), API_CONFIG.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`group bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-gray-700 hover:bg-gray-900/70 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 ${
      !isLoaded ? 'opacity-70' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {stock.symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
              {stock.name}
            </h3>
            <p className="text-gray-400 text-sm font-mono">{stock.symbol}</p>
          </div>
        </div>
        {!isLoaded && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-blue-400 text-xs">Loading...</span>
          </div>
        )}
      </div>

      {/* Price and Change */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-white mb-1">
          {isLoaded ? formatPrice(stock.price) : (
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-gray-700 rounded animate-pulse"></div>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isLoaded 
            ? (isPositive ? 'text-green-400' : 'text-red-400')
            : 'text-gray-400'
        }`}>
          {isLoaded ? (
            <>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {isPositive ? '+' : ''}{(stock.change24h ?? 0).toFixed(2)}%
            </>
          ) : (
            <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Market Cap</span>
          <span className="text-white font-medium">
            {isLoaded ? formatMarketCap(stock.marketCap) : (
              <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">24h Volume</span>
          <span className="text-white font-medium">
            {isLoaded ? formatVolume(stock.volume24h) : (
              <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>
      </div>



      {/* Action Buttons */}
      <div className="space-y-2">
        <Link href={`/purchase?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}&price=${stock.price}`} className="block">
          <Button 
            size="sm" 
            className={`w-full font-semibold ${
              isLoaded 
                ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
            disabled={!isLoaded}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isLoaded ? 'Buy Now' : 'Loading...'}
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1"
            onClick={() => {
              const solscanUrl = stock.solscanUrl || `${EXTERNAL_URLS.SOLSCAN_BASE}${stock.solanaAddress}`;
              window.open(solscanUrl, '_blank');
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}