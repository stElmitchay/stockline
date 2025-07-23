import { Connection, PublicKey } from '@solana/web3.js';
import { EXTERNAL_URLS } from '@/constants';

// Define a connection to Solana mainnet with better reliability options
// For demo purposes, we'll use a more reliable endpoint
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

// Cache for token prices to ensure consistency between refreshes
const tokenPriceCache = new Map<string, CachedTokenData>();

/**
 * Fetch token data from Solana blockchain
 * This is a simplified implementation - in a real-world scenario,
 * you would need to implement proper token price oracles or use a price feed service
 */
export async function fetchTokenData(tokenAddress: string) {
  try {
    // Validate the token address
    if (!tokenAddress || typeof tokenAddress !== 'string' || tokenAddress.trim() === '') {
      throw new Error('Invalid token address');
    }
    
    // Check if we already have a cached price for this token (cache for 1 minute)
    const now = Date.now();
    const cacheEntry = tokenPriceCache.get(tokenAddress);
    
    if (cacheEntry && (now - cacheEntry.timestamp < 60000)) {
      console.log(`Using cached price for ${tokenAddress}: ${cacheEntry.price.toFixed(2)}`);
      return {
        price: cacheEntry.price,
        marketCap: cacheEntry.marketCap,
        volume24h: cacheEntry.volume24h,
        change24h: cacheEntry.change24h
      };
    }
    
    // Fetch real price from Jupiter API
    console.log(`Fetching real price from Jupiter API for ${tokenAddress}`);
    const priceResponse = await fetch(`https://price.jup.ag/v4/price?ids=${tokenAddress}`);
    const priceData = await priceResponse.json();
    
    // Extract price from Jupiter API response
    let price = priceData.data?.[tokenAddress]?.price;
    
    // Validate the price
    if (!price || typeof price !== 'number' || isNaN(price) || price <= 0) {
      console.warn(`Invalid or missing price from Jupiter API for ${tokenAddress}, using fallback`);
      // Fall back to simulation if Jupiter API doesn't have the price
      price = simulatePrice(tokenAddress);
    } else {
      console.log(`Got real price for ${tokenAddress}: ${price.toFixed(2)}`);
    }
    
    // Calculate other metrics based on the price
    const marketCap = simulateMarketCap(price);
    const volume24h = simulateVolume(price, marketCap);
    const change24h = simulateChange();
    
    // Ensure we're returning valid numbers
    const result = {
      price: Number(price.toFixed(2)),
      marketCap: Math.round(marketCap),
      volume24h: Math.round(volume24h),
      change24h: Number(change24h.toFixed(2))
    };
    
    // Cache the result with timestamp
    tokenPriceCache.set(tokenAddress, {
      ...result,
      timestamp: now
    });
    
    return result;
  } catch (error) {
    console.error(`Error fetching data for token ${tokenAddress}:`, error);
    // Return fallback data with static price instead of 0
    // Use a deterministic approach based on the address to ensure consistency
    const addressSum = tokenAddress.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const basePrice = 100 + (addressSum % 400); // Range: 100-500
    
    return {
      price: basePrice,
      marketCap: basePrice * 10000000,
      volume24h: basePrice * 1000000,
      change24h: ((addressSum % 10) - 5) // Range: -5 to +5
    };
  }
}

/**
 * Fetch data for multiple tokens in parallel
 */
