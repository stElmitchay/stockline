import { useState, useEffect, useMemo } from 'react';
import { Stock, SortOption } from '@/types/stock';
import stocksData from '@/data/stocks.json';
import { API_CONFIG, DEFAULTS } from '@/constants';
import { fetchMultipleTokensDataProgressive } from '@/utils/solanaData';

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

  // Function to fetch live data with progressive loading
  const fetchLiveData = async () => {
    try {
      console.log('Fetching live data for stocks with progressive loading...');
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
      
      // Use progressive loading function that updates stocks as data becomes available
      await fetchMultipleTokensDataProgressive(tokenAddresses, (updatedStocks) => {
        setStocks(updatedStocks);
      });
      
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
      console.log('Initial page load - fetching stock data with progressive loading');
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