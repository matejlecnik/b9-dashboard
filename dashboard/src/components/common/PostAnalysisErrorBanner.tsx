'use client'

import { memo } from 'react'
import { X } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4",
        "backdrop-blur-xl backdrop-saturate-150",
        "flex items-center justify-between gap-3",
        "border transition-all duration-200",
        className
      )}
      style={{
        background: 'linear-gradient(180deg, var(--pink-alpha-50) 0%, var(--rose-alpha-40) 100%)',
        border: '1px solid var(--pink-200-alpha-60)',
        boxShadow: '0 8px 32px var(--pink-alpha-20)'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/30 via-transparent to-rose-100/20 pointer-events-none" />
      <div className="flex items-center gap-3 relative z-10">
        <svg className="w-5 h-5 text-pink-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={cn("font-medium text-pink-700", designSystem.typography.color.primary)}>{error}</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-pink-600 hover:text-pink-800 transition-colors relative z-10 flex-shrink-0"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
})
