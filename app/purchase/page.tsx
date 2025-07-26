"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, DollarSign, TrendingUp, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/navigation";
import { formatPrice } from "@/utils/formatters";

interface FormData {
  fullName: string;
  phoneNumber: string;
  address: string;
  amountSLL: string;
}

interface Confirmations {
  riskUnderstanding: boolean;
  walletConfirmation: boolean;
  otcUnderstanding: boolean;
  rateAgreement: boolean;
}

function PurchaseForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phoneNumber: '',
    address: '',
    amountSLL: ''
  });
  const [confirmations, setConfirmations] = useState<Confirmations>({
    riskUnderstanding: false,
    walletConfirmation: false,
    otcUnderstanding: false,
    rateAgreement: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Stock information from URL params
  const stockSymbol = searchParams.get('symbol') || '';
  const stockName = searchParams.get('name') || '';
  const stockPrice = parseFloat(searchParams.get('price') || '0');

  // Exchange rate (this would typically come from an API)
  const exchangeRate = 22000; // 1 USD = 22,000 SLL
  const amountUSD = parseFloat(formData.amountSLL) / exchangeRate || 0;
  const estimatedShares = amountUSD / stockPrice || 0;

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmationChange = (field: keyof Confirmations, checked: boolean) => {
    setConfirmations(prev => ({ ...prev, [field]: checked }));
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim() !== '' &&
      formData.phoneNumber.trim() !== '' &&
      formData.address.trim() !== '' &&
      formData.amountSLL.trim() !== '' &&
      parseFloat(formData.amountSLL) > 0 &&
      Object.values(confirmations).every(Boolean)
    );
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      address: '',
      amountSLL: ''
    });
    setConfirmations({
      riskUnderstanding: false,
      walletConfirmation: false,
      otcUnderstanding: false,
      rateAgreement: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would typically send the data to your backend
      console.log('Purchase request:', {
        ...formData,
        stockSymbol,
        stockName,
        stockPrice,
        amountSLL: parseFloat(formData.amountSLL),
        amountUSD,
        estimatedShares,
        exchangeRate,
        confirmations
      });
      
      // Show success state
      setIsSuccess(true);
      
      // Clear form data after successful submission
      resetForm();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Purchase request failed:', error);
      alert('Purchase request failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/stocks"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Purchase Stock
            </h1>
            <p className="text-gray-400 mt-1">
              Complete your stock purchase with secure OTC transaction
            </p>
          </div>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Personal Information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      className="bg-gray-800/50 border-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="+232 XX XXX XXXX"
                      className="bg-gray-800/50 border-gray-700"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address *
                    </label>
                    <Input
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter your full address"
                      className="bg-gray-800/50 border-gray-700"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Stock Details
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Stock Symbol
                    </label>
                    <Input
                      value={stockSymbol}
                      readOnly
                      className="bg-gray-800/30 border-gray-700 text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Stock Name
                    </label>
                    <Input
                      value={stockName}
                      readOnly
                      className="bg-gray-800/30 border-gray-700 text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current Price (USD)
                    </label>
                    <Input
                      value={formatPrice(stockPrice)}
                      readOnly
                      className="bg-gray-800/30 border-gray-700 text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Receiving Platform
                    </label>
                    <Input
                      value="In-App Wallet"
                      readOnly
                      className="bg-gray-800/30 border-gray-700 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Purchase Amount */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                  Purchase Amount
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount in Leones (SLL) *
                    </label>
                    <Input
                      type="number"
                      value={formData.amountSLL}
                      onChange={(e) => handleInputChange('amountSLL', e.target.value)}
                      placeholder="Enter amount in SLL"
                      className="bg-gray-800/50 border-gray-700"
                      min="1"
                      required
                    />
                  </div>
                  
                  {formData.amountSLL && (
                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-800/30 rounded-xl">
                      <div>
                        <div className="text-sm text-gray-400">USD Equivalent</div>
                        <div className="text-lg font-semibold text-green-400">
                          {formatPrice(amountUSD)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Estimated Shares</div>
                        <div className="text-lg font-semibold text-blue-400">
                          {estimatedShares.toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Exchange Rate</div>
                        <div className="text-lg font-semibold text-yellow-400">
                          1 USD = {exchangeRate.toLocaleString()} SLL
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Section */}
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Confirmation
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      key: 'riskUnderstanding' as keyof Confirmations,
                      text: 'I understand the value of stocks can go up or down.'
                    },
                    {
                      key: 'walletConfirmation' as keyof Confirmations,
                      text: 'I confirm the wallet details are correct.'
                    },
                    {
                      key: 'otcUnderstanding' as keyof Confirmations,
                      text: 'I understand this is a manual OTC transaction.'
                    },
                    {
                      key: 'rateAgreement' as keyof Confirmations,
                      text: 'I agree to the current exchange rate and final share estimate.'
                    }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmations[item.key]}
                        onChange={(e) => handleConfirmationChange(item.key, e.target.checked)}
                        className="mt-1 w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500"
                      />
                      <span className="text-gray-300 text-sm leading-relaxed">
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid() || isSubmitting}
                className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Submit Purchase Request'}
              </Button>
            </form>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Purchase Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stock</span>
                    <span className="font-medium">{stockSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price per Share</span>
                    <span className="font-medium">{formatPrice(stockPrice)}</span>
                  </div>
                  {formData.amountSLL && (
                    <>
                      <div className="border-t border-gray-700 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount (SLL)</span>
                          <span className="font-medium">{parseFloat(formData.amountSLL).toLocaleString()} SLL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount (USD)</span>
                          <span className="font-medium">{formatPrice(amountUSD)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Est. Shares</span>
                          <span className="font-medium text-green-400">{estimatedShares.toFixed(4)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-sm text-blue-400 font-medium mb-1">Important Note</div>
                  <div className="text-xs text-gray-300">
                    This is an OTC (Over-The-Counter) transaction. Your request will be processed manually within 24-48 hours.
                  </div>
                </div>
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-gray-400">Loading purchase form...</div>
        </div>
      </div>
    }>
      <PurchaseForm />
    </Suspense>
  );
}