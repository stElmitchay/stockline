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

// Rate limiting
let lastJupiterCall = 0;
const JUPITER_RATE_LIMIT = 100; // 100ms between calls

/**
 * Fetch token data from Jupiter API v3 via our proxy
 */
async function fetchFromJupiter(tokenAddress: string): Promise<any> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastJupiterCall;
  if (timeSinceLastCall < JUPITER_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, JUPITER_RATE_LIMIT - timeSinceLastCall));
  }
  lastJupiterCall = Date.now();

  try {
    const response = await fetch(`/api/jupiter?ids=${tokenAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.warn(`Jupiter API failed for ${tokenAddress}:`, error);
    throw error;
  }
}

/**
 * Fetch token data with Jupiter only
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
    
    console.log(`Fetching price from Jupiter API for ${tokenAddress}`);
    const jupiterData = await fetchFromJupiter(tokenAddress);
    
    // Handle Jupiter API v3 response format
    let tokenInfo = null;
    let price = null;
    let change24h = null;
    
    // Jupiter v3 format: { "TOKEN_ADDRESS": { "usdPrice": number, "priceChange24h": number } }
    if (jupiterData[tokenAddress]) {
      tokenInfo = jupiterData[tokenAddress];
      price = tokenInfo?.usdPrice;
      change24h = tokenInfo?.priceChange24h;
    }
    
    if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
      console.log(`Jupiter API success for ${tokenAddress}: $${price.toFixed(4)}`);
      
      // Jupiter v3 provides price and 24h change, estimate other metrics
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
    
    // Fetch uncached tokens
    if (tokensToFetch.length > 0) {
      // Try batch fetch from Jupiter v3 via our proxy
      try {
        console.log(`Batch fetching ${tokensToFetch.length} tokens from Jupiter v3 via proxy`);
        
        const jupiterData = await fetch(`/api/jupiter?ids=${tokensToFetch.join(',')}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }).then(res => res.json());
        
        for (const address of tokensToFetch) {
          // Handle Jupiter API v3 response format
          let tokenInfo = null;
          let price = null;
          let change24h = null;
          
          // Jupiter v3 format: { "TOKEN_ADDRESS": { "usdPrice": number, "priceChange24h": number } }
          if (jupiterData[address]) {
            tokenInfo = jupiterData[address];
            price = tokenInfo?.usdPrice;
            change24h = tokenInfo?.priceChange24h;
          }
          
          if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
            const tokenData = {
              price: Number(price.toFixed(8)),
              marketCap: Math.round(price * 1000000000),
              volume24h: Math.round(price * 10000000),
              change24h: change24h ? Number(change24h.toFixed(2)) : Number(((Math.random() - 0.5) * 10).toFixed(2))
            };
            
            tokenPriceCache.set(address, { ...tokenData, timestamp: now });
            dataMap.set(address, tokenData);
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
          }
        }
      } catch (batchError) {
        console.warn('Jupiter v3 batch fetch failed:', batchError);
        
        // Fallback to individual fetches
        for (const address of tokensToFetch) {
          try {
            const data = await fetchTokenData(address);
            dataMap.set(address, data);
          } catch (error) {
            console.error(`Failed to fetch ${address}:`, error);
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
    
    return dataMap;
  } catch (error) {
    console.error('Error fetching multiple token data:', error);
    // Return empty map instead of throwing
    return new Map();
  }
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