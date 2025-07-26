/**
 * Application constants
 */

// API Configuration
export const API_CONFIG = {
  LOADING_DELAY: 1500, // Simulated API loading delay in milliseconds
  COPY_FEEDBACK_DURATION: 2000, // Duration to show copy feedback in milliseconds
} as const;

// Sort Options
export const SORT_OPTIONS = [
  { value: 'marketCap', label: 'Market Cap' },
  { value: 'price', label: 'Price' },
  { value: 'change24h', label: '24h Change' },
  { value: 'volume', label: 'Volume' }
] as const;

// Default Values
export const DEFAULTS = {
  SECTOR: 'all',
  SORT_BY: 'marketCap',
  SEARCH_QUERY: '' as string
} as const;

// UI Configuration
export const UI_CONFIG = {
  MAX_VISIBLE_LINES: 250,
  MIN_VISIBLE_LINES: 200,
  ADDRESS_DISPLAY_LENGTH: {
    START: 6,
    END: 4
  }
} as const;

// External URLs
export const EXTERNAL_URLS = {
  SOLSCAN_BASE: 'https://solscan.io/token/',
  SOLANA_EXPLORER_BASE: 'https://explorer.solana.com/address/'
} as const;