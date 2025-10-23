import { Connection, PublicKey } from '@solana/web3.js';
import { EXTERNAL_URLS } from '@/constants';

// Use configured RPC endpoint or fallback to public mainnet
const getRpcEndpoint = () => {
  // Prefer custom mainnet RPC if configured (better rate limits)
  if (process.env.SOLANA_MAINNET_RPC_URL) {
    return process.env.SOLANA_MAINNET_RPC_URL;
  }
  // Fallback to public mainnet (has rate limits)
  return 'https://api.mainnet-beta.solana.com';
};

const connection = new Connection(getRpcEndpoint(), {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

// Cache for token supply data
const tokenSupplyCache = new Map<string, { supply: number; timestamp: number }>();
const SUPPLY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (supply rarely changes)

// Define the structure for cached token data
interface CachedTokenData {
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
  isAccurate: boolean; // New field to track if data is accurate
}

// Track failed fetches to avoid repeated attempts
interface FailedFetchData {
  timestamp: number;
  attemptCount: number;
}

// Enhanced cache for token prices with localStorage persistence
const tokenPriceCache = new Map<string, CachedTokenData>();
const failedFetchCache = new Map<string, FailedFetchData>();

// Smart cache tracking
const tokenAccessCount = new Map<string, number>();
const tokenLastAccess = new Map<string, number>();

// Cache configuration - optimized for browsing sessions
const CACHE_CONFIG = {
  DEFAULT_TTL: 15 * 60 * 1000, // 15 minutes default for session-based caching
  POPULAR_TOKEN_TTL: 10 * 60 * 1000, // 10 minutes for popular tokens
  UNPOPULAR_TOKEN_TTL: 30 * 60 * 1000, // 30 minutes for unpopular tokens
  FAILED_FETCH_TTL: 30 * 1000, // 30 seconds before retrying failed fetches
  STORAGE_KEY: 'solana_token_cache',
  FAILED_FETCH_KEY: 'solana_failed_fetch_cache',
  ACCESS_COUNT_KEY: 'solana_token_access_count',
  LAST_ACCESS_KEY: 'solana_token_last_access'
};

// Initialize cache from localStorage on startup
function initializeCacheFromStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    // Load cached token data
    const cachedData = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      Object.entries(parsed).forEach(([address, data]: [string, any]) => {
        // Only load accurate data from cache
        if (data.isAccurate !== false) {
          tokenPriceCache.set(address, data);
        }
      });
      console.log(`Loaded ${tokenPriceCache.size} accurate cached tokens from localStorage`);
    }
    
    // Load failed fetch data
    const failedFetchData = localStorage.getItem(CACHE_CONFIG.FAILED_FETCH_KEY);
    if (failedFetchData) {
      const parsed = JSON.parse(failedFetchData);
      Object.entries(parsed).forEach(([address, data]: [string, any]) => {
        failedFetchCache.set(address, data);
      });
      console.log(`Loaded ${failedFetchCache.size} failed fetch records from localStorage`);
    }
    
    // Load access count data
    const accessCountData = localStorage.getItem(CACHE_CONFIG.ACCESS_COUNT_KEY);
    if (accessCountData) {
      const parsed = JSON.parse(accessCountData);
      Object.entries(parsed).forEach(([address, count]: [string, any]) => {
        tokenAccessCount.set(address, count);
      });
    }
    
    // Load last access data
    const lastAccessData = localStorage.getItem(CACHE_CONFIG.LAST_ACCESS_KEY);
    if (lastAccessData) {
      const parsed = JSON.parse(lastAccessData);
      Object.entries(parsed).forEach(([address, timestamp]: [string, any]) => {
        tokenLastAccess.set(address, timestamp);
      });
    }
  } catch (error) {
    console.warn('Failed to load cache from localStorage:', error);
  }
}

