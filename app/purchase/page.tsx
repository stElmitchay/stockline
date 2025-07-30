"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, CheckCircle, DollarSign, TrendingUp, Shield, Clock, User } from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/navigation";
import StockPurchaseForm from "@/components/stockPurchaseForm";

function PurchaseForm() {
  const searchParams = useSearchParams();
  const { user, authenticated } = usePrivy();
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [userAmount, setUserAmount] = useState('');

  // Stock information from URL params
  const stockSymbol = searchParams.get('symbol') || '';
  const stockName = searchParams.get('name') || '';
  const stockPrice = searchParams.get('price') || '';
  
  // Exchange rate and calculations
  const USD_TO_SLL_RATE = 24.5;
  const usdEquivalent = userAmount ? (parseFloat(userAmount) / USD_TO_SLL_RATE) : 0;
  const stockPriceNum = parseFloat(stockPrice || '0') || 0;
  const estimatedShares = stockPriceNum > 0 ? (usdEquivalent / stockPriceNum) : 0;

  // Get user data from Privy
  const userEmail = user?.email?.address || '';
  const solanaWalletAccount = user?.linkedAccounts?.find(
    (account) => account.type === "wallet" && account.chainType === "solana"
  );
  const walletAddress = (solanaWalletAccount as any)?.address || '';

  const handleFormSuccess = () => {
    setShowSuccessMessage(true);
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
      window.location.href = '/stocks';
    }, 5000);
  };

  // Listen for form submission success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'airtable-form-submitted') {
        setIsSuccess(true);
        // Hide success message after 5 seconds and redirect to stocks page
        setTimeout(() => {
          setIsSuccess(false);
          window.location.href = '/stocks';
        }, 5000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
      <Navigation />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Hero Section - Mobile First */}
        <div className="mb-8 pt-16">
          <div className="max-w-4xl mx-auto">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-6">
              <Link
                href="/stocks"
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-100 mb-2">Purchase Stock</h1>
                <p className="text-gray-400">Please fill out the form below to complete your purchase.</p>
              </div>
            </div>

            {/* Success Message */}
            {isSuccess && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="text-green-400 font-semibold">Purchase Request Submitted Successfully!</div>
                    <div className="text-gray-300 text-sm mt-1">
                      Your request will be processed within 24-48 hours. You will receive a confirmation email shortly.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Purchase Form */}
        <div className="max-w-4xl mx-auto mb-6">
          <StockPurchaseForm
            stockSymbol={stockSymbol || ''}
            stockName={stockName || ''}
            stockPrice={stockPrice || ''}
            onSuccess={handleFormSuccess}
            onAmountChange={setUserAmount}
          />
        </div>

        {/* Purchase Summary Card - Matching Stock Card Styling */}
        <div className="max-w-4xl mx-auto">
          <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300`}
               style={{
                 background: 'rgba(46, 71, 68, 0.7)',
                 border: '1px solid rgba(255, 255, 255, 0.1)',
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                 backdropFilter: 'blur(10px)'
               }}>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                       style={{ 
                         background: 'linear-gradient(135deg, #D9FF66 0%, #B8E62E 100%)',
                         boxShadow: '0 4px 15px rgba(217, 255, 102, 0.3)'
                       }}>
                    <DollarSign className="h-6 w-6" style={{ color: '#000000' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Transaction Summary</h3>
                    <p className="text-gray-300 text-sm">Purchase Details</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                     style={{ backgroundColor: 'rgba(217, 255, 102, 0.1)', border: '1px solid rgba(217, 255, 102, 0.3)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D9FF66' }}></div>
                  <span className="text-xs font-medium" style={{ color: '#D9FF66' }}>Ready</span>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#4CAF50' }}></div>
                    <span className="text-gray-300 text-sm">You are buying</span>
                  </div>
                  <span className="text-white font-medium">{stockSymbol || 'Stock'}</span>
                </div>
                
                {userAmount && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#8C66FF' }}></div>
                        <span className="text-gray-300 text-sm">Amount in Leones</span>
                      </div>
                      <span className="text-white font-medium">{parseFloat(userAmount).toLocaleString()} SLL</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#4CAF50' }}></div>
                        <span className="text-gray-300 text-sm">USD Equivalent</span>
                      </div>
                      <span className="text-green-400 font-medium">${usdEquivalent.toFixed(2)} USD</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#D9FF66' }}></div>
                        <span className="text-gray-300 text-sm">Estimated Shares</span>
                      </div>
                      <span className="text-yellow-400 font-bold">{estimatedShares.toFixed(4)} shares</span>
                    </div>
                  </>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#FF6B6B' }}></div>
                    <span className="text-gray-300 text-sm">Will arrive in wallet</span>
                  </div>
                  <span className="text-white font-medium">1-2 hours</span>
                </div>
              </div>

              {/* Important Notes */}
              <div className="space-y-3">
                {/* Removed the processing time and secure OTC transaction cards */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PurchasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-gray-300">Loading purchase form...</div>
          </div>
        </div>
      </div>
    }>
      <PurchaseForm />
    </Suspense>
  );
}