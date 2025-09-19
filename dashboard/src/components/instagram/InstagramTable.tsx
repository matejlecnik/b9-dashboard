'use client'

import React, { memo, useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ExternalLink, Users, Eye, Heart } from 'lucide-react'
import { toProxiedImageUrl } from '@/config/images'

interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  following: number
  posts_count: number
  media_count: number
  review_status: 'pending' | 'ok' | 'non_related' | null
  reviewed_at: string | null
  reviewed_by: string | null
  discovery_source: string | null
  is_private: boolean
  is_verified: boolean
  avg_views_per_reel_cached: number | null
  engagement_rate_cached: number | null
  viral_content_count_cached: number | null
  external_url: string | null
  bio_links: any[] | null
  avg_likes_per_post?: number | null
}

interface InstagramTableProps {
  creators: InstagramCreator[]
  loading: boolean
  selectedCreators?: Set<number>
  setSelectedCreators?: (ids: Set<number>) => void
  onUpdateReview?: (id: number, review: 'ok' | 'non_related' | 'pending') => void
  searchQuery?: string
  onReachEnd?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  className?: string
  postsMetrics?: Map<string, { avgLikes: number, avgComments: number }>
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const InstagramTable = memo(function InstagramTable({
  creators,
  loading,
  selectedCreators = new Set(),
  setSelectedCreators,
  onUpdateReview,
  searchQuery,
  onReachEnd,
  hasMore = false,
  loadingMore = false,
  className,
  postsMetrics
}: InstagramTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || !onReachEnd || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          onReachEnd()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, onReachEnd, loadingMore])

  const toggleSelectAll = useCallback(() => {
    if (!setSelectedCreators) return
    if (selectedCreators.size === creators.length && creators.length > 0) {
      setSelectedCreators(new Set())
    } else {
      setSelectedCreators(new Set(creators.map(c => c.id)))
    }
  }, [selectedCreators, creators, setSelectedCreators])

  const toggleSelectCreator = useCallback((id: number) => {
    if (!setSelectedCreators) return
    const newSelected = new Set(selectedCreators)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCreators(newSelected)
  }, [selectedCreators, setSelectedCreators])

