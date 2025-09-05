import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select'],
  },
  // Configuration for deployment - no basePath for separate Vercel project
  trailingSlash: true,
  // Ensure static exports work properly
  output: 'standalone',
  // Enable image optimization
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