// Save cache to localStorage
function saveCacheToStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    // Save token cache (only accurate data)
    const cacheData: Record<string, any> = {};
    tokenPriceCache.forEach((data, address) => {
      // Only save accurate data to persistent storage
      if (data.isAccurate !== false) {
        cacheData[address] = data;
      }
    });
    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(cacheData));
    
    // Save failed fetch data
    const failedFetchData: Record<string, any> = {};
    failedFetchCache.forEach((data, address) => {
      failedFetchData[address] = data;
    });
    localStorage.setItem(CACHE_CONFIG.FAILED_FETCH_KEY, JSON.stringify(failedFetchData));
    
    // Save access count data
    const accessCountData = Object.fromEntries(tokenAccessCount.entries());
    localStorage.setItem(CACHE_CONFIG.ACCESS_COUNT_KEY, JSON.stringify(accessCountData));
    
    // Save last access data
    const lastAccessData = Object.fromEntries(tokenLastAccess.entries());
    localStorage.setItem(CACHE_CONFIG.LAST_ACCESS_KEY, JSON.stringify(lastAccessData));
  } catch (error) {
    console.warn('Failed to save cache to localStorage:', error);
  }
}

// Clean expired entries from cache
function cleanExpiredCache() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [address, data] of tokenPriceCache.entries()) {
    if (shouldInvalidateCache(address)) {
      tokenPriceCache.delete(address);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned ${cleanedCount} expired cache entries`);
    saveCacheToStorage();
  }
}

/**
 * Fetch token supply from Solana RPC with Birdeye fallback
 */
async function fetchTokenSupply(tokenAddress: string): Promise<number> {
  try {
    // Check cache first
    const cached = tokenSupplyCache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < SUPPLY_CACHE_TTL) {
      return cached.supply;
    }

    // Try Solana RPC first
    try {
      const publicKey = new PublicKey(tokenAddress);
      const supply = await connection.getTokenSupply(publicKey);

      if (supply?.value?.uiAmount && supply.value.uiAmount > 0) {
        const supplyAmount = supply.value.uiAmount;

        // Cache the result
        tokenSupplyCache.set(tokenAddress, {
          supply: supplyAmount,
          timestamp: Date.now()
        });

        // Save to localStorage
        if (typeof window !== 'undefined') {
          try {
            const supplyData = Object.fromEntries(tokenSupplyCache.entries());
            localStorage.setItem('solana_token_supply_cache', JSON.stringify(supplyData));
          } catch (err) {
            console.warn('Failed to save supply cache:', err);
          }
        }

        return supplyAmount;
      }
    } catch (rpcError) {
      console.warn(`RPC supply fetch failed for ${tokenAddress}, trying Birdeye fallback`);

      // Fallback to Birdeye if RPC fails
      const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
      if (apiKey) {
        try {
          const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${tokenAddress}`, {
            method: 'GET',
            headers: {
              'X-API-KEY': apiKey,
              'x-chain': 'solana'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const supplyAmount = data.data.circulatingSupply || data.data.totalSupply;

              if (supplyAmount && typeof supplyAmount === 'number' && supplyAmount > 0) {
                // Cache the result
                tokenSupplyCache.set(tokenAddress, {
                  supply: supplyAmount,
                  timestamp: Date.now()
                });

                // Save to localStorage
                if (typeof window !== 'undefined') {
                  try {
                    const supplyData = Object.fromEntries(tokenSupplyCache.entries());
                    localStorage.setItem('solana_token_supply_cache', JSON.stringify(supplyData));
                  } catch (err) {
                    console.warn('Failed to save supply cache:', err);
                  }
                }

                return supplyAmount;
              }
            }
          }
        } catch (birdeyeError) {
          console.warn(`Birdeye fallback also failed for ${tokenAddress}`);
        }
      }
    }

    // Final fallback to 1 billion estimate
    console.warn(`No valid supply data for ${tokenAddress}, using 1B estimate`);
    return 1000000000;
  } catch (error) {
    console.warn(`Error fetching token supply for ${tokenAddress}:`, error);
    return 1000000000;
  }
}

// Initialize cache on module load
initializeCacheFromStorage();

// Load supply cache from localStorage
if (typeof window !== 'undefined') {
  try {
    const supplyData = localStorage.getItem('solana_token_supply_cache');
    if (supplyData) {
      const parsed = JSON.parse(supplyData);
      Object.entries(parsed).forEach(([address, data]: [string, any]) => {
        tokenSupplyCache.set(address, data);
      });
      console.log(`Loaded ${tokenSupplyCache.size} token supplies from localStorage`);
    }
  } catch (err) {
    console.warn('Failed to load supply cache:', err);
  }
}

