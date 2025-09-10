"use client";

import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import React from "react";

type Props = {
  symbol: string;
  currentPrice: number;
};

// Deterministic pseudo-random based on symbol
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function PriceChart({ symbol, currentPrice }: Props) {
  const points = React.useMemo(() => {
    const length = 30;
    const base = currentPrice > 0 ? currentPrice * 0.9 : 100;
    const target = currentPrice > 0 ? currentPrice : 110;
    const growth = (target - base) / (length - 1);
    const vals: number[] = [];
    for (let i = 0; i < length; i++) {
      const n = seededRandom(symbol.split('').reduce((a, c, idx) => a + c.charCodeAt(0) * (idx + 1), i + 1));
      const noise = (n - 0.5) * (currentPrice > 0 ? currentPrice * 0.03 : 3);
      vals.push(base + i * growth + noise);
    }
    return vals;
  }, [symbol, currentPrice]);

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 120;
  const pathD = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = ((max - v) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  const isPositive = points[points.length - 1] >= points[0];
  const pct = points[0] > 0 ? ((points[points.length - 1] - points[0]) / points[0]) * 100 : 0;

  const usd = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);

  return (
    <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #D9FF66 0%, #B8E62E 100%)', boxShadow: '0 4px 15px rgba(217, 255, 102, 0.3)' }}>
            <TrendingUp className="h-5 w-5 text-black" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Price Trend</h3>
            <p className="text-gray-300 text-sm">Last 30 points</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? '+' : ''}{pct.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-400">{points.length} points</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-300">Price (USD)</span>
          <div className="flex items-center gap-2 text-white font-medium">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span>{usd(points[points.length - 1])}</span>
          </div>
        </div>

        <div className="h-32 relative">
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`}>
            <path d={pathD} stroke={isPositive ? '#4CAF50' : '#EF4444'} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}







