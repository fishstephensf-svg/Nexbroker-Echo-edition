// public/sw.js
// Service worker — caches the app shell so NexBroker loads instantly
// and works offline (showing cached data when no connection)

const CACHE = "nexbroker-v1";
const PRECACHE = ["/", "/_next/static/"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Never intercept API calls or WalletConnect — always go to network
  if (
    e.request.url.includes("/api/") ||
    e.request.url.includes("walletconnect") ||
    e.request.url.includes("relay.walletconnect")
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