  // Render individual row
  const renderRow = useCallback((creator: InstagramCreator, index: number) => {
    // Get the external link - prioritize external_url, fallback to first bio_link
    const externalLink = creator.external_url ||
                         (creator.bio_links && creator.bio_links.length > 0 ? creator.bio_links[0].url : null)

    // Get post metrics from props
    const postMetrics = postsMetrics?.get(creator.ig_user_id)

    return (
      <div
        key={creator.id}
        className={cn(
          "flex items-center px-4 py-4 border-b border-gray-100/50 hover:bg-gray-50/30 transition-all duration-200",
          index % 2 === 0 && "bg-gray-50/10"
        )}
      >
        {/* Checkbox */}
        {setSelectedCreators && (
          <div className="w-10 flex justify-center">
            <Checkbox
              checked={selectedCreators.has(creator.id)}
              onCheckedChange={() => toggleSelectCreator(creator.id)}
              aria-label={`Select ${creator.username}`}
            />
          </div>
        )}

        {/* Profile & Info - Clickable sections */}
        <div className="flex items-start gap-3 w-96 px-3">
          {/* Avatar - Clickable */}
          <a
            href={`https://instagram.com/${creator.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            {creator.profile_pic_url ? (
              <img
                src={toProxiedImageUrl(creator.profile_pic_url)}
                alt={creator.username}
                className="h-12 w-12 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex'
                  }
                }}
              />
            ) : null}
            <div
              className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm items-center justify-center font-semibold"
              style={{ display: creator.profile_pic_url ? 'none' : 'flex' }}
            >
              {creator.username.slice(0, 2).toUpperCase()}
            </div>
          </a>

          {/* Creator Details */}
          <div className="flex-1 min-w-0">
            {/* Full Name */}
            {creator.full_name && (
              <div className="text-xs text-gray-500 truncate">{creator.full_name}</div>
            )}

            {/* Username with badges - Clickable */}
            <div className="flex items-center gap-1.5 mb-1">
              <a
                href={`https://instagram.com/${creator.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-gray-900 hover:text-purple-600 transition-colors"
              >
                @{creator.username}
              </a>
              {creator.is_verified && (
                <Badge variant="secondary" className="text-xs h-4 px-1">✓</Badge>
              )}
              {creator.is_private && (
                <Badge variant="outline" className="text-xs h-4 px-1">🔒</Badge>
              )}
            </div>

            {/* Biography */}
            {creator.biography && (
              <div className="text-xs text-gray-500 line-clamp-2 mb-1">
                {creator.biography}
              </div>
            )}

            {/* External Link - Separate clickable element */}
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-blue-600 truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                🔗 {externalLink.replace(/^https?:\/\//i, '').split('/')[0]}
              </a>
            )}
          </div>
        </div>

        {/* Followers */}
        <div className="w-28 text-center px-2">
          <div className="font-semibold text-gray-800 text-sm">
            {formatNumber(creator.followers)}
          </div>
          <div className="text-xs text-gray-500">followers</div>
        </div>

        {/* Avg Views per Reel */}
        <div className="w-28 text-center px-2">
          {creator.avg_views_per_reel_cached ? (
            <div>
              <div className="font-semibold text-gray-800 text-sm">
                {formatNumber(Math.round(creator.avg_views_per_reel_cached))}
              </div>
              <div className="text-xs text-gray-500">avg views/reel</div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-400">—</div>
              <div className="text-xs text-gray-500">avg views/reel</div>
            </div>
          )}
        </div>

        {/* Avg Likes per Post */}
        <div className="w-28 text-center px-2">
          {postMetrics?.avgLikes ? (
            <div>
              <div className="font-semibold text-gray-800 text-sm">
                {formatNumber(Math.round(postMetrics.avgLikes))}
              </div>
              <div className="text-xs text-gray-500">avg likes/post</div>
            </div>
          ) : creator.avg_likes_per_post ? (
            <div>
              <div className="font-semibold text-gray-800 text-sm">
                {formatNumber(Math.round(creator.avg_likes_per_post))}
              </div>
              <div className="text-xs text-gray-500">avg likes/post</div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-400">—</div>
              <div className="text-xs text-gray-500">avg likes/post</div>
            </div>
          )}
        </div>

        {/* Review buttons */}
        <div className="w-52 px-2">
          {onUpdateReview && (
            <div className="flex gap-1">
              {[
                { label: 'Approve', value: 'ok' as const },
                { label: 'Pending', value: 'pending' as const },
                { label: 'Non Related', value: 'non_related' as const }
              ].map((option) => {
                const isActive = creator.review_status === option.value ||
                                (!creator.review_status && option.value === 'pending')

                return (
                  <Button
                    key={option.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onUpdateReview(creator.id, option.value)}
                    className={cn(
                      "text-xs h-7 px-2",
                      isActive && "bg-pink-500 hover:bg-pink-600 text-white"
                    )}
                    title={`Mark as ${option.label}`}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          )}
        </div>

      </div>
    )
  }, [selectedCreators, onUpdateReview, setSelectedCreators, toggleSelectCreator, postsMetrics])

  if (loading && creators.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-2 text-gray-500">Loading creators...</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col h-full rounded-2xl border border-black/5 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden",
        className
      )}
      role="table"
      aria-busy={loadingMore}
    >
      {/* Header */}
      <div
        className="flex items-center px-4 py-3 bg-gray-50/80 border-b border-gray-200/50 font-medium text-gray-700 text-sm"
        role="row"
      >
        {setSelectedCreators && (
          <div className="w-10 flex justify-center">
            <Checkbox
              checked={selectedCreators.size === creators.length && creators.length > 0}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
          </div>
        )}
        <div className="w-96 px-3">Profile & Info</div>
        <div className="w-28 text-center px-2">Followers</div>
        <div className="w-28 text-center px-2">Avg Views/Reel</div>
        <div className="w-28 text-center px-2">Avg Likes/Post</div>
        <div className="w-52 px-2">Review Status</div>
        <div className="flex-1 flex justify-end pr-4">
          <span className="text-xs text-gray-400">
            {creators.length.toLocaleString()} results
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto min-h-[320px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            <span className="ml-2 text-gray-500">Loading creators...</span>
          </div>
        ) : creators.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            No creators found
            {searchQuery && (
              <span className="ml-1">for &quot;{searchQuery}&quot;</span>
            )}
          </div>
        ) : (
          <>
            {creators.map((creator, index) => renderRow(creator, index))}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                    <span className="ml-2 text-gray-500">Loading more...</span>
                  </>
                ) : (
                  <div className="text-gray-400">Scroll to load more</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

export { InstagramTable }
export type { InstagramCreator, InstagramTableProps }