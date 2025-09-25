'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViralReelCard } from './ViralReelCard'
import type { ViralReel } from '@/lib/supabase/viral-reels'

interface ViralReelsGridProps {
  reels: ViralReel[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
}

export function ViralReelsGrid({
  reels,
  loading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false
}: ViralReelsGridProps) {
  if (loading && reels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No viral reels found matching your criteria.</p>
        <p className="text-sm text-gray-500 mt-2">Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {reels.map((reel) => (
          <ViralReelCard key={reel.media_pk} reel={reel} />
        ))}
      </div>

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="min-w-[200px]"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load More Reels'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}