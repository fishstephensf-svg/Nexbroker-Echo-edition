// lib/chains.js
// Central config for all supported chains, DEXes, and token addresses

export const CHAINS = {
  ethereum: {
    id: 1,
    name: "Ethereum",
    short: "ETH",
    color: "#627EEA",
    dex: "Uniswap v3 (via 1inch)",
    icon: "⟠",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    explorerUrl: "https://etherscan.io/tx",
    nativeToken: "ETH",
    aggregator: "1inch",
  },
  solana: {
    id: "solana",
    name: "Solana",
    short: "SOL",
    color: "#9945FF",
    dex: "Jupiter Aggregator",
    icon: "◎",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://solscan.io/tx",
    nativeToken: "SOL",
    aggregator: "jupiter",
  },
  bnb: {
    id: 56,
    name: "BNB Chain",
    short: "BNB",
    color: "#F0B90B",
    dex: "PancakeSwap (via 1inch)",
    icon: "⬡",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com/tx",
    nativeToken: "BNB",
    aggregator: "1inch",
  },
};

// Well-known token addresses — expand as needed
export const TOKEN_ADDRESSES = {
  ethereum: {
    ETH:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // 1inch native ETH placeholder
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },
  solana: {
    SOL:  "So11111111111111111111111111111111111111112",  // Wrapped SOL mint
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
  bnb: {
    BNB:  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  },
};

// CoinGecko IDs for price feed lookups
export const COINGECKO_IDS = {
  BTC:  "bitcoin",
  ETH:  "ethereum",
  SOL:  "solana",
  BNB:  "binancecoin",
  LINK: "chainlink",
  USDC: "usd-coin",
  USDT: "tether",
};
