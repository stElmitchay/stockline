import { useState, useEffect, useMemo } from 'react';
import { Stock, SortOption } from '@/types/stock';
import stocksData from '@/data/stocks.json';
import { API_CONFIG, DEFAULTS } from '@/constants';
import { fetchMultipleTokensData } from '@/utils/solanaData';

export interface UseStocksReturn {
  stocks: Stock[];
  filteredStocks: Stock[];
  isLoading: boolean;
  searchQuery: string;
  sortBy: SortOption;
  stats: {
    totalStocks: number;
    gainers: number;
    losers: number;
    totalVolume: number;
  };
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  refreshData: () => void;
}

export const useStocks = (): UseStocksReturn => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(DEFAULTS.SEARCH_QUERY);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULTS.SORT_BY);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalStocks: 0,
    gainers: 0,
    losers: 0,
    totalVolume: 0
  });

  // Load stock data from JSON file
  const xStocksData: Stock[] = stocksData.xStocks.map(stock => ({
    ...stock,
    price: 0,
    marketCap: 0,
    volume24h: 0,
    change24h: 0
  }));

  // Initialize with static data to ensure we always have something to display
  useEffect(() => {
    // Set initial data from JSON
    setStocks(xStocksData);
  }, []);

  // Function to fetch live data
  const fetchLiveData = async () => {
    try {
      console.log('Fetching live data for stocks...');
      setIsLoading(true);
      setFetchError(null);
      
      // Get all token addresses
      const tokenAddresses = xStocksData.map(stock => stock.solanaAddress);
      
      if (tokenAddresses.length === 0) {
        throw new Error('No token addresses found');
      }
      
      // Log addresses for debugging
      console.log(`Found ${tokenAddresses.length} token addresses to fetch`);
      console.log('Token addresses:', tokenAddresses);
      
      // Fetch live data for all tokens
      const tokenDataMap = await fetchMultipleTokensData(tokenAddresses);
      
      if (!tokenDataMap || tokenDataMap.size === 0) {
        throw new Error('No data returned from token fetch');
      }
      
      console.log(`Received data for ${tokenDataMap.size} tokens`);
      console.log('Successfully fetched tokens:', Array.from(tokenDataMap.keys()));
      
      // Update stocks with live data
      const updatedStocks = xStocksData.map(stock => {
        const liveData = tokenDataMap.get(stock.solanaAddress);
        
        if (liveData) {
          // Validate the data before using it
          const validPrice = typeof liveData.price === 'number' && !isNaN(liveData.price) && liveData.price > 0
            ? liveData.price
            : stock.price; // Fall back to static data if invalid
            
          const validMarketCap = typeof liveData.marketCap === 'number' && !isNaN(liveData.marketCap) && liveData.marketCap > 0
            ? liveData.marketCap
            : stock.marketCap;
            
          const validVolume = typeof liveData.volume24h === 'number' && !isNaN(liveData.volume24h) && liveData.volume24h > 0
            ? liveData.volume24h
            : stock.volume24h;
            
          // change24h can be negative, so just check if it's a number
          const validChange = typeof liveData.change24h === 'number' && !isNaN(liveData.change24h)
            ? liveData.change24h
            : stock.change24h ?? 0;
          
          // Log the price for debugging
          console.log(`✅ ${stock.symbol} (${stock.solanaAddress}): $${validPrice.toFixed(4)}`);
            
          return {
            ...stock,
            price: validPrice,
            marketCap: validMarketCap,
            volume24h: validVolume,
            change24h: validChange
          };
        }
        
        console.warn(`❌ No live data found for ${stock.symbol} (${stock.solanaAddress}), using static data`);
        return stock;
      });
      
      // Check if we have any valid prices
      const hasValidPrices = updatedStocks.some(stock => stock.price > 0);
      if (!hasValidPrices) {
        throw new Error('No valid prices found in the data');
      }
      
      // Calculate success rate
      const successfulFetches = updatedStocks.filter(stock => stock.price > 0).length;
      const totalTokens = updatedStocks.length;
      const successRate = ((successfulFetches / totalTokens) * 100).toFixed(1);
      
      console.log(`🎯 Fetch Summary: ${successfulFetches}/${totalTokens} tokens fetched successfully (${successRate}% success rate)`);
      
      setStocks(updatedStocks);
      setFetchError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching live stock data:', errorMessage);
      setFetchError(`Failed to fetch live data: ${errorMessage}`);
      // Ensure we have data to display even if fetch fails
      if (stocks.length === 0) {
        setStocks(xStocksData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh data manually
  const refreshData = () => {
    console.log('Manual refresh triggered');
    fetchLiveData();
  };

  // Only fetch on initial page load
  useEffect(() => {
    if (!hasInitialized) {
      console.log('Initial page load - fetching stock data');
      setHasInitialized(true);
      fetchLiveData();
    }
  }, [hasInitialized]);

  // Calculate stats when stocks are updated
  useEffect(() => {
    if (stocks.length > 0) {
      const totalStocks = stocks.length;
      const gainers = stocks.filter(s => (s.change24h ?? 0) > 0).length;
      const losers = stocks.filter(s => (s.change24h ?? 0) < 0).length;
      const totalVolume = stocks.reduce((acc, s) => acc + (s.volume24h ?? 0), 0);

      setStats({
        totalStocks,
        gainers,
        losers,
        totalVolume
      });
    }
  }, [stocks]);

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    let filtered = stocks.filter(stock => 
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort stocks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'marketCap':
          return (b.marketCap ?? 0) - (a.marketCap ?? 0);
        case 'price':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'change24h':
          // Handle undefined change24h values
          const aChange = a.change24h ?? 0;
          const bChange = b.change24h ?? 0;
          return bChange - aChange;
        case 'volume':
          return (b.volume24h ?? 0) - (a.volume24h ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [stocks, searchQuery, sortBy]);

  return {
    stocks,
    filteredStocks,
    isLoading,
    searchQuery,
    sortBy,
    stats,
    setSearchQuery: (query: string) => setSearchQuery(query),
    setSortBy: (sort: SortOption) => setSortBy(sort),
    refreshData
  };
};