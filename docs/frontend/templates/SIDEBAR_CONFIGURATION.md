# Sidebar Configuration Guide

┌─ SIDEBAR SETUP ─────────────────────────────────────────┐
│ ● NAVIGATION  │ ████████████████████ 100% CONFIGURED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "DASHBOARD_TEMPLATE.md",
  "current": "SIDEBAR_CONFIGURATION.md",
  "siblings": [
    {"path": "PAGE_PATTERNS.md", "desc": "Standard page structures"},
    {"path": "COMPONENT_CATALOG.md", "desc": "Reusable components"},
    {"path": "DATA_FLOW_PATTERNS.md", "desc": "React Query patterns"}
  ]
}
```

## Quick Setup

Add your dashboard to the sidebar in 3 steps:

```typescript
// 1. Import your icon
import { YourIcon } from 'lucide-react'

// 2. Create configuration
export const yourSidebarConfig: SidebarConfig = {
  title: 'Your Dashboard',
  icon: YourIcon,
  backHref: '/dashboards',
  dashboardColor: 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600',
  navigationItems: [
    {
      id: 'page-1',
      title: 'Page 1',
      href: '/your-dashboard/page-1',
      icon: Icon1,
      badge: { type: 'count', value: 5 }
    }
  ]
}

// 3. Add to sidebar-configs.tsx getSidebarConfigByPath()
if (path.startsWith('/your-dashboard')) return yourSidebarConfig
```

## Complete Configuration

### 1. SidebarConfig Interface

```typescript
interface SidebarConfig {
  title: string                    // Dashboard name
  icon: LucideIcon | ReactNode     // Dashboard icon
  backHref: string                 // Back navigation URL
  navigationItems: SidebarItem[]   // Navigation links
  showTeamSection?: boolean        // Show user/team info
  showLogout?: boolean             // Show logout button
  dashboardColor?: string          // Gradient color scheme
}
```

### 2. SidebarItem Structure

```typescript
interface SidebarItem {
  id: string                      // Unique identifier
  title: string                   // Display text
  href: string                    // Navigation URL
  icon: LucideIcon               // Item icon
  badge?: {
    type: 'count' | 'status' | 'new'
    value?: string | number | ReactNode
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'custom'
  }
}
```

### 3. Badge System

#### Count Badge
Shows numeric values (e.g., pending items):
```typescript
badge: {
  type: 'count',
  value: 42,
  variant: 'default'
}
```

#### Status Badge
Shows current state (e.g., running/stopped):
```typescript
badge: {
  type: 'status',
  value: (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
  ),
  variant: 'custom'
}
```

#### New Badge
Highlights new features:
```typescript
badge: {
  type: 'new',
  value: 'New',
  variant: 'secondary'
}
```

### 4. Dynamic Badges with React Query

```typescript
// In your sidebar config component
import { useReviewStats } from '@/hooks/queries/useReviewStats'

export function DynamicSidebarConfig() {
  const { data: stats } = useReviewStats()

  const sidebarConfig: SidebarConfig = {
    title: 'Instagram Dashboard',
    icon: Instagram,
    navigationItems: [
      {
        id: 'creator-review',
        title: 'Creator Review',
        href: '/instagram/creator-review',
        icon: UserPlus,
        badge: stats ? {
          type: 'count',
          value: stats.pending,
          variant: stats.pending > 10 ? 'destructive' : 'default'
        } : undefined
      }
    ]
  }

  return sidebarConfig
}
```

### 5. Color Schemes

#### Predefined Gradients
```typescript
// Reddit - Orange to Red
dashboardColor: 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 text-white'

// Instagram - Pink to Purple
dashboardColor: 'bg-gradient-to-br from-pink-600 via-pink-500 to-purple-700 text-white'

// Models - Purple to Pink
dashboardColor: 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 text-white'

// Monitor - Blue to Indigo
dashboardColor: 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white'

// Success - Green
dashboardColor: 'bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white'

// Warning - Yellow to Orange
dashboardColor: 'bg-gradient-to-br from-yellow-500 via-yellow-400 to-orange-500 text-white'

// Dark - Gray to Black
dashboardColor: 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 text-white'
```

### 6. Icon Guidelines

#### Using Lucide Icons
```typescript
import { Users, BarChart, Settings, Monitor } from 'lucide-react'

