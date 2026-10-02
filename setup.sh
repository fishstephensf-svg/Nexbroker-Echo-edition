#!/bin/bash
# setup.sh — run this once before deploying to Vercel
# It moves all the flat files into the correct folder structure Next.js needs

echo "Setting up NexBroker folder structure..."

# Create folders
mkdir -p pages/api/swap
mkdir -p hooks
mkdir -p lib
mkdir -p public

# Move pages
mv pages-index.js          pages/index.js
mv api-advisor.js          pages/api/advisor.js
mv api-prices.js           pages/api/prices.js
mv api-swap-quote.js       pages/api/swap/quote.js
mv api-swap-jupiter.js     pages/api/swap/jupiter.js

# Move hooks
mv hooks-useWalletConnect.js  hooks/useWalletConnect.js
mv hooks-useBalances.js       hooks/useBalances.js
mv hooks-usePrices.js         hooks/usePrices.js
mv hooks-useSwap.js           hooks/useSwap.js
mv hooks-useWallet.js         hooks/useWallet.js

# Move lib
mv lib-chains.js           lib/chains.js

# Move public
mv public-manifest.json    public/manifest.json
mv public-sw.js            public/sw.js

echo "Done! Your project is ready."
