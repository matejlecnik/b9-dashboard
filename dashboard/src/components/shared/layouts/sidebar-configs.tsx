import {
  Instagram,
  Monitor,
  Target,
  TrendingUp,
  Layers,
  UserPlus,
  Search,
  FileText,
  Share2,
  type LucideIcon
} from 'lucide-react'
import { MonitorIcon, RedditIcon, UsersIcon } from '@/components/shared/icons/DashboardIcons'

export interface SidebarItem {
  id: string
  title: string
  href: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  badge?: {
    type: 'count' | 'status' | 'new'
    value?: string | number | React.ReactNode
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'custom'
  }
}

export interface SidebarConfig {
  title: string
  icon: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode
  backHref: string
  navigationItems: SidebarItem[]
  showTeamSection?: boolean
  showLogout?: boolean
  dashboardColor?: string // Dashboard-specific gradient
}

// Reddit Dashboard Navigation
export const redditSidebarConfig: SidebarConfig = {
  title: 'Reddit Dashboard',
  icon: <RedditIcon className="h-6 w-6 text-gray-600" />,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 text-white',
  navigationItems: [
    {
      id: 'subreddit-review',
      title: 'Review',
      href: '/reddit/subreddit-review',
      icon: Search
    },
    {
      id: 'categorization',
      title: 'Categorization',
      href: '/reddit/categorization',
      icon: Layers
    },
    {
      id: 'post-analysis',
      title: 'Post Analysis',
      href: '/reddit/post-analysis',
      icon: FileText
    },
    {
      id: 'posting',
      title: 'Posting',
      href: '/reddit/posting',
      icon: Share2
    }
  ]
}

// Instagram Dashboard Navigation
export const instagramSidebarConfig: SidebarConfig = {
  title: 'Instagram Dashboard',
  icon: Instagram,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'bg-gradient-to-br from-pink-600 via-pink-500 to-pink-700 text-white',
  navigationItems: [
    {
      id: 'creator-review',
      title: 'Creator Review',
      href: '/instagram/creator-review',
      icon: UserPlus
    },
    {
      id: 'niching',
      title: 'Niching',
      href: '/instagram/niching',
      icon: Target
    },
    {
      id: 'viral-content',
      title: 'Viral Content',
      href: '/instagram/viral-content',
      icon: TrendingUp
    }
  ]
}

// Models Dashboard Navigation
export const modelsSidebarConfig: SidebarConfig = {
  title: 'Models Management',
  icon: UsersIcon,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 text-white',
  navigationItems: [
    {
      id: 'models',
      title: 'Models',
      href: '/models',
      icon: UsersIcon
    }
  ]
}

// System Monitor Navigation
export const monitorSidebarConfig: SidebarConfig = {
  title: 'System Monitor',
  icon: MonitorIcon,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500 text-white',
  navigationItems: [
    {
      id: 'reddit-monitor',
      title: 'Reddit Monitor',
      href: '/monitor/reddit',
      icon: RedditIcon
    },
    {
      id: 'instagram-monitor',
      title: 'Instagram Monitor',
      href: '/monitor/instagram',
      icon: Instagram
    }
  ]
}

// Get sidebar config by dashboard ID
export function getSidebarConfig(dashboardId: string): SidebarConfig | null {
  switch (dashboardId) {
    case 'reddit':
      return redditSidebarConfig
    case 'instagram':
      return instagramSidebarConfig
    case 'models':
      return modelsSidebarConfig
    case 'monitor':
      return monitorSidebarConfig
    default:
      return null
  }
}

// Get sidebar config by path
export function getSidebarConfigByPath(pathname: string): SidebarConfig | null {
  if (pathname.startsWith('/reddit')) {
    return redditSidebarConfig
  }
  if (pathname.startsWith('/instagram')) {
    return instagramSidebarConfig
  }
  if (pathname.startsWith('/models')) {
    return modelsSidebarConfig
  }
  if (pathname.startsWith('/monitor')) {
    return monitorSidebarConfig
  }
  return null
}