navigationItems: [
  { icon: Users, ... },
  { icon: BarChart, ... },
  { icon: Settings, ... },
  { icon: Monitor, ... }
]
```

#### Custom SVG Icons
```typescript
// Define custom icon component
const CustomIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* SVG path */}
  </svg>
)

// Use in config
icon: <CustomIcon className="h-6 w-6" />
```

### 7. Navigation Hierarchy

#### Top-Level Dashboard
```typescript
const dashboardConfig: SidebarConfig = {
  title: 'Main Dashboard',
  backHref: '/',  // Back to home
  navigationItems: [
    { href: '/dashboard/overview', ... },
    { href: '/dashboard/analytics', ... },
    { href: '/dashboard/settings', ... }
  ]
}
```

#### Sub-Dashboard
```typescript
const subDashboardConfig: SidebarConfig = {
  title: 'Sub Dashboard',
  backHref: '/main-dashboard',  // Back to parent
  navigationItems: [
    { href: '/sub-dashboard/section1', ... },
    { href: '/sub-dashboard/section2', ... }
  ]
}
```

### 8. Conditional Navigation

#### Role-Based Items
```typescript
const sidebarConfig: SidebarConfig = {
  navigationItems: [
    // Always visible
    { id: 'overview', title: 'Overview', ... },

    // Admin only
    ...(userRole === 'admin' ? [
      { id: 'admin', title: 'Admin Panel', ... }
    ] : []),

    // Feature flag
    ...(features.newFeature ? [
      { id: 'new', title: 'New Feature', badge: { type: 'new' } }
    ] : [])
  ]
}
```

### 9. Active State Detection

The sidebar automatically detects active state based on current path:

```typescript
// Active when exact match or child route
const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

// Visual feedback for active state
className={isActive ? 'bg-b9-pink/15 text-b9-pink' : 'text-gray-700'}
```

### 10. Implementation Example

Complete example for Instagram dashboard:

```typescript
// sidebar-configs.tsx
import { Instagram, UserPlus, ChartArea, Target, TrendingUp } from 'lucide-react'

export const instagramSidebarConfig: SidebarConfig = {
  title: 'Instagram Dashboard',
  icon: Instagram,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'bg-gradient-to-br from-pink-600 via-pink-500 to-purple-700 text-white',
  navigationItems: [
    {
      id: 'creator-review',
      title: 'Creator Review',
      href: '/instagram/creator-review',
      icon: UserPlus,
      badge: {
        type: 'count',
        value: 136,  // From database
        variant: 'warning'
      }
    },
    {
      id: 'analytics',
      title: 'Analytics',
      href: '/instagram/analytics',
      icon: ChartArea
    },
    {
      id: 'niching',
      title: 'Niching',
      href: '/instagram/niching',
      icon: Target,
      badge: {
        type: 'count',
        value: 84,  // Unniched creators
        variant: 'default'
      }
    },
    {
      id: 'viral-content',
      title: 'Viral Content',
      href: '/instagram/viral-content',
      icon: TrendingUp,
      badge: {
        type: 'new',
        value: 'Beta',
        variant: 'secondary'
      }
    }
  ]
}

// Add to path resolver
export function getSidebarConfigByPath(path: string): SidebarConfig | null {
  if (path.startsWith('/instagram')) return instagramSidebarConfig
  if (path.startsWith('/reddit')) return redditSidebarConfig
  if (path.startsWith('/models')) return modelsSidebarConfig
  if (path.startsWith('/monitor')) return monitorSidebarConfig
  return null
}
```

### 11. Mobile Responsiveness

The sidebar automatically handles mobile:
- Collapsible on small screens
- Touch-friendly tap targets
- Swipe gestures for open/close
- Proper z-indexing for overlays

### 12. Accessibility Features

Built-in accessibility:
- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels and roles
- Focus management
- Screen reader announcements
- High contrast support

### 13. Performance Tips

1. **Memoize Config**: Use useMemo for dynamic configs
2. **Lazy Load Icons**: Dynamic import heavy icon sets
3. **Cache Badge Data**: Use React Query for badge counts
4. **Optimize Renders**: React.memo on navigation items
5. **Debounce Updates**: For real-time badge updates

---

_Configuration Version: 1.0.0 | Last Updated: 2025-01-29_