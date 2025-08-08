"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, CheckCircle, DollarSign, TrendingUp, Shield, Clock, User } from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/navigation";
import StockPurchaseForm from "@/components/stockPurchaseForm";
import SuccessImageModal from "@/components/modals/successImageModal";

function PurchaseForm() {
  const searchParams = useSearchParams();
  const { user, authenticated } = usePrivy();
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userAmount, setUserAmount] = useState('');

  // Stock information from URL params
  const stockSymbol = searchParams.get('symbol') || '';
  const stockName = searchParams.get('name') || '';
  const stockPrice = searchParams.get('price') || '';
  
  // Exchange rate and calculations
  const USD_TO_SLL_RATE = 24.5;
  const usdEquivalent = userAmount ? (parseFloat(userAmount) / USD_TO_SLL_RATE) : 0;

  // Get user data from Privy
  const userEmail = user?.email?.address || '';
  const solanaWalletAccount = user?.linkedAccounts?.find(
    (account) => account.type === "wallet" && account.chainType === "solana"
  );
  const walletAddress = (solanaWalletAccount as any)?.address || '';

  const handleFormSuccess = () => {
    // Show success modal immediately
    setShowSuccessModal(true);
  };
  
  // Handle closing the success modal
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Don't show the success message again
    setShowSuccessMessage(false);
  };

  // Listen for form submission success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'airtable-form-submitted') {
        setIsSuccess(true);
        // Success state will remain until user navigates away
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

            {/* Success Message - Only show if showSuccessMessage is true */}
            {isSuccess && showSuccessMessage && (
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

        {/* Success Modal */}
        <SuccessImageModal isOpen={showSuccessModal} onClose={handleCloseSuccessModal} />
        
        {/* Transaction Summary section has been removed */}
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