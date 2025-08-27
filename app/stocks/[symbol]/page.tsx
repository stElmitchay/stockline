"use client";
 
import Link from "next/link";
import stocksData from "@/data/stocks.json";
import { useEffect, useState } from "react";
import React from "react";
import { PriceChart } from "@/components/priceChart";

type Props = {
  params: { symbol: string };
};

const DETAILS: Record<string, { title: string; category: string; objective: string[]; benefits: string[] }> = {
  SPYx: {
    title: "SP500 Stock",
    category: "Tokenized Equities",
    objective: [
      "SP500 Stock (SPYx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "SPYx tracks the price of SPDR S&P 500 ETF Trust (the underlying).",
      "SPYx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the ETF price of SPDR S&P 500 ETF Trust, whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "SPDR S&P 500 ETF Trust (SPY) seeks to track the performance of the S&P 500 Index, representing 500 of the largest publicly traded companies in the U.S. It offers broad exposure to the U.S. equity market and is one of the most widely traded ETFs globally.",
    ],
  },
  TSLAx: {
    title: "Tesla Stock",
    category: "Tokenized Equities",
    objective: [
      "Tesla Stock (TSLAx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "TSLAx tracks the price of Tesla, Inc. (the underlying).",
      "TSLAx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Tesla, Inc., whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Tesla, Inc. designs, develops, manufactures, and sells electric vehicles and energy solutions.",
    ],
  },
  HOODx: {
    title: "Robinhood Stock",
    category: "Tokenized Equities",
    objective: [
      "Robinhood Stock (HOODx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "HOODx tracks the price of Robinhood Markets, Inc. (the underlying).",
      "HOODx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Robinhood Markets, Inc., whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Robinhood offers a platform for users to buy and sell stocks, options, ETFs, and cryptocurrencies with zero trading commissions.",
    ],
  },
  NVDAx: {
    title: "NVIDIA Stock",
    category: "Tokenized Equities",
    objective: [
      "NVIDIA Stock (NVDAx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "NVDAx tracks the price of NVIDIA Corp (the underlying).",
      "NVDAx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of NVIDIA Corp, whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Nvidia builds the AI-powered future, offering a trusted and powerful platform for accessing the broader AI ecosystem.",
    ],
  },
  MSTRx: {
    title: "MicroStrategy Stock",
    category: "Tokenized Equities",
    objective: [
      "MicroStrategy Stock (MSTRx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "MSTRx tracks the price of MicroStrategy Inc. (the underlying).",
      "MSTRx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of MicroStrategy Inc., whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "MicroStrategy provides enterprise analytics and business intelligence solutions and is known for its Bitcoin treasury strategy.",
    ],
  },
  GOOGLx: {
    title: "Alphabet Stock",
    category: "Tokenized Equities",
    objective: [
      "Alphabet Stock (GOOGLx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "GOOGLx tracks the price of Alphabet Inc. Class A (the underlying).",
      "GOOGLx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Alphabet Inc. Class A, whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Alphabet Inc. is the parent company for subsidiaries including Google, YouTube, and Android, as well as other ventures.",
    ],
  },
  METAx: {
    title: "Meta Stock",
    category: "Tokenized Equities",
    objective: [
      "Meta Stock (METAx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "METAx tracks the price of Meta Platforms, Inc (the underlying).",
      "METAx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Meta Platforms, whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Meta Platforms connects people via Facebook, Instagram, Threads, and WhatsApp, and develops VR/AR through Reality Labs.",
    ],
  },
  CRCLx: {
    title: "Circle Stock",
    category: "Tokenized Equities",
    objective: [
      "Circle Stock (CRCLx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "CRCLx tracks the price of Circle Internet Group (the underlying).",
      "CRCLx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Circle Internet Group, whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Circle is best known as the issuer of USDC and provides payments and Web3 infrastructure.",
    ],
  },
  COINx: {
    title: "Coinbase Stock",
    category: "Tokenized Equities",
    objective: [
      "Coinbase Stock (COINx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "COINx tracks the price of Coinbase Global, Inc. (the underlying).",
      "COINx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Coinbase Global, Inc., whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Coinbase is a leading cryptocurrency exchange for individuals and institutions.",
    ],
  },
  AAPLx: {
    title: "Apple Stock",
    category: "Tokenized Equities",
    objective: [
      "Apple Stock (AAPLx) is a tracker certificate issued as Solana SPL and ERC-20 tokens.",
      "AAPLx tracks the price of Apple Inc. (the underlying).",
      "AAPLx is designed to give eligible cryptocurrency market participants regulatory-compliant access to the stock price of Apple Inc., whilst maintaining the benefits of blockchain technology.",
    ],
    benefits: [
      "Apple designs, manufactures, and markets consumer electronics and services globally.",
    ],
  },
};

export default function StockDetailsPage({ params }: Props) {
  const symbolParam = decodeURIComponent(params.symbol || "");
  const stock = stocksData.xStocks.find((s) => s.symbol.toLowerCase() === symbolParam.toLowerCase());

  if (!stock) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link href="/stocks" className="text-gray-300 hover:text-white">← Back to Stocks</Link>
          <h1 className="text-2xl font-bold text-white mt-6">Stock not found</h1>
        </div>
      </div>
    );
  }

  const details = DETAILS[stock.symbol] || null;

  // no local sparkline; use reusable chart component for consistency

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link href="/stocks" className="text-gray-300 hover:text-white">← Back to Stocks</Link>

        <div className="mt-6 flex items-center gap-4">
          {stock.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stock.logoUrl} alt={`${stock.symbol} logo`} className="h-12 w-12 rounded" />
          ) : null}
          <div>
            <h1 className="text-3xl font-bold text-white">{stock.symbol}</h1>
            <p className="text-gray-300">{details?.title || stock.name}</p>
            <p className="text-xs text-gray-400 mt-1">{details?.category || 'Tokenized Equities'}</p>
          </div>
        </div>

        {/* Price chart (wallet-style) */}
        <div className="mt-6">
          <PriceChart symbol={stock.symbol} currentPrice={Number(stock.price) || 0} />
        </div>

        {details ? (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Investment Objective</h2>
              <div className="space-y-3 text-gray-200">
                {details.objective.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Key Benefits</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-200">
                {details.benefits.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <p className="mt-8 text-gray-300">Details coming soon.</p>
        )}

        <div className="mt-8">
          <Link href={`/purchase?symbol=${encodeURIComponent(stock.symbol)}&name=${encodeURIComponent(stock.name)}`} className="block">
            <div className="w-full text-center px-5 py-4 font-semibold rounded-lg" style={{ background: '#D9FF66', color: '#000' }}>
              Order {stock.symbol}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}