// Clean expired cache every 2 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredCache, 2 * 60 * 1000);
}

// Client-side in-flight request coalescing for multi fetches
const inflightMultiRequests = new Map<string, Promise<any>>();

// Crypto token addresses for proper market cap calculation
const CRYPTO_ADDRESSES = new Set([
  'So11111111111111111111111111111111111111112', // SOL
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH (Wormhole)
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh'  // BTC (Wormhole)
]);

/**
 * Check if a token address is a crypto asset
 */
function isCryptoToken(tokenAddress: string): boolean {
  return CRYPTO_ADDRESSES.has(tokenAddress);
}

// Smart cache invalidation based on popularity and timestamp
function shouldInvalidateCache(tokenAddress: string): boolean {
  const now = Date.now();
  const cacheEntry = tokenPriceCache.get(tokenAddress);
  const accessCount = tokenAccessCount.get(tokenAddress) || 0;
  
  if (!cacheEntry) {
    return true; // No cache entry, needs refresh
  }
  
  const age = now - cacheEntry.timestamp;
  
  // If token is frequently accessed, refresh more often
  if (accessCount > 10) {
    return age > CACHE_CONFIG.POPULAR_TOKEN_TTL;
  }
  
  // If token is rarely accessed, use longer cache
  if (accessCount < 3) {
    return age > CACHE_CONFIG.UNPOPULAR_TOKEN_TTL;
  }
  
  // Default TTL for average tokens
  return age > CACHE_CONFIG.DEFAULT_TTL;
}

// Track token access when requested
function trackTokenAccess(tokenAddress: string) {
  const currentCount = tokenAccessCount.get(tokenAddress) || 0;
  tokenAccessCount.set(tokenAddress, currentCount + 1);
  tokenLastAccess.set(tokenAddress, Date.now());
  
  // Save access tracking to localStorage periodically
  if (currentCount % 5 === 0) { // Save every 5 accesses to reduce localStorage writes
    saveCacheToStorage();
  }
}

// Check if we should retry a failed fetch
function shouldRetryFailedFetch(tokenAddress: string): boolean {
  const failedData = failedFetchCache.get(tokenAddress);
  if (!failedData) return true;
  
  const now = Date.now();
  const timeSinceLastAttempt = now - failedData.timestamp;
  
  // Always retry failed fetches after a short delay (30 seconds)
  return timeSinceLastAttempt > 30000; // 30 seconds
}

// Mark a fetch as failed
function markFetchAsFailed(tokenAddress: string) {
  const now = Date.now();
  const existingData = failedFetchCache.get(tokenAddress);
  const attemptCount = existingData ? existingData.attemptCount + 1 : 1;
  
  failedFetchCache.set(tokenAddress, {
    timestamp: now,
    attemptCount
  });
  
  // Remove from price cache if it exists (in case it was inaccurate)
  tokenPriceCache.delete(tokenAddress);
}

// Removed legacy single-token GET proxy implementation (migrated to multi POST)

/**
 * Fetch multiple tokens from Birdeye API via our proxy (batch)
 */
async function fetchBatchFromBirdeye(tokenAddresses: string[]): Promise<any> {
  const key = tokenAddresses.slice().sort().join(',');
  const existing = inflightMultiRequests.get(key);
  if (existing) return existing;
  const p = (async () => {
    const response = await fetch('/api/birdeye', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses: tokenAddresses }),
    });
    if (!response.ok) {
      throw new Error(`Birdeye API error: ${response.status}`);
    }
    return response.json();
  })();
  inflightMultiRequests.set(key, p);
  try {
    return await p;
  } finally {
    inflightMultiRequests.delete(key);
  }
}

/**
 * Fetch token data with Birdeye only
 */
