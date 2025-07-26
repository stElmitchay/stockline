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
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  refreshData: () => void;
}

export const useStocks = (): UseStocksReturn => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(DEFAULTS.SEARCH_QUERY);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULTS.SORT_BY);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // Function to refresh data
  const refreshData = () => {
    setIsLoading(true);
    setFetchError(null);
    setLastRefreshed(Date.now());
  };

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        console.log('Fetching live data for stocks...');
        // Get all token addresses
        const tokenAddresses = xStocksData.map(stock => stock.solanaAddress);
        
        if (tokenAddresses.length === 0) {
          throw new Error('No token addresses found');
        }
        
        // Log addresses for debugging
        console.log(`Found ${tokenAddresses.length} token addresses to fetch`);
        
        // Fetch live data for all tokens
        const tokenDataMap = await fetchMultipleTokensData(tokenAddresses);
        
        if (!tokenDataMap || tokenDataMap.size === 0) {
          throw new Error('No data returned from token fetch');
        }
        
        console.log(`Received data for ${tokenDataMap.size} tokens`);
        
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
            console.log(`${stock.symbol} price: ${validPrice}`);
              
            return {
              ...stock,
              price: validPrice,
              marketCap: validMarketCap,
              volume24h: validVolume,
              change24h: validChange
            };
          }
          
          console.warn(`No live data found for ${stock.symbol}, using static data`);
          return stock;
        });
        
        // Check if we have any valid prices
        const hasValidPrices = updatedStocks.some(stock => stock.price > 0);
        if (!hasValidPrices) {
          throw new Error('No valid prices found in the data');
        }
        
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

    fetchLiveData();
    
    // Set up auto-refresh every minute
    const refreshInterval = setInterval(() => {
      refreshData();
    }, 60000); // 60 seconds
    
    return () => clearInterval(refreshInterval);
  }, [lastRefreshed, stocks.length]);

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
    setSearchQuery: (query: string) => setSearchQuery(query),
    setSortBy: (sort: SortOption) => setSortBy(sort),
    refreshData
  };
};