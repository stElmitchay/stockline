import { NextRequest, NextResponse } from 'next/server';
import { Keypair, VersionedTransaction, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Your fee payer wallet's private key (Keep this secure!)
const FEE_PAYER_PRIVATE_KEY = process.env.SOLANA_FEE_PAYER_PRIVATE_KEY!;
const FEE_PAYER_ADDRESS = process.env.SOLANA_FEE_PAYER_ADDRESS!;

// Initialize fee payer keypair
const feePayerWallet = Keypair.fromSecretKey(
  FEE_PAYER_PRIVATE_KEY.startsWith('[') 
    ? new Uint8Array(JSON.parse(FEE_PAYER_PRIVATE_KEY))
    : bs58.decode(FEE_PAYER_PRIVATE_KEY)
);

// Connect to Solana
const connection = new Connection(clusterApiUrl('mainnet-beta'));

export async function POST(request: NextRequest) {
  try {
    const { 
      transaction: serializedTransaction, 
      amount, 
      userAddress, 
      tokenMint, 
      tokenSymbol, 
      tokenDecimals 
    } = await request.json();

    if (!serializedTransaction || !amount || !userAddress || !tokenMint || !tokenSymbol) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Deserialize the transaction
    const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    // Verify the transaction
    const message = transaction.message;
    const accountKeys = message.getAccountKeys();
    const feePayerIndex = 0;
    const feePayer = accountKeys.get(feePayerIndex);

    if (!feePayer || feePayer.toBase58() !== FEE_PAYER_ADDRESS) {
      return NextResponse.json({
        error: 'Invalid fee payer in transaction'
      }, { status: 403 });
    }

    // Add additional validation here (user verification, etc.)
    // No amount limits - allow unlimited token transfers

    // Sign the transaction with the fee payer
    transaction.sign([feePayerWallet]);

    // Send the transaction
    const signature = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      preflightCommitment: 'confirmed'
    });

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return NextResponse.json({
      transactionHash: signature,
      status: 'success',
      tokenSymbol,
      amount,
      userAddress
    });

  } catch (error) {
    console.error('Sponsored transaction error:', error);
    return NextResponse.json({
      error: 'Transaction failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}