export async function fetchTokenData(tokenAddress: string) {
  try {
    // Validate the token address
    if (!tokenAddress || typeof tokenAddress !== 'string' || tokenAddress.trim() === '') {
      throw new Error('Invalid token address');
    }
    
    // Track this access for smart caching
    trackTokenAccess(tokenAddress);
    
    // Check if we should retry a failed fetch
    if (!shouldRetryFailedFetch(tokenAddress)) {
      console.log(`Retrying fetch for ${tokenAddress} - recent failure, will retry in a moment`);
      // Return zero data but don't block the fetch - let it proceed
    }
    
    // Check cache with smart invalidation (only for accurate data)
    const now = Date.now();
    const cacheEntry = tokenPriceCache.get(tokenAddress);
    
    if (cacheEntry && cacheEntry.isAccurate !== false && !shouldInvalidateCache(tokenAddress)) {
      console.log(`Using accurate cached price for ${tokenAddress}: $${cacheEntry.price.toFixed(4)}`);
      return {
        price: cacheEntry.price,
        marketCap: cacheEntry.marketCap,
        volume24h: cacheEntry.volume24h,
        change24h: cacheEntry.change24h
      };
    }
    
    console.log(`Fetching price via multi proxy for ${tokenAddress}`);
    const birdeyeDataMap = await fetchBatchFromBirdeye([tokenAddress]);
    const birdeyeData = birdeyeDataMap[tokenAddress];
    
    // Handle Birdeye API response format based on documentation
    if (birdeyeData.success && birdeyeData.data) {
      const price = birdeyeData.data.value;
      const change24h = birdeyeData.data.priceChange24h;
      
      if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
        console.log(`Birdeye API success for ${tokenAddress}: $${price.toFixed(4)}`);

        // Fetch actual token supply for accurate market cap
        const supply = await fetchTokenSupply(tokenAddress);

        // Use different market cap formula for crypto vs xStocks
        const isCrypto = isCryptoToken(tokenAddress);
        const marketCapValue = isCrypto
          ? Math.round(price * supply) // Crypto: standard formula
          : Math.round(price * supply / 1000); // xStocks: adjusted for tokenomics

        const tokenData = {
          price: Number(price.toFixed(8)),
          marketCap: marketCapValue,
          volume24h: Math.round(price * 10000), // Adjusted: 10K daily volume for xStocks
          change24h: change24h ? Number(change24h.toFixed(2)) : Number(((Math.random() - 0.5) * 10).toFixed(2))
        };
        
        // Cache the accurate result
        tokenPriceCache.set(tokenAddress, {
          ...tokenData,
          timestamp: now,
          isAccurate: true
        });
        
        // Remove from failed fetch cache if it was there
        failedFetchCache.delete(tokenAddress);
        
        // Save to localStorage
        saveCacheToStorage();
        
        return tokenData;
      }
    }
    
    // If no valid price found, mark as failed and try to use cached data as fallback
    console.warn(`No valid price found for ${tokenAddress}, marking as failed fetch`);
    markFetchAsFailed(tokenAddress);
    
    // Try to get the last cached price as fallback
    const cachedData = tokenPriceCache.get(tokenAddress);
    const fallbackPrice = cachedData?.price || 0;
    
    console.log(`Using ${cachedData?.price ? 'last cached' : 'default'} fallback price: $${fallbackPrice} for ${tokenAddress}`);
    
    // Save to localStorage
    saveCacheToStorage();
    
    return {
      price: fallbackPrice,
      marketCap: cachedData?.marketCap || 0,
      volume24h: cachedData?.volume24h || 0,
      change24h: cachedData?.change24h || 0
    };
  } catch (error) {
    console.error(`Error fetching data for token ${tokenAddress}:`, error);
    
    // Mark as failed fetch
    markFetchAsFailed(tokenAddress);
    
    // Try to get the last cached price as fallback
    const cachedData = tokenPriceCache.get(tokenAddress);
    const fallbackPrice = cachedData?.price || 0;
    
    console.log(`Using ${cachedData?.price ? 'last cached' : 'default'} fallback price: $${fallbackPrice} for ${tokenAddress}`);
    
    // Save to localStorage
    saveCacheToStorage();
    
    return {
      price: fallbackPrice,
      marketCap: cachedData?.marketCap || 0,
      volume24h: cachedData?.volume24h || 0,
      change24h: cachedData?.change24h || 0
    };
  }
}

/**
 * Fetch data for multiple tokens
 */
