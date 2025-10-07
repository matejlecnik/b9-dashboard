'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InstagramCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * InstagramCard - Standardized glassmorphism container for Instagram pages
 *
 * Replaces inline glassmorphism instances with a reusable component
 * using consistent styling tokens.
 *
 * @example
 * ```tsx
 * <InstagramCard>
 *   <YourContent />
 * </InstagramCard>
 *
 * <InstagramCard hover padding="lg">
 *   <YourContent />
 * </InstagramCard>
 * ```
 */
export function InstagramCard({
  children,
  className,
  hover = false,
  padding = 'md'
}: InstagramCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <div
      className={cn(
        // Base layout
        'rounded-2xl transition-all duration-300 ease-out',
        // Glassmorphism (replaces bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px])
        'bg-slate-50/70 backdrop-blur-md',
        'border border-white/20',
        'shadow-[0_8px_32px_rgba(0,0,0,0.1)]',
        // Padding
        paddingClasses[padding],
        // Hover states (optional)
        hover && [
          'hover:bg-slate-50/80',
          'hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]'
        ],
        className
      )}
    >
      {children}
    </div>
  )
}
