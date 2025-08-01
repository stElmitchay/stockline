# Cashout Feature Setup Guide

This guide will help you set up the sponsored transaction cashout feature using Privy's gas management capabilities.

## Overview

The cashout feature allows users to transfer their SOL to your company wallet with sponsored gas fees. Users only need to enter the amount they want to cash out - your backend handles all transaction fees.

## Prerequisites

1. A Solana wallet with SOL for paying transaction fees
2. Privy account with Solana integration enabled
3. Environment variables configured

## Setup Steps

### 1. Create a Fee Payer Wallet

You need a Solana wallet that will pay for all transaction fees. You can create one using:

```javascript
import {Keypair} from '@solana/web3.js';
import bs58 from 'bs58';

// Generate a new keypair
const feePayerWallet = new Keypair();
const feePayerAddress = feePayerWallet.publicKey.toBase58();
const feePayerPrivateKey = bs58.encode(feePayerWallet.secretKey);

console.log('Fee Payer Address:', feePayerAddress);
console.log('Fee Payer Private Key:', feePayerPrivateKey);
```

**Important**: Keep the private key secure and never commit it to version control!

### 2. Fund Your Fee Payer Wallet

Transfer SOL to your fee payer wallet to cover transaction fees. Each transaction typically costs ~0.000005 SOL.

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your wallet details in `.env.local`:
   ```bash
   SOLANA_FEE_PAYER_PRIVATE_KEY=your_base58_encoded_private_key
   SOLANA_FEE_PAYER_ADDRESS=your_fee_payer_wallet_address
   NEXT_PUBLIC_COMPANY_WALLET_ADDRESS=your_fee_payer_wallet_address
   ```

### 4. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the wallet page
3. Click the "Cash Out" button
4. Enter an amount and test the transaction

## Security Considerations

1. **Private Key Security**: Never expose your private key in client-side code
2. **Amount Limits**: The current implementation has a 10 SOL limit per transaction
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **User Verification**: Add additional user verification for large amounts

## Customization

### Changing Transaction Limits

Edit the limit in `/app/api/sponsor-cashout/route.ts`:

```typescript
if (amount > 10) { // Change this value
  return NextResponse.json({
    error: 'Amount exceeds maximum limit'
  }, { status: 400 });
}
```

### Adding Notifications

You can add email notifications or webhooks when transactions are successful by modifying the API endpoint.

### Network Configuration

To switch between mainnet and devnet, update the connection in both:
- `/components/modals/cashoutModal.tsx`
- `/app/api/sponsor-cashout/route.ts`

```typescript
// For devnet:
const connection = new Connection(clusterApiUrl('devnet'));

// For mainnet:
const connection = new Connection(clusterApiUrl('mainnet-beta'));
```

## Troubleshooting

### Common Issues

1. **"Invalid fee payer" error**: Check that your environment variables are correctly set
2. **Transaction fails**: Ensure your fee payer wallet has sufficient SOL
3. **Network errors**: Verify your RPC endpoint is working

### Debug Mode

Add console logging to track transaction flow:

```typescript
console.log('Transaction signature:', signature);
console.log('User address:', userAddress);
console.log('Amount:', amount);
```

## Production Deployment

1. Use a secure key management service for private keys
2. Implement proper logging and monitoring
3. Add rate limiting and abuse prevention
4. Consider using a dedicated RPC endpoint for better reliability
5. Set up alerts for low fee payer wallet balance

## Support

For issues related to Privy integration, refer to the [Privy Documentation](https://docs.privy.io/wallets/gas-and-asset-management/gas/solana).