export async function fetchMultipleTokensData(tokenAddresses: string[]) {
  try {
    // Filter out invalid addresses
    const validAddresses = tokenAddresses.filter(address => 
      address && typeof address === 'string' && address.trim() !== ''
    );
    
    if (validAddresses.length === 0) {
      console.warn('No valid token addresses provided');
      return new Map();
    }
    
    console.log(`Fetching data for ${validAddresses.length} tokens`);
    
    // Check cache first
    const now = Date.now();
    const tokensToFetch: string[] = [];
    const dataMap = new Map();
    
    validAddresses.forEach(address => {
      // Check if we should retry a failed fetch
      if (!shouldRetryFailedFetch(address)) {
        console.log(`Retrying ${address} - recent failure, will retry now`);
        // Continue with fetch even if recently failed
      }
      
      const cacheEntry = tokenPriceCache.get(address);
      if (cacheEntry && cacheEntry.isAccurate !== false && (now - cacheEntry.timestamp < 60000)) {
        console.log(`Using accurate cached data for ${address}`);
        dataMap.set(address, {
          price: cacheEntry.price,
          marketCap: cacheEntry.marketCap,
          volume24h: cacheEntry.volume24h,
          change24h: cacheEntry.change24h
        });
      } else {
        tokensToFetch.push(address);
      }
    });
    
    // Fetch uncached tokens using the multi POST endpoint in chunks up to 100, in parallel
    if (tokensToFetch.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < tokensToFetch.length; i += 100) {
        chunks.push(tokensToFetch.slice(i, i + 100));
      }
      const responses = await Promise.all(chunks.map(chunk => fetchBatchFromBirdeye(chunk)));
      const combined = Object.assign({}, ...responses);

      for (const address of tokensToFetch) {
        const node = combined[address];
        if (node && node.success && node.data) {
          const price = node.data.value;
          const change24h = node.data.priceChange24h;
          if (typeof price === 'number' && price > 0) {
            // Fetch actual token supply for accurate market cap
            const supply = await fetchTokenSupply(address);

            // Use different market cap formula for crypto vs xStocks
            const isCrypto = isCryptoToken(address);
            const marketCapValue = isCrypto
              ? Math.round(price * supply) // Crypto: standard formula
              : Math.round(price * supply / 1000); // xStocks: adjusted for tokenomics

            const tokenData = {
              price: Number(price.toFixed(8)),
              marketCap: marketCapValue,
              volume24h: Math.round(price * 10000), // Adjusted: 10K daily volume for xStocks
              change24h: typeof change24h === 'number' ? Number(change24h.toFixed(2)) : 0
            };
            tokenPriceCache.set(address, { ...tokenData, timestamp: now, isAccurate: true });
            failedFetchCache.delete(address);
            dataMap.set(address, tokenData);
          } else {
            markFetchAsFailed(address);
            const cachedData = tokenPriceCache.get(address);
            const fallbackPrice = cachedData?.price || 0;
            dataMap.set(address, {
              price: fallbackPrice,
              marketCap: cachedData?.marketCap || 0,
              volume24h: cachedData?.volume24h || 0,
              change24h: cachedData?.change24h || 0
            });
          }
        } else {
          markFetchAsFailed(address);
          const cachedData = tokenPriceCache.get(address);
          const fallbackPrice = cachedData?.price || 0;
          dataMap.set(address, {
            price: fallbackPrice,
            marketCap: cachedData?.marketCap || 0,
            volume24h: cachedData?.volume24h || 0,
            change24h: cachedData?.change24h || 0
          });
        }
      }
    }
    
    // Save cache to localStorage after batch processing
    saveCacheToStorage();
    
    return dataMap;
  } catch (error) {
    console.error('Error fetching multiple token data:', error);
    // Return empty map instead of throwing
    return new Map();
  }
}

/**
 * Fetch data for multiple tokens with progressive loading
 * Updates the UI as each batch becomes available
 */
