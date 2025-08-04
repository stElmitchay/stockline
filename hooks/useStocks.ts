import { useState, useEffect, useMemo } from 'react';
import { Stock, SortOption } from '@/types/stock';
import stocksData from '@/data/stocks.json';
import { API_CONFIG, DEFAULTS } from '@/constants';
import { fetchMultipleTokensDataProgressive, warmUpCache } from '@/utils/solanaData';
import { prefetchWalletData } from '@/utils/walletPrefetch';

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
  
  // Check if stocks have been initialized in this session
  const getSessionInitialized = () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('stocks_initialized') === 'true';
  };
  
  const setSessionInitialized = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('stocks_initialized', 'true');
    }
  };
  
  const [hasInitialized, setHasInitialized] = useState(getSessionInitialized);
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

  // Only fetch on initial session load with cache warming
  useEffect(() => {
    if (!hasInitialized) {
      
      setHasInitialized(true);
      setSessionInitialized();
      
      // First, try to warm up cache with all token addresses
      const tokenAddresses = xStocksData.map(stock => stock.solanaAddress);
      warmUpCache(tokenAddresses).then(() => {
        // Prefetch wallet data in the background if user has a Solana wallet
        if (typeof window !== 'undefined') {
          const privyUser = JSON.parse(localStorage.getItem('privy:user') || '{}');
          const solanaWallet = privyUser?.linkedAccounts?.find(
            (account: any) => account.type === 'wallet' && account.chainType === 'solana'
          );
          if (solanaWallet?.address) {
            // Start wallet prefetching in the background (non-blocking)
            prefetchWalletData(solanaWallet.address).catch(() => {
              // Silently handle any prefetch errors
            });
          }
        }
        
        // Then fetch live data (which will use cached data where available)
        fetchLiveData();
      }).catch(() => {
        // If cache warming fails, still proceed with live data fetch
        fetchLiveData();
      });
    } else {
      // If already initialized in this session, just use cached data
      
      // Still fetch to update UI with any cached data, but won't trigger API calls if cache is fresh
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