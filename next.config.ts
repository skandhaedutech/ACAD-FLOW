import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/server-api/:path*',
        destination: 'https://skandaedutech-acadflowbackend.hf.space/server-api/:path*',
      },
    ];
  },
};

export default nextConfig;
