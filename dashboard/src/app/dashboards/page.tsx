'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Instagram,
  Users,
  Activity,
  Monitor,
  Lock,
  Loader2,
  Search,
  LogOut
} from 'lucide-react'
import { Button, Card, CardTitle, Input } from '@/components/ui'
import { supabase, logger } from '@/lib'
import { getUserDashboardsClient, DashboardInfo } from '@/lib/permissions'
import { useDashboardTracking } from '@/hooks/useDashboardTracking'


// Reddit Icon Component
const RedditIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
  </svg>
)

const dashboardIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  reddit: RedditIcon,
  instagram: Instagram,
  models: Users,
  tracking: Activity,
  monitor: Monitor
}

const dashboardColors: Record<string, { color: string; bgColor: string; accent: string }> = {
  reddit: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    accent: 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 text-white'
  },
  instagram: {
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    accent: 'bg-gradient-to-br from-pink-600 via-pink-500 to-pink-700 text-white'
  },
  models: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    accent: 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 text-white'
  },
  tracking: {
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    accent: 'bg-purple-600 text-white'
  },
  monitor: {
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    accent: 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white'
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
    return sortDashboardsByRecent(filtered)
  }, [searchQuery, dashboards, sortDashboardsByRecent])

  // Highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ?
        <span key={i} className="bg-yellow-200 font-medium">{part}</span> :
        part
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
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
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                B9 Dashboard
              </h1>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="w-3 h-3 mr-1.5" />
            <span className="text-xs">Sign Out</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full max-w-sm">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
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
              className="w-full pl-10 pr-4 py-3 border-2 rounded-xl backdrop-blur-sm transition-all duration-300"
            />
          </div>
        </div>

        {/* Empty State - No Access */}
        {dashboards.length === 0 && !loading && (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto p-8">
              <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">No Dashboards Available</h2>
              <p className="text-gray-500">
                You don&apos;t have access to any dashboards yet. Please contact your administrator.
              </p>
            </Card>
          </div>
        )}

        {/* Empty State - No Search Results */}
        {searchQuery.trim() && filteredDashboards.length === 0 && dashboards.length > 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards found</h3>
            <p className="text-gray-500">Try searching with different keywords</p>
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
            <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center tracking-tight">
              Your Available Dashboards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {filteredDashboards.map((dashboard: DashboardInfo, index: number) => {
                const Icon = dashboardIcons[dashboard.dashboard_id] as React.ComponentType<{ className?: string }> || Activity
                const colors = dashboardColors[dashboard.dashboard_id] || {
                  color: 'text-gray-500',
                  bgColor: 'bg-gray-50',
                  accent: 'bg-gray-600 text-white'
                }

                const handleDashboardClick = () => {
                  trackDashboardAccess(dashboard.dashboard_id)
                  router.push(dashboard.path)
                }

                return (
                  <Card
                    key={dashboard.dashboard_id}
                    className="group dashboard-card-active transition-all duration-300 cursor-pointer rounded-lg hover:scale-105 hover:-translate-y-1 active:scale-95"
                    onClick={handleDashboardClick}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="p-4">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${colors.accent}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="ml-3 flex-1">
                          <CardTitle className="text-sm font-semibold text-gray-900 tracking-tight">
                            {highlightText(dashboard.name, searchQuery)}
                          </CardTitle>
                          {/* Last Opened Time */}
                          <p className="text-xs text-gray-500 mt-0.5">
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
          <p className="text-xs text-gray-400">
            © 2025 B9 Dashboard · {userEmail === 'info@b9agencija.com' && 'Admin Access'}
          </p>
        </div>
      </div>
    </div>
  )
}