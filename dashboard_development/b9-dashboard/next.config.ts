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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'b.thumbs.redditmedia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'a.thumbs.redditmedia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'external-preview.redd.it',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'preview.redd.it',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.redd.it',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
