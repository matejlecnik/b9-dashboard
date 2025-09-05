'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import NextImage from 'next/image'
import { 
  TrendingUp, 
  MessageCircle, 
  Clock, 
  Image, 
  Video, 
  FileText, 
  Link,
  ArrowUpDown,
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
      case 'image': return <Image className="h-4 w-4" aria-label="Image post" />
      case 'video': return <Video className="h-4 w-4" aria-label="Video post" />
      case 'text': return <FileText className="h-4 w-4" aria-label="Text post" />
      case 'link': return <Link className="h-4 w-4" aria-label="Link post" />
      default: return <FileText className="h-4 w-4" aria-label="Text post" />
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

        {/* Posts Gallery */}
        <div>
          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity"
                    onClick={() => window.open(`https://reddit.com/r/${post.subreddit_name}/comments/${post.reddit_id}`, '_blank')}
                  >
                    {/* Main Image */}
                    {post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' ? (
                      <NextImage 
                        src={post.thumbnail} 
                        alt={`${post.title}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                        {getContentTypeIcon(post.content_type)}
                      </div>
                    )}

                    {/* Content Type Badge */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/70 backdrop-blur-sm rounded-full p-1.5">
                        <div className="text-white text-xs">
                          {getContentTypeIcon(post.content_type)}
                        </div>
                      </div>
                    </div>

                    {/* Stats Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="text-white text-center px-3">
                        <div className="flex items-center justify-center space-x-4 mb-2">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-medium">{post.score.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.num_comments}</span>
                          </div>
                        </div>
                        <div className="text-xs opacity-90 mb-1">
                          r/{post.subreddit_name}
                        </div>
                        <div className="text-xs opacity-75 line-clamp-2">
                          {post.title}
                        </div>
                      </div>
                    </div>

                    {/* Multiple Images Indicator (for gallery posts) */}
                    {post.content_type === 'link' && post.url.includes('/gallery/') && (
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                          <div className="flex items-center space-x-1 text-white text-xs">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                            <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Indicator */}
                    {post.content_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/70 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Video className="h-6 w-6 text-white" aria-label="Play video" />
                        </div>
                      </div>
                    )}

                    {/* High Engagement Indicator */}
                    {post.score > 10000 && (
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-b9-pink/90 backdrop-blur-sm rounded-full px-2 py-1">
                          <span className="text-white text-xs font-medium">🔥 Hot</span>
                        </div>
                      </div>
                    )}

                    {/* Engagement Percentage */}
                    {post.upvote_ratio && post.upvote_ratio > 0.95 && (
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-green-500/90 backdrop-blur-sm rounded-full px-2 py-1">
                          <span className="text-white text-xs font-medium">
                            {Math.round(post.upvote_ratio * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMorePosts && !loading && (
                <div className="flex justify-center pt-8">
                  <Button onClick={loadMorePosts} variant="outline" size="lg" className="px-8">
                    Load More Posts
                  </Button>
                </div>
              )}

              {/* End Message */}
              {!hasMorePosts && posts.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">You&apos;ve reached the end!</div>
                  <div className="text-sm">Showing all {posts.length} posts from OK subreddits</div>
                </div>
              )}

              {/* No Results */}
              {posts.length === 0 && !loading && (
                <div className="text-center py-16">
                  <div className="text-gray-400 text-6xl mb-4">📱</div>
                  <div className="text-gray-500 text-xl mb-2">No posts found</div>
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


