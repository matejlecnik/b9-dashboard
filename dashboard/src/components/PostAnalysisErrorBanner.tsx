'use client'

import React, { memo } from 'react'
import { X } from 'lucide-react'

interface PostAnalysisErrorBannerProps {
  error: string | null
  onDismiss: () => void
  className?: string
}

export const PostAnalysisErrorBanner = memo(function PostAnalysisErrorBanner({
  error,
  onDismiss,
  className = ''
}: PostAnalysisErrorBannerProps) {
  if (!error) return null

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-red-800 font-medium">{error}</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-600 hover:text-red-800 transition-colors"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
})
