export interface Stock {
  symbol: string;
  name: string;
  solanaAddress: string;
  price?: number;
  change24h?: number;
  marketCap?: number;
  volume24h?: number;
  logoUrl?: string;
  solscanUrl?: string;
}

export interface StockData {
  xStocks: Stock[];
}

export type SortOption = 'marketCap' | 'price' | 'change24h' | 'volume';

// Sector type removed as per requirements