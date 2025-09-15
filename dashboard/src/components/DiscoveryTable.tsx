'use client'

import React, { useState, useCallback, memo, useEffect } from 'react'
import Image from 'next/image'
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
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Mousewheel } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import type { Subreddit, Post } from '@/lib/supabase'
import { getCategoryStyles } from '@/lib/categoryColors'

interface SubredditWithPosts extends Omit<Subreddit, 'category_text' | 'created_at' | 'review'> {
  recent_posts?: Post[]
  public_description?: string | null
  comment_to_upvote_ratio?: number | null
  category_text?: string | null
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
  review?: 'Ok' | 'No Seller' | 'Non Related' | 'User Feed' | null
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
}

interface ExtendedPost extends Post {
  thumbnail?: string | null
  preview_data?: {
    images?: Array<{
      source?: {
        url?: string
      }
    }>
  }
  url?: string | null
  is_video?: boolean
}

interface DiscoveryTableProps {
  subreddits: SubredditWithPosts[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  selectedCategories?: string[]
  availableCategories?: string[]
  sfwOnly?: boolean
}

interface PostGridProps {
  posts: ExtendedPost[]
  loading?: boolean
  error?: string | null
  subredditName: string
}

const PostGrid = memo(function PostGrid({ posts, loading, error, subredditName }: PostGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { addToast } = useToast()

  const handleCopyTitle = useCallback((e: React.MouseEvent, postId: string, title: string) => {
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
  const formatScore = (score: number) => {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`
    return score.toString()
  }

  // Get thumbnail URL from post
  const getPostThumbnail = (post: ExtendedPost) => {
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
    <div className="p-2 h-full">
      <Swiper
        modules={[FreeMode, Mousewheel]}
        spaceBetween={8}
        slidesPerView={6}
        freeMode={true}
        mousewheel={true}
        grabCursor={true}
        className="h-full"
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
  selectedCategories = [],
  availableCategories = [],
  sfwOnly = false
}: DiscoveryTableProps) {
  const [postCache, setPostCache] = useState<Record<number, ExtendedPost[]>>({})
  const [loadingPosts, setLoadingPosts] = useState<Set<number>>(new Set())
  const [postErrors, setPostErrors] = useState<Record<number, string>>({})
  const [rulesModal, setRulesModal] = useState<{ isOpen: boolean; subreddit: Subreddit | null }>({ 
    isOpen: false, 
    subreddit: null 
  })

  // Fetch posts for a subreddit
  const fetchPosts = useCallback(async (subredditId: number, subredditName: string) => {
    // Check cache first
    if (postCache[subredditId]) {
      return
    }

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

      // Calculate 30 days ago
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Build query with filters
      let query = supabase
        .from('reddit_posts')
        .select('*')
        .eq('subreddit_name', subredditName)
        .gte('created_utc', thirtyDaysAgo.toISOString())

      // Apply category filter using the new sub_category_text field
      if (selectedCategories.length === 0) {
        // Show only uncategorized
        query = query.or('sub_category_text.is.null,sub_category_text.eq.')
      } else if (selectedCategories.length < availableCategories.length) {
        // Show only selected categories
        query = query.in('sub_category_text', selectedCategories)
      }
      // If all categories selected, no additional filter needed

      // Apply SFW filter using the new sub_over18 field
      if (sfwOnly) {
        query = query.eq('sub_over18', false)
      }

      const { data: posts, error } = await query
        .order('score', { ascending: false })
        .limit(10)

      if (error) throw error

      setPostCache(prev => ({
        ...prev,
        [subredditId]: posts || []
      }))
    } catch (error) {
      console.error('Error fetching posts:', error)
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
  }, [postCache, loadingPosts, selectedCategories, availableCategories, sfwOnly])

  // Auto-load posts on mount for all visible subreddits
  useEffect(() => {
    subreddits.forEach(subreddit => {
      if (!postCache[subreddit.id] && !loadingPosts.has(subreddit.id)) {
        fetchPosts(subreddit.id, subreddit.name)
      }
    })
  }, [subreddits, postCache, loadingPosts, fetchPosts])

  // Handle showing rules modal
  const handleShowRules = useCallback((subreddit: SubredditWithPosts) => {
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
  const formatNumber = (num: number | null | undefined) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toLocaleString()
  }

  // Format large numbers for requirements
  const formatRequirement = (num: number | null | undefined) => {
    if (!num) return null
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`
    return num.toString()
  }

  if (loading && subreddits.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-pink-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-50 border-b border-gray-200" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 border-b border-gray-100 bg-white p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
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
                  {/* Category Badge - Upper Right Corner */}
                  {subreddit.category_text && (
                    <div 
                      className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium z-10 ring-1 ring-gray-300/50"
                      style={getCategoryStyles(subreddit.category_text)}
                    >
                      {subreddit.category_text}
                    </div>
                  )}
                  
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
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">
                              NSFW
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-green-500 text-green-600">
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
                            {((subreddit.subscriber_engagement_ratio || 0) * 100).toFixed(1)}%
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
                        <button
                          onClick={() => {
                            const hasRulesData = subreddit.rules_data && 
                              typeof subreddit.rules_data === 'object' && (
                                (Array.isArray(subreddit.rules_data) && subreddit.rules_data.length > 0) ||
                                (typeof subreddit.rules_data === 'object' && 'rules' in subreddit.rules_data && 
                                 Array.isArray((subreddit.rules_data as { rules?: unknown[] }).rules) && ((subreddit.rules_data as { rules?: unknown[] }).rules?.length || 0) > 0)
                              )
                            
                            if (hasRulesData) {
                              handleShowRules(subreddit)
                            } else {
                              const confirmOpen = window.confirm(
                                `No rules data available for r/${subreddit.name}.\n\nWould you like to open Reddit to view the rules directly?`
                              )
                              if (confirmOpen) {
                                window.open(`https://www.reddit.com/r/${subreddit.name}/about/rules`, '_blank')
                              }
                            }
                          }}
                          className="p-1 hover:bg-b9-pink/20 rounded-md transition-colors"
                          title="View Rules"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-b9-pink" />
                        </button>
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

      {/* Rules Modal */}
      {rulesModal.isOpen && rulesModal.subreddit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                r/{rulesModal.subreddit.name} Rules
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {(() => {
                const rules = rulesModal.subreddit.rules_data
                
                if (typeof rules === 'string') {
                  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{rules}</p>
                }
                
                if (Array.isArray(rules) && rules.length > 0) {
                  return (
                    <div className="space-y-3">
                      {rules.map((rule: { short_name?: string; title?: string; description?: string; violation_reason?: string }, index: number) => (
                        <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
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
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setRulesModal({ isOpen: false, subreddit: null })}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
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