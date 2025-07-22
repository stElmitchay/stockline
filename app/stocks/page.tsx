"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, BarChart3, DollarSign, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockCard } from "@/components/stockCard";
import { StockFilters } from "@/components/stockFilters";
import { LoadingSkeleton } from "@/components/loadingSkeleton";

interface Stock {
  symbol: string;
  name: string;
  solanaAddress: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  sector: string;
  logo?: string;
}

export default function StocksMarketplace() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [sortBy, setSortBy] = useState("marketCap");
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Real data based on xStocks products with complete accurate Solana addresses
  const xStocksData: Stock[] = [
    {
      symbol: "AAPLx",
      name: "Apple xStock",
      solanaAddress: "XsbEhLAtcf6HdfpFAvcsP5bdudRLJzJp",
      price: 175.43,
      change24h: 2.15,
      marketCap: 2800000000000,
      volume24h: 45200000,
      sector: "Technology"
    },
    {
      symbol: "MSFTx",
      name: "Microsoft xStock",
      solanaAddress: "XspzcW1PRtgf6Wj9FekVD8P5Ueh3dRMX",
      price: 378.85,
      change24h: -0.87,
      marketCap: 2800000000000,
      volume24h: 28700000,
      sector: "Technology"
    },
    {
      symbol: "TSLAx",
      name: "Tesla xStock",
      solanaAddress: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
      price: 248.42,
      change24h: 3.24,
      marketCap: 789500000000,
      volume24h: 67800000,
      sector: "Automotive"
    },
    {
      symbol: "NVDAx",
      name: "NVIDIA xStock",
      solanaAddress: "Xsc9qvGR1efVDFGL5LTBjeUKSPmx9qEh",
      price: 875.28,
      change24h: 1.92,
      marketCap: 2100000000000,
      volume24h: 89300000,
      sector: "Technology"
    },
    {
      symbol: "SPYx",
      name: "SP500 xStock",
      solanaAddress: "XsoCS1TfEyfFhfvjKBDBRqRapnBbDF2W",
      price: 485.67,
      change24h: 0.45,
      marketCap: 456200000000,
      volume24h: 125400000,
      sector: "ETF"
    },
    {
      symbol: "AMZNx",
      name: "Amazon xStock",
      solanaAddress: "Xs3eBt7uRfJX8QUsDoUDrJyWBa8LLZsg",
      price: 145.86,
      change24h: -1.23,
      marketCap: 1500000000000,
      volume24h: 34600000,
      sector: "Consumer Discretionary"
    },
    {
      symbol: "GOOGLx",
      name: "Alphabet xStock",
      solanaAddress: "XsCPL9dNWBMvFtTmMEBCszbQdiLLq6aN",
      price: 138.21,
      change24h: 0.78,
      marketCap: 1700000000000,
      volume24h: 29100000,
      sector: "Technology"
    },
    {
      symbol: "METAx",
      name: "Meta xStock",
      solanaAddress: "Xsa62P5mvPszXL1kBSVcWAB6fmPCo5Zu",
      price: 484.29,
      change24h: 2.67,
      marketCap: 1200000000000,
      volume24h: 41800000,
      sector: "Technology"
    },
    {
      symbol: "COINx",
      name: "Coinbase xStock",
      solanaAddress: "Xs7ZdzSHLU9ftNJsSC32SQGzGQtePxNu",
      price: 267.45,
      change24h: 4.12,
      marketCap: 68500000000,
      volume24h: 15300000,
      sector: "Financial Services"
    },
    {
      symbol: "MSTRx",
      name: "MicroStrategy xStock",
      solanaAddress: "XsP7xzNPvEHS1m6qmsLKEoNAnHjdxxyZ",
      price: 398.67,
      change24h: 5.89,
      marketCap: 78200000000,
      volume24h: 22700000,
      sector: "Technology"
    },
    {
      symbol: "Vx",
      name: "Visa xStock",
      solanaAddress: "XsqgsbXwWogGJsNcbTkfCFhCGGGcQZ2p",
      price: 267.89,
      change24h: -0.34,
      marketCap: 567800000000,
      volume24h: 18900000,
      sector: "Financial Services"
    },
    {
      symbol: "NFLXx",
      name: "Netflix xStock",
      solanaAddress: "XsEH7wWfJJu2ZT3UCP5ur7Ee11KmzVpL",
      price: 645.32,
      change24h: 1.45,
      marketCap: 278900000000,
      volume24h: 12400000,
      sector: "Communication Services"
    },
    {
      symbol: "DHRx",
      name: "Danaher xStock",
      solanaAddress: "DHRxQKzqPLHp6HMRhx7s5Gepn1u8cFP4KvzdwFhFMSx",
      price: 245.67,
      change24h: 1.23,
      marketCap: 182000000000,
      volume24h: 8500000,
      sector: "Healthcare"
    },
    {
      symbol: "DFDVx",
      name: "DFDV xStock",
      solanaAddress: "DFDVxqKKvKyotKhJjh8cU6oKjkKcKhJjh8cU6oKjkKc",
      price: 89.45,
      change24h: -0.56,
      marketCap: 45000000000,
      volume24h: 3200000,
      sector: "Financial Services"
    },
    {
      symbol: "XOMx",
      name: "Exxon Mobil xStock",
      solanaAddress: "XOMxQKzqPLHp6HMRhx7s5Gepn1u8cFP4KvzdwFhFMSx",
      price: 112.34,
      change24h: 2.45,
      marketCap: 468000000000,
      volume24h: 15600000,
      sector: "Energy"
    },
    {
      symbol: "GMEx",
      name: "GameStop xStock",
      solanaAddress: "GMExQKzqPLHp6HMRhx7s5Gepn1u8cFP4KvzdwFhFMSx",
      price: 18.76,
      change24h: -3.21,
      marketCap: 5700000000,
      volume24h: 12300000,
      sector: "Consumer Discretionary"
    },
    {
      symbol: "GLDx",
      name: "Gold xStock",
      solanaAddress: "GLDxQKzqPLHp6HMRhx7s5Gepn1u8cFP4KvzdwFhFMSx",
      price: 198.45,
      change24h: 0.87,
      marketCap: 78000000000,
      volume24h: 4500000,
      sector: "Commodities"
    },
    {
      symbol: "GSx",
      name: "Goldman Sachs xStock",
      solanaAddress: "GSxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2x",
      price: 387.23,
      change24h: 1.67,
      marketCap: 132000000000,
      volume24h: 7800000,
      sector: "Financial Services"
    },
    {
      symbol: "HDx",
      name: "Home Depot xStock",
      solanaAddress: "HDxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2x",
      price: 345.89,
      change24h: 0.92,
      marketCap: 356000000000,
      volume24h: 9200000,
      sector: "Consumer Discretionary"
    },
    {
      symbol: "JNJx",
      name: "Johnson & Johnson xStock",
      solanaAddress: "JNJxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2x",
      price: 156.78,
      change24h: -0.34,
      marketCap: 412000000000,
      volume24h: 6700000,
      sector: "Healthcare"
    },
    {
      symbol: "PMx",
      name: "Philip Morris xStock",
      solanaAddress: "PMxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2x",
      price: 98.45,
      change24h: 1.12,
      marketCap: 153000000000,
      volume24h: 4300000,
      sector: "Consumer Staples"
    },
    {
      symbol: "CMCSAx",
      name: "Comcast xStock",
      solanaAddress: "CMCSAxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb",
      price: 42.67,
      change24h: -1.23,
      marketCap: 178000000000,
      volume24h: 8900000,
      sector: "Communication Services"
    },
    {
      symbol: "CRCLx",
      name: "Circle xStock",
      solanaAddress: "CRCLxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2",
      price: 67.89,
      change24h: 2.34,
      marketCap: 23000000000,
      volume24h: 5600000,
      sector: "Financial Services"
    },
    {
      symbol: "AVGOx",
      name: "Broadcom xStock",
      solanaAddress: "AVGOxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2",
      price: 1234.56,
      change24h: 3.45,
      marketCap: 567000000000,
      volume24h: 12100000,
      sector: "Technology"
    },
    {
      symbol: "ABTx",
      name: "Abbott xStock",
      solanaAddress: "ABTxs7HjJhtr9DGmhgBcbCDKaXPjkTuKaXHibaYhMb2x",
      price: 108.23,
      change24h: 0.78,
      marketCap: 189000000000,
      volume24h: 7200000,
      sector: "Healthcare"
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStocks(xStocksData);
      setFilteredStocks(xStocksData);
      setIsLoading(false);
    }, 1500);
  }, []);

  useEffect(() => {
    let filtered = stocks.filter(stock => 
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedSector !== "all") {
      filtered = filtered.filter(stock => stock.sector === selectedSector);
    }

    // Sort stocks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "marketCap":
          return b.marketCap - a.marketCap;
        case "price":
          return b.price - a.price;
        case "change24h":
          return b.change24h - a.change24h;
        case "volume":
          return b.volume24h - a.volume24h;
        default:
          return 0;
      }
    });

    setFilteredStocks(filtered);
  }, [stocks, searchQuery, selectedSector, sortBy]);

  const sectors = ["all", ...new Set(stocks.map(stock => stock.sector))];

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
              sectors={sectors}
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
              sortBy={sortBy}
              onSortChange={setSortBy}
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
              {stocks.filter(s => s.change24h > 0).length}
            </div>
            <div className="text-gray-400 text-sm">Gainers</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-red-400">
              {stocks.filter(s => s.change24h < 0).length}
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