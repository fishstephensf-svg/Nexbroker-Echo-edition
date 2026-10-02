// pages/api/swap/quote.js
// Returns a swap quote + unsigned transaction from 1inch (Ethereum or BNB Chain)
// The frontend sends this tx to the user's wallet for signing — we never touch private keys.

const ONEINCH_BASE = "https://api.1inch.dev/swap/v6.0";

const CHAIN_IDS = {
  ethereum: 1,
  bnb: 56,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chain, fromToken, toToken, amount, walletAddress, slippage = 1 } = req.body;

  // Validate inputs
  if (!chain || !fromToken || !toToken || !amount || !walletAddress) {
    return res.status(400).json({ error: "Missing required fields: chain, fromToken, toToken, amount, walletAddress" });
  }

  const chainId = CHAIN_IDS[chain];
  if (!chainId) {
    return res.status(400).json({ error: `Unsupported chain: ${chain}. Use 'ethereum' or 'bnb'.` });
  }

  try {
    // Step 1: Get a quote first (no wallet needed, fast)
    const quoteUrl = `${ONEINCH_BASE}/${chainId}/quote?` + new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount,
    });

    const quoteRes = await fetch(quoteUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.ONEINCH_API_KEY}`,
        "Accept": "application/json",
      },
    });

    if (!quoteRes.ok) {
      const err = await quoteRes.json();
      return res.status(502).json({ error: "1inch quote failed", detail: err });
    }

    const quote = await quoteRes.json();

    // Step 2: Build the actual swap tx (includes gas estimate and calldata)
    const swapUrl = `${ONEINCH_BASE}/${chainId}/swap?` + new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount,
      from: walletAddress,
      slippage: slippage.toString(),
      disableEstimate: "false",
      allowPartialFill: "false",
    });

    const swapRes = await fetch(swapUrl, {
      headers: {
        "Authorization": `Bearer ${process.env.ONEINCH_API_KEY}`,
        "Accept": "application/json",
      },
    });

    if (!swapRes.ok) {
      const err = await swapRes.json();
      return res.status(502).json({ error: "1inch swap build failed", detail: err });
    }

    const swap = await swapRes.json();

    // Return quote info + the unsigned tx object
    // Frontend passes swap.tx to MetaMask via eth_sendTransaction
    return res.status(200).json({
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: quote.dstAmount,           // estimated output in token units
      toAmountUSD: quote.dstAmountUsd,     // estimated output in USD (if available)
      priceImpact: quote.priceImpact,
      gas: swap.tx.gas,
      gasPrice: swap.tx.gasPrice,
      tx: swap.tx,                          // ← send this to MetaMask for signing
      protocols: quote.protocols,           // routing path (e.g. Uniswap v3 → Curve)
    });

  } catch (err) {
    console.error("Swap quote error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
