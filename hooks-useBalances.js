// hooks/useBalances.js
// Reads real token balances from the connected wallet.
// - Ethereum + BNB Chain: ethers.js via MetaMask provider
// - Solana: @solana/web3.js via Phantom provider
// Returns a normalized portfolio array in the same shape the UI expects.

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { TOKEN_ADDRESSES, CHAINS } from "../lib/chains";

// Minimal ERC-20 ABI — just what we need for balanceOf + decimals
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// Tokens to check per EVM chain (add more as needed)
const EVM_TOKENS = {
  ethereum: ["ETH", "WBTC", "LINK", "USDC", "USDT"],
  bnb:      ["BNB", "USDT", "BUSD"],
};

// Solana tokens to check
const SOLANA_TOKENS = ["SOL", "USDC", "USDT"];

// Display metadata for known tokens
const TOKEN_META = {
  ETH:  { name: "Ethereum",  color: "#627EEA", target: 25 },
  WBTC: { name: "Bitcoin",   color: "#F7931A", target: 35 },
  LINK: { name: "Chainlink", color: "#2A5ADA", target: 10 },
  SOL:  { name: "Solana",    color: "#9945FF", target: 20 },
  BNB:  { name: "BNB",       color: "#F0B90B", target: 10 },
  USDC: { name: "USD Coin",  color: "#2775CA", target: 0  },
  USDT: { name: "Tether",    color: "#26A17B", target: 0  },
  BUSD: { name: "BUSD",      color: "#F0B90B", target: 0  },
  WBNB: { name: "WBNB",      color: "#F0B90B", target: 0  },
};

export function useBalances(wallet, prices) {
  const [balances, setBalances] = useState([]);   // raw { symbol, qty, chain }
  const [portfolio, setPortfolio] = useState([]); // enriched with price + meta
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // ── Ethereum / BNB Chain balances via ethers.js ─────────────
  const fetchEVMBalances = useCallback(async (walletAddress, chain) => {
    const chainConfig = CHAINS[chain];
    const provider    = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const tokens      = EVM_TOKENS[chain] || [];
    const results     = [];

    for (const symbol of tokens) {
      try {
        const address = TOKEN_ADDRESSES[chain]?.[symbol];
        if (!address) continue;

        let qty;

        if (address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
          // Native token (ETH or BNB)
          const raw = await provider.getBalance(walletAddress);
          qty = parseFloat(ethers.formatEther(raw));
        } else {
          // ERC-20 token
          const contract = new ethers.Contract(address, ERC20_ABI, provider);
          const [raw, decimals] = await Promise.all([
            contract.balanceOf(walletAddress),
            contract.decimals(),
          ]);
          qty = parseFloat(ethers.formatUnits(raw, decimals));
        }

        if (qty > 0.000001) {
          results.push({ symbol, qty, chain });
        }
      } catch (err) {
        console.warn(`Failed to fetch ${symbol} on ${chain}:`, err.message);
      }
    }

    return results;
  }, []);

  // ── Solana balances via @solana/web3.js ─────────────────────
  const fetchSolanaBalances = useCallback(async (walletAddress) => {
    const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
    const connection = new Connection(CHAINS.solana.rpcUrl, "confirmed");
    const pubkey     = new PublicKey(walletAddress);
    const results    = [];

    try {
      // Native SOL balance
      const lamports = await connection.getBalance(pubkey);
      const sol      = lamports / LAMPORTS_PER_SOL;
      if (sol > 0.000001) results.push({ symbol: "SOL", qty: sol, chain: "solana" });

      // SPL token accounts (covers USDC, USDT, etc.)
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });

      for (const { account } of tokenAccounts.value) {
        const info   = account.data.parsed.info;
        const mint   = info.mint;
        const amount = info.tokenAmount.uiAmount;

        if (!amount || amount < 0.000001) continue;

        // Match mint address to known symbol
        const symbol = Object.entries(TOKEN_ADDRESSES.solana).find(([, addr]) => addr === mint)?.[0];
        if (symbol && SOLANA_TOKENS.includes(symbol)) {
          results.push({ symbol, qty: amount, chain: "solana" });
        }
      }
    } catch (err) {
      console.warn("Solana balance fetch error:", err.message);
    }

    return results;
  }, []);

  // ── Main fetch ───────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);

    try {
      let raw = [];

      if (wallet.chain === "solana") {
        raw = await fetchSolanaBalances(wallet.address);
      } else {
        // Fetch both Ethereum and BNB if we have a MetaMask wallet
        // (same address works on both EVM chains)
        const [ethBals, bnbBals] = await Promise.all([
          fetchEVMBalances(wallet.address, "ethereum"),
          fetchEVMBalances(wallet.address, "bnb"),
        ]);
        raw = [...ethBals, ...bnbBals];
      }

      setBalances(raw);
      setLastFetched(new Date());
    } catch (err) {
      console.error("Balance fetch failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet, fetchEVMBalances, fetchSolanaBalances]);

  // Refetch when wallet connects or changes
  useEffect(() => {
    if (wallet?.address) fetchBalances();
    else { setBalances([]); setPortfolio([]); }
  }, [wallet?.address, wallet?.chain]);

  // Re-enrich portfolio whenever raw balances or prices change
  useEffect(() => {
    if (!balances.length) { setPortfolio([]); return; }

    const enriched = balances
      .map(({ symbol, qty, chain }) => {
        const meta      = TOKEN_META[symbol] || { name: symbol, color: "#888", target: 0 };
        const priceData = prices?.[symbol];
        return {
          symbol,
          name:    meta.name,
          chain,
          qty,
          price:   priceData?.price   || 0,
          change:  priceData?.change24h || 0,
          color:   meta.color,
          target:  meta.target,
        };
      })
      .filter(c => c.price > 0)   // hide tokens we don't have a price for
      .sort((a, b) => (b.qty * b.price) - (a.qty * a.price)); // sort by value desc

    // Recalculate targets proportionally based on what's actually held
    const total = enriched.reduce((s, c) => s + c.qty * c.price, 0);
    const withAlloc = enriched.map(c => ({
      ...c,
      currentAlloc: total > 0 ? ((c.qty * c.price / total) * 100) : 0,
    }));

    setPortfolio(withAlloc);
  }, [balances, prices]);

  return {
    portfolio,   // enriched array ready for the UI
    balances,    // raw { symbol, qty, chain } if you need it
    loading,
    error,
    lastFetched,
    refetch: fetchBalances,
  };
}
