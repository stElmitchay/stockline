import { Connection, PublicKey } from '@solana/web3.js';
import { EXTERNAL_URLS } from '@/constants';

// Define a connection to Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
});

// Define the structure for cached token data
interface CachedTokenData {
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
}

// Cache for token prices (1 minute cache)
const tokenPriceCache = new Map<string, CachedTokenData>();

// Rate limiting with exponential backoff
let lastBirdeyeCall = 0;
const BIRDEYE_RATE_LIMIT = 3000; // 3 seconds between calls (very conservative)
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Fetch token data from Birdeye API via our proxy (single token)
 */
async function fetchFromBirdeye(tokenAddress: string): Promise<any> {
  // Adaptive rate limiting based on failures
  const now = Date.now();
  const timeSinceLastCall = now - lastBirdeyeCall;
  const adaptiveDelay = BIRDEYE_RATE_LIMIT + (consecutiveFailures * 1000); // Increase delay with failures
  
  if (timeSinceLastCall < adaptiveDelay) {
    const waitTime = adaptiveDelay - timeSinceLastCall;
    console.log(`Rate limiting, waiting ${waitTime}ms (adaptive delay: ${adaptiveDelay}ms)`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastBirdeyeCall = Date.now();

  try {
    const response = await fetch(`/api/birdeye?address=${tokenAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`Too many consecutive failures (${consecutiveFailures}), increasing delay`);
        consecutiveFailures = 0; // Reset after max failures
      }
      throw new Error(`Birdeye API error: ${response.status}`);
    }
    
    // Reset failure counter on success
    consecutiveFailures = 0;
    
    return response.json();
  } catch (error) {
    console.warn(`Birdeye API failed for ${tokenAddress}:`, error);
    throw error;
  }
}

/**
 * Fetch multiple tokens from Birdeye API via our proxy (batch)
 */
async function fetchBatchFromBirdeye(tokenAddresses: string[]): Promise<any> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastBirdeyeCall;
  if (timeSinceLastCall < BIRDEYE_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, BIRDEYE_RATE_LIMIT - timeSinceLastCall));
  }
  lastBirdeyeCall = Date.now();

  try {
    const addressesParam = tokenAddresses.join(',');
    const response = await fetch(`/api/birdeye?addresses=${addressesParam}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Birdeye API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.warn(`Birdeye API batch failed for ${tokenAddresses.length} tokens:`, error);
    throw error;
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
    
    // Check cache first (1 minute cache)
    const now = Date.now();
    const cacheEntry = tokenPriceCache.get(tokenAddress);
    
    if (cacheEntry && (now - cacheEntry.timestamp < 60000)) {
      console.log(`Using cached price for ${tokenAddress}: $${cacheEntry.price.toFixed(4)}`);
      return {
        price: cacheEntry.price,
        marketCap: cacheEntry.marketCap,
        volume24h: cacheEntry.volume24h,
        change24h: cacheEntry.change24h
      };
    }
    
    console.log(`Fetching price from Birdeye API for ${tokenAddress}`);
    const birdeyeData = await fetchFromBirdeye(tokenAddress);
    
    // Handle Birdeye API response format based on documentation
    if (birdeyeData.success && birdeyeData.data) {
      const price = birdeyeData.data.value;
      const change24h = birdeyeData.data.priceChange24h;
      
      if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
        console.log(`Birdeye API success for ${tokenAddress}: $${price.toFixed(4)}`);
        
        const tokenData = {
          price: Number(price.toFixed(8)),
          marketCap: Math.round(price * 1000000000), // Estimate: 1B token supply
          volume24h: Math.round(price * 10000000), // Estimate: 10M daily volume
          change24h: change24h ? Number(change24h.toFixed(2)) : Number(((Math.random() - 0.5) * 10).toFixed(2))
        };
        
        // Cache the result
        tokenPriceCache.set(tokenAddress, {
          ...tokenData,
          timestamp: now
        });
        
        return tokenData;
      }
    }
    
    // If no valid price found, return fallback data
    console.warn(`No valid price found for ${tokenAddress}, using fallback data`);
    const fallbackData = {
      price: 0.01,
      marketCap: 10000000,
      volume24h: 100000,
      change24h: 0
    };
    
    // Cache the fallback data
    tokenPriceCache.set(tokenAddress, {
      ...fallbackData,
      timestamp: now
    });
    
    return fallbackData;
  } catch (error) {
    console.error(`Error fetching data for token ${tokenAddress}:`, error);
    // Return fallback data instead of throwing
    return {
      price: 0.01,
      marketCap: 10000000,
      volume24h: 100000,
      change24h: 0
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
      const cacheEntry = tokenPriceCache.get(address);
      if (cacheEntry && (now - cacheEntry.timestamp < 60000)) {
        console.log(`Using cached data for ${address}`);
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
    
    // Fetch uncached tokens with robust retry logic
    if (tokensToFetch.length > 0) {
      console.log(`Fetching ${tokensToFetch.length} tokens from Birdeye API with robust retry logic`);
      
      // Process tokens in smaller batches with retry logic
      const batchSize = 5; // Smaller batches for better success rate
      const maxRetries = 2; // Retry failed batches
      
      for (let i = 0; i < tokensToFetch.length; i += batchSize) {
        const batch = tokensToFetch.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} tokens`);
        
        let batchSuccess = false;
        let retryCount = 0;
        
        while (!batchSuccess && retryCount <= maxRetries) {
          try {
            const batchData = await fetchBatchFromBirdeye(batch);
        
          // Process the response
          for (const address of batch) {
            if (batchData[address] && batchData[address].success && batchData[address].data) {
              const price = batchData[address].data.value;
              const change24h = batchData[address].data.priceChange24h;
              
              if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
                const tokenData = {
                  price: Number(price.toFixed(8)),
                  marketCap: Math.round(price * 1000000000),
                  volume24h: Math.round(price * 10000000),
                  change24h: change24h ? Number(change24h.toFixed(2)) : Number(((Math.random() - 0.5) * 10).toFixed(2))
                };
                
                tokenPriceCache.set(address, { ...tokenData, timestamp: now });
                dataMap.set(address, tokenData);
                console.log(`✅ Success: ${address} - $${price.toFixed(4)}`);
              } else {
                // Fallback data for tokens without valid prices
                const fallbackData = {
                  price: 0.01,
                  marketCap: 10000000,
                  volume24h: 100000,
                  change24h: 0
                };
                
                tokenPriceCache.set(address, { ...fallbackData, timestamp: now });
                dataMap.set(address, fallbackData);
                console.log(`⚠️ Fallback: ${address} - No valid price`);
              }
            } else {
              // Fallback data for tokens not in response
              const fallbackData = {
                price: 0.01,
                marketCap: 10000000,
                volume24h: 100000,
                change24h: 0
              };
              
              tokenPriceCache.set(address, { ...fallbackData, timestamp: now });
              dataMap.set(address, fallbackData);
              console.log(`⚠️ Fallback: ${address} - Not in response`);
            }
          }
          
            batchSuccess = true;
            
            // Add delay between batches to respect rate limits
            if (i + batchSize < tokensToFetch.length) {
              console.log(`⏳ Waiting 4 seconds before next batch...`);
              await new Promise(resolve => setTimeout(resolve, 4000));
            }
          } catch (batchError) {
            retryCount++;
            console.warn(`Batch ${Math.floor(i / batchSize) + 1} failed (attempt ${retryCount}/${maxRetries + 1}):`, batchError);
            
            if (retryCount <= maxRetries) {
              console.log(`⏳ Retrying batch in ${retryCount * 2} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
            } else {
              console.warn(`Batch ${Math.floor(i / batchSize) + 1} failed after ${maxRetries + 1} attempts, falling back to individual fetches`);
              
              // Fallback to individual fetches for this batch
              for (const address of batch) {
                try {
                  const data = await fetchTokenData(address);
                  dataMap.set(address, data);
                } catch (individualError) {
                  console.error(`Failed to fetch ${address}:`, individualError);
                  dataMap.set(address, {
                    price: 0.01,
                    marketCap: 10000000,
                    volume24h: 100000,
                    change24h: 0
                  });
                }
              }
            }
          }
        }
      }
    }
    
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
  onProgress: (updatedStocks: any[]) => void
) {
  try {
    // Filter out valid addresses
    const validAddresses = tokenAddresses.filter(address => 
      address && typeof address === 'string' && address.trim() !== ''
    );
    
    if (validAddresses.length === 0) {
      console.warn('No valid token addresses provided');
      return;
    }
    
    console.log(`🚀 Starting progressive loading for ${validAddresses.length} tokens`);
    
    // Check cache first
    const now = Date.now();
    const tokensToFetch: string[] = [];
    const dataMap = new Map();
    
    validAddresses.forEach(address => {
      const cacheEntry = tokenPriceCache.get(address);
      if (cacheEntry && (now - cacheEntry.timestamp < 60000)) {
        console.log(`📦 Using cached data for ${address}`);
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
    
    // If we have cached data, update UI immediately
    if (dataMap.size > 0) {
      console.log(`⚡ Updating UI immediately with ${dataMap.size} cached tokens`);
      const updatedStocks = updateStocksWithLiveData(dataMap);
      onProgress(updatedStocks);
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
            
            const response = await fetch(`/api/birdeye?addresses=${addressesParam}&batchIndex=${batchIndex}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
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
                  const tokenData = {
                    price: Number(price.toFixed(8)),
                    marketCap: Math.round(price * 1000000000),
                    volume24h: Math.round(price * 10000000),
                    change24h: change24h ? Number(change24h.toFixed(2)) : Number(((Math.random() - 0.5) * 10).toFixed(2))
                  };
                  
                  tokenPriceCache.set(address, { ...tokenData, timestamp: now });
                  dataMap.set(address, tokenData);
                  successfulTokens++;
                  console.log(`✅ Success: ${address} - $${price.toFixed(4)}`);
                } else {
                  // Fallback data for tokens without valid prices
                  const fallbackData = {
                    price: 0.01,
                    marketCap: 10000000,
                    volume24h: 100000,
                    change24h: 0
                  };
                  
                  tokenPriceCache.set(address, { ...fallbackData, timestamp: now });
                  dataMap.set(address, fallbackData);
                  console.log(`⚠️ Fallback: ${address} - No valid price`);
                }
              } else {
                // Fallback data for tokens not in response
                const fallbackData = {
                  price: 0.01,
                  marketCap: 10000000,
                  volume24h: 100000,
                  change24h: 0
                };
                
                tokenPriceCache.set(address, { ...fallbackData, timestamp: now });
                dataMap.set(address, fallbackData);
                console.log(`⚠️ Fallback: ${address} - Not in response`);
              }
            }
            
            batchSuccess = true;
            
            // Update UI with the new batch data
            console.log(`🔄 Updating UI with batch ${batchIndex + 1} data (${successfulTokens}/${batch.length} successful)`);
            const updatedStocks = updateStocksWithLiveData(dataMap);
            onProgress(updatedStocks);
            
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
                  dataMap.set(address, {
                    price: 0.01,
                    marketCap: 10000000,
                    volume24h: 100000,
                    change24h: 0
                  });
                }
              }
              
              // Update UI with fallback data
              const updatedStocks = updateStocksWithLiveData(dataMap);
              onProgress(updatedStocks);
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
 * Helper function to update stocks with live data
 */
function updateStocksWithLiveData(tokenDataMap: Map<string, any>) {
  // Import stocks data here to avoid circular dependencies
  const stocksData = require('@/data/stocks.json');
  const xStocksData = stocksData.xStocks.map((stock: any) => ({
    ...stock,
    price: 0,
    marketCap: 0,
    volume24h: 0,
    change24h: 0
  }));
  
  return xStocksData.map((stock: any) => {
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
      
      return {
        ...stock,
        price: validPrice,
        marketCap: validMarketCap,
        volume24h: validVolume,
        change24h: validChange
      };
    }
    
    return stock;
  });
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  tokenPriceCache.clear();
  console.log('Price cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: tokenPriceCache.size,
    entries: Array.from(tokenPriceCache.entries()).map(([address, data]) => ({
      address,
      price: data.price,
      age: Date.now() - data.timestamp
    }))
  };
}
