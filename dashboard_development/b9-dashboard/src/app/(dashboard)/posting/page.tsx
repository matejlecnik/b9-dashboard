'use client'

import { useState, useEffect } from 'react'
import type React from 'react'
import { supabase, type Subreddit, type Post } from '../../../lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { 
  Users, 
  Clock, 
  MessageCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  TrendingUp,
  Zap,
  Calendar,
  Shield,
  Copy
} from 'lucide-react'
import { BookOpen } from 'lucide-react'
import Image from 'next/image'
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

type AllowedCategory = 'Ok' | 'No Seller' | 'Non Related'

type BaseSubreddit = Omit<Subreddit, 'review'> & { review: Subreddit['review'] | AllowedCategory | 'User Feed' | null }

interface SubredditWithPosts extends BaseSubreddit {
  recent_posts?: Post[]
  public_description?: string | null
  avg_engagement_velocity?: number | null
  min_account_age_days?: number | null
  min_comment_karma?: number | null
  min_post_karma?: number | null
  allow_images?: boolean | null
  category?: AllowedCategory | null
  review: AllowedCategory | 'User Feed' | null
}

// (no helpers currently)

export default function PostingPage() {
  const { addToast } = useToast()
  const [okSubreddits, setOkSubreddits] = useState<SubredditWithPosts[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSubreddits, setExpandedSubreddits] = useState<Set<number>>(new Set())
  const [topPostsBySubreddit, setTopPostsBySubreddit] = useState<Record<number, Post[]>>({})
  const [loadingTopPosts, setLoadingTopPosts] = useState<Set<number>>(new Set())
  const [, setLastUpdated] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  // Filters & sorting
  const [sfwFilter, setSfwFilter] = useState<'all' | 'sfw' | 'nsfw'>('all')
  // Removed content-type filter control from toolbar per spec
  const [sortBy, setSortBy] = useState<'subscribers' | 'avg_upvotes' | 'engagement' | 'best_hour'>('engagement')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Fetch subreddits (Ok category only) with a few recent posts
  const fetchOkSubreddits = async () => {
    setLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      const sb = supabase as NonNullable<typeof supabase>
      
      // Prefer 'category' column; fallback to legacy 'review' if needed
      let subreddits: Subreddit[] | null = null
      let primaryError: unknown = null
      try {
        const { data, error } = await sb
          .from('subreddits')
          .select('*')
          .eq('category', 'Ok')
          .not('name', 'ilike', 'u_%')
          .order('avg_upvotes_per_post', { ascending: false })
        if (error) throw error
        subreddits = data
      } catch (e) {
        primaryError = e
      }

      if (!subreddits) {
        const { data, error } = await sb
          .from('subreddits')
          .select('*')
          .eq('review', 'Ok')
          .not('name', 'ilike', 'u_%')
          .order('avg_upvotes_per_post', { ascending: false })
        if (error) throw (primaryError || error)
        subreddits = data
      }

      const subredditsWithPosts = await Promise.all(
        (subreddits || []).map(async (subreddit) => {
          const postsResult = await sb
            .from('posts')
            .select('*')
            .eq('subreddit_name', subreddit.name)
            .order('created_utc', { ascending: false })
            .limit(5)
          const posts = postsResult.data ?? []
          return {
            ...subreddit,
            recent_posts: posts
          }
        })
      )

      setOkSubreddits(subredditsWithPosts)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching Ok subreddits:', error)
      addToast({
        type: 'error',
        title: 'Error Loading Posting Data',
        description: 'Failed to load subreddits and posts. Please try again.',
        duration: 5000
      })
    }
    setLoading(false)
  }


  // Format time ago
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) return `${diffInDays}d ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths}mo ago`
  }

  // Sanitize subreddit icon URL (community_icon often contains &amp;)
  const getIconUrl = (subreddit: SubredditWithPosts): string | null => {
    let url = (subreddit.icon_img && String(subreddit.icon_img).trim()) || (subreddit.community_icon && String(subreddit.community_icon).trim()) || ''
    if (!url) return null
    url = url.replace(/&amp;/g, '&')
    if (url.startsWith('//')) url = `https:${url}`
    return url
  }

  // Generate a color based on subreddit name for consistent placeholder avatars
  const getSubredditColor = (name: string) => {
    const colors = [
      '#FF8395', // B9 Pink
      '#6366F1', // Indigo
      '#8B5CF6', // Violet  
      '#EC4899', // Pink
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#84CC16', // Lime
      '#F97316'  // Orange
    ]
    
    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Get initials from subreddit name for placeholder
  const getSubredditInitials = (name: string) => {
    // Remove r/ prefix and get first 2 characters
    const cleanName = name.replace(/^r\//, '').replace(/^u\//, '')
    return cleanName.substring(0, 2).toUpperCase()
  }

  // Client-side text filtering
  const filteredOkSubreddits = okSubreddits.filter((subreddit) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      subreddit.name.toLowerCase().includes(q) ||
      subreddit.display_name_prefixed.toLowerCase().includes(q) ||
      (subreddit.public_description || subreddit.title || '').toLowerCase().includes(q) ||
      (subreddit.top_content_type || '').toLowerCase().includes(q)
    )
  })

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const input = document.querySelector('input[placeholder*="Search subreddits"]') as HTMLInputElement
        input?.focus()
      },
      description: 'Focus Search Bar',
      category: 'Search'
    },
    {
      key: '/',
      action: () => {
        const input = document.querySelector('input[placeholder*="Search subreddits"]') as HTMLInputElement
        input?.focus()
      },
      description: 'Quick Search',
      category: 'Search'
    },
    {
      key: 'Escape',
      action: () => {
        setSearchQuery('')
      },
      description: 'Clear Selection & Search',
      category: 'Actions',
      preventDefault: false
    }
  ]
  useKeyboardShortcuts(shortcuts, !loading)

  useEffect(() => {
    fetchOkSubreddits()
    const refreshInterval = setInterval(() => {
      fetchOkSubreddits()
    }, 120000)
    return () => clearInterval(refreshInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Client filters & sorting
  const filteredByControls = filteredOkSubreddits.filter((s) => {
    if (sfwFilter === 'sfw' && s.over18) return false
    if (sfwFilter === 'nsfw' && !s.over18) return false
    return true
  })

  const sortedSubreddits = [...filteredByControls].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    let cmp = 0
    switch (sortBy) {
      case 'subscribers':
        cmp = (a.subscribers || 0) - (b.subscribers || 0)
        break
      case 'avg_upvotes':
        cmp = (a.avg_upvotes_per_post || 0) - (b.avg_upvotes_per_post || 0)
        break
      case 'best_hour':
        cmp = (a.best_posting_hour || 0) - (b.best_posting_hour || 0)
        break
      case 'engagement':
      default:
        cmp = (a.subscriber_engagement_ratio || 0) - (b.subscriber_engagement_ratio || 0)
        break
    }
    return cmp * dir
  })

  // Toggle expand and lazy-load top posts
  const toggleExpanded = async (subredditId: number) => {
    setExpandedSubreddits(prev => {
      const ns = new Set(prev)
      if (ns.has(subredditId)) ns.delete(subredditId)
      else ns.add(subredditId)
      return ns
    })
    if (!topPostsBySubreddit[subredditId]) {
      setLoadingTopPosts(prev => new Set(prev).add(subredditId))
      try {
        const sr = okSubreddits.find(s => s.id === subredditId)
        if (sr && supabase) {
          const { data: posts } = await supabase
            .from('posts')
            .select('*')
            .eq('subreddit_name', sr.name)
            .order('score', { ascending: false })
            .limit(20)
          setTopPostsBySubreddit(prev => ({ ...prev, [subredditId]: posts || [] }))
        }
      } finally {
        setLoadingTopPosts(prev => { const ns = new Set(prev); ns.delete(subredditId); return ns })
      }
    }
  }

  // (removed content-type icon rendering)

  const copyTitle = async (e: React.MouseEvent, title: string) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    try {
      await navigator.clipboard.writeText(title)
      addToast({ type: 'success', title: 'Copied', description: 'Title copied to clipboard', duration: 1500 })
    } catch {
      addToast({ type: 'error', title: 'Copy failed', description: 'Could not copy title', duration: 2000 })
    }
  }

  // removed copyLink / copyMarkdown per new UX

  // Compact summary for filtered set
  const showingCount = sortedSubreddits.length
  const totalMembersFiltered = sortedSubreddits.reduce((sum, s) => sum + (s.subscribers || 0), 0)
  const avgMembersFiltered = showingCount > 0 ? Math.round(totalMembersFiltered / showingCount) : 0
  const avgEngagementFiltered = showingCount > 0 
    ? ((sortedSubreddits.reduce((sum, s) => sum + (s.subscriber_engagement_ratio || 0), 0) / showingCount) * 100) 
    : 0

  // Safe formatters to avoid runtime crashes on null/undefined values
  // (removed unused format helpers)

  return (
    <DashboardLayout
      title=""
      subtitle={undefined}
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Search & Filters Toolbar */}
        <div 
          className="rounded-2xl border-0 p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              inset 0 -1px 0 rgba(255, 255, 255, 0.05)
            `,
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative" role="search">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search subreddits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border-0 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-b9-pink transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
                }}
                disabled={loading}
                aria-label="Search subreddits"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3" role="group" aria-label="Posting filters">
              <select aria-label="Filter by SFW or NSFW" value={sfwFilter} onChange={(e) => setSfwFilter(e.target.value as 'all' | 'sfw' | 'nsfw')} className="py-2 px-3 rounded-lg text-sm border border-gray-200">
                <option value="all">All (SFW/NSFW)</option>
                <option value="sfw">SFW only</option>
                <option value="nsfw">NSFW only</option>
              </select>
              <div className="flex gap-2">
                <select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'subscribers' | 'avg_upvotes' | 'engagement' | 'best_hour')} className="py-2 px-3 rounded-lg text-sm border border-gray-200 flex-1">
                  <option value="engagement">Sort: Engagement %</option>
                  <option value="subscribers">Sort: Members</option>
                  <option value="avg_upvotes">Sort: Avg upvotes</option>
                  <option value="best_hour">Sort: Best hour</option>
                </select>
                <select aria-label="Sort direction" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')} className="py-2 px-3 rounded-lg text-sm border border-gray-200">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
              {/* Clear filters */}
              {(sfwFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setSfwFilter('all'); setSearchQuery('') }}
                  className="py-2 px-3 rounded-lg text-sm border border-gray-200 hover:bg-gray-50"
                  aria-label="Clear filters"
                >
                  Clear filters
                </button>
              )}
            </div>
            {/* Active Accounts placeholder */}
            <div className="lg:col-span-2">
              <Card className="bg-white/70 backdrop-blur-md border-0">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-700">Active accounts</CardTitle>
                    <Badge variant="outline" className="text-xs">coming soon</Badge>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        {/* Compact summary */}
        <div className="text-xs text-gray-600 px-1">
          Showing <span className="font-semibold text-b9-pink">{showingCount}</span> subreddits · Total members <span className="font-semibold text-gray-900">{totalMembersFiltered.toLocaleString()}</span> · Avg members <span className="font-semibold text-gray-900">{avgMembersFiltered.toLocaleString()}</span> · Avg engagement <span className="font-semibold text-gray-900">{isFinite(avgEngagementFiltered) ? avgEngagementFiltered.toFixed(2) : '0.00'}%</span>
        </div>

        {/* Subreddits List */}
        <div id="subreddit-list" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            sortedSubreddits.map((subreddit) => (
              <div key={subreddit.id} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-sm group-hover:blur-lg transition-all duration-300"></div>
                <Card className="relative bg-white/80 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/30"></div>
                  
                  {/* Main Subreddit Header */}
                  <CardHeader className="relative pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Subreddit Icon / Avatar */}
                        <a 
                          href={`https://reddit.com/${subreddit.display_name_prefixed}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative"
                          title={`Open ${subreddit.display_name_prefixed} on Reddit`}
                        >
                          {getIconUrl(subreddit) ? (
                            <Image
                              src={getIconUrl(subreddit) || ''}
                              alt={`${subreddit.name} icon`}
                              width={56}
                              height={56}
                              className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow"
                              unoptimized
                            />
                          ) : null}
                          <div 
                            className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg border border-gray-200 ${
                              getIconUrl(subreddit) ? 'hidden' : 'flex'
                            }`}
                            style={{
                              backgroundColor: getSubredditColor(subreddit.name),
                              display: getIconUrl(subreddit) ? 'none' : 'flex'
                            }}
                          >
                            {getSubredditInitials(subreddit.name)}
                          </div>
                          {/* Removed corner 18+ badge to avoid duplication with SFW/NSFW */}
                        </a>

                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <a
                              href={`https://reddit.com/${subreddit.display_name_prefixed}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xl font-bold text-gray-900 hover:text-b9-pink"
                            >
                              {subreddit.display_name_prefixed}
                            </a>
                            {/* Category badge */}
                            {((subreddit.category ?? subreddit.review) !== null) && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-semibold border bg-white/60">
                                {subreddit.category ?? subreddit.review}
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1.5 py-0.5 font-semibold border ${subreddit.over18 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}
                            >
                              {subreddit.over18 ? 'NSFW' : 'SFW'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mt-1 line-clamp-2">{subreddit.public_description || subreddit.title}</p>
                          
                          {/* Key Metrics Row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                            <div className="flex items-center space-x-1 text-sm">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-gray-900">{(subreddit.subscribers || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm">
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-gray-900">{Math.round(subreddit.avg_upvotes_per_post)}</span>
                              <span className="text-gray-500">avg</span>
                            </div>
                            {subreddit.avg_engagement_velocity && (
                              <div className="flex items-center space-x-1 text-sm">
                                <Zap className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium text-gray-900">{Math.round(subreddit.avg_engagement_velocity)}</span>
                                <span className="text-gray-500">upvotes/hr</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-gray-900">{subreddit.best_posting_hour}:00</span>
                              </span>
                              {subreddit.best_posting_day && (
                                <span className="flex items-center space-x-1 text-gray-800">
                                  <Calendar className="h-4 w-4 text-indigo-600" />
                                  <span className="font-medium">{subreddit.best_posting_day}</span>
                                </span>
                              )}
                            </div>
                            
                            {/* Engagement: styled consistently, placed after avg upvotes */}
                            <div className="flex items-center space-x-1 text-sm">
                              <TrendingUp className="h-4 w-4 text-b9-pink" />
                              <span className="font-medium text-gray-900">{((subreddit.subscriber_engagement_ratio || 0) * 100).toFixed(1)}%</span>
                            </div>
                            {/* Updated moved to top-right with icon */}
                          </div>
                          
                          {/* Minimal Requirements Row */}
                          {(subreddit.min_account_age_days || subreddit.min_comment_karma || subreddit.min_post_karma || subreddit.allow_images !== null) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                              <span className="text-gray-600 font-medium">Requirements:</span>
                              {subreddit.min_account_age_days && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                  <Calendar className="h-3 w-3" />
                                  <span>{subreddit.min_account_age_days}d account</span>
                                </div>
                              )}
                              {subreddit.min_comment_karma && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                  <MessageCircle className="h-3 w-3" />
                                  <span>{subreddit.min_comment_karma} comment karma</span>
                                </div>
                              )}
                              {subreddit.min_post_karma && (
                                <div className="flex items-center space-x-1 text-gray-600">
                                  <ArrowUpCircle className="h-3 w-3" />
                                  <span>{subreddit.min_post_karma} post karma</span>
                                </div>
                              )}
                              {subreddit.allow_images === false && (
                                <div className="flex items-center space-x-1 text-red-600">
                                  <Shield className="h-3 w-3" />
                                  <span>No images</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={`https://www.reddit.com/${subreddit.display_name_prefixed.replace(/^\//, '')}/about/rules`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                          title="Subreddit rules"
                          aria-label="Open subreddit rules"
                        >
                          <BookOpen className="h-5 w-5" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(subreddit.id)}
                          className="text-gray-500 hover:text-gray-700"
                          title={expandedSubreddits.has(subreddit.id) ? 'Hide top posts' : 'Show top posts'}
                          aria-expanded={expandedSubreddits.has(subreddit.id)}
                        >
                          {expandedSubreddits.has(subreddit.id) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </Button>
                        {subreddit.last_scraped_at && (
                          <div className="flex items-center text-xs text-gray-500" title={`updated ${timeAgo(subreddit.last_scraped_at)}`}>
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            <span>{timeAgo(subreddit.last_scraped_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSubreddits.has(subreddit.id) && (
                    <CardContent className="relative pt-0">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <MessageCircle className="h-5 w-5 text-gray-700" />
                          <h4 className="font-semibold text-gray-900">Top 20 Most Upvoted Posts</h4>
                          {loadingTopPosts.has(subreddit.id) && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-b9-pink ml-2"></div>
                          )}
                        </div>
                        {topPostsBySubreddit[subreddit.id] && topPostsBySubreddit[subreddit.id].length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[70vh] overflow-y-auto">
                            {topPostsBySubreddit[subreddit.id].map((post) => {
                              const postUrl = `https://www.reddit.com/comments/${post.reddit_id}`
                              const thumb = (post as unknown as { thumbnail?: string }).thumbnail
                              const hasThumb = !!thumb && /^https?:\/\//.test(thumb) && !/(self|default)$/i.test(thumb)
                              return (
                                <a key={post.id} href={postUrl} target="_blank" rel="noopener noreferrer" className="group block bg-white/70 rounded-xl border border-gray-200 hover:shadow transition overflow-hidden">
                                  {/* Media */}
                                  <div className="relative aspect-square bg-gray-100">
                                    {hasThumb ? (
                                      <Image src={thumb} alt="thumb" fill sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw" className="object-cover" unoptimized />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">No preview</div>
                                    )}
                                    <div className="absolute top-1 right-1">
                                      <button
                                        onClick={(e) => copyTitle(e, post.title)}
                                        className="p-1.5 rounded-md bg-white/80 text-gray-700 hover:bg-white shadow"
                                        title="Copy title"
                                        aria-label="Copy title"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Meta */}
                                  <div className="p-2">
                                    <div className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2.25rem]">{post.title}</div>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                      <div className="flex items-center space-x-2">
                                        <span className="flex items-center space-x-1">
                                          <ArrowUpCircle className="h-3 w-3" />
                                          <span>{post.score}</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                          <MessageCircle className="h-3 w-3" />
                                          <span>{post.num_comments}</span>
                                        </span>
                                      </div>
                                      <span>{timeAgo(post.created_utc)}</span>
                                    </div>
                                  </div>
                                </a>
                              )
                            })}
                          </div>
                        ) : !loadingTopPosts.has(subreddit.id) ? (
                          <div className="text-sm text-gray-500 italic">No top posts data</div>
                        ) : null}
                      </div>
                    </CardContent>
                  )}

                </Card>
              </div>
            ))
          )}
        </div>
        {/* No selection bar or rules modal on this page */}
      </div>
    </DashboardLayout>
  )
}
