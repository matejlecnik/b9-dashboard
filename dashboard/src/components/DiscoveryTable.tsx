'use client'

import { useState, useCallback, useEffect, memo, type JSX } from 'react'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import { TagsDisplay } from '@/components/TagsDisplay'
import { supabase } from '@/lib/supabase'
import {
  Users,
  ArrowUpCircle,
  TrendingUp,
  Clock,
  Shield,
  ExternalLink,
  MessageCircle,
  FileText,
  Video,
  Loader2,
  BookOpen,
  Play,
  Copy,
  Check,
  BadgeCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
// import { cn } from '@/lib/utils'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Mousewheel } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import type { Subreddit } from '@/lib/supabase/reddit'
import type { Post } from '@/types/post'

// Remove local TagsDisplay; use shared component instead

// Helper component for rules button
interface RulesButtonProps {
  subreddit: SubredditWithPosts
  onShowRules: (subreddit: SubredditWithPosts) => void
}

const RulesButton = ({ subreddit, onShowRules }: RulesButtonProps): JSX.Element => {
  const hasRulesData = subreddit.rules_data &&
    typeof subreddit.rules_data === 'object' && (
      (Array.isArray(subreddit.rules_data) && subreddit.rules_data.length > 0) ||
      (typeof subreddit.rules_data === 'object' && 'rules' in subreddit.rules_data &&
       Array.isArray((subreddit.rules_data as { rules?: unknown[] }).rules) &&
       ((subreddit.rules_data as { rules?: unknown[] }).rules?.length || 0) > 0)
    )

  const handleClick = (): void => {
    if (hasRulesData) {
      onShowRules(subreddit)
    } else {
      const confirmOpen = window.confirm(
        `No rules data available for r/${subreddit.name}.\n\nWould you like to open Reddit to view the rules directly?`
      )
      if (confirmOpen) {
        window.open(`https://www.reddit.com/r/${subreddit.name}/about/rules`, '_blank')
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className="p-1 hover:bg-b9-pink/20 rounded-md transition-colors"
      title="View Rules"
    >
      <BookOpen className={`h-3.5 w-3.5 ${hasRulesData ? 'text-b9-pink' : 'text-gray-300'}`} />
    </button>
  )
}

export interface SubredditWithPosts extends Omit<Subreddit, 'created_at' | 'review'> {
  recent_posts?: Post[]
  public_description?: string | null
  comment_to_upvote_ratio?: number | null
  min_account_age_days?: number | null
  min_comment_karma?: number | null
  min_post_karma?: number | null
  allow_images?: boolean | null
  moderator_activity_score?: number | null
  community_health_score?: number | null
  image_post_avg_score?: number | null
  video_post_avg_score?: number | null
  text_post_avg_score?: number | null
  created_at?: string
  review?: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | 'Banned' | null
  posts_loading?: boolean
  posts_error?: string | null
  thumbnail?: string | null
  preview_data?: {
    images?: Array<{
      source?: {
        url?: string
      }
    }>
  }
  verification_required?: boolean | null
  tags?: string[] | null // Override to ensure it's treated as an array
}

// ExtendedPost - using interface to avoid any type conflicts
interface ExtendedPost {
  id: number
  reddit_id: string
  title: string
  score: number
  num_comments: number
  created_utc: string
  subreddit_name: string
  content_type: string
  upvote_ratio: number
  thumbnail?: string | null
  url?: string
  author_username: string
  sub_primary_category?: string | null
  sub_over18?: boolean | null
  preview_data?: {
    images?: Array<{
      source?: { url?: string }
      resolutions?: Array<{ url: string; width: number; height: number }>
    }>
    reddit_video?: {
      fallback_url?: string
    }
  }
  domain?: string
  is_video?: boolean
  is_self?: boolean
  over_18?: boolean
  post_type?: string
  viral_score?: number
}

interface DiscoveryTableProps {
  subreddits: SubredditWithPosts[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  onUpdate?: (id: number, updates: Partial<SubredditWithPosts>) => void
  onTagUpdate?: (id: number, oldTag: string, newTag: string) => void
  onTagRemove?: (id: number, tag: string) => void
  onAddTag?: (id: number, tag: string) => void
}

interface PostGridProps {
  posts: ExtendedPost[]
  loading?: boolean
  error?: string | null
  subredditName: string
}

const PostGrid = memo(function PostGrid({ posts, loading, error, subredditName }: PostGridProps): JSX.Element {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { addToast } = useToast()
  

  const handleCopyTitle = useCallback((e: React.MouseEvent, postId: string, title: string): void => {
    e.preventDefault()
    e.stopPropagation()
    
    navigator.clipboard.writeText(title).then(() => {
      setCopiedId(postId)
      addToast({
        type: 'success',
        title: 'Copied!',
        description: 'Post title copied to clipboard',
        duration: 2000
      })
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {
      addToast({
        type: 'error',
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        duration: 2000
      })
    })
  }, [addToast])
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-xs text-gray-500">Loading posts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-gray-500">Failed to load posts</span>
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-gray-400">No recent posts</span>
      </div>
    )
  }

  // Format score for display
  const formatScore = (score: number): string => {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`
    return score.toString()
  }

  // Get thumbnail URL from post
  const getPostThumbnail = (post: ExtendedPost): string | null => {
    // Try to get preview image
    if (post.preview_data?.images?.[0]?.source?.url) {
      return post.preview_data.images[0].source.url.replace(/&amp;/g, '&')
    }
    // Fallback to thumbnail
    if (post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' && post.thumbnail !== 'nsfw' && post.thumbnail !== 'spoiler') {
      return post.thumbnail.replace(/&amp;/g, '&')
    }
    return null
  }

  // Display up to 10 posts in swiper
  const displayPosts = posts.slice(0, 10)

  return (
    <div className="p-2">
      <Swiper
        modules={[FreeMode, Mousewheel]}
        spaceBetween={8}
        slidesPerView={6}
        freeMode={true}
        mousewheel={true}
        grabCursor={true}
        className="h-full"
        breakpoints={{
          0: { slidesPerView: 2, spaceBetween: 6 },
          480: { slidesPerView: 3, spaceBetween: 6 },
          768: { slidesPerView: 4, spaceBetween: 8 },
          1024: { slidesPerView: 5, spaceBetween: 8 },
          1280: { slidesPerView: 6, spaceBetween: 8 }
        }}
      >
        {displayPosts.map((post, idx) => {
          const thumbnail = getPostThumbnail(post)
          
          return (
            <SwiperSlide key={post.reddit_id || idx}>
              <div className="h-full group relative bg-white rounded-md border border-pink-100 hover:border-b9-pink hover:shadow-md transition-all overflow-hidden">
                {/* Copy Button */}
                <button
                  onClick={(e) => handleCopyTitle(e, post.reddit_id, post.title)}
                  className="absolute top-1 right-1 z-10 p-1 bg-white/90 backdrop-blur-sm rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-pink-50"
                  title="Copy title"
                >
                  {copiedId === post.reddit_id ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-600" />
                  )}
                </button>
                
                <a
                  href={`https://reddit.com/r/${subredditName}/comments/${post.reddit_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full cursor-pointer"
                  title={post.title}
                >
                  {/* Thumbnail/Preview */}
                  <div className="relative h-20 bg-gray-100">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {post.is_video ? (
                        <Video className="h-6 w-6 text-gray-400" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                  {post.is_video && thumbnail && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Stats */}
                <div className="p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-0.5 text-[10px]">
                      <ArrowUpCircle className="h-3 w-3 text-orange-500" />
                      <span className="font-semibold">{formatScore(post.score)}</span>
                    </div>
                    <div className="flex items-center space-x-0.5 text-[10px] text-gray-600">
                      <MessageCircle className="h-2.5 w-2.5" />
                      <span>{post.num_comments}</span>
                    </div>
                  </div>
                  {/* Title preview - 2 lines max */}
                  <p className="text-[9px] text-gray-700 line-clamp-2 leading-tight">
                    {post.title}
                  </p>
                </div>
                </a>
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
})

export const DiscoveryTable = memo(function DiscoveryTable({
  subreddits,
  loading = false,
  onUpdate,
  onTagUpdate,
  onTagRemove,
  onAddTag
}: DiscoveryTableProps): JSX.Element {
  const [postCache, setPostCache] = useState<Record<number, ExtendedPost[]>>({})
  const [loadingPosts, setLoadingPosts] = useState<Set<number>>(new Set())
  const [postErrors, setPostErrors] = useState<Record<number, string>>({})
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({
    isOpen: false,
    subreddit: null
  })

  // Clear cache on mount to ensure fresh 7-day data
  useEffect(() => {
    setPostCache({})
  }, [])

  // Fetch posts for a subreddit
  const fetchPosts = useCallback(async (subredditId: number, subredditName: string): Promise<void> => {
    // Check if already loading
    if (loadingPosts.has(subredditId)) {
      return
    }

    setLoadingPosts(prev => new Set(prev).add(subredditId))
    setPostErrors(prev => ({ ...prev, [subredditId]: '' }))

    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Calculate 7 days ago using the same method as usePostAnalysis hook
      const hoursAgo = 168 // 7 days * 24 hours
      const sevenDaysAgo = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
      const cutoffDate = sevenDaysAgo.toISOString()

      logger.log(`[DiscoveryTable] Fetching posts for ${subredditName} from last 7 days (cutoff: ${cutoffDate})`)

      // Fetch posts without category filtering since all shown subreddits are already filtered
      const { data: posts, error } = await supabase
        .from('reddit_posts')
        .select('*')
        .eq('subreddit_name', subredditName)
        .gte('created_utc', cutoffDate)
        .order('score', { ascending: false })
        .limit(10)

      if (error) throw error

      // Debug: Log the posts to verify they're from last 7 days
      if (posts && posts.length > 0) {
        logger.log(`[DiscoveryTable] Got ${posts.length} posts for ${subredditName}`)
        logger.log(`[DiscoveryTable] First post date: ${posts[0].created_utc}`)
        logger.log(`[DiscoveryTable] Last post date: ${posts[posts.length - 1].created_utc}`)
      } else {
        logger.log(`[DiscoveryTable] No posts found for ${subredditName} in last 7 days`)
      }

      setPostCache(prev => ({
        ...prev,
        [subredditId]: posts || []
      }))
    } catch (error) {
      logger.error('Error fetching posts:', error)
      setPostErrors(prev => ({
        ...prev,
        [subredditId]: 'Failed to load posts'
      }))
    } finally {
      setLoadingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(subredditId)
        return newSet
      })
    }
  }, [loadingPosts])

  // Auto-load posts on mount for all visible subreddits
  useEffect(() => {
    subreddits.forEach(subreddit => {
      // Always fetch fresh posts (7-day filter), skip cache check
      if (!loadingPosts.has(subreddit.id) && !postCache[subreddit.id]) {
        fetchPosts(subreddit.id, subreddit.name)
      }
    })
  }, [subreddits, fetchPosts, loadingPosts, postCache])

  // Handle showing rules modal
  const handleShowRules = useCallback((subreddit: SubredditWithPosts): void => {
    let rules = null
    
    if (subreddit.rules_data) {
      if (typeof subreddit.rules_data === 'string') {
        rules = subreddit.rules_data
      } else if (Array.isArray(subreddit.rules_data)) {
        rules = subreddit.rules_data
      } else if (typeof subreddit.rules_data === 'object' && 'rules' in subreddit.rules_data) {
        rules = (subreddit.rules_data as { rules?: unknown[] }).rules
      }
    }
    
    setRulesModal({ isOpen: true, subreddit: { ...subreddit, rules_data: rules } as Subreddit })
  }, [])

  // Format number helper
  const formatNumber = (num: number | null | undefined): string => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toLocaleString()
  }

  // Format large numbers for requirements
  const formatRequirement = (num: number | null | undefined): string | null => {
    if (!num) return null
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
    return num.toString()
  }

  if (loading && subreddits.length === 0) {
    return (
      <div className="animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-1/4 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-pink-200 overflow-hidden">
      {/* Table Body */}
      <div className="divide-y divide-pink-100">
        {subreddits.map((subreddit) => {
          const posts = postCache[subreddit.id] || []
          const isLoadingPosts = loadingPosts.has(subreddit.id)
          const postError = postErrors[subreddit.id]
          
          return (
            <div key={subreddit.id} className="hover:bg-pink-50/30 transition-all">
              {/* Main Row - More Compact */}
              <div className="flex items-stretch min-h-[140px]">
                {/* Left Section - Subreddit Info (35%) - More Compact */}
                <div className="w-[35%] p-3 border-r border-pink-100 relative">

                  {/* Subreddit Header */}
                  <div className="flex items-start justify-between mb-2 pr-12">
                    <a 
                      href={`https://reddit.com/r/${subreddit.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 group flex-1"
                    >
                      {subreddit.icon_img || subreddit.community_icon ? (
                        <Image
                          src={(subreddit.icon_img || subreddit.community_icon || '').replace(/&amp;/g, '&')}
                          alt={subreddit.name}
                          width={32}
                          height={32}
                          className="rounded-full border border-gray-200 group-hover:border-b9-pink transition-colors flex-shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {subreddit.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900 group-hover:text-b9-pink transition-colors">
                            r/{subreddit.name}
                          </span>
                          {subreddit.verification_required && (
                            <span title="Verification Required">
                              <BadgeCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            </span>
                          )}
                          {subreddit.over18 ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4 bg-red-100 text-red-800 border-red-200 font-semibold">
                              NSFW
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4 border-green-500 text-green-700 bg-green-50 font-semibold">
                              SFW
                            </Badge>
                          )}
                          <ExternalLink className="h-2.5 w-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-1">
                          {subreddit.public_description || subreddit.title}
                        </p>
                      </div>
                    </a>
                  </div>

                  {/* Tags Display - Two Small Rows */}
                  <div className="mb-1.5">
                    <TagsDisplay
                      tags={Array.isArray(subreddit.tags) ? subreddit.tags : []}
                      compactMode={true}
                      onTagUpdate={async (oldTag, newTag) => {
                        // Use parent-provided handler if available, otherwise use local logic
                        if (onTagUpdate) {
                          onTagUpdate(subreddit.id, oldTag, newTag)
                        } else {
                          // Fallback to direct database update
                          if (!supabase) return

                          const currentTags = Array.isArray(subreddit.tags) ? [...subreddit.tags] : []
                          const index = currentTags.indexOf(oldTag)
                          if (index !== -1) {
                            currentTags[index] = newTag

                            const { error } = await supabase
                              .from('reddit_subreddits')
                              .update({ tags: currentTags })
                              .eq('id', subreddit.id)

                            if (!error) {
                              // Update local state by creating new array reference
                              subreddit.tags = [...currentTags]
                              // Force re-render by updating parent if callback exists
                              if (onUpdate) onUpdate(subreddit.id, { tags: currentTags })
                            }
                          }
                        }
                      }}
                      onTagRemove={async (tag: string) => {
                        // Use parent-provided handler if available, otherwise use local logic
                        if (onTagRemove) {
                          onTagRemove(subreddit.id, tag)
                        } else {
                          // Fallback to direct database update
                          if (!supabase) return

                          const currentTags = Array.isArray(subreddit.tags) ? subreddit.tags : []
                          const newTags = currentTags.filter(t => t !== tag)

                          const { error } = await supabase
                            .from('reddit_subreddits')
                            .update({ tags: newTags })
                            .eq('id', subreddit.id)

                          if (!error) {
                            // Update local state by creating new array reference
                            subreddit.tags = [...newTags]
                            // Force re-render by updating parent if callback exists
                            if (onUpdate) onUpdate(subreddit.id, { tags: newTags })
                          }
                        }
                      }}
                      onAddTag={async (tag: string) => {
                        // Use parent-provided handler if available, otherwise use local logic
                        if (onAddTag) {
                          onAddTag(subreddit.id, tag)
                        } else {
                          // Fallback to direct database update
                          if (!supabase) return

                          const currentTags = Array.isArray(subreddit.tags) ? [...subreddit.tags] : []
                          if (!currentTags.includes(tag)) {
                            currentTags.push(tag)

                            const { error } = await supabase
                              .from('reddit_subreddits')
                              .update({ tags: currentTags })
                              .eq('id', subreddit.id)

                            if (!error) {
                              // Update local state by creating new array reference
                              subreddit.tags = [...currentTags]
                              // Force re-render by updating parent if callback exists
                              if (onUpdate) onUpdate(subreddit.id, { tags: currentTags })
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Key Stats with Rules Button - Glass Morphism Style */}
                  <div className="relative mb-1.5 rounded-lg overflow-hidden">
                    {/* Glass morphism background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-100/50 to-pink-50/30 backdrop-blur-sm" />
                    <div className="absolute inset-0 bg-white/30" />
                    
                    <div className="relative flex items-center gap-1 p-1.5 border border-pink-200/50">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        {/* Members */}
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-b9-pink flex-shrink-0" />
                          <span className="text-[11px] font-bold text-gray-900">
                            {formatNumber(subreddit.subscribers || 0)}
                          </span>
                        </div>
                        
                        {/* Engagement */}
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-3 w-3 text-b9-pink flex-shrink-0" />
                          <span className="text-[11px] font-bold text-gray-900">
                            {((subreddit.engagement || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* Avg Upvotes */}
                        <div className="flex items-center justify-center gap-1">
                          <ArrowUpCircle className="h-3 w-3 text-b9-pink flex-shrink-0" />
                          <span className="text-[11px] font-bold text-gray-900">
                            {Math.round(subreddit.avg_upvotes_per_post || 0)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Rules Button with spacing */}
                      <div className="px-1">
                        <RulesButton subreddit={subreddit} onShowRules={handleShowRules} />
                      </div>
                    </div>
                  </div>

                  {/* Best Posting Time */}
                  {(subreddit.best_posting_hour !== null || subreddit.best_posting_day) && (
                    <div className="bg-gradient-to-r from-pink-50 to-pink-50/70 rounded border border-pink-200 px-2 py-1 mb-1.5 flex items-center justify-center space-x-1.5">
                      <Clock className="h-3 w-3 text-b9-pink" />
                      <span className="text-[9px] text-gray-700 font-medium">
                        Best: {subreddit.best_posting_hour !== null ? `${subreddit.best_posting_hour}:00 UTC` : 'Any time'}
                        {subreddit.best_posting_day && ` on ${subreddit.best_posting_day}`}
                      </span>
                    </div>
                  )}

                  {/* Requirements (if any) */}
                  {(subreddit.min_account_age_days || subreddit.min_comment_karma || subreddit.min_post_karma) && (
                    <div className="bg-gradient-to-r from-pink-50/50 to-pink-50 rounded border border-pink-200 p-1.5">
                      <div className="flex items-center space-x-2 text-[9px] text-gray-700">
                        <Shield className="h-3 w-3 text-b9-pink flex-shrink-0" />
                        <div className="flex items-center space-x-2">
                          {subreddit.min_account_age_days && (
                            <span>{subreddit.min_account_age_days}d age</span>
                          )}
                          {subreddit.min_comment_karma && (
                            <span>{formatRequirement(subreddit.min_comment_karma)} comment</span>
                          )}
                          {subreddit.min_post_karma && (
                            <span>{formatRequirement(subreddit.min_post_karma)} post</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Section - Post Grid (65%) */}
                <div className="w-[65%] bg-gradient-to-br from-pink-50/30 to-white">
                  <PostGrid 
                    posts={posts} 
                    loading={isLoadingPosts}
                    error={postError}
                    subredditName={subreddit.name}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More button removed - using infinite scroll instead */}

      {/* Rules Modal - Glassmorphism Design */}
      {rulesModal.isOpen && rulesModal.subreddit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
          />
          <div className="relative bg-gradient-to-br from-white/90 via-gray-50/85 to-white/80 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/20">
            <div className="p-5 border-b border-gray-200/30 bg-gradient-to-r from-transparent via-white/10 to-transparent">
              <h2 className="text-lg font-semibold text-gray-900">
                r/{rulesModal.subreddit.name} Rules
              </h2>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-140px)] bg-gradient-to-b from-transparent via-gray-50/20 to-transparent">
              {(() => {
                const rules = rulesModal.subreddit.rules_data
                
                if (typeof rules === 'string') {
                  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{rules}</p>
                }
                
                if (Array.isArray(rules) && rules.length > 0) {
                  return (
                    <div className="space-y-3">
                      {rules.map((rule: { short_name?: string; title?: string; description?: string; violation_reason?: string }, index: number) => (
                        <div key={index} className="border-b border-gray-200/20 pb-3 last:border-0 bg-white/30 rounded-lg p-3 backdrop-blur-sm">
                          <h3 className="font-medium text-gray-900">
                            {index + 1}. {rule.short_name || rule.title || `Rule ${index + 1}`}
                          </h3>
                          {rule.description && (
                            <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                          )}
                          {rule.violation_reason && (
                            <p className="text-xs text-gray-500 mt-1">
                              Violation: {rule.violation_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                }
                
                return <p className="text-sm text-gray-500">No rules available</p>
              })()}
            </div>
            <div className="p-4 border-t border-gray-200/30 bg-gradient-to-r from-transparent via-white/10 to-transparent">
              <button
                onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
                className="px-4 py-2 bg-white/50 hover:bg-white/70 text-gray-700 rounded-lg backdrop-blur-sm transition-all duration-200 border border-gray-200/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})