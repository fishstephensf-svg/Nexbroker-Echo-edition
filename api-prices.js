// pages/api/prices.js
// Fetches live prices for all portfolio tokens from CoinGecko
// Call this on an interval from the frontend (e.g. every 30s with SWR)

import { COINGECKO_IDS } from "../../lib/chains";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ids = Object.values(COINGECKO_IDS).join(",");

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?` + new URLSearchParams({
      ids,
      vs_currencies: "usd",
      include_24hr_change: "true",
      include_market_cap: "true",
    });

    const cgRes = await fetch(url, {
      headers: {
        "x-cg-demo-api-key": process.env.COINGECKO_API_KEY,
        "Accept": "application/json",
      },
    });

    if (!cgRes.ok) {
      return res.status(502).json({ error: "CoinGecko request failed" });
    }

    const raw = await cgRes.json();

    // Reshape into { BTC: { price, change24h, marketCap }, ... }
    const prices = {};
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (raw[geckoId]) {
        prices[symbol] = {
          price:     raw[geckoId].usd,
          change24h: raw[geckoId].usd_24h_change,
          marketCap: raw[geckoId].usd_market_cap,
        };
      }
    }

    // Cache for 20 seconds at the CDN level (Vercel edge)
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=10");
    return res.status(200).json({ prices, updatedAt: new Date().toISOString() });

  } catch (err) {
    console.error("Price fetch error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
