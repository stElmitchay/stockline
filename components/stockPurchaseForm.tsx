"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircle, DollarSign, Upload, AlertCircle, Copy, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StockPurchaseFormProps {
  stockSymbol: string;
  stockName: string;
  stockPrice: string;
  onSuccess?: () => void;
  onAmountChange?: (amount: string) => void;
}

export default function StockPurchaseForm({ 
  stockSymbol, 
  stockName, 
  stockPrice, 
  onSuccess,
  onAmountChange 
}: StockPurchaseFormProps) {
  const { user } = usePrivy();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showUSSDModal, setShowUSSDModal] = useState(false);
  
  // Get user data from Privy
  const userEmail = user?.email?.address || '';
  const solanaWalletAccount = user?.linkedAccounts?.find(
    (account) => account.type === "wallet" && account.chainType === "solana"
  );
  const walletAddress = (solanaWalletAccount as any)?.address || '';

  // Exchange rate (1 USD = 24.5 SLL)
  const USD_TO_SLL_RATE = 24.5;
  
  // Form state - only user-facing fields
  const [formData, setFormData] = useState({
    email: userEmail,
    mobileNumber: '',
    amountInLeones: '',
    stockTicker: stockSymbol,
    walletAddress: walletAddress,
    paymentReceipt: null as File | null,
    confirmation1: false, // "I understand the value of stocks can go up or down."
    confirmation2: false, // General confirmation
    confirmationManualProcess: false // "this transaction is process manually..."
  });
  
  // Calculate USD equivalent and shares
  const usdEquivalent = formData.amountInLeones ? (parseFloat(formData.amountInLeones) / USD_TO_SLL_RATE) : 0;
  const stockPriceNum = parseFloat(stockPrice) || 0;
  const estimatedShares = stockPriceNum > 0 ? (usdEquivalent / stockPriceNum) : 0;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    
    // Notify parent component of amount changes and show USSD modal
    if (field === 'amountInLeones' && typeof value === 'string') {
      if (onAmountChange) {
        onAmountChange(value);
      }
      // Show USSD modal when amount is entered (and not empty)
      if (value.trim() && parseFloat(value) > 0) {
        setShowUSSDModal(true);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, paymentReceipt: file }));
    setError(null);
  };

  const handleCopyUSSD = async () => {
    const ussdCode = `#144*2*2*232864*${formData.amountInLeones}#`;
    try {
      await navigator.clipboard.writeText(ussdCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy USSD code:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.mobileNumber || !formData.amountInLeones) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.confirmation1 || !formData.confirmation2 || !formData.confirmationManualProcess) {
        throw new Error('Please confirm all required checkboxes');
      }

      if (!formData.paymentReceipt) {
        throw new Error('Please upload your payment receipt');
      }

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('email', formData.email);
      submitData.append('mobileNumber', formData.mobileNumber);
      submitData.append('amountInLeones', formData.amountInLeones);
      submitData.append('stockTicker', formData.stockTicker);
      submitData.append('walletAddress', formData.walletAddress);
      submitData.append('confirmation1', formData.confirmation1.toString());
      submitData.append('confirmation2', formData.confirmation2.toString());
      submitData.append('confirmationManualProcess', formData.confirmationManualProcess.toString());
      if (formData.paymentReceipt) {
        submitData.append('paymentReceipt', formData.paymentReceipt);
      }

      // Submit to API
      const response = await fetch('/api/airtable/submit-stock-purchase', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit purchase request');
      }

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }

      // Reset form after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-400" />
          <div>
            <div className="text-green-400 font-semibold">Purchase Request Submitted Successfully!</div>
            <div className="text-gray-300 text-sm mt-1">
              Your request will be processed within 24-48 hours. You will receive a confirmation email shortly.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-2xl shadow-2xl transition-all duration-300"
           style={{
             background: 'rgba(46, 71, 68, 0.7)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
             boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
             backdropFilter: 'blur(10px)'
           }}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-orange-400" />
            <div className="text-orange-400 font-semibold">Authentication Required</div>
          </div>
          <p className="text-gray-300 mb-6">
            Please login to complete your purchase of {stockName} shares.
          </p>
          <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <p className="text-sm text-orange-300">
              You need to be logged in to access the stock purchase form and complete transactions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purchase Details Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Purchase Details</h3>
          
          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number *</label>
            <p className="text-xs text-gray-400 mb-2">This is the number you will be sending the Orange Money payment from</p>
            <Input
              type="tel"
              value={formData.mobileNumber}
              onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
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

          {/* Amount in Leones */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount in Leones *</label>
            <Input
              type="number"
              value={formData.amountInLeones}
              onChange={(e) => handleInputChange('amountInLeones', e.target.value)}
              onFocus={() => setIsAmountFocused(true)}
              onBlur={() => setIsAmountFocused(false)}
              className="border-white/20 text-white"
              style={{
                background: 'rgba(46, 71, 68, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(5px)'
              }}
              placeholder="Enter amount in Leones"
              required
            />
          </div>

           {/* Transaction Summary - Only show when amount field is focused */}
           {isAmountFocused && formData.amountInLeones && (
             <div className="p-4 rounded-lg border border-white/20 transition-all duration-300 ease-in-out"
                  style={{
                    background: 'rgba(46, 71, 68, 0.3)',
                    backdropFilter: 'blur(5px)'
                  }}>
               <h4 className="text-sm font-medium text-gray-300 mb-3">Transaction Summary</h4>
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-400">Amount in Leones:</span>
                   <span className="text-sm text-white font-medium">{parseFloat(formData.amountInLeones).toLocaleString()} SLL</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-400">USD Equivalent:</span>
                   <span className="text-sm text-green-400 font-medium">${usdEquivalent.toFixed(2)} USD</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-400">Stock Price:</span>
                   <span className="text-sm text-white font-medium">${stockPrice} USD</span>
                 </div>
                 <div className="flex justify-between items-center border-t border-white/10 pt-2">
                   <span className="text-sm text-gray-300 font-medium">Estimated Shares:</span>
                   <span className="text-sm text-yellow-400 font-bold">{estimatedShares.toFixed(4)} shares</span>
                 </div>
               </div>
             </div>
           )}



           {/* Payment Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Receipt *</label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                required
              />
              <div className="flex items-center gap-3 p-3 rounded-lg border border-white/20 text-white pointer-events-none"
                   style={{
                     background: 'rgba(46, 71, 68, 0.5)',
                     backdropFilter: 'blur(5px)'
                   }}>
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-sm">
                  {formData.paymentReceipt ? formData.paymentReceipt.name : 'Upload payment receipt'}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmation1}
                onChange={(e) => handleInputChange('confirmation1', e.target.checked)}
                className="mt-1 h-4 w-4 text-green-400 rounded focus:ring-green-400/30 focus:ring-2"
                required
              />
              <span className="text-sm text-gray-300">
                I understand the value of stocks can go up or down. *
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmation2}
                onChange={(e) => handleInputChange('confirmation2', e.target.checked)}
                className="mt-1 h-4 w-4 text-green-400 rounded focus:ring-green-400/30 focus:ring-2"
                required
              />
              <span className="text-sm text-gray-300">
                I agree to the terms and conditions. *
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmationManualProcess}
                onChange={(e) => handleInputChange('confirmationManualProcess', e.target.checked)}
                className="mt-1 h-4 w-4 text-green-400 rounded focus:ring-green-400/30 focus:ring-2"
                required
              />
              <span className="text-sm text-gray-300">
                I understand this transaction is processed manually, may take a few hours, and the final stock price can vary slightly from the estimate. *
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-medium py-3 rounded-lg transition-all duration-300"
          style={{
            background: isSubmitting 
              ? 'linear-gradient(135deg, rgba(217, 255, 102, 0.6) 0%, rgba(184, 230, 46, 0.6) 100%)'
              : 'linear-gradient(135deg, #D9FF66 0%, #B8E62E 100%)',
            color: '#000000',
            border: '1px solid rgba(217, 255, 102, 0.3)',
            boxShadow: '0 4px 15px rgba(217, 255, 102, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              Submitting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Buy Now
            </div>
          )}
        </Button>
      </form>

      {/* USSD Code Modal */}
      {showUSSDModal && formData.amountInLeones && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
             onClick={() => setShowUSSDModal(false)}>
          <div className="max-w-md w-full p-6 rounded-2xl shadow-2xl transition-all duration-300"
               onClick={(e) => e.stopPropagation()}
               style={{
                 background: 'rgba(46, 71, 68, 0.9)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                 backdropFilter: 'blur(10px)'
               }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Smartphone className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Orange Money Payment</h3>
                <p className="text-sm text-gray-400">Copy and dial this code</p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-3">
                Copy this USSD code and dial it on your phone to complete the payment of <span className="text-orange-400 font-semibold">{parseFloat(formData.amountInLeones).toLocaleString()} SLL</span>:
              </p>
              
              <div className="flex items-center gap-2 p-4 rounded-lg border border-white/20"
                    style={{
                      background: 'rgba(46, 71, 68, 0.5)',
                      backdropFilter: 'blur(5px)'
                    }}>
                 <code className="flex-1 text-orange-300 font-mono text-lg font-bold break-all">
                   #144*2*2*232864*{formData.amountInLeones}#
                 </code>
                <Button
                  type="button"
                  onClick={handleCopyUSSD}
                  className="shrink-0 h-10 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium"
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="rounded-lg p-3 mb-4 border border-white/20"
                  style={{
                    background: 'rgba(46, 71, 68, 0.3)',
                    backdropFilter: 'blur(5px)'
                  }}>
               <p className="text-xs text-gray-300 font-medium mb-1">Next Steps:</p>
               <ol className="text-xs text-gray-400 space-y-1">
                 <li>1. Copy the code above</li>
                 <li>2. Dial it on your phone</li>
                 <li>3. Enter your Orange Money PIN</li>
                 <li>4. Take a screenshot of the confirmation</li>
                 <li>5. Upload the screenshot below</li>
               </ol>
             </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowUSSDModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handleCopyUSSD();
                  setShowUSSDModal(false);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Copy & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}