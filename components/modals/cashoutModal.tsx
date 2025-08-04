"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import { useSolanaWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { usePrivy } from "@privy-io/react-auth";
import {
  TransactionMessage,
  PublicKey,
  VersionedTransaction,
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createTransferInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getMint
} from "@solana/spl-token";

interface TokenAccount {
  mint: string;
  balance: number;
  decimals: number;
  symbol?: string;
  name?: string;
  price?: number;
  logoURI?: string;
}

interface CashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  tokens: TokenAccount[];
}

// Your company wallet address (replace with actual address)
// This should be the same as SOLANA_FEE_PAYER_ADDRESS in your environment variables
const COMPANY_WALLET_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_WALLET_ADDRESS || "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

export function CashoutModal({
  isOpen,
  onClose,
  userBalance,
  tokens,
}: CashoutModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pendingCashoutData, setPendingCashoutData] = useState<any>(null);
  const { wallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const { user } = usePrivy();

  // Auto-fill email from Privy user data
  useEffect(() => {
    if (user?.email?.address) {
      setEmail(user.email.address);
    }
  }, [user]);

  // Create SOL token entry
  const solToken: TokenAccount = useMemo(() => ({
    mint: 'So11111111111111111111111111111111111111112',
    balance: userBalance,
    decimals: 9,
    symbol: 'SOL',
    name: 'Solana',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  }), [userBalance]);

  // Combine SOL with other tokens
  const allTokens = useMemo(() => [solToken, ...tokens], [solToken, tokens]);

  // Set default selected token to SOL if none selected
  useEffect(() => {
    if (!selectedToken && allTokens.length > 0) {
      setSelectedToken(allTokens[0]);
    }
  }, [selectedToken, allTokens]);

  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

  const handleFormSubmit = async () => {
    if (!embeddedWallet || !amount || !selectedToken) return;

    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!email || !mobileNumber) {
        throw new Error("Please fill in email and mobile number");
      }

      const amountValue = parseFloat(amount);
      if (amountValue <= 0 || amountValue > selectedToken.balance) {
        throw new Error("Invalid amount");
      }

      // Submit to Airtable for initial record
      const response = await fetch('/api/airtable/submit-cashout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          mobileNumber,
          amount: amountValue,
          tokenSymbol: selectedToken.symbol,
          walletAddress: embeddedWallet.address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit cashout request');
      }

      // Store the cashout data for later transaction
      setPendingCashoutData({
        amount: amountValue,
        selectedToken,
        email,
        mobileNumber
      });

      setFormSubmitted(true);
      alert('Cashout request submitted! We will contact you to confirm the transaction.');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit cashout request');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTransaction = async () => {
    if (!embeddedWallet || !pendingCashoutData) return;

    setLoading(true);
    setError(null);

    try {
      const { amount: amountValue, selectedToken } = pendingCashoutData;

      // Create connection with fallback to more reliable RPC
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=demo';
      const connection = new Connection(rpcUrl);
      const { blockhash } = await connection.getLatestBlockhash();

      let transferInstruction;

      if (selectedToken.symbol === 'SOL') {
        // SOL transfer
        transferInstruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(embeddedWallet.address),
          toPubkey: new PublicKey(COMPANY_WALLET_ADDRESS),
          lamports: Math.floor(amountValue * LAMPORTS_PER_SOL),
        });
      } else {
        // SPL Token transfer
        const mintPubkey = new PublicKey(selectedToken.mint);
        
        // Determine the correct program ID by checking the mint account
        let programId = TOKEN_PROGRAM_ID;
        try {
          const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
          programId = TOKEN_2022_PROGRAM_ID;
        } catch {
          // If TOKEN_2022 fails, use standard TOKEN_PROGRAM_ID
          programId = TOKEN_PROGRAM_ID;
        }
        
        const fromTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          new PublicKey(embeddedWallet.address),
          false,
          programId
        );
        
        const toTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          new PublicKey(COMPANY_WALLET_ADDRESS),
          false,
          programId
        );

        const tokenAmount = Math.floor(amountValue * Math.pow(10, selectedToken.decimals));

        // Check if destination token account exists
        const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
        const instructions = [];
        
        // Create destination token account if it doesn't exist
        if (!toAccountInfo) {
          const createAccountInstruction = createAssociatedTokenAccountInstruction(
            new PublicKey(COMPANY_WALLET_ADDRESS), // payer (fee payer)
            toTokenAccount, // associated token account
            new PublicKey(COMPANY_WALLET_ADDRESS), // owner
            mintPubkey, // mint
            programId
          );
          instructions.push(createAccountInstruction);
        }

        // Use transfer_checked for TOKEN_2022 tokens, regular transfer for TOKEN_PROGRAM tokens
        const tokenTransferInstruction = programId === TOKEN_2022_PROGRAM_ID 
          ? createTransferCheckedInstruction(
              fromTokenAccount,
              mintPubkey,
              toTokenAccount,
              new PublicKey(embeddedWallet.address),
              tokenAmount,
              selectedToken.decimals,
              [],
              programId
            )
          : createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              new PublicKey(embeddedWallet.address),
              tokenAmount,
              [],
              programId
            );
        
        instructions.push(tokenTransferInstruction);
        
        // If we have multiple instructions, we need to handle them differently
        if (instructions.length > 1) {
          // Create transaction message with multiple instructions
          const message = new TransactionMessage({
            payerKey: new PublicKey(COMPANY_WALLET_ADDRESS),
            recentBlockhash: blockhash,
            instructions: instructions
          }).compileToV0Message();

          const transaction = new VersionedTransaction(message);

          // Use Privy's signTransaction method
          const signedTransaction = await signTransaction({
            transaction: transaction,
            connection: connection
          });

          // Send to backend for sponsoring
          const response = await fetch('/api/sponsor-cashout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transaction: Buffer.from(signedTransaction.serialize()).toString('base64'),
              amount: amountValue,
              userAddress: embeddedWallet.address,
              tokenMint: selectedToken.mint,
              tokenSymbol: selectedToken.symbol || 'Unknown',
              tokenDecimals: selectedToken.decimals
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transaction failed');
          }

          const result = await response.json();
          
          // Update Airtable record with transaction hash
      try {
        await fetch('/api/airtable/update-cashout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: pendingCashoutData.email,
            walletAddress: embeddedWallet.address,
            transactionHash: result.transactionHash
          })
        });
      } catch (airtableError) {
        console.error('Failed to update Airtable record:', airtableError);
        // Don't fail the entire process if Airtable update fails
      }
          
          // Handle success for multi-instruction transaction
           setAmount('');
           setEmail('');
           setMobileNumber('');
           setFormSubmitted(false);
           setPendingCashoutData(null);
           setLoading(false);
           setError('');
          
          // Show success message or redirect
          alert(`Transaction successful! Hash: ${result.transactionHash}`);
          onClose();
          return;
        } else {
          // Use transfer_checked for TOKEN_2022 tokens, regular transfer for TOKEN_PROGRAM tokens
          transferInstruction = programId === TOKEN_2022_PROGRAM_ID 
            ? createTransferCheckedInstruction(
                fromTokenAccount,
                mintPubkey,
                toTokenAccount,
                new PublicKey(embeddedWallet.address),
                tokenAmount,
                selectedToken.decimals,
                [],
                programId
              )
            : createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                new PublicKey(embeddedWallet.address),
                tokenAmount,
                [],
                programId
              );
        }
      }

      // Create transaction message with fee payer as backend wallet
      const message = new TransactionMessage({
        payerKey: new PublicKey(COMPANY_WALLET_ADDRESS), // Backend pays fees
        recentBlockhash: blockhash,
        instructions: [transferInstruction]
      }).compileToV0Message();

      // Create transaction
      const transaction = new VersionedTransaction(message);

      // Use Privy's signTransaction method
      const signedTransaction = await signTransaction({
        transaction: transaction,
        connection: connection
      });

      // Serialize the signed transaction to send to backend
      const serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');

      // Send to your backend
      const response = await fetch('/api/sponsor-cashout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          transaction: serializedTransaction,
          amount: amountValue,
          userAddress: embeddedWallet.address,
          tokenMint: selectedToken.mint,
          tokenSymbol: selectedToken.symbol,
          tokenDecimals: selectedToken.decimals
        })
      });

      if (!response.ok) {
        throw new Error('Transaction failed');
      }

      const { transactionHash } = await response.json();
      console.log('Cashout successful:', transactionHash);
      
      // Update Airtable record with transaction hash
      try {
        await fetch('/api/airtable/update-cashout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: pendingCashoutData.email,
            walletAddress: embeddedWallet.address,
            transactionHash
          })
        });
      } catch (airtableError) {
        console.error('Failed to update Airtable record:', airtableError);
        // Don't fail the entire process if Airtable update fails
      }
      
      // Reset form and close modal
      setAmount("");
      setEmail("");
      setMobileNumber("");
      setFormSubmitted(false);
      setPendingCashoutData(null);
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formSubmitted ? "Complete Transaction" : "Cash Out"}
      description={formSubmitted ? "Complete your cashout transaction" : "Submit your cashout request"}
    >
      <div className="space-y-4">
        {formSubmitted && pendingCashoutData && (
          <div className="p-4 bg-green-900/50 border border-green-500 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">Request Submitted</h3>
            <p className="text-green-300 text-sm mb-2">
              Your cashout request has been submitted and confirmed. Complete the transaction below.
            </p>
            <div className="text-sm text-green-200">
              <p>Amount: {pendingCashoutData.amount} {pendingCashoutData.selectedToken.symbol}</p>
              <p>Email: {pendingCashoutData.email}</p>
            </div>
          </div>
        )}
        
        {!formSubmitted && (
          <>
            {/* Email Field */}
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
            
            {/* Mobile Number Field */}
            <Input
              label="Mobile Number"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter your mobile number"
              required
            />
        
        {/* Token Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Token
          </label>
          <select
            value={selectedToken?.mint || ''}
            onChange={(e) => {
              const token = allTokens.find(t => t.mint === e.target.value);
              setSelectedToken(token || null);
              setAmount(''); // Reset amount when token changes
            }}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allTokens.map((token) => (
              <option key={token.mint} value={token.mint}>
                {token.symbol} - {token.name} (Balance: {token.balance.toFixed(Math.min(token.decimals, 6))})
              </option>
            ))}
          </select>
        </div>
        
        {selectedToken && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400">Balance:</p>
            <p className="text-white font-semibold">
              {selectedToken.balance.toFixed(Math.min(selectedToken.decimals, 6))} {selectedToken.symbol}
            </p>
          </div>
        )}

        {selectedToken && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Quick Select:</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const amount = (selectedToken.balance * 0.25).toFixed(Math.min(selectedToken.decimals, 6));
                  setAmount(amount);
                }}
                className="flex-1 px-3 py-2 bg-gray-800 hover:bg-[#4CAF50] border border-gray-600 hover:border-[#4CAF50] rounded-lg text-white text-sm transition-colors duration-200"
              >
                25%
              </button>
              <button
                onClick={() => {
                  const amount = (selectedToken.balance * 0.5).toFixed(Math.min(selectedToken.decimals, 6));
                  setAmount(amount);
                }}
                className="flex-1 px-3 py-2 bg-gray-800 hover:bg-[#4CAF50] border border-gray-600 hover:border-[#4CAF50] rounded-lg text-white text-sm transition-colors duration-200"
              >
                50%
              </button>
              <button
                onClick={() => {
                  const amount = selectedToken.balance.toFixed(Math.min(selectedToken.decimals, 6));
                  setAmount(amount);
                }}
                className="flex-1 px-3 py-2 bg-gray-800 hover:bg-[#4CAF50] border border-gray-600 hover:border-[#4CAF50] rounded-lg text-white text-sm transition-colors duration-200"
              >
                100%
              </button>
            </div>
          </div>
        )}

        <Input
          label={`Amount (${selectedToken?.symbol || 'Token'})`}
          type="number"
          step={selectedToken?.decimals === 9 ? "0.001" : "0.01"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          max={selectedToken?.balance || 0}
        />
        
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

            <Button
              onClick={handleFormSubmit}
              disabled={!embeddedWallet || !amount || !selectedToken || !email || !mobileNumber || loading || parseFloat(amount) <= 0 || parseFloat(amount) > (selectedToken?.balance || 0)}
              className="w-full"
            >
              {loading ? 'Submitting...' : `Submit Cashout Request`}
            </Button>
          </>
        )}
        
        {formSubmitted && pendingCashoutData && (
          <>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">Transaction Details:</p>
              <p className="text-white font-semibold">
                {pendingCashoutData.amount} {pendingCashoutData.selectedToken.symbol}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                To: Company Wallet
              </p>
            </div>
            
            <Button
              onClick={handleCompleteTransaction}
              disabled={!embeddedWallet || loading}
              className="w-full"
            >
              {loading ? 'Processing Transaction...' : 'Complete Transaction'}
            </Button>
          </>
        )}
        
        <p className="text-xs text-gray-500 text-center">
          Gas fees will be sponsored by our platform
        </p>
      </div>
    </Modal>
  );
}