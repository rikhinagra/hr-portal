import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js 15 may not have full types for this yet
  allowedDevOrigins: ["192.168.31.67", "localhost"],
  devIndicators: {
    buildActivity: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
