import type { NextConfig } from "next";
// PWA support using next-pwa
// @ts-expect-error - next-pwa has no types for ESM import in Next 14
import withPWA from "next-pwa";
import path from "node:path";
import webpack from "webpack";

const baseConfig: NextConfig = {
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

		// Polyfills for browser builds where some deps expect Node core modules
		config.resolve = config.resolve || {};
		config.resolve.fallback = {
			...(config.resolve.fallback || {}),
			stream: require.resolve("stream-browserify"),
			buffer: require.resolve("buffer/"),
			util: require.resolve("util/"),
			assert: require.resolve("assert/"),
			process: require.resolve("process/browser"),
			string_decoder: require.resolve("string_decoder/"),
		};

		config.plugins = config.plugins || [];
		config.plugins.push(
			new webpack.ProvidePlugin({
				Buffer: ["buffer", "Buffer"],
				process: ["process"],
			})
		);

		return config;
	},
};

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = withPWA({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true,
  buildExcludes: [/_middleware\//],
  runtimeCaching: undefined, // use default workbox runtime caching
  publicExcludes: [
    // exclude generated images and other large assets from precache
    "!og-image.png",
  ],
  fallbacks: {
    document: "/offline",
  },
})(baseConfig);

export default nextConfig;
