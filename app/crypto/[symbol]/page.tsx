"use client";

import Link from "next/link";
import { PriceChart } from "@/components/priceChart";
import { useCrypto } from "@/hooks/useCrypto";
import { Loader2 } from "lucide-react";
import { use } from "react";

// Inline prop typing to avoid PageProps constraint issues

const DETAILS: Record<string, { title: string; category: string; objective: string[]; benefits: string[] }> = {
  SOL: {
    title: "Solana",
    category: "Blockchain Platform",
    objective: [
      "Solana (SOL) is a high-performance blockchain platform designed for decentralized applications and crypto-currencies.",
      "SOL is the native cryptocurrency of the Solana network, used for transaction fees, staking, and governance.",
      "Solana is designed to provide fast, secure, and scalable blockchain infrastructure for the next generation of decentralized applications.",
    ],
    benefits: [
      "Solana offers extremely fast transaction speeds (up to 65,000 TPS) with sub-second finality.",
      "Low transaction costs make it ideal for high-frequency applications and micro-transactions.",
      "Growing ecosystem of DeFi, NFT, and Web3 applications built on Solana.",
      "Proof-of-Stake consensus mechanism with energy-efficient validation.",
    ],
  },
  ETH: {
    title: "Ethereum (Wormhole)",
    category: "Smart Contract Platform",
    objective: [
      "Ethereum (ETH) is the second-largest cryptocurrency by market cap and the leading smart contract platform.",
      "This is Wormhole-wrapped ETH on Solana, bringing Ethereum's value to the Solana blockchain.",
      "ETH powers the Ethereum network, used for gas fees, staking, and as collateral across DeFi protocols.",
    ],
    benefits: [
      "Ethereum pioneered smart contracts and decentralized applications (dApps).",
      "Largest developer ecosystem with thousands of active projects and protocols.",
      "Proof-of-Stake consensus after The Merge, reducing energy consumption by 99.95%.",
      "Foundation for DeFi, NFTs, DAOs, and emerging Web3 infrastructure.",
      "Wormhole bridging enables seamless cross-chain interoperability.",
    ],
  },
  BTC: {
    title: "Bitcoin (Wormhole)",
    category: "Digital Currency",
    objective: [
      "Bitcoin (BTC) is the first and largest cryptocurrency by market capitalization.",
      "This is Wormhole-wrapped BTC on Solana, bringing Bitcoin's store of value to the Solana ecosystem.",
      "BTC is designed as a peer-to-peer electronic cash system and a decentralized store of value.",
    ],
    benefits: [
      "Bitcoin is the most widely recognized and adopted cryptocurrency globally.",
      "Limited supply of 21 million BTC creates scarcity and deflationary economics.",
      "Proven security with over 15 years of continuous operation.",
      "Decentralized network with thousands of nodes worldwide.",
      "Digital gold and hedge against inflation for institutional and retail investors.",
      "Wormhole bridging brings Bitcoin liquidity to Solana's fast ecosystem.",
    ],
  },
  BNB: {
    title: "BNB (Wormhole)",
    category: "Exchange Token",
    objective: [
      "BNB is the native cryptocurrency of the BNB Chain ecosystem, originally launched by Binance.",
      "This is Wormhole-wrapped BNB on Solana, enabling BNB utility across the Solana ecosystem.",
      "BNB is used for trading fee discounts, transaction fees, and powering decentralized applications on BNB Chain.",
    ],
    benefits: [
      "BNB has one of the largest trading volumes and market caps among exchange tokens.",
      "Regular token burns reduce supply, creating deflationary pressure.",
      "Powers a vast ecosystem of DeFi, GameFi, and NFT projects on BNB Chain.",
      "Wormhole bridging brings BNB liquidity to Solana's high-speed environment.",
      "Utility extends beyond trading fees to staking, governance, and launchpad participation.",
    ],
  },
  DOGE: {
    title: "Dogecoin (Wrapped)",
    category: "Meme Coin",
    objective: [
      "Dogecoin (DOGE) started as a lighthearted cryptocurrency based on the Shiba Inu meme.",
      "This is wrapped DOGE on Solana, bringing the community-driven meme coin to the Solana ecosystem.",
      "DOGE has evolved into a widely-accepted payment method and store of value with strong community support.",
    ],
    benefits: [
      "One of the most recognized cryptocurrencies with mainstream adoption.",
      "Low transaction fees make it ideal for microtransactions and tipping.",
      "Strong community support and high social media engagement.",
      "Accepted by major merchants and payment processors worldwide.",
      "Wrapping on Solana enables faster and cheaper DOGE transactions.",
    ],
  },
  TRX: {
    title: "TRON",
    category: "Blockchain Platform",
    objective: [
      "TRON (TRX) is a blockchain platform focused on content sharing and entertainment applications.",
      "TRX is now available on Solana, expanding its reach to the high-performance Solana ecosystem.",
      "TRON aims to create a decentralized internet where content creators can connect directly with consumers.",
    ],
    benefits: [
      "High throughput and scalability for content-heavy applications.",
      "Low transaction costs make it ideal for micropayments and content monetization.",
      "Large ecosystem with billions of dollars in stablecoin transactions.",
      "Strong presence in Asian markets with widespread adoption.",
      "Integration with Solana enables cross-chain DeFi opportunities.",
    ],
  },
  JUP: {
    title: "Jupiter",
    category: "DeFi Aggregator",
    objective: [
      "Jupiter (JUP) is the native token of Jupiter, the leading DEX aggregator on Solana.",
      "JUP powers governance and incentivizes liquidity provision across Solana's DeFi ecosystem.",
      "Jupiter aggregates liquidity from multiple DEXs to provide users with the best swap rates.",
    ],
    benefits: [
      "Jupiter is the #1 DEX aggregator on Solana by volume.",
      "Smart routing technology finds the best prices across multiple liquidity sources.",
      "JUP holders participate in protocol governance and revenue sharing.",
      "Integrated with all major Solana wallets and dApps.",
      "Continuous innovation with features like limit orders, DCA, and perpetuals.",
    ],
  },
  BONK: {
    title: "Bonk",
    category: "Community Meme Coin",
    objective: [
      "Bonk is Solana's first dog-themed meme coin, launched as a community-driven token.",
      "50% of BONK's supply was airdropped to the Solana community to revitalize the ecosystem.",
      "BONK serves as a community coin for the Solana ecosystem with growing utility.",
    ],
    benefits: [
      "First major Solana meme coin with strong community backing.",
      "Wide distribution through airdrops to NFT holders and early Solana users.",
      "Growing utility with integration into Solana DeFi protocols and games.",
      "Low entry point with massive upside potential driven by community momentum.",
      "Represents the fun and experimental side of the Solana ecosystem.",
    ],
  },
  JTO: {
    title: "Jito",
    category: "Liquid Staking & MEV",
    objective: [
      "Jito (JTO) is the governance token for Jito Network, Solana's leading liquid staking protocol.",
      "Jito provides liquid staking derivatives (JitoSOL) and MEV infrastructure for Solana.",
      "JTO holders govern the protocol and receive rewards from staking and MEV activities.",
    ],
    benefits: [
      "Jito is the largest liquid staking protocol on Solana by TVL.",
      "JitoSOL allows users to stake SOL while maintaining liquidity for DeFi.",
      "MEV infrastructure optimizes validator rewards and reduces spam.",
      "JTO governance controls protocol parameters and treasury allocation.",
      "Backed by top-tier investors including a16z and Multicoin Capital.",
    ],
  },
  ORE: {
    title: "Ore",
    category: "Mineable Token",
    objective: [
      "Ore is a mineable token on Solana using a novel proof-of-work algorithm.",
      "Unlike traditional PoW, Ore mining is accessible and efficient on consumer hardware.",
      "ORE brings the fairness of mining to the Solana ecosystem without environmental concerns.",
    ],
    benefits: [
      "First mineable token on Solana with fair distribution through mining.",
      "Energy-efficient mining algorithm suitable for regular computers.",
      "No pre-mine or venture capital allocation - purely community-driven.",
      "Decentralized distribution model rewards active participants.",
      "Novel economic model combining PoW mining with Solana's speed.",
    ],
  },
};

