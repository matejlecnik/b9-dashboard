'use client'

import type { ReactElement } from 'react'
import { usePathname } from 'next/navigation'
import { getSidebarConfigByPath } from './sidebar-configs'
import { SidebarTemplate, type SidebarNavigationItem } from './SidebarTemplate'

export function UnifiedSidebar() {
  const pathname = usePathname()
  const config = getSidebarConfigByPath(pathname || '')

  if (!config) {
    // Default fallback - should not happen in practice
    return null
  }

  // Map SidebarItem[] to SidebarNavigationItem[]
  const navigationItems: SidebarNavigationItem[] = config.navigationItems.map(item => ({
    href: item.href,
    title: item.title,
    icon: item.icon,
    badge: item.badge ? {
      type: item.badge.type === 'new' ? 'status' : item.badge.type as 'count' | 'status',
      value: (typeof item.badge.value === 'string' || typeof item.badge.value === 'number')
        ? item.badge.value
        : item.badge.value as ReactElement,
      variant: item.badge.variant === 'destructive' || item.badge.variant === 'secondary' || item.badge.variant === 'outline'
        ? 'default'
        : item.badge.variant as 'default' | 'success' | 'warning' | 'error' | 'custom'
    } : undefined
  }))

  return (
    <SidebarTemplate
      title={config.title}
      icon={config.icon}
      backHref={config.backHref}
      navigationItems={navigationItems}
      showTeamSection={config.showTeamSection}
      showLogout={config.showLogout}
      dashboardColor={config.dashboardColor}
    />
  )
}