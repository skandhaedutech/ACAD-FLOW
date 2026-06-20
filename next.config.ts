import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://acadflow-backend-vrg7.onrender.com';
    return [
      {
        source: '/server-api/:path*',
        destination: `${backendUrl}/server-api/:path*`,
      },
    ];
  },
};

export default nextConfig;
