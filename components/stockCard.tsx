"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Copy, ExternalLink, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stock } from "@/types/stock";
import { formatPrice, formatMarketCap, formatVolume, formatAddress } from "@/utils/formatters";
import { API_CONFIG, EXTERNAL_URLS } from "@/constants";

interface StockCardProps {
  stock: Stock;
}

export function StockCard({ stock }: StockCardProps) {
  const [copied, setCopied] = useState(false);





  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), API_CONFIG.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isPositive = (stock.change24h ?? 0) >= 0;

  return (
    <div className="group bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-gray-700 hover:bg-gray-900/70 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
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
      </div>

      {/* Price and Change */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-white mb-1">
          {formatPrice(stock.price)}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {isPositive ? '+' : ''}{(stock.change24h ?? 0).toFixed(2)}%
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Market Cap</span>
          <span className="text-white font-medium">{formatMarketCap(stock.marketCap)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">24h Volume</span>
          <span className="text-white font-medium">{formatVolume(stock.volume24h)}</span>
        </div>
      </div>

      {/* Solana Address */}
      <div className="mb-4">
        <div className="text-gray-400 text-xs mb-2">Solana Address</div>
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
          <code className="text-blue-400 text-xs font-mono flex-1 truncate">
            {formatAddress(stock.solanaAddress)}
          </code>
          <button
            onClick={() => copyToClipboard(stock.solanaAddress)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Copy address"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
        {copied && (
          <div className="text-green-400 text-xs mt-1">Address copied!</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
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
  );
}