// Platform configuration for multi-dashboard support
export interface PlatformConfig {
  id: string
  name: string
  description: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceKey?: string
  apiUrl?: string
  theme: {
    primary: string
    secondary?: string
    accent?: string
  }
  features: string[]
  status: 'active' | 'beta' | 'coming-soon'
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  reddit: {
    id: 'reddit',
    name: 'Reddit Analytics',
    description: 'Reddit marketing analytics platform for OnlyFans creator audience discovery',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    theme: {
      primary: '#FF4500',
      secondary: '#FF5700',
      accent: '#FF6B1A'
    },
    features: ['subreddit-review', 'categorization', 'posting', 'post-analysis', 'user-analysis'],
    status: 'active'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Analytics',
    description: 'Instagram engagement tracking and influencer discovery platform',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    theme: {
      primary: '#E4405F',
      secondary: '#C13584',
      accent: '#F77737'
    },
    features: ['engagement-tracking', 'influencer-discovery', 'content-analysis'],
    status: 'coming-soon'
  },
  tracking: {
    id: 'tracking',
    name: 'Tracking Dashboard',
    description: 'Cross-platform performance tracking and ROI analytics',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    theme: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA'
    },
    features: ['roi-tracking', 'cross-platform-analytics', 'performance-metrics'],
    status: 'beta'
  }
}

// Helper function to get platform config
export function getPlatformConfig(platformId: string): PlatformConfig | null {
  return PLATFORMS[platformId] || null
}

// Helper function to get active platforms
export function getActivePlatforms(): PlatformConfig[] {
  return Object.values(PLATFORMS).filter(p => p.status === 'active')
}

// Helper function to check if platform is available
export function isPlatformAvailable(platformId: string): boolean {
  const platform = PLATFORMS[platformId]
  return platform && platform.status !== 'coming-soon'
}