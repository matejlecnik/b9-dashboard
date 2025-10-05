import {
  Tags,
  PenTool,
  // Users,
  FileText,
  FolderTree,
  LucideIcon,
} from 'lucide-react'

export interface BadgeConfig {
  type: 'count' | 'status' | 'alert' | 'dot'
  value?: number | string
  color?: 'default' | 'success' | 'warning' | 'error' | 'info'
  pulse?: boolean
}

export interface NavigationItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  badge?: BadgeConfig
  permission?: string
  description?: string
  shortcut?: string
  onClick?: () => void
  subItems?: NavigationItem[]
  isComingSoon?: boolean
}

export interface NavigationSection {
  id: string
  title?: string
  items: NavigationItem[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

export interface NavigationConfig {
  sections: NavigationSection[]
}

// Main navigation configuration
export const navigationConfig: NavigationConfig = {
  sections: [
    {
      id: 'main',
      items: [
        {
          id: 'subreddit-review',
          title: 'Subreddit Review',
          href: '/reddit/subreddit-review',
          icon: Tags,
          shortcut: '⌘1',
          badge: {
            type: 'count',
            color: 'info'
          }
        },
        {
          id: 'categorization',
          title: 'Categorization',
          href: '/reddit/categorization',
          icon: FolderTree,
          shortcut: '⌘2'
        },
        {
          id: 'posting',
          title: 'Posting',
          href: '/reddit/posting',
          icon: PenTool,
          shortcut: '⌘3'
        },
        {
          id: 'post-analysis',
          title: 'Post Analysis',
          href: '/reddit/post-analysis',
          icon: FileText,
          shortcut: '⌘4'
        }
      ]
    }
  ]
}

// Helper function to get navigation item by ID
export const getNavigationItem = (id: string): NavigationItem | undefined => {
  for (const section of navigationConfig.sections) {
    for (const item of section.items) {
      if (item.id === id) return item
      if (item.subItems) {
        const subItem = item.subItems.find(sub => sub.id === id)
        if (subItem) return subItem
      }
    }
  }
  return undefined
}

// Helper function to get all navigation items as flat array
export const getAllNavigationItems = (): NavigationItem[] => {
  const items: NavigationItem[] = []
  for (const section of navigationConfig.sections) {
    for (const item of section.items) {
      items.push(item)
      if (item.subItems) {
        items.push(...item.subItems)
      }
    }
  }
  return items
}

// Helper function to check if href is active
export const isActiveHref = (href: string, currentPath: string): boolean => {
  if (href === '/subreddit-review') {
    return currentPath === '/' || currentPath === '/subreddit-review'
  }
  return currentPath.startsWith(href)
}