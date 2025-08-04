"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircle, DollarSign, Upload, AlertCircle, Copy, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import stocksData from "@/data/stocks.json";

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
  const [receiptData, setReceiptData] = useState<any>(null);
  const [stockLogoUrl, setStockLogoUrl] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Find stock logo URL from stocks data
  useEffect(() => {
    const stock = stocksData.xStocks.find(s => s.symbol === stockSymbol);
    setStockLogoUrl(stock?.logoUrl || null);
  }, [stockSymbol]);
  
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
    
    // Notify parent component of amount changes
    if (field === 'amountInLeones' && typeof value === 'string') {
      if (onAmountChange) {
        onAmountChange(value);
      }
    }
  };

  const handleAmountBlur = () => {
    setIsAmountFocused(false);
    // Show USSD modal when user finishes typing and amount is valid
    if (formData.amountInLeones.trim() && parseFloat(formData.amountInLeones) > 0) {
      setShowUSSDModal(true);
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

  const generateReceiptData = () => {
    const timestamp = new Date().toLocaleString();
    const usdEquivalent = parseFloat(formData.amountInLeones) / USD_TO_SLL_RATE;
    const estimatedShares = parseFloat(stockPrice) > 0 ? (usdEquivalent / parseFloat(stockPrice)) : 0;
    
    return {
      timestamp,
      stockSymbol,
      stockName,
      stockPrice,
      amountInLeones: formData.amountInLeones,
      usdEquivalent: usdEquivalent.toFixed(2),
      estimatedShares: estimatedShares.toFixed(4),
      mobileNumber: formData.mobileNumber,
      walletAddress: formData.walletAddress,
      email: formData.email
    };
  };

  const downloadReceipt = async () => {
    if (!receiptData) return;
    
    try {
      // Create canvas manually to avoid CSS parsing issues
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      // Set canvas dimensions to match receipt
      canvas.width = 400;
      canvas.height = 700;
      
      // Background
      ctx.fillStyle = '#2E4744';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw patterned edges
      const drawPatternedEdge = (side: 'left' | 'right' | 'bottom') => {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        
        if (side === 'left') {
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(16, canvas.height);
          ctx.stroke();
          
          // Pattern fill
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          for (let y = 0; y < canvas.height; y += 20) {
            ctx.fillRect(0, y, 16, 12);
          }
        } else if (side === 'right') {
          ctx.beginPath();
          ctx.moveTo(canvas.width - 16, 0);
          ctx.lineTo(canvas.width - 16, canvas.height);
          ctx.stroke();
          
          // Pattern fill
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          for (let y = 0; y < canvas.height; y += 20) {
            ctx.fillRect(canvas.width - 16, y, 16, 12);
          }
        } else if (side === 'bottom') {
          ctx.beginPath();
          ctx.moveTo(0, canvas.height - 16);
          ctx.lineTo(canvas.width, canvas.height - 16);
          ctx.stroke();
          
          // Pattern fill
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          for (let x = 0; x < canvas.width; x += 20) {
            ctx.fillRect(x, canvas.height - 16, 12, 16);
          }
        }
      };
      
      drawPatternedEdge('left');
      drawPatternedEdge('right');
      drawPatternedEdge('bottom');
      
      // Reset line dash
      ctx.setLineDash([]);
      
      // Draw stock logo/icon with gradient background
      const drawStockLogo = () => {
        const centerX = canvas.width / 2;
        const centerY = 80;
        const radius = 32;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
        gradient.addColorStop(0, '#F59E0B');
        gradient.addColorStop(1, '#10B981');
        
        // Draw circle with gradient
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw stock symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(receiptData.stockSymbol.charAt(0), centerX, centerY + 8);
        
        // Draw checkmark icon
        const checkX = centerX + 20;
        const checkY = centerY + 20;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(checkX, checkY, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw check symbol
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(checkX - 4, checkY);
        ctx.lineTo(checkX - 1, checkY + 3);
        ctx.lineTo(checkX + 4, checkY - 2);
        ctx.stroke();
      };
      
      drawStockLogo();
      
      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Stock Purchase Order', canvas.width / 2, 150);
      
      // Stock symbol and name
      ctx.font = '16px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`${receiptData.stockSymbol} • ${receiptData.stockName}`, canvas.width / 2, 175);
      
      // Transaction details section
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Transaction Details', canvas.width / 2, 220);
      
      // Content area with margin for patterns
      const contentMargin = 30;
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      
      // Details with icons
      const details = [
        ['📦 Item:', receiptData.stockName],
        ['💰 Price:', `$${receiptData.usdEquivalent}`],
        ['💵 Amount (SLL):', `${parseFloat(receiptData.amountInLeones).toLocaleString()} SLL`],
        ['📅 Date:', new Date(receiptData.timestamp).toLocaleDateString()],
        ['📱 Mobile:', receiptData.mobileNumber],
        ['👛 Wallet:', `${receiptData.walletAddress.slice(0, 8)}...${receiptData.walletAddress.slice(-8)}`]
      ];
      
      let yPos = 260;
      details.forEach(([label, value]) => {
        ctx.fillStyle = '#cccccc';
        ctx.fillText(label, contentMargin, yPos);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(value, 180, yPos);
        ctx.font = '14px Arial';
        yPos += 35;
      });
      
      // Separator line
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentMargin, yPos + 10);
      ctx.lineTo(canvas.width - contentMargin, yPos + 10);
      ctx.stroke();
      
      // Total section
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Total:', contentMargin, yPos + 50);
      ctx.fillText(`$${receiptData.usdEquivalent}`, 180, yPos + 50);
      
      // Footer
      ctx.font = '14px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.textAlign = 'center';
      ctx.fillText('Thank you for your purchase!', canvas.width / 2, canvas.height - 50);
      
      // Download
      const link = document.createElement('a');
      link.download = `stock-purchase-receipt-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      console.log('Receipt generated successfully with full styling');
    } catch (error) {
      console.error('Error generating receipt:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      alert('Failed to generate receipt image. Please try again.');
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
      submitData.append('transactionType', 'CashIn'); // Automatically set to CashIn for purchases
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

      // Generate receipt data
      const receipt = generateReceiptData();
      setReceiptData(receipt);
      
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }

      // Receipt will remain visible until user manually closes it

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess && receiptData) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        {/* Receipt */}
        <div 
          ref={receiptRef}
          className="p-8 relative"
          style={{
            background: 'rgba(46, 71, 68, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            borderRadius: '0px'
          }}
        >
          {/* Left side cut pattern */}
          <div className="absolute left-0 top-0 bottom-0 w-4" style={{
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 8px, rgba(255,255,255,0.2) 8px, rgba(255,255,255,0.2) 12px)',
            borderLeft: '2px dashed rgba(255,255,255,0.3)'
          }}></div>
          
          {/* Right side cut pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-4" style={{
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 8px, rgba(255,255,255,0.2) 8px, rgba(255,255,255,0.2) 12px)',
            borderRight: '2px dashed rgba(255,255,255,0.3)'
          }}></div>
          
          {/* Bottom cut pattern */}
          <div className="absolute bottom-0 left-0 right-0 h-4" style={{
            background: 'repeating-linear-gradient(to right, transparent 0px, transparent 8px, rgba(255,255,255,0.2) 8px, rgba(255,255,255,0.2) 12px)',
            borderBottom: '2px dashed rgba(255,255,255,0.3)'
          }}></div>
          {/* Content with margins for cut patterns */}
           <div className="mx-6 mb-6">
           {/* Header with Stock Logo */}
           <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center relative">
              {stockLogoUrl ? (
                <img 
                  src={stockLogoUrl} 
                  alt={`${receiptData.stockName} logo`}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    // Fallback to initials if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, #F59E0B 0%, #10B981 100%)"><span class="text-2xl font-bold text-white">${receiptData.stockSymbol.charAt(0)}</span></div>`;
                    }
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #10B981 100%)' }}>
                  <span className="text-2xl font-bold text-white">{receiptData.stockSymbol.charAt(0)}</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Stock Purchase Order</h1>
            <p className="text-gray-300 text-sm">{receiptData.stockSymbol} • {receiptData.stockName}</p>
          </div>

          {/* Transaction Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Transaction details</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Item</span>
                <span className="text-white font-medium">{receiptData.stockName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Price</span>
                <span className="text-white font-medium">${receiptData.usdEquivalent}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Quantity</span>
                <span className="text-white font-medium">{receiptData.estimatedShares} shares</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Method</span>
                <span className="text-white font-medium">Mobile Money</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Amount (SLL)</span>
                <span className="text-white font-medium">{parseFloat(receiptData.amountInLeones).toLocaleString()} SLL</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Date</span>
                <span className="text-white font-medium">{new Date(receiptData.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="border-t border-white/20 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">Total:</span>
                <span className="text-lg font-bold text-white">${receiptData.usdEquivalent}</span>
              </div>
            </div>
          </div>

          {/* Decorative Pattern Section */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="flex justify-center items-center space-x-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(45deg, #F59E0B, #EAB308)' }}></div>
              <div className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(45deg, #10B981, #059669)' }}></div>
              <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(45deg, #8B5CF6, #7C3AED)' }}></div>
              <div className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(45deg, #EF4444, #DC2626)' }}></div>
              <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(45deg, #3B82F6, #2563EB)' }}></div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-2 rounded-full mx-auto" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              </div>
            </div>
            
            <div className="flex justify-center mt-3">
              <svg width="120" height="20" viewBox="0 0 120 20" className="opacity-30">
                <defs>
                  <linearGradient id="patternGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="25%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="75%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <path d="M0 10 Q30 5 60 10 T120 10" stroke="url(#patternGradient)" strokeWidth="2" fill="none" />
                <circle cx="20" cy="10" r="2" fill="#F59E0B" opacity="0.6" />
                <circle cx="40" cy="8" r="1.5" fill="#10B981" opacity="0.6" />
                <circle cx="60" cy="12" r="2" fill="#8B5CF6" opacity="0.6" />
                <circle cx="80" cy="8" r="1.5" fill="#EF4444" opacity="0.6" />
                <circle cx="100" cy="10" r="2" fill="#3B82F6" opacity="0.6" />
              </svg>
            </div>
          </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="p-6 rounded-2xl border border-green-500/30"
             style={{
               background: 'rgba(46, 71, 68, 0.9)',
               backdropFilter: 'blur(10px)'
             }}>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <h3 className="text-xl font-bold text-green-400">Thank You! Your Order is in the Queue.</h3>
            </div>
            
            <div className="space-y-3 text-gray-300">
              <p className="text-lg">We have successfully received your request.</p>
              
              <p className="text-sm">Our team will process your order, and you will receive a final confirmation call or WhatsApp notification before order is completed.</p>
              
              <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/10">
                <p className="text-sm text-orange-300 font-medium">
                  All orders are processed during our business hours (Mon-Fri, 9am-5pm).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={downloadReceipt}
            className="w-full flex items-center justify-center gap-2 !text-black font-semibold hover:opacity-90"
            style={{
              background: '#D9FF66',
              borderRadius: '12px',
              border: 'none'
            }}
          >
            <Download className="h-4 w-4 text-black" />
            Download Receipt
          </Button>
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

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
              onBlur={handleAmountBlur}
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