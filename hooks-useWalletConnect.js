// hooks/useWalletConnect.js
// WalletConnect v2 integration for mobile wallets (Coinbase Wallet, MetaMask Mobile, etc.)
// Uses @walletconnect/ethereum-provider which handles QR pairing and deep links on Android

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// Your WalletConnect Project ID — get free one at https://cloud.walletconnect.com
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_WC_PROJECT_ID";

const CHAIN_CONFIG = {
  ethereum: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
  },
  bnb: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
  },
};

export function useWalletConnect() {
  const [provider, setProvider]   = useState(null);
  const [wallet, setWallet]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [uri, setUri]             = useState(null); // WalletConnect pairing URI for QR

  // Lazy-load WalletConnect (large bundle — only load when user tries to connect)
  const getWCProvider = useCallback(async () => {
    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");

    const wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [1],          // Ethereum mainnet
      optionalChains: [56], // BNB Chain
      showQrModal: false,   // We handle the QR ourselves for better mobile UX
      metadata: {
        name: "NexBroker",
        description: "AI-powered multi-chain DEX broker",
        url: typeof window !== "undefined" ? window.location.origin : "https://nexbroker.app",
        icons: ["/icons/icon-192.png"],
      },
    });

    // Capture the pairing URI to show as QR or deep link
    wcProvider.on("display_uri", (pairingUri) => {
      setUri(pairingUri);
    });

    wcProvider.on("session_event", () => {});

    wcProvider.on("disconnect", () => {
      setWallet(null);
      setProvider(null);
      setUri(null);
    });

    wcProvider.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        setWallet(null);
      } else {
        setWallet(w => w ? { ...w, address: accounts[0] } : null);
      }
    });

    wcProvider.on("chainChanged", (chainId) => {
      const chain = chainId === 56 ? "bnb" : "ethereum";
      setWallet(w => w ? { ...w, chain } : null);
    });

    return wcProvider;
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUri(null);

    try {
      const wcProvider = await getWCProvider();

      // This triggers the display_uri event which gives us the deep link
      await wcProvider.connect({
        chains: [1],
        optionalChains: [56],
      });

      const ethersProvider = new ethers.BrowserProvider(wcProvider);
      const signer         = await ethersProvider.getSigner();
      const address        = await signer.getAddress();
      const network        = await ethersProvider.getNetwork();
      const chain          = Number(network.chainId) === 56 ? "bnb" : "ethereum";

      setProvider(wcProvider);
      setWallet({ address, chain, type: "walletconnect", signer, ethersProvider });
      setUri(null); // clear QR once connected

    } catch (err) {
      if (err.message?.includes("User rejected")) {
        setError("Connection rejected in wallet app.");
      } else {
        setError(err.message || "WalletConnect failed");
      }
    } finally {
      setLoading(false);
    }
  }, [getWCProvider]);

  const disconnect = useCallback(async () => {
    try {
      if (provider?.disconnect) await provider.disconnect();
    } catch {}
    setWallet(null);
    setProvider(null);
    setUri(null);
  }, [provider]);

  // Execute a swap transaction via WalletConnect
  const executeSwap = useCallback(async (swapData) => {
    if (!wallet?.signer) throw new Error("No wallet connected");

    const txResponse = await wallet.signer.sendTransaction({
      to:       swapData.tx.to,
      data:     swapData.tx.data,
      value:    swapData.tx.value || "0x0",
      gasLimit: swapData.tx.gas,
    });

    await txResponse.wait();

    const explorerBase = wallet.chain === "bnb" ? "https://bscscan.com/tx" : "https://etherscan.io/tx";
    return { txHash: txResponse.hash, explorer: `${explorerBase}/${txResponse.hash}` };
  }, [wallet]);

  // Generate Coinbase Wallet deep link for Android
  // Opens directly in the Coinbase Wallet app if installed
  const getCoinbaseDeepLink = useCallback(() => {
    if (!uri) return null;
    const encoded = encodeURIComponent(uri);
    return `https://go.cb-w.com/wc?uri=${encoded}`;
  }, [uri]);

  return {
    wallet,
    loading,
    error,
    uri,              // raw WalletConnect URI (for QR code display)
    connect,
    disconnect,
    executeSwap,
    getCoinbaseDeepLink,
  };
}
