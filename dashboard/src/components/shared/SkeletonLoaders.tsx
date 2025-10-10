'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'


export function SubredditTableSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-5 w-5" variant="rounded" />
          <Skeleton className="h-12 w-12" variant="circular" />
          <Skeleton className="h-4 flex-1 max-w-[200px]" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" variant="rounded" />
        </div>
      ))}
    </div>
  )
}

export function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-6 border ${designSystem.borders.radius.sm}">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5" variant="circular" />
          </div>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="w-full animate-fade-in">
      {/* Table Header */}
      <div className="flex items-center h-12 border-b px-4 space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Table Rows */}
      <div className="divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center h-16 px-4 space-x-4">
            <Skeleton className="h-5 w-5" variant="rounded" />
            <Skeleton className="h-10 w-10" variant="circular" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" variant="rounded" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" variant="rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function UniversalTableSkeleton() {
  return (
    <div className="w-full border ${designSystem.borders.radius.sm} animate-fade-in">
      {/* Table Header */}
      <div className={cn("flex items-center h-14 px-6 space-x-6 border-b", designSystem.background.surface.subtle, `dark:${designSystem.background.surface.darkest}`)}>
        <Skeleton className="h-5 w-5" variant="rounded" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Table Rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className={cn("flex items-center h-20 px-6 space-x-6 border-b", `hover:${designSystem.background.surface.subtle}/50`, `dark:hover:${designSystem.background.surface.darkest}/50`)}>
          <Skeleton className="h-5 w-5" variant="rounded" />
          <Skeleton className="h-14 w-14" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-6 w-20" variant="rounded" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" variant="rounded" />
            <Skeleton className="h-8 w-20" variant="rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ModelsTableSkeleton() {
  return (
    <div className="w-full border ${designSystem.borders.radius.sm} animate-fade-in">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center p-4 border-b space-x-4">
          <Skeleton className="h-5 w-5" variant="rounded" />
          <Skeleton className="h-12 w-12" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" variant="rounded" />
              <Skeleton className="h-5 w-20" variant="rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" variant="rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" variant="rounded" />
            <Skeleton className="h-8 w-8" variant="rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function InstagramTableSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border ${designSystem.borders.radius.sm} p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Skeleton className="h-12 w-12" variant="circular" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-3/4 mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border ${designSystem.borders.radius.sm} p-4">
          <Skeleton className="h-32 w-full mb-3" variant="rounded" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function DiscoveryTableSkeleton() {
  return (
    <div className="bg-white ${designSystem.borders.radius.sm} shadow-sm border border-primary/30 overflow-hidden animate-fade-in">
      <div className="divide-y divide-primary/20">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-stretch min-h-[140px]">
            {/* Left Section - Subreddit Info */}
            <div className="w-[35%] p-3 border-r border-primary/20">
              {/* Header */}
              <div className="flex items-start mb-2">
                <Skeleton className="h-8 w-8 mr-2" variant="circular" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>

              {/* Tags */}
              <div className="mb-2">
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16" variant="rounded" />
                  <Skeleton className="h-5 w-20" variant="rounded" />
                  <Skeleton className="h-5 w-14" variant="rounded" />
                </div>
              </div>

              {/* Stats */}
              <div className="mb-2">
                <Skeleton className="h-8 w-full" variant="rounded" animation="wave" />
              </div>

              {/* Requirements */}
              <Skeleton className="h-6 w-full" variant="rounded" />
            </div>

            {/* Right Section - Post Grid */}
            <div className="w-[65%] bg-gradient-to-br from-primary/10 to-white p-2">
              <div className="flex gap-2">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="w-24 flex-shrink-0">
                    <Skeleton className="h-20 w-full mb-1" variant="rectangular" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-2 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}