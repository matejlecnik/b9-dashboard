'use client'

import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp,
  Target,
  Activity,
  Globe,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

// Reddit Icon Component
const RedditIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
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
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const dashboards: Dashboard[] = [
    {
      id: 'reddit',
      name: 'Reddit Intelligence',
      description: 'Subreddit categorization and OnlyFans marketing strategy optimization',
      icon: RedditIcon,
      href: '/reddit-dashboard',
      status: 'active',
      color: 'border-orange-200 hover:border-orange-300',
      gradient: 'from-orange-500/10 via-red-500/5 to-pink-500/10',
      accent: 'bg-b9-pink text-white',
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
      icon: Users,
      href: '/instagram-dashboard',
      status: 'coming-soon',
      color: 'border-purple-200 hover:border-purple-300',
      gradient: 'from-purple-500/10 via-pink-500/5 to-red-500/10',
      accent: 'bg-gray-200 text-gray-700',
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
      color: 'border-green-200 hover:border-green-300',
      gradient: 'from-green-500/10 via-teal-500/5 to-blue-500/10',
      accent: 'bg-gray-200 text-gray-700',
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
      color: 'border-blue-200 hover:border-blue-300',
      gradient: 'from-blue-500/10 via-indigo-500/5 to-purple-500/10',
      accent: 'bg-gray-200 text-gray-700',
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
      color: 'border-gray-200 hover:border-gray-300',
      gradient: 'from-gray-500/10 via-slate-500/5 to-gray-500/10',
      accent: 'bg-gray-200 text-gray-700',
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
      gradient: 'from-b9-pink/10 via-purple-500/5 to-blue-500/10',
      accent: 'bg-gray-200 text-gray-700',
      metrics: [
        { label: 'Platforms', value: 'All' },
        { label: 'Insights', value: 'AI-Powered' },
        { label: 'Launch', value: '2025' }
      ]
    }
  ]

  const activeDashboards = dashboards.filter(d => d.status === 'active')
  const upcomingDashboards = dashboards.filter(d => d.status !== 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-200">
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

        {/* Active Dashboards */}
        <div className="mb-16">
          <div className="flex items-center space-x-3 mb-6">
            <h2 
              className="text-lg font-medium text-gray-900 tracking-tight"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
              }}
            >
              Available Platforms
            </h2>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              {activeDashboards.length} active
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {activeDashboards.map((dashboard) => {
              const IconComponent = dashboard.icon
              return (
                <Link key={dashboard.id} href={dashboard.href}>
                  <Card 
                    className="group glass-card shadow-apple border border-gray-200 hover:border-gray-300 hover:shadow-apple-strong hover-lift transition-all duration-200 flex items-center p-3 relative rounded-lg"
                  >
                    {/* Icon + Name layout (Airtable-like) */}
                    <div className={`p-2 rounded-md flex-shrink-0 ${dashboard.accent}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-900 ml-3 flex-1 truncate">
                      {dashboard.name}
                    </CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Coming Soon Dashboards */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <h2 
              className="text-lg font-medium text-gray-900 tracking-tight"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
              }}
            >
              Upcoming Platforms
            </h2>
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
              {upcomingDashboards.length} planned
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {upcomingDashboards.map((dashboard) => {
              const IconComponent = dashboard.icon
              return (
                <Card 
                  key={dashboard.id} 
                  className="glass-card shadow-apple border border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center p-3 relative rounded-lg opacity-80 hover:opacity-100"
                >
                  <div className={`p-2 rounded-md flex-shrink-0 ${dashboard.accent}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-800 ml-3 flex-1 truncate">
                    {dashboard.name}
                  </CardTitle>
                  <div className="ml-2 text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                    {dashboard.status === 'beta' ? 'Beta' : 'Coming soon'}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            B9 Dashboard • Business Intelligence Platform
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Powered by advanced analytics and real-time data processing
          </p>
        </div>
      </div>
    </div>
  )
}
