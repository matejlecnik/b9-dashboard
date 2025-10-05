import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase storage
      {
        protocol: 'https',
        hostname: 'cetrhongdrjztsrsffuh.supabase.co',
        pathname: '/**',
      },
      // Instagram/Facebook CDN pattern 1: instagram.*.fna.fbcdn.net
      {
        protocol: 'https',
        hostname: '**.fna.fbcdn.net',
        pathname: '/**',
      },
      // Instagram CDN pattern: scontent*.cdninstagram.com
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
        pathname: '/**',
      },
      // Additional Instagram patterns for broader coverage
      {
        protocol: 'https',
        hostname: '**.instagram.com',
        pathname: '/**',
      },
      // Facebook CDN (sometimes used for Instagram)
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
        pathname: '/**',
      },
      // Reddit CDN patterns
      {
        protocol: 'https',
        hostname: 'styles.redditmedia.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.redd.it',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'preview.redd.it',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'external-preview.redd.it',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'a.thumbs.redditmedia.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'b.thumbs.redditmedia.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