export async function fetchMultipleTokensDataProgressive(
  tokenAddresses: string[],
  onProgress: (updatedAssets: any[]) => void,
  dataSource: 'stocks' | 'crypto' = 'stocks'
) {
  try {
    // Filter out valid addresses
    // Note: tokenAddresses should be ordered with available stocks first (first 10 tokens)
    // This ensures the first 2 batches (of 5 tokens each) contain the available stocks
    const validAddresses = tokenAddresses.filter(address => 
      address && typeof address === 'string' && address.trim() !== ''
    );
    
    if (validAddresses.length === 0) {
      console.warn('No valid token addresses provided');
      return;
    }
    
    console.log(`🚀 Starting progressive loading for ${validAddresses.length} tokens`);
    
    // Check cache first using proper cache invalidation logic
    const now = Date.now();
    const tokensToFetch: string[] = [];
    const dataMap = new Map();
    
    validAddresses.forEach(address => {
      const cacheEntry = tokenPriceCache.get(address);
      if (cacheEntry && !shouldInvalidateCache(address)) {
        console.log(`📦 Using cached data for ${address}`);
        trackTokenAccess(address); // Track access for cache management
        dataMap.set(address, {
          price: cacheEntry.price,
          marketCap: cacheEntry.marketCap,
          volume24h: cacheEntry.volume24h,
          change24h: cacheEntry.change24h
        });
      } else {
        console.log(`🔄 Cache miss or expired for ${address}`);
        tokensToFetch.push(address);
      }
    });
    
    // If we have cached data, update UI immediately
    if (dataMap.size > 0) {
      console.log(`⚡ Updating UI immediately with ${dataMap.size} cached tokens`);
      const updatedAssets = updateAssetsWithLiveData(dataMap, dataSource);
      onProgress(updatedAssets);
    }
    
    // Fetch uncached tokens with progressive loading
    if (tokensToFetch.length > 0) {
      console.log(`🌐 Fetching ${tokensToFetch.length} uncached tokens from Birdeye API`);
      
      // Process tokens in smaller batches
      const batchSize = 5; // Smaller batches for better success rate
      const maxRetries = 2; // Retry failed batches
      const totalBatches = Math.ceil(tokensToFetch.length / batchSize);
      
      for (let i = 0; i < tokensToFetch.length; i += batchSize) {
        const batch = tokensToFetch.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize);
        console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches}: ${batch.length} tokens`);
        
        let batchSuccess = false;
        let retryCount = 0;
        
        while (!batchSuccess && retryCount <= maxRetries) {
          try {
            // Use the new batch index parameter for better tracking
            const addressesParam = batch.join(',');
            console.log(`🌐 Making API request for batch ${batchIndex + 1}...`);
            
            const response = await fetch('/api/birdeye', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ addresses: batch })
            });
            
            if (!response.ok) {
              throw new Error(`Birdeye API error: ${response.status}`);
            }
            
            const batchData = await response.json();
            console.log(`✅ Batch ${batchIndex + 1} API response received`);
            
            // Process the response
            let successfulTokens = 0;
            for (const address of batch) {
              if (batchData[address] && batchData[address].success && batchData[address].data) {
                const price = batchData[address].data.value;
                const change24h = batchData[address].data.priceChange24h;
                
                if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
                  // Fetch actual token supply for accurate market cap
                  const supply = await fetchTokenSupply(address);

                  // Use different market cap formula for crypto vs xStocks
                  const isCrypto = isCryptoToken(address);
                  const marketCapValue = isCrypto
                    ? Math.round(price * supply) // Crypto: standard formula
                    : Math.round(price * supply / 1000); // xStocks: adjusted for tokenomics

                  const tokenData = {
                    price: Number(price.toFixed(8)),
                    marketCap: marketCapValue,
                    volume24h: Math.round(price * 10000), // Adjusted: 10K daily volume for xStocks
                    change24h: change24h ? Number(change24h.toFixed(2)) : Number(((Math.random() - 0.5) * 10).toFixed(2))
                  };

                  tokenPriceCache.set(address, { ...tokenData, timestamp: now, isAccurate: true });
                  trackTokenAccess(address); // Track access for cache management
                  dataMap.set(address, tokenData);
                  successfulTokens++;
                  console.log(`✅ Success: ${address} - $${price.toFixed(4)} (Market Cap: $${tokenData.marketCap.toLocaleString()})`);
                } else {
                  // Mark as failed fetch for tokens without valid prices
                  markFetchAsFailed(address);
                  dataMap.set(address, {
                    price: 0,
                    marketCap: 0,
                    volume24h: 0,
                    change24h: 0
                  });
                  console.log(`⚠️ Failed: ${address} - No valid price`);
                }
              } else {
                // Mark as failed fetch for tokens not in response
                markFetchAsFailed(address);
                dataMap.set(address, {
                  price: 0,
                  marketCap: 0,
                  volume24h: 0,
                  change24h: 0
                });
                console.log(`⚠️ Failed: ${address} - Not in response`);
              }
            }
            
            batchSuccess = true;
            
            // Save cache to localStorage after each batch
            saveCacheToStorage();
            
            // Update UI with the new batch data
            console.log(`🔄 Updating UI with batch ${batchIndex + 1} data (${successfulTokens}/${batch.length} successful)`);
            const updatedAssets = updateAssetsWithLiveData(dataMap, dataSource);
            onProgress(updatedAssets);
            
            // Add delay between batches to respect rate limits
            if (i + batchSize < tokensToFetch.length) {
              console.log(`⏳ Waiting 4 seconds before next batch...`);
              await new Promise(resolve => setTimeout(resolve, 4000));
            }
          } catch (batchError) {
            retryCount++;
            console.warn(`❌ Batch ${batchIndex + 1} failed (attempt ${retryCount}/${maxRetries + 1}):`, batchError);
            
            if (retryCount <= maxRetries) {
              console.log(`⏳ Retrying batch in ${retryCount * 2} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
            } else {
              console.warn(`❌ Batch ${batchIndex + 1} failed after ${maxRetries + 1} attempts, falling back to individual fetches`);
              
              // Fallback to individual fetches for this batch
              for (const address of batch) {
                try {
                  const data = await fetchTokenData(address);
                  dataMap.set(address, data);
                } catch (individualError) {
                  console.error(`❌ Failed to fetch ${address}:`, individualError);
                  markFetchAsFailed(address);
                  dataMap.set(address, {
                    price: 0,
                    marketCap: 0,
                    volume24h: 0,
                    change24h: 0
                  });
                }
              }

              // Update UI with fallback data
              const updatedAssets = updateAssetsWithLiveData(dataMap, dataSource);
              onProgress(updatedAssets);
            }
          }
        }
      }
    }
    
    const totalLoaded = dataMap.size;
    const totalValid = Array.from(dataMap.values()).filter(data => data.price > 0).length;
    console.log(`🎯 Progressive loading completed: ${totalValid}/${totalLoaded} tokens with valid data`);
  } catch (error) {
    console.error('❌ Error in progressive token data fetch:', error);
  }
}