export async function fetchMultipleTokensData(tokenAddresses: string[]) {
  try {
    // Filter out any invalid addresses
    const validAddresses = tokenAddresses.filter(address => 
      address && typeof address === 'string' && address.trim() !== ''
    );
    
    if (validAddresses.length === 0) {
      console.warn('No valid token addresses provided');
      return new Map();
    }
    
    console.log(`Fetching data for ${validAddresses.length} tokens`);
    
    // Check which tokens we need to fetch (not in cache or cache expired)
    const now = Date.now();
    const tokensToFetch: string[] = [];
    const dataMap = new Map();
    
    // First check cache and identify which tokens need fresh data
    validAddresses.forEach(address => {
      const cacheEntry = tokenPriceCache.get(address);
      if (cacheEntry && (now - cacheEntry.timestamp < 60000)) {
        // Use cached data if it's less than 1 minute old
        console.log(`Using cached data for ${address}`);
        dataMap.set(address, {
          price: cacheEntry.price,
          marketCap: cacheEntry.marketCap,
          volume24h: cacheEntry.volume24h,
          change24h: cacheEntry.change24h
        });
      } else {
        // Need to fetch fresh data
        tokensToFetch.push(address);
      }
    });
    
    // If we have tokens that need fresh data, fetch them in a batch
    if (tokensToFetch.length > 0) {
      try {
        console.log(`Fetching prices for ${tokensToFetch.length} tokens from Jupiter API`);
        // Batch fetch prices from Jupiter API
        const priceResponse = await fetch(`https://price.jup.ag/v4/price?ids=${tokensToFetch.join(',')}`);
        const priceData = await priceResponse.json();
        
        // Process each token that needed fresh data
        for (const address of tokensToFetch) {
          // Extract price from Jupiter API response
          const price = priceData.data?.[address]?.price;
          
          if (price && typeof price === 'number' && !isNaN(price) && price > 0) {
            // We got a valid price from Jupiter API
            console.log(`Got real price for ${address}: ${price.toFixed(2)}`);
            
            // Calculate other metrics based on the price
            const marketCap = simulateMarketCap(price);
            const volume24h = simulateVolume(price, marketCap);
            const change24h = simulateChange();
            
            const result = {
              price: Number(price.toFixed(2)),
              marketCap: Math.round(marketCap),
              volume24h: Math.round(volume24h),
              change24h: Number(change24h.toFixed(2))
            };
            
            // Cache the result
            tokenPriceCache.set(address, {
              ...result,
              timestamp: now
            });
            
            // Add to our result map
            dataMap.set(address, result);
          } else {
            // Jupiter API didn't have a valid price, fall back to simulation
            console.warn(`No valid price from Jupiter API for ${address}, using fallback`);
            const fallbackData = await fetchTokenData(address); // This will use simulation
            dataMap.set(address, fallbackData);
          }
        }
      } catch (batchError) {
        console.error('Error batch fetching prices from Jupiter API:', batchError);
        // If batch fetch fails, fall back to individual fetches
        console.log('Falling back to individual token fetches');
        const promises = tokensToFetch.map(address => fetchTokenData(address));
        const results = await Promise.allSettled(promises);
        
        tokensToFetch.forEach((address, index) => {
          const result = results[index];
          if (result.status === 'fulfilled') {
            dataMap.set(address, result.value);
          } else {
            // Use fallback for failed fetches
            console.warn(`Failed to fetch data for ${address}`);
            const addressSum = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const basePrice = 100 + (addressSum % 400); // Range: 100-500
            
            const fallbackData = {
              price: basePrice,
              marketCap: basePrice * 10000000,
              volume24h: basePrice * 1000000,
              change24h: ((addressSum % 10) - 5) // Range: -5 to +5
            };
            
            dataMap.set(address, fallbackData);
          }
        });
      }
    }
    
    // Double-check that all entries have valid prices
    for (const [address, data] of dataMap.entries()) {
      if (!data || typeof data.price !== 'number' || isNaN(data.price) || data.price <= 0) {
        console.warn(`Still invalid price for ${address}, forcing fallback`);
        // Last resort fallback with fixed values
        const fallbackData = {
          price: 250,
          marketCap: 2500000000,
          volume24h: 250000000,
          change24h: 2.5
        };
        
        dataMap.set(address, fallbackData);
        
        // Also update cache with fallback
        tokenPriceCache.set(address, {
          ...fallbackData,
          timestamp: now
        });
      }
    }
    
    return dataMap;
  } catch (error: unknown) {
    // Properly handle unknown type error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching multiple token data:', errorMessage);
    // Create a map with deterministic fallback data for all addresses
    const fallbackMap = new Map();
    tokenAddresses.forEach(address => {
      const addressSum = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const basePrice = 100 + (addressSum % 400); // Range: 100-500
      
      fallbackMap.set(address, {
        price: basePrice,
        marketCap: basePrice * 10000000,
        volume24h: basePrice * 1000000,
        change24h: ((addressSum % 10) - 5) // Range: -5 to +5
      });
    });
    return fallbackMap;
  }
}

