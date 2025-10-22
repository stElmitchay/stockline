# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stockline is a Solana-based tokenized stocks (xStocks) marketplace built with Next.js 15, TypeScript, and Tailwind CSS. The app allows users to browse stocks, purchase shares with Sierra Leonean Leones (SLL), and manage their portfolio via a PWA-enabled web interface. It integrates with Privy for authentication, Airtable for data storage, Birdeye API for live token prices, and Solana blockchain for wallet management.

## Development Commands

```bash
# Development
npm run dev                 # Start dev server at http://localhost:3000

# Production
npm run build              # Build production bundle
npm start                  # Start production server

# Utilities
npm run lint               # Run ESLint
npm run generate-og        # Generate Open Graph image (scripts/generate-og-image.js)
```

## Environment Variables

Required environment variables in `.env.local`:

```
BIRDEYE_API_KEY=xxx                              # Birdeye API for Solana token data
NEXT_PUBLIC_PRIVY_APP_ID=xxx                     # Privy authentication app ID
NEXT_PUBLIC_SOLANA_RPC_URL=xxx                   # Solana RPC endpoint (devnet or mainnet)
SOLANA_MAINNET_RPC_URL=xxx                       # Optional: Custom mainnet RPC for supply data (Helius, QuickNode, Alchemy)
SOLANA_FEE_PAYER_PRIVATE_KEY=[array]            # Fee payer wallet private key
SOLANA_FEE_PAYER_ADDRESS=xxx                     # Fee payer wallet address
AIRTABLE_BASE_ID=xxx                             # Airtable base ID
AIRTABLE_TABLE_ID=xxx                            # Airtable table ID for stock purchases
AIRTABLE_PERSONAL_ACCESS_TOKEN=xxx              # Airtable PAT
IMGBB_API_KEY=xxx                                # Optional: ImgBB for receipt uploads
```

## Architecture

### Key Technologies

- **Next.js 15 (App Router)**: Uses App Router with server and client components
- **React 19**: Latest React with Server Components
- **Privy**: Wallet authentication and embedded wallet creation
- **Solana Web3.js**: Blockchain interactions (devnet for testing, mainnet for production)
- **Airtable**: Backend data storage for purchase requests and holdings
- **Birdeye API**: Real-time Solana token price data
- **PWA (next-pwa)**: Installable Progressive Web App with offline support
- **Tailwind CSS 4**: Utility-first styling

### Data Flow

1. **Stock Data Pipeline**:
   - Stock metadata stored in `/data/stocks.json` (static data with `isAvailable` flag)
   - `useStocks` hook (`hooks/useStocks.ts`) fetches live price data via Birdeye API
   - Progressive loading: Fetches in batches of 5 tokens, prioritizing available stocks first
   - Smart caching with localStorage persistence (15-minute TTL, customizable per token popularity)
   - Session-based cache warming to avoid redundant API calls

2. **Authentication Flow**:
   - Privy handles wallet connection (embedded Solana wallets created automatically)
   - User data stored in localStorage by Privy
   - Solana wallet address extracted from `linkedAccounts` for transactions

3. **Purchase Flow**:
   - User selects stock → redirected to `/purchase?symbol=X&name=Y&price=Z`
   - `StockPurchaseForm` component collects payment details and receipt
   - Form submits to `/api/airtable/submit-stock-purchase`
   - Receipt uploaded to IMGBB (fallback: tmpfiles.org or 0x0.st)
   - Record created in Airtable with `Status: Todo`, `Transaction Type: CashIn`
   - First-time purchasers pay onboarding fee (tracked via `Subscription Fee` field)
   - Success modal displays after submission

4. **Wallet/Holdings Flow**:
   - `/wallet` page displays user's Solana wallet and stock holdings
   - Holdings fetched from Airtable via `/api/airtable/get-holdings-history`
   - Cashout requests submitted via `/api/airtable/submit-cashout`
   - Transactions sponsored via `/api/sponsor-cashout` (server-side signing)

### Key Files and Responsibilities

**Core Hooks:**
- `hooks/useStocks.ts`: Manages stock data fetching, filtering, sorting, and progressive loading. Prioritizes available stocks (first 10 tokens).

**Utilities:**
- `utils/solanaData.ts`: Handles Birdeye API integration, token data fetching, smart caching, and cache warming. Multi-token batch fetching with progressive updates.
- `utils/walletPrefetch.ts`: Background prefetching of user wallet data (non-blocking).

**API Routes:**
- `/api/birdeye`: Proxy for Birdeye API (POST endpoint for batch token fetching)
- `/api/airtable/submit-stock-purchase`: Creates Airtable records for stock purchases
- `/api/airtable/get-holdings-history`: Fetches user holdings from Airtable
- `/api/airtable/submit-cashout`: Submits cashout requests
- `/api/sponsor-cashout`: Server-side transaction signing for sponsored cashouts

