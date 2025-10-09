import {
  MessageCircle,
  Instagram,
  Users,
  Activity,
  BarChart3,
  FolderTree,
  Share2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  description?: string
  requiresPermission?: string
  badge?: {
    type: 'count' | 'new' | 'live'
    value?: string | number
    color?: string
  }
}

export interface DashboardConfig {
  id: string
  title: string
  path: string
  icon: LucideIcon
  description: string
  color: string
  gradient: string
  requiresPermission: string
  apiNamespace: string
  navigation: NavigationItem[]
}

// Reddit Dashboard Configuration
export const redditDashboard: DashboardConfig = {
  id: 'reddit',
  title: 'Reddit Analytics',
  path: '/reddit',
  icon: MessageCircle,
  description: 'Subreddit discovery and marketing analytics',
  color: 'orange',
  gradient: 'from-orange-500 to-red-600',
  requiresPermission: 'reddit',
  apiNamespace: '/api/reddit',
  navigation: [
    {
      id: 'subreddit-review',
      title: 'Review',
      href: '/reddit/subreddit-review',
      icon: MessageCircle,
      description: 'Review and categorize subreddits',
      badge: { type: 'new' }
    },
    {
      id: 'categorization',
      title: 'Categorization',
      href: '/reddit/categorization',
      icon: FolderTree,
      description: 'AI-powered categorization'
    },
    {
      id: 'post-analysis',
      title: 'Post Analysis',
      href: '/reddit/post-analysis',
      icon: BarChart3,
      description: 'Analyze post performance'
    },
    {
      id: 'posting',
      title: 'Posting',
      href: '/reddit/posting',
      icon: Share2,
      description: 'Content posting management'
    },
  ]
}

// Instagram Dashboard Configuration
export const instagramDashboard: DashboardConfig = {
  id: 'instagram',
  title: 'Instagram Analytics',
  path: '/instagram',
  icon: Instagram,
  description: 'Instagram creator discovery and analytics',
  color: 'pink',
  gradient: 'from-primary to-secondary-hover',
  requiresPermission: 'instagram',
  apiNamespace: '/api/instagram',
  navigation: [
    {
      id: 'analytics',
      title: 'Analytics Dashboard',
      href: '/instagram/analytics',
      icon: BarChart3,
      description: 'Overview and metrics'
    },
    {
      id: 'niching',
      title: 'Niching',
      href: '/instagram/niching',
      icon: Instagram,
      description: 'Niche analysis and targeting'
    },
    {
      id: 'creator-review',
      title: 'Creator Review',
      href: '/instagram/creator-review',
      icon: Users,
      description: 'Review and approve creators'
    }
  ]
}

// Models Dashboard Configuration
export const modelsDashboard: DashboardConfig = {
  id: 'models',
  title: 'Models',
  path: '/models',
  icon: Users,
  description: 'Manage model profiles and preferences',
  color: 'purple',
  gradient: 'from-secondary to-indigo-600',
  requiresPermission: 'models',
  apiNamespace: '/api/models',
  navigation: [] // Single page dashboard
}

// Monitor Dashboard Configuration
export const monitorDashboard: DashboardConfig = {
  id: 'monitor',
  title: 'System Monitor',
  path: '/monitor/reddit',
  icon: Activity,
  description: 'Monitor scraping and system status',
  color: 'green',
  gradient: 'from-green-500 to-teal-600',
  requiresPermission: 'monitor',
  apiNamespace: '/api/monitor',
  navigation: [
    {
      id: 'reddit-monitor',
      title: 'Reddit Monitor',
      href: '/monitor/reddit',
      icon: Activity,
      description: 'Reddit scraper status',
      badge: { type: 'live', color: 'orange' }
    },
    {
      id: 'instagram-monitor',
      title: 'Instagram Monitor',
      href: '/monitor/instagram',
      icon: Activity,
      description: 'Instagram scraper status',
      badge: { type: 'live', color: 'pink' }
    }
  ]
}

// Tracking Dashboard Configuration
export const trackingDashboard: DashboardConfig = {
  id: 'tracking',
  title: 'Tracking',
  path: '/tracking',
  icon: BarChart3,
  description: 'Performance tracking and analytics',
  color: 'blue',
  gradient: 'from-blue-500 to-cyan-600',
  requiresPermission: 'tracking',
  apiNamespace: '/api/tracking',
  navigation: [] // To be expanded
}

// All dashboards registry
export const dashboards: DashboardConfig[] = [
  redditDashboard,
  instagramDashboard,
  modelsDashboard,
  monitorDashboard,
  trackingDashboard
]

// Helper functions
export function getDashboardById(id: string): DashboardConfig | undefined {
  return dashboards.find(d => d.id === id)
}

export function getDashboardByPath(path: string): DashboardConfig | undefined {
  return dashboards.find(d => path.startsWith(d.path))
}

export function getNavigationItem(dashboardId: string, itemId: string): NavigationItem | undefined {
  const dashboard = getDashboardById(dashboardId)
  return dashboard?.navigation.find(item => item.id === itemId)
}

export function getDashboardsForUser(permissions: string[]): DashboardConfig[] {
  return dashboards.filter(d => permissions.includes(d.requiresPermission))
}