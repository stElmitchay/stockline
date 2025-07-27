"use client";

import { useState } from "react";
import { Search, TrendingUp, TrendingDown, BarChart3, DollarSign, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockCard } from "@/components/stockCard";
import { StockFilters } from "@/components/stockFilters";
import { LoadingSkeleton } from "@/components/loadingSkeleton";
import { useStocks } from "@/hooks/useStocks";
import Navigation from "@/components/navigation";

export default function StocksMarketplace() {
  const { stocks, filteredStocks, isLoading, searchQuery, sortBy, stats, setSearchQuery, setSortBy, refreshData } = useStocks();
  const [showFilters, setShowFilters] = useState(false);

  // Show loading skeletons only if we have no stocks yet
  const showLoadingSkeletons = isLoading && stocks.length === 0;
  
  // Show stocks that have been loaded, even if still loading more
  const stocksToShow = showLoadingSkeletons ? [] : filteredStocks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Navigation />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                Stock Marketplace
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Trade tokenized stocks on Solana blockchain with real-time pricing
              </p>
            </div>
            
            {/* Floating Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search stocks by name or symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-gray-800/80 border-gray-700/50 rounded-xl backdrop-blur-sm focus:bg-gray-800 transition-all duration-200"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-6 py-4 rounded-xl transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'bg-gray-800/80 border-gray-700/50 hover:bg-gray-700'
                  }`}
                >
                  <Filter className="h-5 w-5" />
                  Filters
                </Button>
              </div>
              
              {/* Filters Panel */}
              {showFilters && (
                <div className="mt-4 p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                  <StockFilters
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onRefresh={refreshData}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white">{stats.totalStocks}</div>
            <div className="text-gray-400 text-sm">Total Stocks</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">{stats.gainers}</div>
            <div className="text-gray-400 text-sm">Gainers</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-red-400">{stats.losers}</div>
            <div className="text-gray-400 text-sm">Losers</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">
              ${(stats.totalVolume / 1000000).toFixed(1)}M
            </div>
            <div className="text-gray-400 text-sm">24h Volume</div>
          </div>
        </div>

        {/* Stock Grid */}
        {showLoadingSkeletons ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stocksToShow.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}

        {stocksToShow.length === 0 && !showLoadingSkeletons && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No stocks found</div>
            <div className="text-gray-500 text-sm mt-2">
              Try adjusting your search or filters
            </div>
          </div>
        )}
      </div>
    </div>
  );
}