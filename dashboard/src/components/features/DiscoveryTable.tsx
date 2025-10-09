'use client'

import { useState, useCallback, useEffect, memo, type JSX } from 'react'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import { TagsDisplay } from '@/components/shared/TagsDisplay'
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
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
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
      className={cn("p-1 hover:bg-pink-50/50", designSystem.borders.radius.sm, designSystem.transitions.default)}
      title="View Rules"
    >
      <BookOpen className={cn(
        "h-3.5 w-3.5",
        hasRulesData ? 'text-pink-600' : designSystem.typography.color.disabled
      )} />
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
      <div className={cn(designSystem.layout.flex.rowCenter, "h-full")}>
        <Loader2 className={cn("h-5 w-5 animate-spin", designSystem.typography.color.disabled)} />
        <span className={cn("ml-2 text-xs font-mac-text", designSystem.typography.color.subtle)}>Loading posts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(designSystem.layout.flex.rowCenter, "h-full")}>
        <span className={cn("text-xs font-mac-text", designSystem.typography.color.subtle)}>Failed to load posts</span>
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className={cn(designSystem.layout.flex.rowCenter, "h-full")}>
        <span className={cn("text-xs font-mac-text", designSystem.typography.color.disabled)}>No recent posts</span>
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
    <div className="p-2 min-h-[140px]">
      <Swiper
        modules={[FreeMode, Mousewheel]}
        spaceBetween={8}
        slidesPerView={6}
        freeMode={true}
        mousewheel={true}
        grabCursor={true}
        className="h-full [&_.swiper-slide]:bg-transparent"
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
              <div className={cn("h-full group relative bg-transparent border border-gray-200/60 hover:border-pink-400/60 hover:shadow-md overflow-hidden", designSystem.borders.radius.sm, designSystem.transitions.default)}>
                {/* Copy Button */}
                <button
                  onClick={(e) => handleCopyTitle(e, post.reddit_id, post.title)}
                  className={cn(
                    "absolute top-1 right-1 z-10 p-1 opacity-0 group-hover:opacity-100 bg-gray-800/70 hover:bg-gray-900/80 backdrop-blur-sm",
                    designSystem.borders.radius.sm,
                    designSystem.transitions.default
                  )}
                  title="Copy title"
                >
                  {copiedId === post.reddit_id ? (
                    <Check className="h-3 w-3 text-pink-600" />
                  ) : (
                    <Copy className={cn("h-3 w-3", designSystem.typography.color.tertiary)} />
                  )}
                </button>

                <a
                  href={`https://reddit.com/r/${subredditName}/comments/${post.reddit_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full cursor-pointer bg-transparent"
                  title={post.title}
                >
                  {/* Thumbnail/Preview */}
                  <div className="relative h-20 rounded-t-lg">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      className="object-cover rounded-t-lg"
                      unoptimized
                    />
                  ) : (
                    <div className={cn(designSystem.layout.flex.rowCenter, "h-full")}>
                      {post.is_video ? (
                        <Video className={cn("h-6 w-6", designSystem.typography.color.disabled)} />
                      ) : (
                        <FileText className={cn("h-6 w-6", designSystem.typography.color.disabled)} />
                      )}
                    </div>
                  )}
                  {post.is_video && thumbnail && (
                    <div className={cn("absolute inset-0 bg-black/30", designSystem.layout.flex.rowCenter)}>
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="p-2 space-y-1">
                  <div className={cn(designSystem.layout.flex.rowBetween)}>
                    <div className={cn(designSystem.layout.flex.rowStart, "space-x-0.5 text-[10px] font-mac-text")}>
                      <ArrowUpCircle className="h-3 w-3 text-pink-600" />
                      <span className="font-semibold">{formatScore(post.score)}</span>
                    </div>
                    <div className={cn(designSystem.layout.flex.rowStart, "space-x-0.5 text-[10px] font-mac-text", designSystem.typography.color.tertiary)}>
                      <MessageCircle className="h-2.5 w-2.5" />
                      <span>{post.num_comments}</span>
                    </div>
                  </div>
                  {/* Title preview - 2 lines max */}
                  <p className={cn("text-[9px] line-clamp-2 leading-tight font-mac-text", designSystem.typography.color.secondary)}>
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

  // Mac-style relative time formatter
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Recently added'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Less than 1 minute
    if (diffMins < 1) return 'Just now'

    // Less than 1 hour
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`

    // Less than 24 hours - show "X hours ago"
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

    // Yesterday
    if (diffDays === 1) return 'Yesterday'

    // Less than 7 days
    if (diffDays < 7) return `${diffDays} days ago`

    // Less than 30 days
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`
    }

    // Less than 365 days
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months === 1 ? '' : 's'} ago`
    }

    // Over a year
    const years = Math.floor(diffDays / 365)
    return `${years} year${years === 1 ? '' : 's'} ago`
  }

  if (loading && subreddits.length === 0) {
    return (
      <div className="animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center px-4 py-3 border-b border-light">
            <div className={cn("h-4 rounded w-1/4 mr-4", designSystem.background.surface.neutral)}></div>
            <div className={cn("h-4 rounded w-1/3 mr-4", designSystem.background.surface.neutral)}></div>
            <div className={cn("h-4 rounded w-1/4", designSystem.background.surface.neutral)}></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn("overflow-hidden backdrop-blur-xl backdrop-saturate-150", designSystem.borders.radius.sm)}
      style={{
        background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
        border: '1px solid var(--slate-400-alpha-60)',
        boxShadow: '0 12px 32px var(--black-alpha-15)'
      }}
    >
      {/* Table Body */}
      <div className="divide-y divide-gray-200/40">
        {subreddits.map((subreddit) => {
          const posts = postCache[subreddit.id] || []
          const isLoadingPosts = loadingPosts.has(subreddit.id)
          const postError = postErrors[subreddit.id]
          
          return (
            <div key={subreddit.id} className={cn("hover:bg-pink-50/30", designSystem.transitions.default)}>
              {/* Main Row - More Compact */}
              <div className={cn(designSystem.layout.flex.rowStart, "min-h-[140px]")}>
                {/* Left Section - Subreddit Info (35%) - More Compact */}
                <div className="w-[35%] p-3 pb-3 border-r border-gray-200/40 relative">
                  {/* Subreddit Header */}
                  <div className={cn(designSystem.layout.flex.rowBetween, "items-start mb-2")}>
                    <a
                      href={`https://reddit.com/r/${subreddit.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(designSystem.layout.flex.rowStart, "space-x-2 group flex-1")}
                    >
                      {subreddit.icon_img || subreddit.community_icon ? (
                        <Image
                          src={(subreddit.icon_img || subreddit.community_icon || '').replace(/&amp;/g, '&')}
                          alt={subreddit.name}
                          width={32}
                          height={32}
                          className={cn("border border-gray-200/60 group-hover:border-pink-400/60 flex-shrink-0", designSystem.borders.radius.full, designSystem.transitions.default)}
                          unoptimized
                        />
                      ) : (
                        <div
                          className={cn("w-8 h-8 flex items-center justify-center text-white font-bold text-xs flex-shrink-0", designSystem.borders.radius.full)}
                          style={{
                            background: `linear-gradient(135deg, ${(() => {
                              const hash = subreddit.name.split('').reduce((acc, char) => {
                                return char.charCodeAt(0) + ((acc << 5) - acc)
                              }, 0)
                              const variants = [
                                'var(--pink-400), var(--pink-600)',
                                'var(--pink-500), var(--pink-700)',
                                'var(--pink-300), var(--pink-500)',
                                'var(--pink-600), var(--pink-400)',
                                'var(--pink-500), var(--pink-600)',
                              ]
                              return variants[Math.abs(hash) % variants.length]
                            })()})`,
                            border: '1px solid var(--pink-600-alpha-30)'
                          }}
                        >
                          {subreddit.name.charAt(0)?.toUpperCase() || 'R'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={cn(designSystem.layout.flex.rowStart, "space-x-1.5 flex-wrap")}>
                          <span className={cn("font-semibold text-sm group-hover:text-pink-600 font-mac-text", designSystem.typography.color.primary, designSystem.transitions.default)}>
                            r/{subreddit.name}
                          </span>
                          {subreddit.verification_required && (
                            <span title="Verification Required">
                              <BadgeCheck className="h-3.5 w-3.5 text-pink-600 flex-shrink-0" />
                            </span>
                          )}
                          {subreddit.over18 ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4 bg-pink-50/50 text-pink-600 border-pink-200/40 font-semibold">
                              NSFW
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4 bg-gray-50 text-gray-600 border-gray-200/40 font-semibold">
                              SFW
                            </Badge>
                          )}
                          <ExternalLink className={cn("h-2.5 w-2.5 opacity-0 group-hover:opacity-100", designSystem.typography.color.disabled, designSystem.transitions.default)} />
                        </div>
                        <p className={cn("text-[10px] line-clamp-1 font-mac-text", designSystem.typography.color.subtle)}>
                          {subreddit.public_description || subreddit.title}
                        </p>
                      </div>
                    </a>
                  </div>

                  {/* Tags Display - Limited to 2 rows max */}
                  <div className="mb-1 max-h-[28px] overflow-hidden relative">
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
                  <div
                    className={cn("relative mb-1 overflow-hidden backdrop-blur-xl backdrop-saturate-150", designSystem.borders.radius.sm)}
                    style={{
                      background: 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
                      border: '1px solid var(--slate-400-alpha-60)',
                      boxShadow: '0 4px 12px var(--black-alpha-08)'
                    }}
                  >
                    <div className={cn("relative gap-1 p-1.5", designSystem.layout.flex.rowStart)}>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        {/* Members */}
                        <div className={cn(designSystem.layout.flex.rowCenter, "gap-1")}>
                          <Users className="h-3 w-3 text-pink-600 flex-shrink-0" />
                          <span className={cn("text-[11px] font-bold font-mac-text", designSystem.typography.color.primary)}>
                            {formatNumber(subreddit.subscribers || 0)}
                          </span>
                        </div>

                        {/* Engagement */}
                        <div className={cn(designSystem.layout.flex.rowCenter, "gap-1")}>
                          <TrendingUp className="h-3 w-3 text-pink-600 flex-shrink-0" />
                          <span className={cn("text-[11px] font-bold font-mac-text", designSystem.typography.color.primary)}>
                            {((subreddit.engagement || 0) * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Avg Upvotes */}
                        <div className={cn(designSystem.layout.flex.rowCenter, "gap-1")}>
                          <ArrowUpCircle className="h-3 w-3 text-pink-600 flex-shrink-0" />
                          <span className={cn("text-[11px] font-bold font-mac-text", designSystem.typography.color.primary)}>
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

                  {/* Best Posting Time - Always rendered for consistent alignment */}
                  <div
                    className={cn("px-2 py-1 mb-1 space-x-1.5 backdrop-blur-xl backdrop-saturate-150", designSystem.borders.radius.sm, designSystem.layout.flex.rowCenter)}
                    style={{
                      background: 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
                      border: '1px solid var(--slate-400-alpha-60)'
                    }}
                  >
                    {(subreddit.best_posting_hour !== null || subreddit.best_posting_day) ? (
                      <>
                        <Clock className="h-3 w-3 text-pink-600" />
                        <span className={cn("text-[9px] font-medium font-mac-text", designSystem.typography.color.secondary)}>
                          Best: {subreddit.best_posting_hour !== null ? `${subreddit.best_posting_hour}:00 UTC` : 'Any time'}
                          {subreddit.best_posting_day && ` on ${subreddit.best_posting_day}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className={cn("text-[9px] font-medium font-mac-text", designSystem.typography.color.disabled)}>
                          No data available
                        </span>
                      </>
                    )}
                  </div>

                  {/* Requirements - Always rendered for consistent alignment */}
                  <div
                    className={cn("p-1.5 mb-0 backdrop-blur-xl backdrop-saturate-150", designSystem.borders.radius.sm)}
                    style={{
                      background: 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
                      border: '1px solid var(--slate-400-alpha-60)'
                    }}
                  >
                    {(subreddit.min_account_age_days || subreddit.min_comment_karma || subreddit.min_post_karma) ? (
                      <div className={cn(designSystem.layout.flex.rowStart, "space-x-2 text-[9px] font-mac-text", designSystem.typography.color.secondary)}>
                        <Shield className="h-3 w-3 text-pink-600 flex-shrink-0" />
                        <div className={cn(designSystem.layout.flex.rowStart, "space-x-2")}>
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
                    ) : (
                      <div className={cn(designSystem.layout.flex.rowStart, "space-x-2 text-[9px] font-mac-text", designSystem.typography.color.disabled)}>
                        <Shield className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span>No requirements</span>
                      </div>
                    )}
                  </div>

                  {/* Last Updated Timestamp - Mac Style */}
                  <div className="mt-2">
                    <div
                      className={cn(
                        "px-2 py-1 text-[9px] font-medium tracking-wide font-mac-text backdrop-blur-xl backdrop-saturate-150",
                        designSystem.typography.color.disabled,
                        designSystem.borders.radius.sm
                      )}
                      style={{
                        background: 'linear-gradient(180deg, var(--gray-200-alpha-90) 0%, var(--gray-300-alpha-85) 100%)',
                        border: '1px solid var(--slate-400-alpha-40)',
                        boxShadow: '0 2px 8px var(--black-alpha-06)'
                      }}
                    >
                      Updated {formatRelativeTime(subreddit.last_scraped_at || subreddit.created_at)}
                    </div>
                  </div>
                </div>

                {/* Right Section - Post Grid (65%) */}
                <div className="w-[65%] bg-gradient-to-br from-gray-50/50 to-slate-50/30">
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
        <div className={cn("fixed inset-0 z-50 p-4", designSystem.layout.flex.rowCenter)}>
          <div
            className={cn("absolute inset-0 bg-black/40", designSystem.glass.heavy)}
            onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
          />
          <div
            className={cn("relative max-w-2xl w-full max-h-[80vh] overflow-hidden backdrop-blur-xl backdrop-saturate-150", designSystem.borders.radius.lg, designSystem.shadows.xl)}
            style={{
              background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
              border: '1px solid var(--slate-400-alpha-60)',
              boxShadow: '0 20px 50px var(--black-alpha-20)'
            }}
          >
            <div className="p-5 border-b border-gray-200/40">
              <h2 className={cn("text-lg font-semibold font-mac-display", designSystem.typography.color.primary)}>
                r/{rulesModal.subreddit.name} Rules
              </h2>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-140px)] font-mac-text">
              {(() => {
                const rules = rulesModal.subreddit.rules_data

                if (typeof rules === 'string') {
                  return <p className={cn("text-sm whitespace-pre-wrap", designSystem.typography.color.secondary)}>{rules}</p>
                }

                if (Array.isArray(rules) && rules.length > 0) {
                  return (
                    <div className="space-y-3">
                      {rules.map((rule: { short_name?: string; title?: string; description?: string; violation_reason?: string }, index: number) => (
                        <div
                          key={index}
                          className={cn("border-b border-gray-200/40 pb-3 last:border-0 p-3 backdrop-blur-sm", designSystem.borders.radius.sm)}
                          style={{
                            background: 'linear-gradient(180deg, var(--white-alpha-40) 0%, var(--white-alpha-30) 100%)'
                          }}
                        >
                          <h3 className={cn("font-medium", designSystem.typography.color.primary)}>
                            {index + 1}. {rule.short_name || rule.title || `Rule ${index + 1}`}
                          </h3>
                          {rule.description && (
                            <p className={cn("text-sm mt-1", designSystem.typography.color.tertiary)}>{rule.description}</p>
                          )}
                          {rule.violation_reason && (
                            <p className={cn("text-xs mt-1", designSystem.typography.color.subtle)}>
                              Violation: {rule.violation_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                }

                return <p className={cn("text-sm", designSystem.typography.color.subtle)}>No rules available</p>
              })()}
            </div>
            <div className="p-4 border-t border-gray-200/40">
              <button
                onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
                className={cn(
                  "px-4 py-2 border font-mac-text hover:bg-pink-50/30",
                  designSystem.borders.radius.sm,
                  designSystem.typography.color.secondary,
                  designSystem.glass.light,
                  designSystem.transitions.default
                )}
                style={{
                  background: 'linear-gradient(180deg, var(--white-alpha-50) 0%, var(--white-alpha-40) 100%)',
                  border: '1px solid var(--slate-400-alpha-60)'
                }}
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