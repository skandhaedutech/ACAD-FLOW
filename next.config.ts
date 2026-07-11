import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/server-api/:path*',
        destination: process.env.NODE_ENV === 'development' 
          ? 'http://127.0.0.1:5000/server-api/:path*' 
          : 'https://acadflow-backend-vrg7.onrender.com/server-api/:path*',
      },
    ];
  },
};

export default nextConfig;
