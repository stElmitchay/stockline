"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircle, DollarSign, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StockPurchaseFormProps {
  stockSymbol: string;
  stockName: string;
  stockPrice: string;
  onSuccess?: () => void;
}

export default function StockPurchaseForm({ 
  stockSymbol, 
  stockName, 
  stockPrice, 
  onSuccess 
}: StockPurchaseFormProps) {
  const { user } = usePrivy();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get user data from Privy
  const userEmail = user?.email?.address || '';
  const solanaWalletAccount = user?.linkedAccounts?.find(
    (account) => account.type === "wallet" && account.chainType === "solana"
  );
  const walletAddress = (solanaWalletAccount as any)?.address || '';

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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, paymentReceipt: file }));
  };

  const validateForm = () => {
    if (!formData.email) return "Email is required";
    if (!formData.mobileNumber) return "Mobile number is required";
    if (!formData.amountInLeones) return "Amount in Leones is required";
    if (!formData.walletAddress) return "Wallet address is required";
    if (!formData.confirmation1) return "Please confirm you understand stock value fluctuations";
    if (!formData.confirmation2) return "Please confirm the second checkbox";
    if (!formData.confirmationManualProcess) return "Please confirm you understand the manual processing";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'paymentReceipt' && value instanceof File) {
          submitData.append(key, value);
        } else if (typeof value === 'boolean') {
          submitData.append(key, value.toString());
        } else if (value) {
          submitData.append(key, value.toString());
        }
      });

      const response = await fetch('/api/airtable/submit-stock-purchase', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      setIsSuccess(true);
      onSuccess?.();
      
      // Reset form after success
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

  return (
    <div className="relative overflow-hidden rounded-2xl p-6"
         style={{
           background: '#1A1A1A',
           border: '1px solid rgba(255, 255, 255, 0.1)',
           boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
         }}>
      <h2 className="text-xl font-semibold text-gray-100 mb-6">Purchase Form</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="bg-gray-800/50 border-gray-600 text-white"
            required
          />
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number *</label>
          <Input
            type="tel"
            value={formData.mobileNumber}
            onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
            className="bg-gray-800/50 border-gray-600 text-white"
            placeholder="+1234567890"
            required
          />
        </div>

        {/* Amount in Leones */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount in Leones (SLL) *</label>
          <Input
            type="number"
            value={formData.amountInLeones}
            onChange={(e) => handleInputChange('amountInLeones', e.target.value)}
            className="bg-gray-800/50 border-gray-600 text-white"
            placeholder="0"
            required
          />
        </div>

        {/* Stock Ticker (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stock Ticker</label>
          <Input
            type="text"
            value={formData.stockTicker}
            className="bg-gray-700/50 border-gray-600 text-gray-400"
            readOnly
          />
        </div>

        {/* Wallet Address (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Address</label>
          <Input
            type="text"
            value={formData.walletAddress}
            className="bg-gray-700/50 border-gray-600 text-gray-400 text-xs"
            readOnly
          />
        </div>

        {/* Payment Receipt Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Payment Receipt</label>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
              id="payment-receipt"
            />
            <label
              htmlFor="payment-receipt"
              className="flex items-center gap-2 p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
            >
              <Upload className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300 text-sm">
                {formData.paymentReceipt ? formData.paymentReceipt.name : 'Choose file...'}
              </span>
            </label>
          </div>
        </div>

        {/* Confirmations */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.confirmation1}
              onChange={(e) => handleInputChange('confirmation1', e.target.checked)}
              className="mt-1 h-4 w-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-400"
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
              className="mt-1 h-4 w-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-400"
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
              className="mt-1 h-4 w-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-400"
              required
            />
            <span className="text-sm text-gray-300">
              I understand this transaction is processed manually, may take a few hours, and the final stock price can vary slightly from the estimate. *
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Submit Purchase Request
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}