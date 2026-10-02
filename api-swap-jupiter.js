// pages/api/swap/jupiter.js
// Handles Solana swaps via Jupiter Aggregator
// Returns a serialized transaction the frontend sends to Phantom for signing

const JUPITER_API = "https://quote-api.jup.ag/v6";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { inputMint, outputMint, amount, walletAddress, slippageBps = 50 } = req.body;
  // slippageBps: 50 = 0.5%, 100 = 1%

  if (!inputMint || !outputMint || !amount || !walletAddress) {
    return res.status(400).json({ error: "Missing required fields: inputMint, outputMint, amount, walletAddress" });
  }

  try {
    // Step 1: Get best route quote from Jupiter
    const quoteUrl = `${JUPITER_API}/quote?` + new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
      onlyDirectRoutes: "false",
      asLegacyTransaction: "false",
    });

    const quoteRes = await fetch(quoteUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!quoteRes.ok) {
      const err = await quoteRes.json();
      return res.status(502).json({ error: "Jupiter quote failed", detail: err });
    }

    const quote = await quoteRes.json();

    // Step 2: Build the swap transaction
    const swapRes = await fetch(`${JUPITER_API}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,        // auto-wrap/unwrap native SOL
        dynamicComputeUnitLimit: true, // auto-set compute budget
        prioritizationFeeLamports: "auto",
      }),
    });

    if (!swapRes.ok) {
      const err = await swapRes.json();
      return res.status(502).json({ error: "Jupiter swap build failed", detail: err });
    }

    const { swapTransaction } = await swapRes.json();

    // swapTransaction is a base64-encoded versioned transaction
    // Frontend deserializes it and sends to Phantom:
    //   const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
    //   const sig = await window.solana.signAndSendTransaction(tx)

    return res.status(200).json({
      inputMint,
      outputMint,
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,           // in smallest units (lamports for SOL)
      priceImpactPct: quote.priceImpactPct,
      routePlan: quote.routePlan,           // DEX hops taken
      slippageBps,
      swapTransaction,                       // ← base64 tx to send to Phantom
    });

  } catch (err) {
    console.error("Jupiter swap error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