**Components:**
- `components/providers.tsx`: Wraps app with Privy provider, handles console error filtering (suppresses Chrome extension Privy errors), and registers service worker
- `components/stockCard.tsx`: Displays individual stock cards with price, change, and purchase button
- `components/stockPurchaseForm.tsx`: Collects purchase details, validates payment receipt (JPG/PNG only), and submits to Airtable
- `components/walletCard.tsx`: Displays wallet balance and holdings
- `components/navigation.tsx`: App navigation bar with wallet connection

**Pages:**
- `/app/stocks/page.tsx`: Main marketplace with filtering, sorting, and search
- `/app/purchase/page.tsx`: Stock purchase form page (uses Suspense for loading)
- `/app/wallet/page.tsx`: User wallet and holdings overview
- `/app/stocks/[symbol]/page.tsx`: Individual stock detail page (dynamic route)

### Special Considerations

**Privy Configuration:**
- `embeddedWallets.createOnLogin: "all-users"` creates Solana wallets automatically
- Chrome extension errors filtered in `components/providers.tsx` (origin mismatch false positives)

**Caching Strategy:**
- Smart cache with localStorage persistence (`utils/solanaData.ts`)
- Popular tokens (>10 accesses) refresh every 10 minutes
- Unpopular tokens (<3 accesses) refresh every 30 minutes
- Failed fetches marked and retried after 30 seconds
- Session-based cache warming (only runs once per session, skips if < 10 minutes since last warming)
- Token supply cached for 24 hours (fetched from Solana RPC or Birdeye fallback)
- Cache statistics available via `getCacheStats()` function

**Market Cap Calculation:**
- Market Cap = (Token Price × Actual Circulating Supply) / 1000
- Adjusted by 1000x to account for xStock tokenomics (fractional representation)
- **Hybrid approach for supply data:**
  1. First tries Solana RPC `getTokenSupply()` (source of truth)
  2. Falls back to Birdeye `token_overview` endpoint if RPC fails (rate limited)
  3. Final fallback to 1B token estimate if both fail
- Supply data cached for 24 hours
- **Recommendation:** Set `SOLANA_MAINNET_RPC_URL` to a reliable provider (Helius, QuickNode, Alchemy) to avoid public RPC rate limits

**Progressive Loading:**
- Stocks load in batches of 5 tokens with 4-second delays between batches
- Available stocks (first 10 tokens) load in first 2 batches for immediate display
- UI updates progressively as each batch completes
- Retry logic: Failed batches retry up to 2 times before falling back to individual fetches

**Airtable Schema:**
- `Status` field options: `Todo`, `In Progress`, `Done`
- `Transaction Type` field: `CashIn`, `CashOut`
- `Subscription Fee` boolean: Marks first-time purchases with onboarding fee
- `Amount in Leones`: Stores NET amount after fees (what user receives in stock credit)
- `Notes` field: Tracks original amount, fees, and net amount for transparency

**PWA Features:**
- Service worker registered in production only (`components/providers.tsx`)
- Offline fallback page at `/app/offline/page.tsx`
- Install prompt component: `components/pwaInstallPrompt.tsx`
- Manifest: `public/manifest.webmanifest`

**Console Logging:**
- Production: All console methods silenced unless `NEXT_PUBLIC_DEBUG=true`
- Chrome extension errors filtered in all environments (Privy origin mismatch)

## Testing Workflow

No automated tests configured. Manual testing:
1. Run `npm run dev`
2. Test stock browsing, filtering, sorting on `/stocks`
3. Test purchase flow with Privy wallet connection
4. Test wallet/holdings display on `/wallet`
5. Test PWA installation and offline mode

## Common Gotchas

1. **Privy Origin Errors**: Chrome extensions can trigger false Privy errors. These are filtered in `providers.tsx`.
2. **Stock Data Prioritization**: Available stocks MUST appear first in `data/stocks.json` order for correct progressive loading.
3. **Receipt Uploads**: Only JPG/PNG accepted. Upload failures should gracefully fall back through IMGBB → tmpfiles → 0x0.st.
4. **Fee Calculation**: First-time purchases include onboarding fee. Net amount after fees is stored in Airtable.
5. **Solana Network**: Check `NEXT_PUBLIC_SOLANA_RPC_URL` for devnet vs mainnet. Devnet for testing, mainnet for production.
6. **Cache Warming**: Runs once per session. To force re-warm, clear `sessionStorage.cache_warmed_session`.
7. **Next.js 15 Breaking Changes**: Uses React 19, Tailwind CSS 4, and updated ESLint config. Some packages may have compatibility issues.

## Stock Data Management

To add new stocks:
1. Add entry to `/data/stocks.json` with all required fields:
   - `symbol`, `name`, `solanaAddress`, `logoUrl`, `solscanUrl`, `isAvailable` (boolean)
2. If stock is available for purchase, set `isAvailable: true` and place it in the first 10 entries for priority loading
3. Refresh cache or clear `localStorage` to see changes immediately

## Deployment Notes

- Production builds strip console logs via Next.js `removeConsole` compiler option
- PWA service worker only active in production builds
- Vercel Analytics integrated via `@vercel/analytics`
- Environment variables must be set in deployment platform (Vercel, etc.)