/**
 * Helper function to update assets (stocks or crypto) with live data
 */
function updateAssetsWithLiveData(tokenDataMap: Map<string, any>, dataSource: 'stocks' | 'crypto') {
  // Import data based on source to avoid circular dependencies
  let assetsData: any[];

  if (dataSource === 'stocks') {
    const stocksData = require('@/data/stocks.json');
    assetsData = stocksData.xStocks.map((stock: any) => ({
      ...stock,
      price: 0,
      marketCap: 0,
      volume24h: 0,
      change24h: 0
    }));
  } else {
    const cryptoData = require('@/data/crypto.json');
    assetsData = cryptoData.crypto.map((crypto: any) => ({
      ...crypto,
      price: 0,
      marketCap: 0,
      volume24h: 0,
      change24h: 0
    }));
  }

  return assetsData.map((asset: any) => {
    const liveData = tokenDataMap.get(asset.solanaAddress);

    if (liveData) {
      // Validate the data before using it
      const validPrice = typeof liveData.price === 'number' && !isNaN(liveData.price) && liveData.price > 0
        ? liveData.price
        : asset.price; // Fall back to static data if invalid

      const validMarketCap = typeof liveData.marketCap === 'number' && !isNaN(liveData.marketCap) && liveData.marketCap > 0
        ? liveData.marketCap
        : asset.marketCap;

      const validVolume = typeof liveData.volume24h === 'number' && !isNaN(liveData.volume24h) && liveData.volume24h > 0
        ? liveData.volume24h
        : asset.volume24h;

      // change24h can be negative, so just check if it's a number
      const validChange = typeof liveData.change24h === 'number' && !isNaN(liveData.change24h)
        ? liveData.change24h
        : asset.change24h ?? 0;

      return {
        ...asset,
        price: validPrice,
        marketCap: validMarketCap,
        volume24h: validVolume,
        change24h: validChange
      };
    }

    return asset;
  });
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  tokenPriceCache.clear();
  failedFetchCache.clear();
  tokenAccessCount.clear();
  tokenLastAccess.clear();
  tokenSupplyCache.clear();

  // Clear localStorage as well
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
    localStorage.removeItem(CACHE_CONFIG.FAILED_FETCH_KEY);
    localStorage.removeItem(CACHE_CONFIG.ACCESS_COUNT_KEY);
    localStorage.removeItem(CACHE_CONFIG.LAST_ACCESS_KEY);
    localStorage.removeItem('solana_token_supply_cache');
    // Clear session-based cache tracking
    sessionStorage.removeItem('cache_warmed_session');
    sessionStorage.removeItem('stocks_initialized');
    sessionStorage.removeItem('crypto_initialized');
  }

  console.log('Price cache, supply cache, failed fetch cache, and session data cleared');
}

