// hooks/useWallet.js
// Unified wallet hook for MetaMask (Ethereum + BNB) and Phantom (Solana)
// Returns a consistent wallet object regardless of which chain/wallet is active

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [wallet, setWallet]   = useState(null);  // { address, chain, type, provider }
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  // ── MetaMask / EVM (Ethereum + BNB Chain) ──────────────────
  const connectMetaMask = useCallback(async (targetChain = "ethereum") => {
    if (!window.ethereum) {
      setError("MetaMask not found. Install it at metamask.io");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const chainId = targetChain === "bnb" ? "0x38" : "0x1";

      // Request the right chain
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (switchErr) {
        // Chain not added to MetaMask yet — add BNB Chain automatically
        if (switchErr.code === 4902 && targetChain === "bnb") {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x38",
              chainName: "BNB Smart Chain",
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: ["https://bsc-dataseed.binance.org"],
              blockExplorerUrls: ["https://bscscan.com"],
            }],
          });
        } else {
          throw switchErr;
        }
      }

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();

      setWallet({
        address:  accounts[0],
        chain:    targetChain,
        type:     "metamask",
        provider,
        signer,
      });
    } catch (err) {
      setError(err.message || "MetaMask connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Phantom (Solana) ───────────────────────────────────────
  const connectPhantom = useCallback(async () => {
    if (!window.solana?.isPhantom) {
      setError("Phantom not found. Install it at phantom.app");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await window.solana.connect();
      setWallet({
        address: resp.publicKey.toString(),
        chain:   "solana",
        type:    "phantom",
        provider: window.solana,
      });
    } catch (err) {
      setError(err.message || "Phantom connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wallet?.type === "phantom") window.solana?.disconnect();
    setWallet(null);
    setError(null);
  }, [wallet]);

  // ── Execute a swap tx after backend builds it ──────────────
  const executeSwap = useCallback(async (swapData) => {
    if (!wallet) throw new Error("No wallet connected");

    if (wallet.chain === "solana") {
      // Jupiter returns a base64 versioned transaction
      const { VersionedTransaction } = await import("@solana/web3.js");
      const txBytes = Buffer.from(swapData.swapTransaction, "base64");
      const tx      = VersionedTransaction.deserialize(txBytes);
      const sig     = await window.solana.signAndSendTransaction(tx);
      return { txHash: sig.signature, explorer: `https://solscan.io/tx/${sig.signature}` };

    } else {
      // 1inch returns a plain tx object — send via MetaMask
      const txHash = await wallet.signer.sendTransaction({
        to:       swapData.tx.to,
        data:     swapData.tx.data,
        value:    swapData.tx.value,
        gasLimit: swapData.tx.gas,
      });
      await txHash.wait(); // wait for 1 confirmation
      return { txHash: txHash.hash, explorer: `https://${wallet.chain === "bnb" ? "bscscan" : "etherscan"}.io/tx/${txHash.hash}` };
    }
  }, [wallet]);

  // Listen for MetaMask account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnect();
      else if (wallet?.type === "metamask") setWallet(w => ({ ...w, address: accounts[0] }));
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", () => disconnect()); // force reconnect on chain switch
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [wallet, disconnect]);

  return { wallet, error, loading, connectMetaMask, connectPhantom, disconnect, executeSwap };
}
