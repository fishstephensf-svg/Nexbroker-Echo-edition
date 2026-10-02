/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow calls to DEX aggregator APIs from the browser during dev
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

module.exports = nextConfig;
