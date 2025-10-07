'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Lock,
  Loader2,
  Search,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { getUserDashboardsClient, DashboardInfo } from '@/lib/permissions'
import { useDashboardTracking, DashboardWithTracking } from '@/hooks/useDashboardTracking'
import { RedditIcon, InstagramIcon, UsersIcon, ActivityIcon, MonitorIcon } from '@/components/shared/icons/DashboardIcons'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const dashboardIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  reddit: RedditIcon,
  instagram: InstagramIcon,
  models: UsersIcon,
  tracking: ActivityIcon,
  monitor: MonitorIcon
}

/**
 * Dashboard Colors - Migrated to Design Token System v2.0
 * Using semantic tokens and platform-specific colors
 */
const dashboardColors: Record<string, { color: string; bgColor: string; accent: string }> = {
  reddit: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    accent: 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 text-white'
  },
  instagram: {
    color: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-50',
    accent: 'bg-gradient-to-br from-fuchsia-600 via-pink-500 to-purple-600 text-white'
  },
  models: {
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
    accent: 'bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-500 text-white'
  },
  tracking: {
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    accent: 'bg-gradient-to-br from-rose-700 via-rose-500 to-pink-600 text-white'
  },
  monitor: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    accent: 'bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500 text-white'
  }
}


export default function DashboardsPage() {
  const router = useRouter()
  const [dashboards, setDashboards] = useState<DashboardInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Dashboard tracking hook
  const { trackDashboardAccess, sortDashboardsByRecent, getRelativeTime } = useDashboardTracking()

  useEffect(() => {
    loadUserDashboards()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchFocused) {
        e.preventDefault()
        document.getElementById('dashboard-search')?.focus()
      } else if (e.key === 'Escape') {
        setSearchQuery('')
        document.getElementById('dashboard-search')?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchFocused])

  async function loadUserDashboards() {
    try {
      if (!supabase) {
        logger.error('No Supabase client available')
        setLoading(false)
        return
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        logger.error('Failed to get user:', userError)
        setLoading(false)
        return
      }

      setUserEmail(user.email || null)

      // Get user's accessible dashboards
      const userDashboards = await getUserDashboardsClient(user.email!)
      setDashboards(userDashboards)
    } catch (error) {
      logger.error('Failed to load dashboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!supabase) {
      logger.error('Supabase client not available')
      router.push('/login')
      return
    }

    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      logger.error('Logout error:', error)
      router.push('/login')
    }
  }

  // Filter and sort dashboards
  const filteredDashboards = useMemo(() => {
    let filtered = dashboards

    // Apply search filter if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = dashboards.filter(dashboard =>
        dashboard.name.toLowerCase().includes(query) ||
        (dashboard.description?.toLowerCase() || '').includes(query)
      )
    }

    // Sort by most recently accessed
    return sortDashboardsByRecent(filtered as DashboardWithTracking[])
  }, [searchQuery, dashboards, sortDashboardsByRecent])

  // Highlight search matches - using design tokens
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ?
        <span key={i} className={cn("bg-warning/20 font-medium", designSystem.typography.color.primary)}>{part}</span> :
        part
    )
  }

  if (loading) {
    return (
      <div className={cn("min-h-screen", designSystem.background.surface.subtle)}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen", designSystem.background.surface.subtle)}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-default">
          <div className="flex items-center space-x-4">
            <Image
              src="/logo/logo.png"
              alt="B9 Dashboard"
              width={80}
              height={30}
              className="h-8 w-auto object-contain"
              priority
            />
            <div>
              <h1 className={cn("text-2xl font-semibold tracking-tight", designSystem.typography.color.primary)}>
                B9 Dashboard
              </h1>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className={cn("bg-white border-strong", designSystem.background.hover.subtle, designSystem.typography.color.secondary)}
          >
            <LogOut className="w-3 h-3 mr-1.5" />
            <span className="text-xs">Sign Out</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full max-w-sm">
            <div className={cn("absolute left-3 top-1/2 transform -translate-y-1/2 z-10", designSystem.typography.color.disabled)}>
              <Search className="h-4 w-4" />
            </div>
            <Input
              id="dashboard-search"
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={`w-full pl-10 pr-4 py-3 border-2 ${designSystem.borders.radius.md} backdrop-blur-sm transition-all duration-300`}
            />
          </div>
        </div>

        {/* Empty State - No Access */}
        {dashboards.length === 0 && !loading && (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto p-8">
              <Lock className={cn("w-12 h-12 mx-auto mb-4", designSystem.typography.color.disabled)} />
              <h2 className="text-xl font-semibold mb-2">No Dashboards Available</h2>
              <p className={cn(designSystem.typography.color.subtle)}>
                You don&apos;t have access to any dashboards yet. Please contact your administrator.
              </p>
            </Card>
          </div>
        )}

        {/* Empty State - No Search Results */}
        {searchQuery.trim() && filteredDashboards.length === 0 && dashboards.length > 0 && (
          <div className="text-center py-12">
            <Search className={cn("h-12 w-12 mx-auto mb-4", designSystem.typography.color.disabled)} />
            <h3 className={cn("text-lg font-medium mb-2", designSystem.typography.color.primary)}>No dashboards found</h3>
            <p className={cn(designSystem.typography.color.subtle)}>Try searching with different keywords</p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="mt-4"
            >
              Clear search
            </Button>
          </div>
        )}

        {/* Available Dashboards */}
        {filteredDashboards.length > 0 && (
          <div>
            <h2 className={cn("text-lg font-semibold mb-4 text-center tracking-tight", designSystem.typography.color.secondary)}>
              Your Available Dashboards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {filteredDashboards.map((dashboard: DashboardWithTracking, index: number) => {
                const Icon = dashboardIcons[dashboard.dashboard_id] as React.ComponentType<{ className?: string }> || ActivityIcon
                const colors = dashboardColors[dashboard.dashboard_id] || {
                  color: designSystem.typography.color.subtle,
                  bgColor: designSystem.background.surface.subtle,
                  accent: `${designSystem.background.surface.darker} text-white`
                }

                const handleDashboardClick = () => {
                  trackDashboardAccess(dashboard.dashboard_id)
                  router.push(dashboard.path)
                }

                return (
                  <Card
                    key={dashboard.dashboard_id}
                    className={`group dashboard-card-active transition-all duration-300 cursor-pointer ${designSystem.borders.radius.sm} hover:scale-105 hover:-translate-y-1 active:scale-95`}
                    onClick={handleDashboardClick}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className={`p-2 ${designSystem.borders.radius.sm} flex-shrink-0 ${colors.accent}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="ml-3 flex-1">
                          <CardTitle className={cn("text-sm font-semibold tracking-tight", designSystem.typography.color.primary)}>
                            {highlightText(dashboard.name, searchQuery)}
                          </CardTitle>
                          {/* Last Opened Time */}
                          <p className={cn("text-xs mt-0.5", designSystem.typography.color.subtle)}>
                            {getRelativeTime(dashboard.dashboard_id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 text-center">
          <p className={cn("text-xs", designSystem.typography.color.disabled)}>
            © 2025 B9 Dashboard · {userEmail === 'info@b9agencija.com' && 'Admin Access'}
          </p>
        </div>
      </div>
    </div>
  )
}