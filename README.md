# Solana xStocks Marketplace

A modern, responsive marketplace for Solana-based tokenized stocks (xStocks) built with Next.js, TypeScript, and Tailwind CSS.

## Features

### 🏪 Stock Marketplace
- Browse 25+ tokenized stocks with real-time data
- Advanced filtering by sector (Technology, Healthcare, Finance, etc.)
- Multiple sorting options (Market Cap, Price, 24h Change, Volume)
- Real-time search functionality
- Responsive grid layout with detailed stock cards

### 📊 Stock Information
- Current price and 24h price change
- Market capitalization and trading volume
- Sector classification and stock symbols
- Solana blockchain integration with Solscan links
- Copy-to-clipboard functionality for addresses

### 🔗 Blockchain Integration
- Direct links to Solscan for token details
- Solana address display and copying
- Wallet connection interface
- Transaction explorer integration

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Lucide React icons
- **State Management**: React hooks with custom useStocks hook
- **Data Storage**: JSON-based data management

## Project Structure

```
├── app/
│   ├── stocks/
│   │   └── page.tsx          # Main stocks marketplace page
│   ├── wallet/
│   │   └── page.tsx          # Wallet connection page
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # Reusable UI components
│   ├── stockCard.tsx         # Individual stock card component
│   └── stockFilters.tsx      # Filtering and sorting controls
├── data/
│   └── stocks.json           # Stock data storage
├── hooks/
│   └── useStocks.ts          # Custom hook for stock data management
├── types/
│   └── stock.ts              # TypeScript type definitions
├── utils/
│   └── formatters.ts         # Utility functions for data formatting
└── constants/
    └── index.ts              # Application constants and configuration
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd create-solana-next-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Usage

### Browsing Stocks
1. Navigate to `/stocks` to view the marketplace
2. Use the search bar to find specific stocks
3. Filter by sector using the dropdown
4. Sort by different criteria (market cap, price, etc.)

### Stock Details
- Click "View Details" to open Solscan token page
- Copy Solana addresses using the copy button
- View comprehensive stock information in cards

### Wallet Integration
- Visit `/wallet` for wallet connection interface
- View transaction history and account details

## Data Management

### Stock Data Structure
Each stock in `data/stocks.json` contains:
```json
{
  "symbol": "AAPLx",
  "name": "Apple Inc.",
  "price": 150.25,
  "change24h": 2.5,
  "marketCap": 2500000000,
  "volume": 50000000,
  "sector": "Technology",
  "solanaAddress": "...",
  "solscanUrl": "https://solscan.io/token/..."
}
```

### Adding New Stocks
1. Add stock data to `data/stocks.json`
2. Include all required fields
3. Optionally add specific Solscan URL

## Customization

### Constants Configuration
Modify `constants/index.ts` to adjust:
- API loading delays
- UI configuration
- Default values
- External URLs

### Styling
- Tailwind CSS classes for responsive design
- Custom components in `components/ui/`
- Consistent color scheme and typography

### Type Safety
- Comprehensive TypeScript interfaces in `types/stock.ts`
- Strict type checking throughout the application
- Custom hooks with proper typing

## Performance Features

- **Optimized Rendering**: Efficient filtering and sorting
- **Responsive Design**: Mobile-first approach
- **Code Splitting**: Next.js automatic optimization
- **Custom Hooks**: Reusable state management
- **Utility Functions**: Centralized formatting logic

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
