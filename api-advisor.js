// pages/api/advisor.js
// Server-side Claude call — keeps ANTHROPIC_API_KEY off the client entirely
// Accepts conversation history + portfolio context, returns AI response

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, portfolio, wallet, mode = "chat" } = req.body;
  // mode: "chat" = normal Q&A | "analyze" = generate trade proposals as JSON

  if (!messages || !portfolio) {
    return res.status(400).json({ error: "Missing messages or portfolio" });
  }

  const total = portfolio.reduce((s, c) => s + c.qty * c.price, 0);
  const portfolioCtx = portfolio.map(c =>
    `${c.symbol} (${c.chain}): ${c.qty} @ $${c.price.toFixed(2)} (${c.change > 0 ? "+" : ""}${c.change}% 24h), value $${(c.qty * c.price).toFixed(2)}, current alloc ${((c.qty * c.price / total) * 100).toFixed(1)}% vs ${c.target}% target`
  ).join("\n");

  const isAnalyze = mode === "analyze";

  const systemPrompt = isAnalyze
    ? `You are a DeFi portfolio advisor. Return ONLY a valid JSON array of trade proposals. No markdown, no prose, no backticks.

Portfolio (total: $${total.toFixed(2)}):
${portfolioCtx}

Wallet: ${wallet || "connected"}
Available DEXes: Uniswap v3 (Ethereum via 1inch), Jupiter (Solana), PancakeSwap (BNB Chain via 1inch)

Each proposal must have exactly these fields:
{"id":"unique_string","action":"BUY" or "SELL","fromSymbol":"string","toSymbol":"string","chain":"ethereum" or "solana" or "bnb","amount":number,"usdValue":number,"priceImpact":"e.g. 0.12%","fee":"e.g. $4.20","slippage":"e.g. 0.5%","reasoning":"one specific data-driven sentence"}

Propose 2-3 swaps to move toward target allocations. Only use symbols in the portfolio or USDC as bridge.`
    : `You are a sharp DeFi portfolio advisor embedded in a multi-chain DEX broker. Be concise (2-4 sentences max) unless asked for more detail. Use specific numbers. Always note risk.

Portfolio (total: $${total.toFixed(2)}):
${portfolioCtx}

Wallet: ${wallet || "connected"}
DEXes available: Uniswap v3 (Ethereum), Jupiter (Solana), PancakeSwap (BNB Chain)`;

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: isAnalyze ? 1500 : 600,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json();
      return res.status(502).json({ error: "Claude API error", detail: err });
    }

    const data = await claudeRes.json();
    const text = data.content?.map(b => b.text || "").join("") || "";

    if (isAnalyze) {
      try {
        const proposals = JSON.parse(text.replace(/```json|```/g, "").trim());
        return res.status(200).json({ proposals });
      } catch {
        return res.status(200).json({ proposals: [], raw: text });
      }
    }

    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error("Advisor error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
