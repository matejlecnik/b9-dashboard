'use client'

import { Activity } from 'lucide-react'
import { SidebarTemplate } from '@/components/SidebarTemplate'

export function RedditMonitorSidebar() {

  const navigationItems = [
    {
      id: 'reddit-monitor',
      title: 'Reddit Monitor',
      href: '/monitor/reddit',
      icon: Activity,
      badge: {
        type: 'status' as const,
        value: (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
        ),
        variant: 'custom' as any
      }
    }
  ]

  return (
    <SidebarTemplate
      title="System Monitor"
      icon={Activity}
      backHref="/dashboards"
      navigationItems={navigationItems}
      showTeamSection={true}
      showLogout={true}
    />
  )
}