'use client'

import React, { useEffect, useState, useRef } from 'react'
import { PostGalleryCard } from './PostGalleryCard'
import { SkeletonCard } from './UniversalLoading'
import type { Post } from '@/types/post'

interface VirtualizedPostGridProps {
  posts: Post[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  className?: string
}

export function VirtualizedPostGrid({ 
  posts, 
  loading, 
  hasMore, 
  onLoadMore,
  className = ''
}: VirtualizedPostGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(4)

  // Calculate responsive columns - Max 4 columns as requested
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 640) setColumns(2)      // sm
      else if (width < 768) setColumns(3)  // md  
      else setColumns(4)                   // lg and above - max 4 columns
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  // Intersection observer for infinite scroll with proper cleanup and performance optimization
  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current
    
    if (!currentLoadMoreRef || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loading) {
          // Debounce rapid intersection events
          const timeoutId = setTimeout(() => {
            onLoadMore()
          }, 100)
          
          // Store timeout for cleanup
          currentLoadMoreRef.dataset.timeoutId = timeoutId.toString()
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '100px',
        // Optimize for performance
        root: null
      }
    )

    observer.observe(currentLoadMoreRef)

    return () => {
      // Clear any pending timeout
      const timeoutId = currentLoadMoreRef.dataset.timeoutId
      if (timeoutId) {
        clearTimeout(parseInt(timeoutId))
        delete currentLoadMoreRef.dataset.timeoutId
      }
      
      // Properly disconnect observer
      observer.unobserve(currentLoadMoreRef)
      observer.disconnect()
    }
  }, [hasMore, loading, onLoadMore])

  // Removed virtual scrolling complexity as requested - render all posts for better performance

  return (
    <div className={className}>
      {/* Main Grid - Simplified without virtual scrolling */}
      <div 
        className={`grid gap-3 auto-rows-max`}
        style={{ 
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        }}
      >
        {/* All Posts */}
        {posts.map((post) => (
          <PostGalleryCard
            key={post.id}
            post={post}
          />
        ))}
      </div>

      {/* Enhanced Loading States with Skeleton Cards */}
      {loading && (
        <div className="mt-8">
          <div 
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {[...Array(12)].map((_, i) => {
              // Add variety to skeleton cards
              const variants = ['default', 'compact', 'wide'] as const
              const variant = variants[i % 3]
              
              return (
                <div 
                  key={i} 
                  className="animate-card-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <SkeletonCard variant={variant} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && !loading && (
        <div 
          ref={loadMoreRef} 
          className="h-20 flex items-center justify-center"
        >
          <div className="text-gray-400">Loading more posts...</div>
        </div>
      )}

      {/* End Message */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-16">
          <div className="text-gray-400 text-6xl mb-4">🎉</div>
          <div className="text-gray-500 text-xl mb-2">You&apos;ve seen it all!</div>
          <div className="text-gray-400 text-sm">
            Showing all {posts.length} posts from approved subreddits
          </div>
        </div>
      )}

      {/* No Results */}
      {posts.length === 0 && !loading && (
        <div className="text-center py-24 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200/50">
          <div className="text-gray-300 text-8xl mb-6">📱</div>
          <div className="text-gray-500 text-2xl mb-3 font-medium">No posts found</div>
          <div className="text-gray-400 max-w-md mx-auto">
            Try adjusting your search terms or category filters to discover more content
          </div>
        </div>
      )}
    </div>
  )
}

