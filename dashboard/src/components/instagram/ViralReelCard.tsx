'use client'

import Image from 'next/image'
import { Play, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { InstagramCard } from './InstagramCard'
import type { ViralReel } from '@/lib/supabase/viral-reels'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface ViralReelCardProps {
  reel: ViralReel
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function toProxiedImageUrl(url: string): string {
  // For Instagram images, we can use them directly as they have proper CORS headers
  return url
}

export function ViralReelCard({ reel }: ViralReelCardProps) {
  const thumbnailUrl = reel.cover_url || reel.thumbnail_url
  const profilePicUrl = reel.creator?.profile_pic_url

  return (
    <InstagramCard hover padding="none" className="group overflow-hidden hover:scale-[1.03] hover:-translate-y-1 cursor-pointer">
      <div className={`relative aspect-[9/16] ${designSystem.background.surface.light}`}>
        {thumbnailUrl ? (
          <Image
            src={toProxiedImageUrl(thumbnailUrl)}
            alt={`Reel by ${reel.creator_username}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
            <Play className={cn("h-12 w-12", designSystem.typography.color.disabled)} />
          </div>
        )}

        {/* Overlay with play button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/90 {designSystem.borders.radius.full} p-3">
            <Play className={cn("h-8 w-8 fill-current", designSystem.typography.color.primary)} />
          </div>
        </div>

        {/* View count badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 {designSystem.borders.radius.sm} text-xs font-medium flex items-center gap-1">
          <Play className="h-3 w-3 fill-current" />
          {formatNumber(reel.play_count)}
        </div>

        {/* Duration badge */}
        {reel.video_duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 {designSystem.borders.radius.sm} text-xs font-medium">
            {formatDuration(reel.video_duration)}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Creator info */}
        <div className="flex items-center gap-2">
          {profilePicUrl ? (
            <div className="relative w-8 h-8">
              <Image
                src={toProxiedImageUrl(profilePicUrl)}
                alt={reel.creator_username || 'Creator'}
                fill
                className="{designSystem.borders.radius.full} object-cover"
                sizes="32px"
              />
            </div>
          ) : (
            <div className="w-8 h-8 {designSystem.borders.radius.full} bg-gradient-to-br from-secondary to-primary" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              @{reel.creator_username || 'Unknown'}
            </p>
            {reel.creator?.followers && (
              <p className={cn("text-xs", designSystem.typography.color.subtle)}>
                {formatNumber(reel.creator.followers)} followers
              </p>
            )}
          </div>
        </div>

        {/* Caption */}
        {reel.caption_text && (
          <p className={cn("text-sm line-clamp-2", designSystem.typography.color.secondary)}>
            {reel.caption_text}
          </p>
        )}

        {/* Engagement stats */}
        <div className={cn("flex items-center justify-between text-xs", designSystem.typography.color.tertiary)}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatNumber(reel.like_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatNumber(reel.comment_count)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5" />
              {formatNumber(reel.save_count)}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-3.5 w-3.5" />
              {formatNumber(reel.share_count)}
            </span>
          </div>
        </div>

        {/* Timestamp */}
        {reel.taken_at && (
          <p className={cn("text-xs", designSystem.typography.color.subtle)}>
            {formatDistanceToNow(new Date(reel.taken_at), { addSuffix: true })}
          </p>
        )}

        {/* Engagement rate if available */}
        {reel.engagement_rate && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className={designSystem.typography.color.tertiary}>Engagement Rate</span>
              <span className="font-semibold text-secondary">
                {(reel.engagement_rate * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </InstagramCard>
  )
}