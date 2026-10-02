# NexBroker — Upload Instructions

## Files in this zip (upload ALL of them to GitHub)

- package.json
- next.config.js
- setup.sh
- pages-index.js
- api-advisor.js
- api-prices.js
- api-swap-quote.js
- api-swap-jupiter.js
- hooks-useWalletConnect.js
- hooks-useBalances.js
- hooks-usePrices.js
- hooks-useSwap.js
- hooks-useWallet.js
- lib-chains.js
- public-manifest.json
- public-sw.js

## How to deploy on Vercel

1. Upload ALL files above to your GitHub repo (no folders needed)
2. Go to vercel.com and import your GitHub repo
3. In Vercel settings, find "Build & Development Settings"
4. Set the BUILD COMMAND to: bash setup.sh && next build
5. Add your 4 environment variables
6. Deploy!

## Your 4 environment variables for Vercel

- ANTHROPIC_API_KEY
- ONEINCH_API_KEY
- COINGECKO_API_KEY
- NEXT_PUBLIC_WC_PROJECT_ID
