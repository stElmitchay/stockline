"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import { Check } from "lucide-react";
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
  onFormSubmitted?: (data: any) => void;
  pendingCashoutData?: any;
}

// Your company wallet address (replace with actual address)
// This should be the same as SOLANA_FEE_PAYER_ADDRESS in your environment variables
const COMPANY_WALLET_ADDRESS = process.env.SOLANA_FEE_PAYER_ADDRESS || "moCAqUGuuLiYxxfKzurCyqkioDFUJbFdKeXb9pbnwnu";

export function CashoutModal({
  isOpen,
  onClose,
  userBalance,
  tokens,
  onFormSubmitted,
  pendingCashoutData: externalPendingData,
}: CashoutModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pendingCashoutData, setPendingCashoutData] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
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
      const cashoutData = {
        amount: amountValue,
        selectedToken,
        email,
        mobileNumber
      };
      
      setPendingCashoutData(cashoutData);
      
      // Show success message
      setShowSuccessMessage(true);
      
      // Notify parent component
      if (onFormSubmitted) {
        onFormSubmitted(cashoutData);
      }
      
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
        setShowSuccessMessage(false);
        setFormSubmitted(false);
        setPendingCashoutData(null);
        setAmount("");
        setEmail("");
        setMobileNumber("");
        setSelectedToken(null);
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit cashout request');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTransaction = async () => {
    const cashoutData = externalPendingData || pendingCashoutData;
    if (!embeddedWallet || !cashoutData) return;

    setLoading(true);
    setError(null);

    try {
      const { amount: amountValue, selectedToken } = cashoutData;

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
          console.log(`Transaction successful! Hash: ${result.transactionHash}`);
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

      // Create transaction message with company wallet as fee payer
      console.log('Using company wallet address:', COMPANY_WALLET_ADDRESS);
      const message = new TransactionMessage({
        payerKey: new PublicKey(COMPANY_WALLET_ADDRESS), // Company wallet pays fees
        recentBlockhash: blockhash,
        instructions: [transferInstruction]
      }).compileToV0Message();

      // Create transaction
      const transaction = new VersionedTransaction(message);

      // Use Privy's signTransaction method for the actual transfer
      const signedTransaction = await signTransaction({
        transaction: transaction,
        connection: connection
      });

      // Serialize the signed transaction to send to backend
      const serializedTransaction = Buffer.from(signedTransaction.serialize()).toString('base64');

      // Send to your backend
      console.log('Sending transaction to backend...');
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

      console.log('Backend response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error(errorData.error || 'Transaction failed');
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
            email: cashoutData.email,
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
      setLoading(false);
      onClose();
      
      // Notify parent to clear pending data
      if (onFormSubmitted) {
        onFormSubmitted(null);
      }
      
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
      <div className="max-w-md mx-auto p-6 rounded-2xl shadow-2xl transition-all duration-300"
           style={{
             background: 'rgba(46, 71, 68, 0.7)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
             boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
             backdropFilter: 'blur(10px)'
           }}>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2"
               style={{
                 background: 'rgba(239, 68, 68, 0.1)',
                 border: '1px solid rgba(239, 68, 68, 0.3)'
               }}>
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}
        
        {showSuccessMessage && (
          <div className="mb-4 p-6 rounded-lg border border-green-500/30"
               style={{
                 background: 'rgba(16, 185, 129, 0.1)',
                 backdropFilter: 'blur(5px)'
               }}>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                     style={{
                       boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                     }}>
                  <Check className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-400">Thank You! Your Request Has Been Received.</h3>
              </div>
              
              <div className="space-y-3 text-gray-300">
                <p className="text-lg">We have successfully received your cashout request.</p>
                
                <p className="text-sm">You will be contacted via phone call or WhatsApp to confirm and complete your transaction.</p>
              </div>
            </div>
          </div>
        )}
        
        {!showSuccessMessage && (
          // Cashout Form View
          <form className="space-y-6" noValidate>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Cashout Details</h3>
              

              
              {/* Mobile Number Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number *</label>
                <p className="text-xs text-gray-400 mb-2">We'll contact you on this number to confirm the transaction</p>
                <Input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="border-white/20 text-white"
                  style={{
                    background: 'rgba(46, 71, 68, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(5px)'
                  }}
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
              
              {/* Token Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Token *</label>
                <select
                  value={selectedToken?.symbol || ''}
                  onChange={(e) => {
                    const token = allTokens.find(t => t.symbol === e.target.value);
                    setSelectedToken(token || null);
                  }}
                  className="w-full p-3 rounded-lg border border-white/20 text-white"
                  style={{
                    background: 'rgba(46, 71, 68, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(5px)'
                  }}
                >
                  <option value="">Select a token</option>
                  {allTokens.map((token) => (
                    <option key={token.mint} value={token.symbol}>
                      {token.symbol} - {token.balance.toFixed(Math.min(token.decimals, 6))}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Amount Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount *</label>
                <Input
                  type="number"
                  step={selectedToken?.decimals === 9 ? "0.001" : "0.01"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-white/20 text-white"
                  style={{
                    background: 'rgba(46, 71, 68, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(5px)'
                  }}
                  placeholder={`Enter amount in ${selectedToken?.symbol || 'tokens'}`}
                  max={selectedToken?.balance || 0}
                  required
                />
              </div>

              {/* Quick Select Buttons */}
              {selectedToken && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Quick Select:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const amount = (selectedToken.balance * 0.25).toFixed(Math.min(selectedToken.decimals, 6));
                        setAmount(amount);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                      style={{
                        background: 'rgba(46, 71, 68, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)'
                      }}
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const amount = (selectedToken.balance * 0.5).toFixed(Math.min(selectedToken.decimals, 6));
                        setAmount(amount);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                      style={{
                        background: 'rgba(46, 71, 68, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)'
                      }}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const amount = selectedToken.balance.toFixed(Math.min(selectedToken.decimals, 6));
                        setAmount(amount);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                      style={{
                        background: 'rgba(46, 71, 68, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(5px)'
                      }}
                    >
                      100%
                    </button>
                  </div>
                </div>
              )}


            </div>

            {/* Submit Button */}
            <Button
              onClick={handleFormSubmit}
              disabled={!embeddedWallet || !amount || !selectedToken || !email || !mobileNumber || loading || parseFloat(amount) <= 0 || parseFloat(amount) > (selectedToken?.balance || 0)}
              className="w-full font-medium py-3 rounded-lg transition-all duration-300"
              style={{
                background: loading 
                  ? 'linear-gradient(135deg, rgba(217, 255, 102, 0.6) 0%, rgba(184, 230, 46, 0.6) 100%)'
                  : 'linear-gradient(135deg, #D9FF66 0%, #B8E62E 100%)',
                color: '#000000',
                border: '1px solid rgba(217, 255, 102, 0.3)',
                boxShadow: '0 4px 15px rgba(217, 255, 102, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Submit Cashout Request
                </div>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Gas fees will be sponsored by our platform
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
}