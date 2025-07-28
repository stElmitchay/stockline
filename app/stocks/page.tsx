"use client";

import { useState } from "react";
import { Search, TrendingUp, TrendingDown, BarChart3, DollarSign, Filter, X } from "lucide-react";
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
  const [showSearch, setShowSearch] = useState(false);

  // Show loading skeletons only if we have no stocks yet
  const showLoadingSkeletons = isLoading && stocks.length === 0;
  
  // Show stocks that have been loaded, even if still loading more
  const stocksToShow = showLoadingSkeletons ? [] : filteredStocks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <Navigation />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Hero Section - Mobile First */}
        <div className="mb-8 pt-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Layout - Text + Action Icons */}
            <div className="flex items-start justify-between gap-4">
              {/* Main Text Content */}
              <div className="flex-1">
              </div>
              
              {/* Action Icons - Mobile Optimized */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Search Icon */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 h-10 w-10 rounded-full bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50"
                >
                  <Search className="h-5 w-5 text-gray-300" />
                </Button>
                
                {/* Filter Icon */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 h-10 w-10 rounded-full border transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-600/20 border-blue-500/50' 
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                  }`}
                >
                  <Filter className="h-5 w-5 text-gray-300" />
                </Button>
              </div>
            </div>
            
            {/* Floating Search Bar - Only show when active */}
            {showSearch && (
              <div className="mt-4 relative animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 py-2.5 text-sm bg-gray-800/80 border-gray-700/50 rounded-lg backdrop-blur-sm focus:bg-gray-800 transition-all duration-200"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSearch(false)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Filters Panel - Floating */}
            {showFilters && (
              <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-200">Filters</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="p-1 h-6 w-6"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </Button>
                  </div>
                  <StockFilters
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onRefresh={refreshData}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Grid */}
        {showLoadingSkeletons ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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