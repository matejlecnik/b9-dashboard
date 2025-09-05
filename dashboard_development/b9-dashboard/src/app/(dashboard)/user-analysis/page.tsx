'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Clock, 
  MessageCircle,
  Star,
  Calendar,
  Search,
  ExternalLink,
  UserCheck,
  Plus,
  X,
  Loader2,
  User,
  Crown,
  Shield,
  MailCheck,
  ArrowLeft,
  Bookmark
} from 'lucide-react'
import NextImage from 'next/image'
import { createClient } from '@/utils/supabase/client'

interface User {
  id: number
  username: string
  reddit_id?: string
  overall_user_score: number
  account_age_days: number
  total_karma: number
  link_karma: number
  comment_karma: number
  avg_post_score: number
  preferred_content_type: string
  most_active_posting_hour: number
  cross_subreddit_activity: number
  total_posts_analyzed: number
  last_scraped_at: string
  primary_subreddits: string[]
  karma_per_day: number
  engagement_consistency_score: number
  our_creator: boolean
  icon_img?: string
  subreddit_display_name?: string
  subreddit_title?: string
  subreddit_subscribers?: number
  is_suspended: boolean
  verified: boolean
  has_verified_email?: boolean
  is_gold: boolean
  is_mod: boolean
  created_utc?: string
  bio?: string
  bio_url?: string
  subreddit_banner_img?: string
}

interface Post {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  subreddit_name: string
  content_type: string
  created_utc: string
  thumbnail?: string
  url?: string
  over_18: boolean
}

interface UserProfile {
  user: User
  recent_posts: Post[]
}

interface UserStats {
  total_users: number
  high_quality_users: number
  medium_quality_users: number
  low_quality_users: number
  our_creators: number
  avg_score: number
  avg_age_days: number
  avg_karma: number
}

interface ContentTypeStats {
  preferred_content_type: string
  user_count: number
  avg_quality_score: number
  avg_post_performance: number
}

interface HourlyActivityStats {
  most_active_posting_hour: number
  user_count: number
  avg_quality_score: number
}

