import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	compiler: {
		// Strip console.* only in production to avoid dev chunk issues
		removeConsole: process.env.NODE_ENV === 'production',
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	webpack: (config) => {
		config.externals["@solana/web3.js"] = "commonjs @solana/web3.js";
		config.externals["@solana/spl-token"] = "commonjs @solana/spl-token";
		return config;
	},
};

export default nextConfig;
