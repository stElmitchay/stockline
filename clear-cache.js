// Run this in browser console to clear all stock data cache
localStorage.removeItem('solana_token_cache');
localStorage.removeItem('solana_failed_fetch_cache');
localStorage.removeItem('solana_token_access_count');
localStorage.removeItem('solana_token_last_access');
localStorage.removeItem('solana_token_supply_cache');
sessionStorage.removeItem('cache_warmed_session');
sessionStorage.removeItem('stocks_initialized');
console.log('✅ Cache cleared! Refresh the page to see updated values.');
