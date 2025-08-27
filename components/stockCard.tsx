"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Copy, ExternalLink, Eye, ShoppingCart, Loader2, ArrowUp, ArrowDown, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stock } from "@/types/stock";
import { formatPrice, formatMarketCap, formatVolume, formatAddress } from "@/utils/formatters";
import { API_CONFIG, EXTERNAL_URLS } from "@/constants";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

interface StockCardProps {
  stock: Stock;
}

export function StockCard({ stock }: StockCardProps) {
  const [copied, setCopied] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const { user, authenticated, login } = usePrivy();

  // Check if this stock has been loaded (has a valid price)
  const isLoaded = (stock.price ?? 0) > 0;
  const isPositive = (stock.change24h ?? 0) >= 0;
  const isAvailable = stock.isAvailable ?? false;

  // Handle notify me functionality
  const handleNotifyMe = async () => {
    if (!authenticated) {
      // If user is not authenticated, prompt them to login
      login();
      return;
    }

    // Get user email and wallet address
    const userEmail = user?.email?.address;
    const solanaWalletAccount = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana"
    );
    const walletAddress = (solanaWalletAccount as any)?.address;

    if (!userEmail || !walletAddress) {
      alert('Please ensure you have an email and connected wallet to receive notifications.');
      return;
    }

    setIsNotifying(true);

    try {
      const response = await fetch('/api/airtable/submit-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          walletAddress: walletAddress,
          stockTicker: stock.symbol
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit notification request');
      }

      setNotificationSent(true);
    } catch (error) {
      console.error('Error submitting notification:', error);
      alert('Failed to submit notification request. Please try again.');
    } finally {
      setIsNotifying(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), API_CONFIG.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Generate mock price data for the mini chart
  const generatePriceData = () => {
    const basePrice = stock.price || 100;
    const changePercent = stock.change24h || 0;
    const data = [];
    
    // Generate 7 data points that reflect the actual trend
    for (let i = 0; i < 7; i++) {
      // Start from 6 days ago and work towards current price
      const daysAgo = 6 - i;
      const progress = daysAgo / 6; // 0 = current, 1 = 6 days ago
      
      // Calculate the price at this point in time
      // If change24h is +5%, we want the price 6 days ago to be ~5% lower
      const historicalChange = changePercent * progress;
      const priceAtTime = basePrice / (1 + (changePercent / 100)) * (1 + (historicalChange / 100));
      
      // Add some realistic daily variation (±2% per day)
      const dailyVariation = (Math.random() - 0.5) * 0.04;
      const finalPrice = priceAtTime * (1 + dailyVariation);
      
      data.push(finalPrice);
    }
    
    return data.reverse(); // Reverse so most recent is last
  };

  const priceData = generatePriceData();
  const maxPrice = Math.max(...priceData);
  const minPrice = Math.min(...priceData);
  
  // Determine if the overall trend is positive based on first vs last price
  const firstPrice = priceData[0];
  const lastPrice = priceData[priceData.length - 1];
  const chartTrend = lastPrice > firstPrice;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
      !isLoaded ? 'opacity-70' : ''
    }`}
    style={{
      background: '#1A1A1A',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    }}>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
              {stock.logoUrl ? (
                <img 
                  src={stock.logoUrl} 
                  alt={`${stock.name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = stock.symbol.slice(0, 2);
                      parent.className = "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg";
                      parent.style.background = 'linear-gradient(135deg, #D9FF66 0%, #B8E62E 100%)';
                      parent.style.boxShadow = '0 4px 15px rgba(217, 255, 102, 0.3)';
                    }
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                     style={{ 
                       background: 'linear-gradient(135deg, #D9FF66 0%, #B8E62E 100%)',
                       boxShadow: '0 4px 15px rgba(217, 255, 102, 0.3)'
                     }}>
                  {stock.symbol.slice(0, 2)}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg group-hover:text-yellow-300 transition-colors">
                {stock.name}
              </h3>
              <p className="text-gray-300 text-sm font-mono">{stock.symbol}</p>
            </div>
          </div>
          
          {/* Price and Change - Moved to upper right */}
          <div className="text-right">
            {!isLoaded ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#D9FF66' }} />
                <span className="text-xs" style={{ color: '#D9FF66' }}>Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-xl font-bold text-white mb-1">
                  {formatPrice(stock.price)}
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium justify-end ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                  {isPositive ? '+' : ''}{(stock.change24h ?? 0).toFixed(2)}%
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mini Price Chart */}
        {isLoaded && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-300">7-day trend</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartTrend ? '#4CAF50' : '#EF4444' }}></div>
                <span className="text-xs text-gray-300">{chartTrend ? 'Up' : 'Down'}</span>
              </div>
            </div>
            <div className="h-16 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex items-center justify-between opacity-20">
                <div className="w-full h-px bg-gray-400"></div>
                <div className="w-full h-px bg-gray-400"></div>
                <div className="w-full h-px bg-gray-400"></div>
              </div>
              
              {/* Line chart */}
              <svg className="absolute inset-0 w-full h-full">
                <path 
                  d={`M 0 ${((maxPrice - priceData[0]) / (maxPrice - minPrice)) * 60} ${priceData.map((price, i) => {
                    const x = (i / (priceData.length - 1)) * 100;
                    const y = ((maxPrice - price) / (maxPrice - minPrice)) * 60;
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  stroke={chartTrend ? '#4CAF50' : '#EF4444'}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points */}
                {priceData.map((price, i) => {
                  const x = (i / (priceData.length - 1)) * 100;
                  const y = ((maxPrice - price) / (maxPrice - minPrice)) * 60;
                  return (
                    <circle
                      key={i}
                      cx={`${x}%`}
                      cy={y}
                      r="2"
                      fill={chartTrend ? '#4CAF50' : '#EF4444'}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}

        {/* Stats with Color-coded Bullets */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#4CAF50' }}></div>
              <span className="text-gray-300 text-sm">Market Cap</span>
            </div>
            <span className="text-white font-medium">
              {isLoaded ? formatMarketCap(stock.marketCap) : (
                <div className="h-4 w-16 bg-gray-600/50 rounded animate-pulse"></div>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#8C66FF' }}></div>
              <span className="text-gray-300 text-sm">24h Volume</span>
            </div>
            <span className="text-white font-medium">
              {isLoaded ? formatVolume(stock.volume24h) : (
                <div className="h-4 w-16 bg-gray-600/50 rounded animate-pulse"></div>
              )}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isAvailable ? (
            <>
              <Link href={`/purchase?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}&price=${stock.price}`} className="block">
                <Button 
                  size="sm" 
                  className="w-full font-semibold"
                  style={{
                    background: isLoaded ? '#D9FF66' : '#4A5568',
                    border: 'none',
                    color: isLoaded ? '#000000' : '#9CA3AF'
                  }}
                  disabled={!isLoaded}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isLoaded ? 'Order Now' : 'Loading...'}
                </Button>
              </Link>
              <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className="block">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                className="w-full font-semibold"
                style={{
                  background: '#4A5568',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'not-allowed'
                }}
                disabled={true}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full border-gray-600 text-gray-300"
                onClick={handleNotifyMe}
                disabled={isNotifying || notificationSent}
                style={{
                  background: notificationSent ? '#4CAF50' : undefined,
                  borderColor: notificationSent ? '#4CAF50' : undefined,
                  color: notificationSent ? '#FFFFFF' : undefined
                }}
              >
                {isNotifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : notificationSent ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Notification Sent
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Notify Me
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}