export default function UserAnalysisPage() {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [contentTypeStats, setContentTypeStats] = useState<ContentTypeStats[]>([])
  const [hourlyStats, setHourlyStats] = useState<HourlyActivityStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'our_creators'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'karma' | 'age' | 'posts'>('score')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const itemsPerPage = 50

  // Server-side search state
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [searchHasMore, setSearchHasMore] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [loadData])

  // Server-side search with debounce
  const searchUsers = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true)

      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data } = await supabase
        .from('users')
        .select(`
          id, username, reddit_id, overall_user_score, account_age_days, total_karma,
          link_karma, comment_karma, avg_post_score, preferred_content_type, 
          most_active_posting_hour, cross_subreddit_activity, total_posts_analyzed, 
          last_scraped_at, primary_subreddits, karma_per_day, engagement_consistency_score,
          our_creator, icon_img, subreddit_display_name, subreddit_title, subreddit_banner_img,
          subreddit_subscribers, is_suspended, verified, has_verified_email, is_gold, is_mod, created_utc,
          bio, bio_url
        `)
        .ilike('username', `%${searchTerm}%`)
        .order('overall_user_score', { ascending: false })
        .range(from, to)

      if (data) {
        if (append) {
          setSearchResults(prev => [...prev, ...data])
        } else {
          setSearchResults(data)
        }
        setSearchHasMore(data.length === itemsPerPage)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, itemsPerPage, searchTerm])

  useEffect(() => {
    const term = searchTerm.trim()
    const handler = setTimeout(() => {
      if (term) {
        setSearchPage(1)
        searchUsers(1, false)
      } else {
        setSearchResults([])
        setSearchHasMore(false)
        setSearchPage(1)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm, searchUsers])

  const loadData = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true)
      
      // Load user statistics
      const { data: statsData } = await supabase.rpc('get_user_stats')
      if (statsData && statsData.length > 0) {
        setStats(statsData[0])
      }

      // Load content type statistics
      const { data: contentData } = await supabase
        .from('users')
        .select('preferred_content_type, overall_user_score, avg_post_score')
        .not('preferred_content_type', 'is', null)

      if (contentData) {
        const contentTypeMap = new Map<string, { count: number, totalScore: number, totalPerformance: number }>()
        contentData.forEach(user => {
          const type = user.preferred_content_type
          if (!contentTypeMap.has(type)) {
            contentTypeMap.set(type, { count: 0, totalScore: 0, totalPerformance: 0 })
          }
          const stats = contentTypeMap.get(type)!
          stats.count++
          stats.totalScore += user.overall_user_score
          stats.totalPerformance += user.avg_post_score || 0
        })

        const contentStats: ContentTypeStats[] = Array.from(contentTypeMap.entries()).map(([type, data]) => ({
          preferred_content_type: type,
          user_count: data.count,
          avg_quality_score: data.totalScore / data.count,
          avg_post_performance: data.totalPerformance / data.count
        })).sort((a, b) => b.user_count - a.user_count)

        setContentTypeStats(contentStats)
      }

      // Load hourly activity statistics
      const { data: hourlyData } = await supabase
        .from('users')
        .select('most_active_posting_hour, overall_user_score')
        .not('most_active_posting_hour', 'is', null)

      if (hourlyData) {
        const hourlyMap = new Map<number, { count: number, totalScore: number }>()
        hourlyData.forEach(user => {
          const hour = user.most_active_posting_hour
          if (!hourlyMap.has(hour)) {
            hourlyMap.set(hour, { count: 0, totalScore: 0 })
          }
          const stats = hourlyMap.get(hour)!
          stats.count++
          stats.totalScore += user.overall_user_score
        })

        const hourlyStatsArray: HourlyActivityStats[] = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
          most_active_posting_hour: hour,
          user_count: data.count,
          avg_quality_score: data.totalScore / data.count
        })).sort((a, b) => a.most_active_posting_hour - b.most_active_posting_hour)

        setHourlyStats(hourlyStatsArray)
      }

      // Load all users for search functionality
      if (page === 1 && !append) {
        // Load all users for search (limited to reasonable amount)
        const { data: allUsersData } = await supabase
          .from('users')
          .select(`
            id, username, reddit_id, overall_user_score, account_age_days, total_karma,
            link_karma, comment_karma, avg_post_score, preferred_content_type, 
            most_active_posting_hour, cross_subreddit_activity, total_posts_analyzed, 
            last_scraped_at, primary_subreddits, karma_per_day, engagement_consistency_score,
            our_creator, icon_img, subreddit_display_name, subreddit_title, subreddit_banner_img,
            subreddit_subscribers, is_suspended, verified, has_verified_email, is_gold, is_mod, created_utc,
            bio, bio_url
          `)
          .order('overall_user_score', { ascending: false })
          .limit(1000) // Load first 1000 users for search

        if (allUsersData) {
          setAllUsers(allUsersData)
          setHasMore(allUsersData.length === 1000) // More available if we hit the limit
        }
      } else if (append) {
        // Load more users for pagination
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1

        const { data: moreUsersData } = await supabase
          .from('users')
          .select(`
            id, username, reddit_id, overall_user_score, account_age_days, total_karma,
            link_karma, comment_karma, avg_post_score, preferred_content_type, 
            most_active_posting_hour, cross_subreddit_activity, total_posts_analyzed, 
            last_scraped_at, primary_subreddits, karma_per_day, engagement_consistency_score,
            our_creator, icon_img, subreddit_display_name, subreddit_title, subreddit_banner_img,
            subreddit_subscribers, is_suspended, verified, has_verified_email, is_gold, is_mod, created_utc,
            bio, bio_url
          `)
          .order('overall_user_score', { ascending: false })
          .range(from, to)

        if (moreUsersData) {
          setAllUsers(prev => [...prev, ...moreUsersData])
          setHasMore(moreUsersData.length === itemsPerPage)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, itemsPerPage])

  const loadMoreUsers = useCallback(async () => {
    const term = searchTerm.trim()
    if (term) {
      const next = searchPage + 1
      setSearchPage(next)
      await searchUsers(next, true)
    } else {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      await loadData(nextPage, true)
    }
  }, [currentPage, loadData, searchPage, searchTerm, searchUsers])

  const addNewUser = async () => {
    if (!newUsername.trim()) return
    
    setAddingUser(true)
    try {
      // Call API endpoint to fetch user from Reddit using proxy
      const response = await fetch('/api/reddit/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: newUsername.trim() }),
      })

      const result = await response.json()
      
      if (result.success) {
        // Mark as our creator
        await supabase
          .from('users')
          .update({ our_creator: true })
          .eq('username', newUsername.trim())

        // Refresh data
        await loadData(1, false)
        setNewUsername('')
        setShowAddUser(false)
      } else {
        console.error('Failed to add user:', result.error)
        alert(`Failed to add user: ${result.error}`)
      }
    } catch (error) {
      console.error('Error adding user:', error)
      alert('Failed to add user. Please try again.')
    } finally {
      setAddingUser(false)
    }
  }

  const toggleOurCreator = async (userId: number, currentStatus: boolean) => {
    try {
      await supabase
        .from('users')
        .update({ our_creator: !currentStatus })
        .eq('id', userId)

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, our_creator: !currentStatus } : user
      ))
      setAllUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, our_creator: !currentStatus } : user
      ))
    } catch (error) {
      console.error('Error updating creator status:', error)
    }
  }

  const loadUserProfile = async (user: User) => {
    setLoadingProfile(true)
    try {
      // Get recent posts for this user
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, reddit_id, title, score, num_comments, subreddit_name,
          content_type, created_utc, thumbnail, url, over_18
        `)
        .eq('author_username', user.username)
        .order('created_utc', { ascending: false })
        .limit(10)

      setSelectedUser({
        user,
        recent_posts: posts || []
      })
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatScore = (score: number | null) => {
    if (score === null || score === undefined) return 'N/A'
    return score.toFixed(1)
  }

  const getQualityBadge = (score: number) => {
    if (score >= 7) return { label: 'High Quality', color: 'bg-green-100 text-green-800 border-green-300' }
    if (score >= 4) return { label: 'Medium Quality', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    return { label: 'Low Quality', color: 'bg-gray-100 text-gray-800 border-gray-300' }
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'text': return '📝'
      case 'link': return '🔗'
      default: return '📄'
    }
  }

  // Filter and search through all users
  const baseUsers = searchTerm.trim() ? searchResults : allUsers
  const filteredUsers = baseUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesQuality = qualityFilter === 'all' || 
      (qualityFilter === 'high' && user.overall_user_score >= 7) ||
      (qualityFilter === 'medium' && user.overall_user_score >= 4 && user.overall_user_score < 7) ||
      (qualityFilter === 'low' && user.overall_user_score < 4) ||
      (qualityFilter === 'our_creators' && user.our_creator)
    return matchesSearch && matchesQuality
  }).sort((a, b) => {
    switch (sortBy) {
      case 'score': return b.overall_user_score - a.overall_user_score
      case 'karma': return b.total_karma - a.total_karma
      case 'age': return b.account_age_days - a.account_age_days
      case 'posts': return b.total_posts_analyzed - a.total_posts_analyzed
      default: return 0
    }
  })

  if (loading && !selectedUser) {
    return (
      <DashboardLayout
        title="User Analysis"
        subtitle="Reddit user quality analysis and engagement insights"
        showSearch={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b9-pink"></div>
          <span className="ml-2 text-gray-600">Loading user analysis...</span>
        </div>
      </DashboardLayout>
    )
  }

  // User Profile Modal
  if (selectedUser) {
    const user = selectedUser.user
    return (
      <DashboardLayout
        title={`User Profile: u/${user.username}`}
        subtitle="Detailed Reddit user analysis and engagement data"
        showSearch={false}
      >
        <div className="space-y-6">
          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={() => setSelectedUser(null)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to User List
          </Button>

          {/* User Profile Header */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  {user.icon_img ? (
                    <NextImage
                      src={user.icon_img}
                      alt={`${user.username} profile`}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        const target = e.target as unknown as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = (target.nextElementSibling as HTMLElement)
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200 bg-b9-pink ${
                      user.icon_img ? 'hidden' : 'flex'
                    }`}
                    style={{ display: user.icon_img ? 'none' : 'flex' }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h2 className="text-2xl font-bold text-black">u/{user.username}</h2>
                    {user.our_creator && (
                      <Badge className="bg-b9-pink text-white">Our Creator</Badge>
                    )}
                    {user.has_verified_email && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <MailCheck className="h-3 w-3 mr-1" />
                        Email Verified
                      </Badge>
                    )}
                    {user.is_gold && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Crown className="h-3 w-3 mr-1" />
                        Reddit Premium
                      </Badge>
                    )}
                    {user.is_mod && (
                      <Badge className="bg-green-100 text-green-800">
                        <Shield className="h-3 w-3 mr-1" />
                        Moderator
                      </Badge>
                    )}
                  </div>

                  {/* User Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">{formatScore(user.overall_user_score)}</div>
                      <div className="text-xs text-gray-600">Quality Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">{formatNumber(user.total_karma)}</div>
                      <div className="text-xs text-gray-600">Total Karma</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">{Math.round(user.account_age_days / 365 * 10) / 10}y</div>
                      <div className="text-xs text-gray-600">Account Age</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-black">{user.total_posts_analyzed}</div>
                      <div className="text-xs text-gray-600">Posts Analyzed</div>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Link Karma:</span>
                      <span className="ml-2 font-medium">{formatNumber(user.link_karma)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comment Karma:</span>
                      <span className="ml-2 font-medium">{formatNumber(user.comment_karma)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Post Score:</span>
                      <span className="ml-2 font-medium">{formatNumber(user.avg_post_score)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Karma/Day:</span>
                      <span className="ml-2 font-medium">{formatNumber(user.karma_per_day)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Content Type:</span>
                      <span className="ml-2 font-medium capitalize">{user.preferred_content_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Active Hour:</span>
                      <span className="ml-2 font-medium">{user.most_active_posting_hour ? `${user.most_active_posting_hour}:00` : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 mt-4">
                    <Button
                      variant={user.our_creator ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleOurCreator(user.id, user.our_creator)}
                      className={user.our_creator ? 'bg-b9-pink hover:bg-b9-pink/90' : ''}
                    >
                      <Bookmark className="h-4 w-4 mr-2" />
                      {user.our_creator ? 'Remove from Our Creators' : 'Mark as Our Creator'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://reddit.com/u/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Reddit
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* User Subreddit Info */}
              {(user.subreddit_display_name || user.subreddit_banner_img || user.bio) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-black mb-3">User Subreddit</h3>
                  {user.subreddit_banner_img && (
                    <div className="mb-4">
                      <NextImage src={user.subreddit_banner_img} alt="User subreddit banner" width={1200} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                    </div>
                  )}
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-b9-pink/10 rounded-full flex items-center justify-center mt-1">
                      <User className="h-6 w-6 text-b9-pink" />
                    </div>
                    <div className="flex-1">
                      {user.subreddit_display_name && (
                        <div className="font-medium text-black">u/{user.subreddit_display_name}</div>
                      )}
                      {user.subreddit_title && (
                        <div className="text-sm text-gray-600">{user.subreddit_title}</div>
                      )}
                      {user.subreddit_subscribers !== undefined && (
                        <div className="text-xs text-gray-500">{formatNumber(user.subreddit_subscribers)} subscribers</div>
                      )}
                      {user.bio && (
                        <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{user.bio}</div>
                      )}
                      {user.bio_url && (
                        <a href={user.bio_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-b9-pink hover:underline">
                          {user.bio_url}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Posts */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-b9-pink" />
                <span>Recent Posts ({selectedUser.recent_posts.length})</span>
              </CardTitle>
              <CardDescription>
                Latest posts from this user across different subreddits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedUser.recent_posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No posts found for this user</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedUser.recent_posts.map((post) => (
                    <div key={post.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        {post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' && (
                          <NextImage
                            src={post.thumbnail}
                            alt="Post thumbnail"
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className="text-xs">r/{post.subreddit_name}</Badge>
                            <Badge className={`text-xs ${post.over_18 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {post.over_18 ? 'NSFW' : 'SFW'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {getContentTypeIcon(post.content_type)} {post.content_type}
                            </span>
                          </div>
                          <h4 className="font-medium text-black mb-2 line-clamp-2">
                            {post.title}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>{formatNumber(post.score)} upvotes</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="h-3 w-3" />
                              <span>{formatNumber(post.num_comments)} comments</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(post.created_utc).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="User Analysis"
      subtitle="Reddit user quality analysis and engagement insights"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-b9-pink" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-xl font-bold text-black">{formatNumber(stats?.total_users || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">High Quality</p>
                  <p className="text-xl font-bold text-black">{formatNumber(stats?.high_quality_users || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-b9-pink" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Our Creators</p>
                  <p className="text-xl font-bold text-black">{formatNumber(allUsers.filter(u => u.our_creator).length)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-xl font-bold text-black">{formatScore(stats?.avg_score || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Karma</p>
                  <p className="text-xl font-bold text-black">{formatNumber(stats?.avg_karma || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filters, and Add User */}
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search all users..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b9-pink focus:border-transparent w-full sm:w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'our_creators', 'high', 'medium', 'low'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={qualityFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQualityFilter(filter)}
                      className={qualityFilter === filter ? 'bg-b9-pink hover:bg-b9-pink/90' : ''}
                    >
                      {filter === 'all' ? 'All Users' : 
                       filter === 'our_creators' ? 'Our Creators' :
                       `${filter.charAt(0).toUpperCase() + filter.slice(1)} Quality`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'karma' | 'age' | 'posts')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b9-pink focus:border-transparent"
                >
                  <option value="score">Sort by Score</option>
                  <option value="karma">Sort by Karma</option>
                  <option value="age">Sort by Age</option>
                  <option value="posts">Sort by Posts</option>
                </select>
                <Button
                  onClick={() => setShowAddUser(true)}
                  className="bg-b9-pink hover:bg-b9-pink/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add User Modal */}
        {showAddUser && (
          <Card className="border border-b9-pink/20 bg-b9-pink/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-b9-pink" />
                  <span>Add New User</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddUser(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reddit Username
                  </label>
                  <input
                    type="text"
                    placeholder="Enter username (without u/)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-b9-pink focus:border-transparent"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !addingUser && addNewUser()}
                    disabled={addingUser}
                  />
                </div>
                <Button
                  onClick={addNewUser}
                  disabled={!newUsername.trim() || addingUser}
                  className="bg-b9-pink hover:bg-b9-pink/90"
                >
                  {addingUser ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This will fetch the user data from Reddit using our proxy system and mark them as one of our creators.
              </p>
            </CardContent>
          </Card>
        )}

        {/* User List */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-b9-pink" />
              <span>Reddit Users ({filteredUsers.length})</span>
            </CardTitle>
            <CardDescription>
              Click on username or profile picture to view detailed analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No users found matching your criteria</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const qualityBadge = getQualityBadge(user.overall_user_score)
                    return (
                      <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Clickable Profile Picture */}
                            <button
                              onClick={() => loadUserProfile(user)}
                              className="flex-shrink-0 hover:opacity-80 transition-opacity"
                              disabled={loadingProfile}
                            >
                              {user.icon_img ? (
                                <NextImage
                                  src={user.icon_img}
                                  alt={`${user.username} profile`}
                                  width={48}
                                  height={48}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as unknown as HTMLImageElement
                                    target.style.display = 'none'
                                    const fallback = (target.nextElementSibling as HTMLElement)
                                    if (fallback) fallback.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-gray-200 bg-b9-pink ${
                                  user.icon_img ? 'hidden' : 'flex'
                                }`}
                                style={{ display: user.icon_img ? 'none' : 'flex' }}
                              >
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                {/* Clickable Username */}
                                <button
                                  onClick={() => loadUserProfile(user)}
                                  className="font-medium text-black hover:text-b9-pink transition-colors text-left"
                                  disabled={loadingProfile}
                                >
                                  u/{user.username}
                                </button>
                                <Badge className={`text-xs px-2 py-0.5 ${qualityBadge.color}`}>
                                  {qualityBadge.label}
                                </Badge>
                                {user.our_creator && (
                                  <Badge className="bg-b9-pink text-white text-xs">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Our Creator
                                  </Badge>
                                )}
                                {user.has_verified_email && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    <MailCheck className="h-3 w-3" />
                                  </Badge>
                                )}
                                {user.is_suspended && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">
                                    Suspended
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center space-x-1">
                                  <Star className="h-3 w-3" />
                                  <span>Score: {formatScore(user.overall_user_score)}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{formatNumber(user.total_karma)} karma</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{Math.round(user.account_age_days / 365 * 10) / 10}y old</span>
                                </span>
                                {user.preferred_content_type && (
                                  <span className="flex items-center space-x-1">
                                    <span>{getContentTypeIcon(user.preferred_content_type)}</span>
                                    <span>{user.preferred_content_type}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-black">
                                {formatNumber(user.avg_post_score)} avg score
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.total_posts_analyzed} posts analyzed
                              </div>
                              {user.most_active_posting_hour !== null && user.most_active_posting_hour !== undefined && (
                                <div className="text-xs text-gray-500 flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Active at {user.most_active_posting_hour}:00</span>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleOurCreator(user.id, user.our_creator)}
                              className={user.our_creator ? 'border-b9-pink text-b9-pink' : ''}
                            >
                              <Bookmark className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* Load More Button */}
            {hasMore && filteredUsers.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={loadMoreUsers}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading more users...
                    </>
                  ) : (
                    <>
                      Load More Users
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-b9-pink" />
                <span>Content Type Preferences</span>
              </CardTitle>
              <CardDescription>
                User distribution and quality by preferred content type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contentTypeStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No content type data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contentTypeStats.map((stat) => (
                    <div key={stat.preferred_content_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getContentTypeIcon(stat.preferred_content_type)}</span>
                        <div>
                          <div className="font-medium text-black capitalize">
                            {stat.preferred_content_type} Posts
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatNumber(stat.user_count)} users • Quality: {formatScore(stat.avg_quality_score)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-black">
                          {formatNumber(stat.avg_post_performance)} avg score
                        </div>
                        <div className="text-xs text-gray-500">
                          per post
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-b9-pink" />
                <span>Peak Activity Hours</span>
              </CardTitle>
              <CardDescription>
                User activity patterns and quality by posting hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No hourly activity data available</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {hourlyStats
                      .sort((a, b) => b.user_count - a.user_count)
                      .slice(0, 8)
                      .map((stat) => (
                        <div key={stat.most_active_posting_hour} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-b9-pink/10 rounded-full flex items-center justify-center">
                              <span className="text-b9-pink font-semibold text-xs">
                                {stat.most_active_posting_hour}:00
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-black text-sm">
                                {stat.most_active_posting_hour}:00 - {(stat.most_active_posting_hour + 1) % 24}:00
                              </div>
                              <div className="text-xs text-gray-600">
                                Quality: {formatScore(stat.avg_quality_score)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-black">
                              {formatNumber(stat.user_count)}
                            </div>
                            <div className="text-xs text-gray-500">
                              users
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