// Simulation functions - replace these with actual data sources in production
/**
 * Simulate a price based on token address
 * This function ensures a deterministic price based on the token address
 * to maintain consistency between refreshes
 */
function simulatePrice(address: string): number {
  try {
    // Validate address
    if (!address || typeof address !== 'string') {
      console.error('Invalid address provided to simulatePrice');
      return 250; // Fixed fallback price for invalid addresses
    }
    
    // Calculate a checksum from the address characters
    // This ensures the same address always generates the same base price
    const addressSum = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    // Generate a base price between $50 and $500
    // The modulo operation ensures we get a consistent value for the same address
    const basePrice = 50 + (addressSum % 450);
    
    // Add a small random component (±5%) to simulate minor price fluctuations
    // while maintaining the same general price level
    const randomFactor = 0.95 + (Math.random() * 0.1);
    const finalPrice = basePrice * randomFactor;
    
    // Ensure the price is never below $10 and round to 2 decimal places for display
    const safePrice = Math.max(10, parseFloat(finalPrice.toFixed(2)));
    
    // Double-check for NaN and provide fallback
    if (isNaN(safePrice)) {
      console.warn('Generated NaN price for address: ' + address + ', using fallback');
      return 250; // Fixed fallback price
    }
    
    return safePrice;
  } catch (error) {
    console.error('Error in simulatePrice for address: ' + address, error);
    return 250; // Default fallback price
  }
}

function simulateMarketCap(price: number, supply?: number): number {
  try {
    // Ensure price is valid
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      console.warn(`Invalid price provided to simulateMarketCap: ${price}`);
      price = 100 + Math.random() * 400; // Fallback price
    }
    
    // If we have a valid supply, use it, otherwise simulate
    if (supply !== undefined && supply > 0) {
      return price * supply;
    }
    
    // Generate a realistic market cap based on price
    // Higher priced stocks tend to have higher market caps
    const baseMarketCap = 1000000000 + (price * 10000000);
    const randomFactor = Math.random() * 10000000000;
    return baseMarketCap + randomFactor;
  } catch (error) {
    console.error('Error in simulateMarketCap:', error);
    return 5000000000 + Math.random() * 15000000000; // Safe fallback
  }
}

function simulateVolume(price: number, marketCap: number): number {
  try {
    // Validate inputs
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      console.warn(`Invalid price provided to simulateVolume: ${price}`);
      price = 100 + Math.random() * 400; // Fallback price
    }
    
    if (typeof marketCap !== 'number' || isNaN(marketCap) || marketCap <= 0) {
      console.warn(`Invalid marketCap provided to simulateVolume: ${marketCap}`);
      marketCap = 5000000000 + Math.random() * 15000000000; // Fallback market cap
    }
    
    // Volume is typically a fraction of market cap, with some correlation to price
    // Lower priced tokens often have higher trading volumes in crypto
    const volumeRatio = 0.01 + (Math.random() * 0.05) + (1000 / (price + 0.1)) * 0.001;
    return marketCap * Math.min(volumeRatio, 0.2); // Cap at 20% of market cap
  } catch (error) {
    console.error('Error in simulateVolume:', error);
    return 100000000 + Math.random() * 500000000; // Safe fallback
  }
}

function simulateChange(): number {
  try {
    // Generate a realistic price change percentage for crypto tokens
    // Crypto tends to be more volatile than traditional stocks
    // Most tokens move within -8% to +8% in a day
    const baseChange = (Math.random() * 16) - 8;
    
    // Occasionally simulate larger moves (crypto can have significant swings)
    const volatilityFactor = Math.random();
    if (volatilityFactor > 0.85) {
      // High volatility day (15% chance)
      const direction = Math.random() > 0.5 ? 1 : -1;
      return baseChange + (direction * Math.random() * 15);
    } else if (volatilityFactor > 0.6) {
      // Medium volatility day (25% chance)
      const direction = Math.random() > 0.5 ? 1 : -1;
      return baseChange + (direction * Math.random() * 7);
    }
    
    return baseChange;
  } catch (error) {
    console.error('Error in simulateChange:', error);
    return (Math.random() * 10) - 5; // Safe fallback with wider range
  }
}