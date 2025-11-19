/**
 * Utility functions for formatting financial data
 */

/**
 * Format price as currency
 * Handles very small crypto prices with subscript notation (e.g., $0.0₄1026 for $0.00001026)
 */
export const formatPrice = (price?: number): string => {
  if (price === undefined || price === null || price === 0) {
    return '$0.00';
  }

  // For very small prices (< $0.01), use subscript notation for leading zeros
  if (price < 0.01 && price > 0) {
    const priceStr = price.toFixed(20); // Use high precision
    const decimalPart = priceStr.split('.')[1];

    // Count leading zeros after decimal point
    let leadingZeros = 0;
    for (const char of decimalPart) {
      if (char === '0') {
        leadingZeros++;
      } else {
        break;
      }
    }

    // If there are more than 2 leading zeros, use subscript notation
    if (leadingZeros > 2) {
      // Get the significant digits (first 4 non-zero digits)
      const significantDigits = decimalPart.substring(leadingZeros, leadingZeros + 4);
      const subscriptNumber = leadingZeros.toString()
        .split('')
        .map(digit => String.fromCharCode(0x2080 + parseInt(digit))) // Unicode subscript numbers
        .join('');

      return `$0.0${subscriptNumber}${significantDigits}`;
    }

    // For 1-2 leading zeros, show normally with up to 6 decimal places
    return '$' + price.toFixed(6).replace(/\.?0+$/, '');
  }

  // For prices between $0.01 and $1, show 4 decimal places
  if (price < 1) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(price);
  }

  // For prices >= $1, show 2 decimal places (standard)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

/**
 * Format market cap with appropriate suffix (T, B, M)
 */
export const formatMarketCap = (marketCap?: number): string => {
  if (marketCap === undefined || marketCap === null) {
    return '$0';
  }
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
export const formatVolume = (volume?: number): string => {
  if (volume === undefined || volume === null) {
    return '$0';
  }
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
export const formatPercentageChange = (change?: number): string => {
  if (change === undefined || change === null) {
    return '0.00%';
  }
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};