export default function CryptoDetailsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const symbolParam = decodeURIComponent(symbol || "");
  const { crypto: cryptoAssets, isLoading } = useCrypto();

  const crypto = cryptoAssets.find((c) => c.symbol.toLowerCase() === symbolParam.toLowerCase());

  if (isLoading && !crypto) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link href="/stocks" className="text-gray-300 hover:text-white">← Back to Marketplace</Link>
          <div className="flex items-center gap-2 mt-6">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <h1 className="text-2xl font-bold text-white">Loading crypto data...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!crypto) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link href="/stocks" className="text-gray-300 hover:text-white">← Back to Marketplace</Link>
          <h1 className="text-2xl font-bold text-white mt-6">Crypto asset not found</h1>
        </div>
      </div>
    );
  }

  const details = DETAILS[crypto.symbol] || null;
  const currentPrice = crypto.price ?? 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2E4744' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link href="/stocks" className="text-gray-300 hover:text-white">← Back to Marketplace</Link>

        <div className="mt-6 flex items-center gap-4">
          {crypto.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={crypto.logoUrl} alt={`${crypto.symbol} logo`} className="h-12 w-12 rounded" />
          ) : null}
          <div>
            <h1 className="text-3xl font-bold text-white">{crypto.symbol}</h1>
            <p className="text-gray-300">{details?.title || crypto.name}</p>
            <p className="text-xs text-gray-400 mt-1">{details?.category || 'Cryptocurrency'}</p>
          </div>
        </div>

        {/* Price chart (wallet-style) */}
        <div className="mt-6">
          <PriceChart symbol={crypto.symbol} currentPrice={currentPrice} />
        </div>

        {details ? (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">About {crypto.symbol}</h2>
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
          <Link href={`/purchase?symbol=${encodeURIComponent(crypto.symbol)}&name=${encodeURIComponent(crypto.name)}&assetType=crypto`} className="block">
            <div className="w-full text-center px-5 py-4 font-semibold rounded-lg" style={{ background: '#D9FF66', color: '#000' }}>
              Buy {crypto.symbol}
            </div>
          </Link>
        </div>

        {/* Blockchain Explorer Link */}
        {crypto.solscanUrl && (
          <div className="mt-4">
            <a
              href={crypto.solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-5 py-4 font-medium rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800/50 transition-colors"
            >
              View on Solscan ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

