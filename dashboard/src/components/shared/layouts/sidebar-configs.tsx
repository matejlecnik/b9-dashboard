import {
  Instagram,
  Monitor,
  UserCircle2,
  Target,
  TrendingUp,
  Layers,
  UserPlus,
  Search,
  FileText,
  Share2,
  type LucideIcon
} from 'lucide-react'
import { MonitorIcon } from '@/components/shared/icons/DashboardIcons'

export interface SidebarItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  badge?: {
    type: 'count' | 'status' | 'new'
    value?: string | number | React.ReactNode
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'custom'
  }
}

// Reddit Logo Component
export const RedditIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
  </svg>
)

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
  title: 'Models',
  icon: UserCircle2,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 text-white',
  navigationItems: []  // Models dashboard has no sub-navigation
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
      icon: Monitor
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