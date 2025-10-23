import { useState, useEffect, useMemo } from 'react';
import { Stock, SortOption } from '@/types/stock';
import cryptoData from '@/data/crypto.json';
import { API_CONFIG, DEFAULTS } from '@/constants';
import { fetchMultipleTokensDataProgressive, warmUpCache } from '@/utils/solanaData';
import { prefetchWalletData } from '@/utils/walletPrefetch';

export interface UseCryptoReturn {
  crypto: Stock[];
  filteredCrypto: Stock[];
  isLoading: boolean;
  searchQuery: string;
  sortBy: SortOption;
  stats: {
    totalAssets: number;
    gainers: number;
    losers: number;
    totalVolume: number;
  };
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  refreshData: () => void;
}

export const useCrypto = (): UseCryptoReturn => {
  const [crypto, setCrypto] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(DEFAULTS.SEARCH_QUERY);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULTS.SORT_BY);

  // Check if crypto has been initialized in this session
  const getSessionInitialized = () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('crypto_initialized') === 'true';
  };

  const setSessionInitialized = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('crypto_initialized', 'true');
    }
  };

  const [hasInitialized, setHasInitialized] = useState(getSessionInitialized);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAssets: 0,
    gainers: 0,
    losers: 0,
    totalVolume: 0
  });

  // Load crypto data from JSON file
  const cryptoAssetsData: Stock[] = cryptoData.crypto.map(asset => ({
    ...asset,
    price: 0,
    marketCap: 0,
    volume24h: 0,
    change24h: 0,
    isAvailable: asset.isAvailable ?? false
  }));

  // Initialize with static data to ensure we always have something to display
  useEffect(() => {
    // Set initial data from JSON, prioritizing available crypto
    const sortedCrypto = [...cryptoAssetsData].sort((a, b) => {
      // Available crypto first
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      // Then by name for consistency
      return a.name.localeCompare(b.name);
    });
    setCrypto(sortedCrypto);
  }, []);

  // Function to fetch live data with progressive loading
  const fetchLiveData = async () => {
    try {
      console.log('Fetching live data for crypto with progressive loading...');
      setIsLoading(true);
      setFetchError(null);

      // Get token addresses, prioritizing available crypto
      // This ensures the first 10 tokens (first 2 batches of 5) are the available crypto
      const availableCrypto = cryptoAssetsData.filter(asset => asset.isAvailable);
      const unavailableCrypto = cryptoAssetsData.filter(asset => !asset.isAvailable);

      // Fetch available crypto first, then unavailable crypto
      // This order is important for batch processing (batches of 5)
      const prioritizedTokenAddresses = [
        ...availableCrypto.map(asset => asset.solanaAddress),
        ...unavailableCrypto.map(asset => asset.solanaAddress)
      ];

      if (prioritizedTokenAddresses.length === 0) {
        throw new Error('No token addresses found');
      }

      // Log addresses for debugging
      console.log(`Found ${prioritizedTokenAddresses.length} crypto token addresses to fetch`);
      console.log(`Available crypto: ${availableCrypto.length}, Unavailable crypto: ${unavailableCrypto.length}`);
      console.log(`First ${Math.min(10, availableCrypto.length)} tokens (first 2 batches) will be available crypto: ${availableCrypto.map(c => c.symbol).join(', ')}`);

      // Use progressive loading function that updates crypto as data becomes available
      await fetchMultipleTokensDataProgressive(prioritizedTokenAddresses, (updatedCrypto) => {
        // Maintain the priority order when updating
        const sortedUpdatedCrypto = updatedCrypto.sort((a, b) => {
          // Available crypto first
          if (a.isAvailable && !b.isAvailable) return -1;
          if (!a.isAvailable && b.isAvailable) return 1;
          // Then by name for consistency
          return a.name.localeCompare(b.name);
        });
        setCrypto(sortedUpdatedCrypto);
      }, 'crypto'); // Pass 'crypto' as data source

      setFetchError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching live crypto data:', errorMessage);
      setFetchError(`Failed to fetch live data: ${errorMessage}`);
      // Ensure we have data to display even if fetch fails
      if (crypto.length === 0) {
        const sortedCrypto = [...cryptoAssetsData].sort((a, b) => {
          if (a.isAvailable && !b.isAvailable) return -1;
          if (!a.isAvailable && b.isAvailable) return 1;
          return a.name.localeCompare(b.name);
        });
        setCrypto(sortedCrypto);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh data manually
  const refreshData = () => {
    console.log('Manual refresh triggered for crypto');
    fetchLiveData();
  };

  // Only fetch on initial session load with cache warming
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      setSessionInitialized();

      // First, try to warm up cache with all token addresses
      const availableCrypto = cryptoAssetsData.filter(asset => asset.isAvailable);
      const unavailableCrypto = cryptoAssetsData.filter(asset => !asset.isAvailable);
      const prioritizedTokenAddresses = [
        ...availableCrypto.map(asset => asset.solanaAddress),
        ...unavailableCrypto.map(asset => asset.solanaAddress)
      ];
      warmUpCache(prioritizedTokenAddresses).then(() => {
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
      fetchLiveData();
    }
  }, [hasInitialized]);

  // Calculate stats when crypto is updated
  useEffect(() => {
    if (crypto.length > 0) {
      const totalAssets = crypto.length;
      const gainers = crypto.filter(c => (c.change24h ?? 0) > 0).length;
      const losers = crypto.filter(c => (c.change24h ?? 0) < 0).length;
      const totalVolume = crypto.reduce((acc, c) => acc + (c.volume24h ?? 0), 0);

      setStats({
        totalAssets,
        gainers,
        losers,
        totalVolume
      });
    }
  }, [crypto]);

  // Filter and sort crypto
  const filteredCrypto = useMemo(() => {
    let filtered = crypto.filter(asset =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort crypto - always prioritize available crypto first
    filtered.sort((a, b) => {
      // First, prioritize available crypto
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;

      // Then apply the selected sort criteria
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'marketCap':
          return (b.marketCap ?? 0) - (a.marketCap ?? 0);
        case 'price':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'change24h':
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
  }, [crypto, searchQuery, sortBy]);

  return {
    crypto,
    filteredCrypto,
    isLoading,
    searchQuery,
    sortBy,
    stats,
    setSearchQuery: (query: string) => setSearchQuery(query),
    setSortBy: (sort: SortOption) => setSortBy(sort),
    refreshData
  };
};
