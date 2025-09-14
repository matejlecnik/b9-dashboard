'use client'

import React from 'react'

export function SubredditTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
    </div>
  )
}

export function MetricsCardsSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-24 bg-gray-200 rounded"></div>
      <div className="h-24 bg-gray-200 rounded"></div>
      <div className="h-24 bg-gray-200 rounded"></div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
      <div className="h-10 bg-gray-200 rounded mb-2"></div>
    </div>
  )
}