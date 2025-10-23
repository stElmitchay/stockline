import Link from "next/link";
import cryptoData from "@/data/crypto.json";
import { PriceChart } from "@/components/priceChart";

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
};

export default async function CryptoDetailsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const symbolParam = decodeURIComponent(symbol || "");
  const crypto = cryptoData.crypto.find((c) => c.symbol.toLowerCase() === symbolParam.toLowerCase());

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
  const currentPrice = Number((crypto as unknown as { price?: number }).price ?? 0);

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

