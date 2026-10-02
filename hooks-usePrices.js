// hooks/usePrices.js
// Polls /api/prices every 30s and returns live price data
// Uses SWR for automatic revalidation and background refresh

import useSWR from "swr";

const fetcher = (url) => fetch(url).then(r => r.json());

export function usePrices() {
  const { data, error, isLoading } = useSWR("/api/prices", fetcher, {
    refreshInterval: 30_000,      // refresh every 30 seconds
    revalidateOnFocus: true,      // refresh when user tabs back in
    dedupingInterval: 10_000,     // don't fire more than once per 10s
  });

  return {
    prices:    data?.prices || {},
    updatedAt: data?.updatedAt,
    loading:   isLoading,
    error,
  };
}
