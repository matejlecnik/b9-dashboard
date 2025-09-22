import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  trailingSlash: false,
  poweredByHeader: false,
  reactStrictMode: true, // Enable React strict mode for better error detection
  productionBrowserSourceMaps: false, // Disable source maps in production

  // Experimental features for performance
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Set body size limit for server actions
      allowedOrigins: undefined, // Allow all origins for server actions
    },
    // optimizeCss: true, // Disabled - requires critters package
    webVitalsAttribution: ['CLS', 'LCP'],
    optimizePackageImports: ['@radix-ui/react-*', 'lucide-react'], // Optimize common imports
  },
  
  // Fix workspace root to prevent lockfile conflicts
  outputFileTracingRoot: process.cwd(),
  
  // Optimized image configuration (use remotePatterns; domains is deprecated)
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
        hostname: 'c.thumbs.redditmedia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd.thumbs.redditmedia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thumbs.redditmedia.com',
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
      {
        protocol: 'https',
        hostname: 'styles.redditmedia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'emoji.redditmedia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.redditstatic.com',
        port: '',
        pathname: '/**',
      },
      // Common external image hosting domains
      {
        protocol: 'https',
        hostname: 'b.l3n.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.discordapp.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gyazo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.gyazo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'postimg.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imageupload.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      // Instagram CDN domains
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'instagram.*.fbcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent*.cdninstagram.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent-*.cdninstagram.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent-*.instagram.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Headers for better caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Rely on Next.js defaults for tree-shaking to avoid cacheUnaffected conflicts
    
    // Reduce bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
