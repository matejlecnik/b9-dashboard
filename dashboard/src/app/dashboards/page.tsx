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
import { CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { getUserDashboardsClient, DashboardInfo } from '@/lib/permissions'
import { useDashboardTracking, DashboardWithTracking } from '@/hooks/useDashboardTracking'
import { RedditIcon, InstagramIcon, UsersIcon, ActivityIcon, MonitorIcon } from '@/components/shared/icons/DashboardIcons'
import { designSystem, getDashboardTheme } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const dashboardIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  reddit: RedditIcon,
  instagram: InstagramIcon,
  models: UsersIcon,
  tracking: ActivityIcon,
  monitor: MonitorIcon
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
          <div className="flex items-center justify-center h-96">
            <div className={cn(
              "p-8 rounded-2xl animate-fade-in",
              "bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60",
              "backdrop-blur-2xl backdrop-saturate-150",
              "border border-gray-300/40",
              "shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            )}>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen", designSystem.background.surface.subtle)}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 relative">
          {/* Gradient divider */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300/60 to-transparent" />

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
              <h1 className={cn("text-2xl font-mac-display font-semibold tracking-tight", designSystem.typography.color.primary)}>
                B9 Dashboard
              </h1>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className={cn(
              "font-mac-text transition-all duration-300 ease-out",
              // Glassmorphic background
              "bg-gradient-to-br from-white/50 via-gray-50/40 to-white/50",
              "backdrop-blur-xl backdrop-saturate-150",
              // Mac-style border & shadow
              "border border-gray-300/40",
              "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
              // Hover state with red tint (Mac logout style)
              "hover:from-red-50/60 hover:via-red-50/50 hover:to-red-50/60",
              "hover:border-red-300/40 hover:text-red-600",
              "hover:shadow-[0_4px_12px_rgba(239,68,68,0.15)]",
              "hover:scale-105 active:scale-95"
            )}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Sign Out</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full max-w-md">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="dashboard-search"
              type="text"
              placeholder="Search dashboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "w-full pl-10 pr-16 py-2.5 rounded-xl font-mac-text text-sm",
                "transition-all duration-300 ease-out",
                // Glassmorphic background matching sidebar
                "bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60",
                "backdrop-blur-2xl backdrop-saturate-150",
                // Mac-style border & shadow
                "border border-gray-300/40",
                "shadow-[0_2px_8px_var(--black-alpha-04),0_1px_0_var(--white-alpha-60)_inset]",
                // Focus state with subtle gray ring (Mac-style)
                isSearchFocused
                  ? "ring-4 ring-gray-400/20 border-gray-400/50 shadow-[0_4px_12px_var(--black-alpha-08)]"
                  : "hover:border-gray-300/60 hover:shadow-[0_4px_10px_var(--black-alpha-06)]",
                // Placeholder styling + explicit outline suppression
                "placeholder:text-gray-400 text-gray-900",
                "outline-none focus:outline-none focus-visible:outline-none active:outline-none"
              )}
            />
            {/* Keyboard hint */}
            {!isSearchFocused && !searchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className={cn(
                  "inline-flex items-center justify-center",
                  "w-6 h-6",
                  "text-[10px] font-mac-text font-semibold",
                  "text-gray-500",
                  "bg-gradient-to-b from-white/60 to-gray-100/50",
                  "border border-gray-300/50",
                  "rounded-md shadow-sm",
                  "backdrop-blur-sm"
                )}>
                  <span className="translate-y-[0.5px]">/</span>
                </kbd>
              </div>
            )}
          </div>
        </div>

        {/* Empty State - No Access */}
        {dashboards.length === 0 && !loading && (
          <div className="text-center py-16 animate-fade-in">
            <div className={cn(
              "max-w-md mx-auto p-10 rounded-2xl",
              // Glassmorphic background matching other cards
              "bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60",
              "backdrop-blur-2xl backdrop-saturate-150",
              "border border-gray-300/40",
              "shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            )}>
              {/* Icon with gradient */}
              <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 mb-6">
                <Lock className="w-8 h-8 text-gray-600" />
              </div>
              <h2 className="text-xl font-mac-display font-semibold mb-3 text-gray-900">
                No Dashboards Available
              </h2>
              <p className="text-sm font-mac-text text-gray-600 leading-relaxed">
                You don&apos;t have access to any dashboards yet. Please contact your administrator.
              </p>
            </div>
          </div>
        )}

        {/* Empty State - No Search Results */}
        {searchQuery.trim() && filteredDashboards.length === 0 && dashboards.length > 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className={cn(
              "max-w-md mx-auto p-10 rounded-2xl",
              // Glassmorphic background matching other cards
              "bg-gradient-to-br from-white/60 via-gray-50/50 to-white/60",
              "backdrop-blur-2xl backdrop-saturate-150",
              "border border-gray-300/40",
              "shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            )}>
              {/* Icon with gradient */}
              <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 mb-6">
                <Search className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-mac-display font-semibold mb-3 text-gray-900">
                No dashboards found
              </h3>
              <p className="text-sm font-mac-text text-gray-600 leading-relaxed mb-6">
                Try searching with different keywords
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="font-mac-text"
              >
                Clear search
              </Button>
            </div>
          </div>
        )}

        {/* Available Dashboards */}
        {filteredDashboards.length > 0 && (
          <div>
            <h2 className={cn("text-lg font-mac-text font-semibold mb-4 text-center tracking-tight", designSystem.typography.color.secondary)}>
              Your Available Dashboards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {filteredDashboards.map((dashboard: DashboardWithTracking, index: number) => {
                const Icon = dashboardIcons[dashboard.dashboard_id] as React.ComponentType<{ className?: string }> || ActivityIcon
                const theme = getDashboardTheme(dashboard.dashboard_id)

                const handleDashboardClick = () => {
                  trackDashboardAccess(dashboard.dashboard_id)
                  router.push(dashboard.path)
                }

                return (
                  <div
                    key={dashboard.dashboard_id}
                    className={cn(
                      "group dashboard-card-active",
                      "transition-all duration-300 cursor-pointer",
                      designSystem.borders.radius.lg,
                      "hover:scale-105 hover:-translate-y-1 active:scale-95",
                      "overflow-hidden",
                      "min-h-[117px]"
                    )}
                    onClick={handleDashboardClick}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
                      backdropFilter: 'blur(20px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                      // Enhanced Mac-style shadow (multi-layer with subtle inset highlights)
                      boxShadow: '0 20px 50px var(--black-alpha-12), 0 1px 0 rgba(255,255,255,0.6) inset, 0 -1px 0 rgba(0,0,0,0.02) inset',
                      border: '1px solid var(--slate-400-alpha-60)'
                    }}
                  >
                    <div className="p-5 flex items-center h-full">
                      <div className="flex items-center">
                        <div className={cn(
                          `p-2 ${designSystem.borders.radius.sm} flex-shrink-0 ${theme.accent}`,
                          "shadow-[0_1px_2px_rgba(0,0,0,0.1)_inset]" // Inner depth
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="ml-3 flex-1">
                          <CardTitle className={cn("text-sm font-mac-text font-semibold tracking-tight", designSystem.typography.color.primary)}>
                            {highlightText(dashboard.name, searchQuery)}
                          </CardTitle>
                          {/* Last Opened Time */}
                          <p className={cn("text-xs font-mac-text mt-0.5", designSystem.typography.color.subtle)}>
                            {getRelativeTime(dashboard.dashboard_id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-6 text-center">
          <p className={cn("text-xs font-mac-text", designSystem.typography.color.disabled)}>
            © 2025 B9 Dashboard · {userEmail === 'info@b9agencija.com' && 'Admin Access'}
          </p>
        </div>
      </div>
    </div>
  )
}