/**
 * Utility functions for formatting financial data
 */

/**
 * Format price as currency
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
};

/**
 * Format market cap with appropriate suffix (T, B, M)
 */
export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  }
  return `$${marketCap.toLocaleString()}`;
};

/**
 * Format volume with appropriate suffix (B, M, K)
 */
export const formatVolume = (volume: number): string => {
  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(2)}B`;
  } else if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(2)}M`;
  } else if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(2)}K`;
  }
  return `$${volume.toLocaleString()}`;
};

/**
 * Format Solana address for display (first 6 + last 4 characters)
 */
export const formatAddress = (address: string): string => {
  const START_LENGTH = 6;
  const END_LENGTH = 4;
  return `${address.slice(0, START_LENGTH)}...${address.slice(-END_LENGTH)}`;
};

/**
 * Format percentage change with appropriate sign
 */
export const formatPercentageChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};