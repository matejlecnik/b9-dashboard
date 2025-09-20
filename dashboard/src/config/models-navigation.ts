import {
  Users,
  UserCheck,
  UserX,
  Tags,
  Settings,
  LucideIcon
} from 'lucide-react'

export interface NavigationItem {
  id: string
  title: string
  href: string
  icon: LucideIcon
  badge?: {
    type: 'count' | 'status'
    value?: number | string
    color?: 'default' | 'success' | 'warning' | 'error'
  }
  description?: string
}

export interface NavigationSection {
  id: string
  title?: string
  items: NavigationItem[]
}

export const modelsNavigationConfig: NavigationSection[] = [
  {
    id: 'main',
    items: [
      {
        id: 'all-models',
        title: 'All Models',
        href: '/models',
        icon: Users,
        description: 'View and manage all models'
      },
      {
        id: 'active-models',
        title: 'Active Models',
        href: '/models?filter=active',
        icon: UserCheck,
        description: 'Currently active models'
      },
      {
        id: 'inactive-models',
        title: 'Inactive Models',
        href: '/models?filter=inactive',
        icon: UserX,
        description: 'Inactive or archived models'
      },
      {
        id: 'tag-management',
        title: 'Tag Categories',
        href: '/models/tags',
        icon: Tags,
        description: 'Manage tag categories and preferences'
      },
      {
        id: 'settings',
        title: 'Settings',
        href: '/models/settings',
        icon: Settings,
        description: 'Models dashboard settings'
      }
    ]
  }
]

export const isActiveModelsHref = (href: string, currentPath: string): boolean => {
  // Handle query parameters
  const [basePath] = currentPath.split('?')
  const [hrefBase] = href.split('?')

  if (href === '/models' && currentPath === '/models') {
    return true
  }

  if (href.includes('?filter=')) {
    return currentPath.includes(href)
  }

  return basePath.startsWith(hrefBase)
}