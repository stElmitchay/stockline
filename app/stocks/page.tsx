"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, BarChart3, DollarSign, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockCard } from "@/components/stockCard";
import { StockFilters } from "@/components/stockFilters";
import { LoadingSkeleton } from "@/components/loadingSkeleton";
import { DisclosureModal } from "@/components/modals/disclosureModal";
import { useStocks } from "@/hooks/useStocks";
import Navigation from "@/components/navigation";

export default function StocksMarketplace() {
  const { stocks, filteredStocks, isLoading, searchQuery, sortBy, stats, setSearchQuery, setSortBy, refreshData } = useStocks();
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);

  // Check if user has agreed to disclosures
  useEffect(() => {
    const hasAgreedToDisclosures = localStorage.getItem('stockline_disclosures_agreed');
    if (!hasAgreedToDisclosures) {
      setShowDisclosureModal(true);
    }
  }, []);

  const handleDisclosureAccept = () => {
    localStorage.setItem('stockline_disclosures_agreed', 'true');
    setShowDisclosureModal(false);
  };

  // Show loading skeletons only if we have no stocks yet
  const showLoadingSkeletons = isLoading && stocks.length === 0;
  
  // Show stocks that have been loaded, even if still loading more
  const stocksToShow = showLoadingSkeletons ? [] : filteredStocks;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
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
                <h1 className="text-3xl font-bold text-gray-100 mb-2">Own a piece of a company you use everyday</h1>
                <p className="text-gray-400">Start your investment journey here</p>
              </div>
              
              {/* Action Icons - Mobile Optimized */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Search Icon */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-3 h-12 w-12 rounded-full transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: showSearch ? '#8C66FF' : 'rgba(255, 255, 255, 0.1)',
                    border: showSearch ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Search className="h-5 w-5 text-white" />
                </Button>
                
                {/* Filter Icon */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-3 h-12 w-12 rounded-full transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: showFilters ? '#D9FF66' : 'rgba(255, 255, 255, 0.1)',
                    border: showFilters ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Filter className="h-5 w-5" style={{ color: showFilters ? '#000000' : '#FFFFFF' }} />
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
                    className="pl-10 pr-10 py-3 text-sm bg-gray-800/90 border-gray-700/50 rounded-xl backdrop-blur-sm focus:bg-gray-800 transition-all duration-200"
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
                <div className="rounded-xl border border-gray-700/50 p-4"
                style={{
                  background: '#1A1A1A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
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
      
      {/* Footer Section */}
       <footer className="mt-8 py-6">
         <div className="container mx-auto px-4">
           <div className="max-w-3xl mx-auto">
             <p className="text-gray-500 text-xs leading-relaxed opacity-60 text-center">
               Disclaimer: Stockline provides a platform to access tokenized U.S. equities. We are not a registered investment advisor or broker-dealer. All investment decisions are made at your own risk. Investing in securities involves risks, including the possible loss of the principal amount invested. The value of stocks can fluctuate, and past performance does not guarantee future returns. Stockline does not provide investment, tax, or legal advice.
             </p>
           </div>
         </div>
       </footer>
      
      {/* Disclosure Modal */}
      <DisclosureModal 
        isOpen={showDisclosureModal} 
        onAccept={handleDisclosureAccept} 
      />
    </div>
  );
}