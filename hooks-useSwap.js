// hooks/useSwap.js
// Orchestrates the full swap flow:
//   1. Call our backend to get a quote + unsigned tx
//   2. Show the user the details (price impact, fees, etc.)
//   3. On approval, send to wallet for signing

import { useState, useCallback } from "react";
import { TOKEN_ADDRESSES } from "../lib/chains";

export function useSwap(wallet, executeSwap) {
  const [quote, setQuote]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError]       = useState(null);
  const [txResult, setTxResult] = useState(null);

  // Step 1: Fetch quote from backend (no wallet interaction yet)
  const fetchQuote = useCallback(async ({ fromSymbol, toSymbol, amountUSD }) => {
    if (!wallet) { setError("Connect wallet first"); return; }
    setLoading(true);
    setError(null);
    setQuote(null);

    try {
      const chain     = wallet.chain;
      const fromToken = TOKEN_ADDRESSES[chain]?.[fromSymbol];
      const toToken   = TOKEN_ADDRESSES[chain]?.[toSymbol];

      if (!fromToken || !toToken) {
        throw new Error(`Token address not found for ${fromSymbol} or ${toSymbol} on ${chain}`);
      }

      // Convert USD amount to token units (rough — in production use live price)
      // For now we pass amount in USD and let the backend convert
      const endpoint = chain === "solana" ? "/api/swap/jupiter" : "/api/swap/quote";

      const body = chain === "solana"
        ? { inputMint: fromToken, outputMint: toToken, amount: Math.floor(amountUSD * 1e6), walletAddress: wallet.address }
        : { chain, fromToken, toToken, amount: Math.floor(amountUSD * 1e18).toString(), walletAddress: wallet.address };

      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Quote failed");

      setQuote(data);
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Step 2: Execute the swap (sends to wallet for signing)
  const confirmSwap = useCallback(async () => {
    if (!quote) { setError("No quote loaded"); return; }
    setExecuting(true);
    setError(null);
    try {
      const result = await executeSwap(quote);
      setTxResult(result);
      setQuote(null);
      return result;
    } catch (err) {
      setError(err.message || "Transaction failed or rejected");
    } finally {
      setExecuting(false);
    }
  }, [quote, executeSwap]);

  const reset = () => { setQuote(null); setError(null); setTxResult(null); };

  return { quote, loading, executing, error, txResult, fetchQuote, confirmSwap, reset };
}
