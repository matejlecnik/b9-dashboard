'use client'

import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  TrendingUp,
  Target,
  Activity,
  Globe,
  Search
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'

// Reddit Icon Component
const RedditIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
  </svg>
)

// Instagram Icon Component
const InstagramIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>
  </svg>
)

interface Dashboard {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  status: 'active' | 'coming-soon' | 'beta'
  color: string
  gradient: string
  accent: string
  metrics?: {
    label: string
    value: string
  }[]
}

export default function DashboardsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleLogout = async () => {
    if (!supabase) {
      console.error('Supabase client not available')
      router.push('/login')
      return
    }
    
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  // Filter dashboards based on search query
  const filteredDashboards = useMemo(() => {
    const dashboards: Dashboard[] = [
      {
        id: 'reddit',
        name: 'Reddit Intelligence',
        description: 'Subreddit categorization and OnlyFans marketing strategy optimization',
        icon: RedditIcon,
        href: '/subreddit-review',
        status: 'active',
        color: 'border-gray-200 hover:border-orange-300',
        gradient: 'from-pink-500/10 via-pink-400/5 to-pink-500/10',
        accent: 'bg-gray-600 text-white',
        metrics: [
          { label: 'Subreddits', value: '1,200+' },
          { label: 'Categories', value: '3' },
          { label: 'Active', value: '24/7' }
        ]
      },
      {
        id: 'instagram',
        name: 'Instagram Analytics',
        description: 'Instagram engagement tracking and influencer discovery platform',
        icon: InstagramIcon,
        href: '/instagram-dashboard',
        status: 'coming-soon',
        color: 'border-pink-200 hover:border-purple-300',
        gradient: 'from-pink-500/10 via-pink-400/5 to-pink-500/10',
        accent: 'bg-gradient-to-br from-pink-600 via-pink-500 to-pink-700 text-white',
        metrics: [
          { label: 'Accounts', value: 'TBA' },
          { label: 'Metrics', value: 'Advanced' },
          { label: 'Launch', value: 'Q2 2025' }
        ]
      },
      {
        id: 'tiktok',
        name: 'TikTok Intelligence',
        description: 'TikTok trend analysis and viral content optimization',
        icon: TrendingUp,
        href: '/tiktok-dashboard',
        status: 'coming-soon',
        color: 'border-black hover:border-gray-700',
        gradient: 'from-black/10 via-gray-900/5 to-black/10',
        accent: 'bg-black text-white',
        metrics: [
          { label: 'Trends', value: 'Real-time' },
          { label: 'Content', value: 'Video AI' },
          { label: 'Launch', value: 'Q3 2025' }
        ]
      },
      {
        id: 'onlyfans',
        name: 'OnlyFans Analytics',
        description: 'Revenue tracking and subscriber growth optimization',
        icon: Target,
        href: '/onlyfans-dashboard',
        status: 'beta',
        color: 'border-cyan-200 hover:border-cyan-300',
        gradient: 'from-gray-500/10 via-gray-400/5 to-gray-500/10',
        accent: 'bg-gray-600 text-white',
        metrics: [
          { label: 'Revenue', value: 'Live' },
          { label: 'Subscribers', value: 'Growth' },
          { label: 'Status', value: 'Beta' }
        ]
      },
      {
        id: 'twitter',
        name: 'X (Twitter) Monitor',
        description: 'Twitter engagement and audience analysis platform',
        icon: Activity,
        href: '/twitter-dashboard',
        status: 'coming-soon',
        color: 'border-black hover:border-gray-700',
        gradient: 'from-black/10 via-gray-900/5 to-black/10',
        accent: 'bg-black text-white',
        metrics: [
          { label: 'Engagement', value: 'Real-time' },
          { label: 'Audience', value: 'Analysis' },
          { label: 'Launch', value: 'Q4 2025' }
        ]
      },
      {
        id: 'unified',
        name: 'Unified Analytics',
        description: 'Cross-platform insights and comprehensive business intelligence',
        icon: Globe,
        href: '/unified-dashboard',
        status: 'coming-soon',
        color: 'border-b9-pink/30 hover:border-b9-pink/50',
        gradient: 'from-b9-pink/10 via-pink-400/5 to-pink-500/10',
        accent: 'bg-gray-200 text-gray-700',
        metrics: [
          { label: 'Platforms', value: 'All' },
          { label: 'Insights', value: 'AI-Powered' },
          { label: 'Launch', value: '2025' }
        ]
      }
    ]

    if (!searchQuery.trim()) return dashboards
    
    const query = searchQuery.toLowerCase()
    return dashboards.filter(dashboard => 
      dashboard.name.toLowerCase().includes(query) ||
      dashboard.description.toLowerCase().includes(query)
    )
  }, [searchQuery])
  
  const activeDashboards = filteredDashboards.filter(d => d.status === 'active')
  const upcomingDashboards = filteredDashboards.filter(d => d.status !== 'active')
  
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
  
  // Highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, i) => 
      regex.test(part) ? 
        <span key={i} className="bg-b9-pink/20 text-b9-pink font-medium">{part}</span> : 
        part
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
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
            <div>
              <h1 
                className="text-2xl font-semibold text-gray-900 tracking-tight"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
                }}
              >
                B9 Dashboard
              </h1>
              <p 
                className="text-gray-500 text-sm tracking-wide"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                }}
              >
                Select your business intelligence platform
              </p>
            </div>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Sign Out
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
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl backdrop-blur-sm transition-all duration-300 search-input-enhanced ${
                isSearchFocused
                  ? 'search-glow-focus'
                  : ''
              } focus:outline-none`}
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
              }}
            />
          </div>
        </div>

        {/* Empty State */}
        {searchQuery.trim() && filteredDashboards.length === 0 && (
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

        {/* Active Dashboards */}
        {activeDashboards.length > 0 && (
          <div className="mb-12">
            <h2 
              className="text-lg font-semibold text-gray-800 mb-4 text-center tracking-tight"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
              }}
            >
              Available
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {activeDashboards.map((dashboard, index) => {
                const IconComponent = dashboard.icon
                return (
                  <Link key={dashboard.id} href={dashboard.href}>
                    <Card 
                      className={`group dashboard-card-active transition-all duration-300 cursor-pointer rounded-lg animate-card-fade-in hover:scale-105 hover:-translate-y-1 active:scale-95`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center p-4">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${dashboard.accent}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-gray-900 ml-3 tracking-tight">
                          {highlightText(dashboard.name, searchQuery)}
                        </CardTitle>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Coming Soon Dashboards */}
        {upcomingDashboards.length > 0 && (
          <div>
            <h2 
              className="text-lg font-semibold text-gray-800 mb-4 text-center tracking-tight"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
              }}
            >
              Coming Soon
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {upcomingDashboards.map((dashboard, index) => {
                const IconComponent = dashboard.icon
                return (
                  <Card 
                    key={dashboard.id} 
                    className={`dashboard-card-inactive transition-all duration-300 opacity-60 hover:opacity-80 rounded-lg animate-card-fade-in hover:scale-[1.02] hover:-translate-y-0.5 cursor-not-allowed`}
                    style={{ animationDelay: `${(activeDashboards.length + index) * 0.1}s` }}
                  >
                    <div className="flex items-center p-4">
                      <div className="p-2 rounded-lg flex-shrink-0 bg-gray-200">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-gray-700 ml-3 tracking-tight">
                        {highlightText(dashboard.name, searchQuery)}
                      </CardTitle>
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
            © 2025 B9 Dashboard
          </p>
        </div>
      </div>
    </div>
  )
}