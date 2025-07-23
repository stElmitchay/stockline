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

export default function StocksMarketplace() {
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    stocks,
    filteredStocks,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    refreshData
  } = useStocks();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Stock Marketplace
              </h1>
              <p className="text-gray-400 mt-1">
                Trade tokenized stocks on Solana blockchain
              </p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 lg:w-auto w-full">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search stocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <StockFilters
              sortBy={sortBy}
              onSortChange={setSortBy}
              onRefresh={refreshData}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white">{stocks.length}</div>
            <div className="text-gray-400 text-sm">Total Stocks</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">
              {stocks.filter(s => (s.change24h ?? 0) > 0).length}
            </div>
            <div className="text-gray-400 text-sm">Gainers</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-red-400">
              {stocks.filter(s => (s.change24h ?? 0) < 0).length}
            </div>
            <div className="text-gray-400 text-sm">Losers</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">
              ${(stocks.reduce((acc, s) => acc + s.volume24h, 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-gray-400 text-sm">24h Volume</div>
          </div>
        </div>

        {/* Stock Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}

        {filteredStocks.length === 0 && !isLoading && (
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