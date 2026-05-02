import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js 15 may not have full types for this yet
  allowedDevOrigins: ["192.168.31.67", "localhost"],
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
