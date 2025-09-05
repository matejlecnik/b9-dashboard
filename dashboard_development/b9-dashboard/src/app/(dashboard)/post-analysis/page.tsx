'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import { 
  TrendingUp, 
  MessageCircle, 
  Clock, 
  Image, 
  Video, 
  FileText, 
  Link,
  ArrowUpDown,
  ExternalLink,
  Filter,
  Search
} from 'lucide-react'

interface Post {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  created_utc: string
  subreddit_name: string
  content_type: string
  upvote_ratio: number
  thumbnail: string | null
  url: string
  author_username: string
  subscribers: number
  subreddit_avg_upvotes: number
  engagement_velocity: number | null
  posting_hour: number | null
}

interface PostMetrics {
  totalPosts: number
  totalSubreddits: number
  avgScore: number
  avgComments: number
  topContentType: string
  bestPerformingHour: number
}

const POSTS_PER_PAGE = 20

export default function PostAnalysisPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [metrics, setMetrics] = useState<PostMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'comments' | 'recent' | 'engagement'>('score')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('30d')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrenPage] = useState(1)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  
  const supabase = createClient()

  const fetchMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_post_analytics_metrics')
      
      if (error) {
        // Fallback query if RPC doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('posts')
          .select(`
            score,
            num_comments,
            content_type,
            posting_hour,
            subreddit_name,
            subreddits!inner(review)
          `)
          .eq('subreddits.review', 'Ok')
        
        if (!fallbackError && fallbackData) {
          const totalPosts = fallbackData.length
          const totalSubreddits = new Set(fallbackData.map(p => p.subreddit_name)).size
          const avgScore = fallbackData.reduce((sum, p) => sum + (p.score || 0), 0) / totalPosts
          const avgComments = fallbackData.reduce((sum, p) => sum + (p.num_comments || 0), 0) / totalPosts
          
          // Find most common content type
          const contentTypes = fallbackData.reduce((acc, p) => {
            const type = p.content_type || 'unknown'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          const topContentType = Object.entries(contentTypes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'image'
          
          // Find best performing hour
          const hourScores = fallbackData.reduce((acc, p) => {
            if (p.posting_hour !== null) {
              acc[p.posting_hour] = acc[p.posting_hour] || []
              acc[p.posting_hour].push(p.score || 0)
            }
            return acc
          }, {} as Record<number, number[]>)
          
          const bestPerformingHour = Object.entries(hourScores)
            .map(([hour, scores]) => ({
              hour: parseInt(hour),
              avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length
            }))
            .sort((a, b) => b.avgScore - a.avgScore)[0]?.hour || 12
          
          setMetrics({
            totalPosts,
            totalSubreddits,
            avgScore: Math.round(avgScore),
            avgComments: Math.round(avgComments),
            topContentType,
            bestPerformingHour
          })
        }
      } else if (data) {
        setMetrics(data[0])
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }, [supabase])

  const fetchPosts = useCallback(async (page = 1, append = false) => {
    try {
      setLoading(page === 1)
      
      let query = supabase
        .from('posts')
        .select(`
          id,
          reddit_id,
          title,
          score,
          num_comments,
          created_utc,
          subreddit_name,
          content_type,
          upvote_ratio,
          thumbnail,
          url,
          author_username,
          engagement_velocity,
          posting_hour,
          subreddits!inner(
            review,
            subscribers,
            avg_upvotes_per_post
          )
        `)
        .eq('subreddits.review', 'Ok')
        .not('title', 'is', null)

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date()
        const timeThreshold = new Date()
        
        switch (timeFilter) {
          case '24h':
            timeThreshold.setHours(now.getHours() - 24)
            break
          case '7d':
            timeThreshold.setDate(now.getDate() - 7)
            break
          case '30d':
            timeThreshold.setDate(now.getDate() - 30)
            break
        }
        
        query = query.gte('created_utc', timeThreshold.toISOString())
      }

      // Apply content type filter
      if (contentTypeFilter !== 'all') {
        query = query.eq('content_type', contentTypeFilter)
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,subreddit_name.ilike.%${searchTerm}%,author_username.ilike.%${searchTerm}%`)
      }

      // Apply sorting
      switch (sortBy) {
        case 'score':
          query = query.order('score', { ascending: false })
          break
        case 'comments':
          query = query.order('num_comments', { ascending: false })
          break
        case 'recent':
          query = query.order('created_utc', { ascending: false })
          break
        case 'engagement':
          query = query.order('upvote_ratio', { ascending: false })
          break
      }

      // Add pagination
      const from = (page - 1) * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching posts:', error)
        return
      }

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPosts = data.map((post: any) => ({
          ...post,
          subscribers: post.subreddits?.subscribers || 0,
          subreddit_avg_upvotes: post.subreddits?.avg_upvotes_per_post || 0
        })) as Post[]
        
        if (append) {
          setPosts(prev => [...prev, ...transformedPosts])
        } else {
          setPosts(transformedPosts)
        }
        
        setHasMorePosts(data.length === POSTS_PER_PAGE)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, sortBy, contentTypeFilter, timeFilter, searchTerm])

  useEffect(() => {
    fetchMetrics()
    fetchPosts(1, false)
    setCurrenPage(1)
  }, [fetchMetrics, fetchPosts])

  const loadMorePosts = () => {
    const nextPage = currentPage + 1
    setCurrenPage(nextPage)
    fetchPosts(nextPage, true)
  }

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'image': return <Image className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'text': return <FileText className="h-4 w-4" />
      case 'link': return <Link className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInDays > 0) {
      return `${diffInDays}d ago`
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      return `${diffInMinutes}m ago`
    }
  }

  return (
    <DashboardLayout
      title="Post Analytics"
      subtitle="Recent best performing posts from OK subreddits"
      showSearch={false}
    >
      <div className="space-y-6">
        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-b9-pink" />
                <div>
                  <p className="text-sm text-gray-600">Total Posts</p>
                  <p className="text-xl font-bold text-black">{metrics.totalPosts.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Subreddits</p>
                  <p className="text-xl font-bold text-black">{metrics.totalSubreddits}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-xl font-bold text-black">{metrics.avgScore}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Comments</p>
                  <p className="text-xl font-bold text-black">{metrics.avgComments}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                {getContentTypeIcon(metrics.topContentType)}
                <div>
                  <p className="text-sm text-gray-600">Top Type</p>
                  <p className="text-lg font-bold text-black capitalize">{metrics.topContentType}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Best Hour</p>
                  <p className="text-xl font-bold text-black">{metrics.bestPerformingHour}:00</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search posts, subreddits, or authors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-b9-pink/20 focus:border-b9-pink"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={sortBy} onValueChange={(value: 'score' | 'comments' | 'recent' | 'engagement') => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Top Score</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="engagement">Best Ratio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="link">Links</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={(value: 'all' | '24h' | '7d' | '30d') => setTimeFilter(value)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Posts Grid */}
        <div>
          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="aspect-square animate-pulse">
                  <div className="p-4 h-full flex flex-col">
                    <div className="flex-1 bg-gray-200 rounded-lg mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map((post) => (
                  <Card key={post.id} className="aspect-square hover:shadow-lg transition-shadow group cursor-pointer">
                    <a 
                      href={`https://reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full"
                    >
                      <div className="p-4 h-full flex flex-col">
                        {/* Image Section */}
                        <div className="flex-1 relative mb-3 bg-gray-100 rounded-lg overflow-hidden">
                          {post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' ? (
                            <img 
                              src={post.thumbnail} 
                              alt="Post thumbnail"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {getContentTypeIcon(post.content_type)}
                            </div>
                          )}
                          
                          {/* Content Type Badge */}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="text-xs capitalize bg-white/90 backdrop-blur-sm">
                              {getContentTypeIcon(post.content_type)}
                              <span className="ml-1">{post.content_type}</span>
                            </Badge>
                          </div>

                          {/* External Link Icon */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-1">
                              <ExternalLink className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-2">
                          {/* Title */}
                          <h3 className="font-semibold text-black line-clamp-2 text-sm leading-tight">
                            {post.title}
                          </h3>
                          
                          {/* Subreddit and Author */}
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium text-b9-pink">r/{post.subreddit_name}</span>
                              <span>•</span>
                              <span>{post.subscribers?.toLocaleString()} members</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>by u/{post.author_username}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(post.created_utc)}</span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1 text-green-600">
                                <TrendingUp className="h-3 w-3" />
                                <span className="font-medium">{post.score.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex items-center space-x-1 text-blue-600">
                                <MessageCircle className="h-3 w-3" />
                                <span>{post.num_comments}</span>
                              </div>
                            </div>

                            <div className="text-gray-500">
                              {Math.round((post.upvote_ratio || 0) * 100)}% ↑
                            </div>
                          </div>

                          {/* Engagement Velocity if available */}
                          {post.engagement_velocity && (
                            <div className="flex items-center space-x-1 text-purple-600 text-xs">
                              <Clock className="h-3 w-3" />
                              <span>{Math.round(post.engagement_velocity)} votes/hr</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {hasMorePosts && !loading && (
                <div className="flex justify-center pt-8">
                  <Button onClick={loadMorePosts} variant="outline" size="lg">
                    Load More Posts
                  </Button>
                </div>
              )}

              {!hasMorePosts && posts.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  Showing all {posts.length} posts
                </div>
              )}

              {posts.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">No posts found</div>
                  <div className="text-gray-400 text-sm">Try adjusting your filters or search terms</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}


