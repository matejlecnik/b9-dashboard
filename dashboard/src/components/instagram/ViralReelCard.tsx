'use client'

import React from 'react'
import { Play, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toProxiedImageUrl } from '@/config/images'
import { ViralReel } from '@/lib/supabase/viral-reels'

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

export const ViralReelCard = React.memo(function ViralReelCard({ reel }: ViralReelCardProps) {
  const thumbnailUrl = reel.cover_url || reel.thumbnail_url
  const profilePicUrl = reel.creator?.profile_pic_url

  return (
    <div className="group overflow-hidden rounded-2xl transition-all duration-300 ease-out bg-[rgba(248,250,252,0.8)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.9)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.03] hover:-translate-y-1 cursor-pointer">
      <div className="relative aspect-[9/16] bg-gray-100">
        {thumbnailUrl ? (
          <img
            src={toProxiedImageUrl(thumbnailUrl)}
            alt={`Reel by ${reel.creator_username}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Play className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Overlay with play button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-3">
            <Play className="h-8 w-8 text-gray-900 fill-current" />
          </div>
        </div>

        {/* View count badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
          <Play className="h-3 w-3 fill-current" />
          {formatNumber(reel.play_count)}
        </div>

        {/* Duration badge */}
        {reel.video_duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
            {formatDuration(reel.video_duration)}
          </div>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Creator info */}
        <div className="flex items-center gap-2">
          {profilePicUrl ? (
            <img
              src={toProxiedImageUrl(profilePicUrl)}
              alt={reel.creator_username || 'Creator'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              @{reel.creator_username || 'Unknown'}
            </p>
            {reel.creator?.followers && (
              <p className="text-xs text-gray-500">
                {formatNumber(reel.creator.followers)} followers
              </p>
            )}
          </div>
        </div>

        {/* Caption */}
        {reel.caption_text && (
          <p className="text-sm text-gray-700 line-clamp-2">
            {reel.caption_text}
          </p>
        )}

        {/* Engagement stats */}
        <div className="flex items-center justify-between text-xs text-gray-600">
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
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(reel.taken_at), { addSuffix: true })}
          </p>
        )}

        {/* Engagement rate if available */}
        {reel.engagement_rate && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Engagement Rate</span>
              <span className="font-semibold text-purple-600">
                {(reel.engagement_rate * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})