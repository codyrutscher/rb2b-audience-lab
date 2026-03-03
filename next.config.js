/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/retarget/:path*", destination: "/api/reactivate/:path*" },
    ];
  },
};

module.exports = nextConfig;