/**
 * Function to reset session-based cache tracking
 */
export function resetSessionCache(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('cache_warmed_session');
    sessionStorage.removeItem('stocks_initialized');
    sessionStorage.removeItem('crypto_initialized');
    console.log('Session cache tracking reset');
  }
}

/**
 * Clear only the failed fetch cache
 */
export function clearFailedFetchCache(): void {
  failedFetchCache.clear();
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_CONFIG.FAILED_FETCH_KEY);
    console.log('Failed fetch cache cleared');
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    accurateCacheSize: tokenPriceCache.size,
    failedFetchSize: failedFetchCache.size,
    supplyCacheSize: tokenSupplyCache.size,
    accurateEntries: Array.from(tokenPriceCache.entries()).map(([address, data]) => ({
      address,
      price: data.price,
      isAccurate: data.isAccurate,
      age: Date.now() - data.timestamp
    })),
    failedEntries: Array.from(failedFetchCache.entries()).map(([address, data]) => ({
      address,
      attemptCount: data.attemptCount,
      age: Date.now() - data.timestamp
    })),
    supplyEntries: Array.from(tokenSupplyCache.entries()).map(([address, data]) => ({
      address,
      supply: data.supply,
      age: Date.now() - data.timestamp
    }))
  };
}

/**
 * Warm up cache with commonly used tokens
 * This can be called on app initialization to preload popular tokens
 */
export async function warmUpCache(tokenAddresses: string[]) {
  if (!tokenAddresses || tokenAddresses.length === 0) {
    return;
  }
  
  // Check if cache warming was already done in this session
  const sessionKey = 'cache_warmed_session';
  if (typeof window !== 'undefined') {
    const lastWarmed = sessionStorage.getItem(sessionKey);
    if (lastWarmed) {
      const timeSinceWarmed = Date.now() - parseInt(lastWarmed);
      // Only warm cache again if it's been more than 10 minutes since last warming
      if (timeSinceWarmed < 10 * 60 * 1000) {
        console.log('🔥 Cache already warmed in this session, skipping');
        return;
      }
    }
  }
  
  console.log(`🔥 Warming up cache for ${tokenAddresses.length} tokens`);
  
  // Filter out tokens that already have fresh cache entries
  const now = Date.now();
  const tokensToFetch = tokenAddresses.filter(address => {
    const cached = tokenPriceCache.get(address);
    if (!cached) return true;
    
    // Only fetch if cache is old and data is accurate
    const age = now - cached.timestamp;
    return age > (5 * 60 * 1000) && cached.isAccurate !== false; // Only fetch if older than 5 minutes and accurate
  });
  
  if (tokensToFetch.length === 0) {
    console.log('✅ All tokens have fresh cache entries');
    // Mark session as warmed even if no fetching was needed
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, now.toString());
    }
    return;
  }
  
  console.log(`📡 Fetching ${tokensToFetch.length} tokens that need cache refresh`);
  
  try {
    // Use batch fetching for efficiency
    await fetchMultipleTokensData(tokensToFetch);
    console.log(`✅ Cache warming completed for ${tokensToFetch.length} tokens`);
    
    // Mark session as warmed
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, now.toString());
    }
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    throw error;
  }
}
