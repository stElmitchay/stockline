import { NextRequest, NextResponse } from 'next/server';
import { Keypair, VersionedTransaction, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Your fee payer wallet's private key (Keep this secure!)
const FEE_PAYER_PRIVATE_KEY = process.env.SOLANA_FEE_PAYER_PRIVATE_KEY!;
const FEE_PAYER_ADDRESS = process.env.SOLANA_FEE_PAYER_ADDRESS!;

// Initialize fee payer keypair
const feePayerWallet = FEE_PAYER_PRIVATE_KEY ? Keypair.fromSecretKey(
  FEE_PAYER_PRIVATE_KEY.startsWith('[') 
    ? new Uint8Array(JSON.parse(FEE_PAYER_PRIVATE_KEY))
    : bs58.decode(FEE_PAYER_PRIVATE_KEY)
) : null;

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

    console.log('Sponsor cashout request:', { amount, userAddress, tokenMint, tokenSymbol });

    if (!serializedTransaction || !amount || !userAddress || !tokenMint || !tokenSymbol) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Check if environment variables are set
    console.log('Environment variables check:', {
      hasPrivateKey: !!FEE_PAYER_PRIVATE_KEY,
      hasAddress: !!FEE_PAYER_ADDRESS,
      addressValue: FEE_PAYER_ADDRESS
    });
    
    if (!FEE_PAYER_PRIVATE_KEY || !FEE_PAYER_ADDRESS) {
      console.error('Missing environment variables:', { 
        hasPrivateKey: !!FEE_PAYER_PRIVATE_KEY, 
        hasAddress: !!FEE_PAYER_ADDRESS 
      });
      return NextResponse.json({ 
        error: 'Server configuration error - missing environment variables',
        details: {
          hasPrivateKey: !!FEE_PAYER_PRIVATE_KEY,
          hasAddress: !!FEE_PAYER_ADDRESS
        }
      }, { status: 500 });
    }

    // Deserialize the transaction
    const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    console.log('Transaction fee payer:', transaction.message.getAccountKeys().get(0)?.toBase58());
    console.log('Expected fee payer address:', FEE_PAYER_ADDRESS);

    // Verify the transaction (following Privy's security recommendations)
    const message = transaction.message;
    const accountKeys = message.getAccountKeys();
    const feePayerIndex = 0; // Fee payer is always the first account
    const feePayer = accountKeys.get(feePayerIndex);

    // 1. Check that it's using the correct fee payer
    if (!feePayer || feePayer.toBase58() !== FEE_PAYER_ADDRESS) {
      console.error('Fee payer mismatch:', {
        expected: FEE_PAYER_ADDRESS,
        received: feePayer?.toBase58()
      });
      return NextResponse.json({
        error: 'Invalid fee payer in transaction'
      }, { status: 403 });
    }

    // 2. Check for any unauthorized fund transfers
    for (const instruction of message.compiledInstructions) {
      const programId = accountKeys.get(instruction.programIdIndex);

      // Check if instruction is for System Program (transfers)
      if (programId && programId.toBase58() === '11111111111111111111111111111111') {
        // Check if it's a transfer (command 2)
        if (instruction.data[0] === 2) {
          const senderIndex = instruction.accountKeyIndexes[0];
          const senderAddress = accountKeys.get(senderIndex);

          // Don't allow transactions that transfer tokens from fee payer
          if (senderAddress && senderAddress.toBase58() === FEE_PAYER_ADDRESS) {
            return NextResponse.json({
              error: 'Transaction attempts to transfer funds from fee payer'
            }, { status: 403 });
          }
        }
      }
    }

    // 3. Add fee payer signature to the already signed transaction
    if (!feePayerWallet) {
      return NextResponse.json({
        error: 'Server configuration error - fee payer wallet not initialized'
      }, { status: 500 });
    }
    transaction.sign([feePayerWallet]);

    console.log('Transaction verified and signed with company wallet');

    // Send the transaction
    console.log('Submitting sponsored transaction to network...');
    const signature = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      preflightCommitment: 'confirmed'
    });

    console.log('Transaction submitted with signature:', signature);

    // Wait for confirmation
    console.log('Waiting for transaction confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('Transaction confirmed!');

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