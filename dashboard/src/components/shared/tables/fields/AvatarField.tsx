'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface AvatarFieldProps {
  src?: string | null
  alt?: string
  fallback?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showBorder?: boolean
}

// Gradient palette for fallback avatars
const GRADIENT_PALETTE = [
  'linear-gradient(135deg, #EC4899, #EF4444)', // Pink-red
  'linear-gradient(135deg, #EC4899, #A855F7)', // Pink-purple
  'linear-gradient(135deg, #6B7280, #475569)', // Gray-slate
  'linear-gradient(135deg, #F472B6, #FB7185)', // Pink-rose
  'linear-gradient(135deg, #64748B, #6B7280)', // Slate-gray
  'linear-gradient(135deg, #A855F7, #EC4899)'  // Purple-pink
]

// Generate gradient based on string hash
function getGradientForName(name: string = ''): string {
  if (!name) return GRADIENT_PALETTE[0]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }

  const index = Math.abs(hash) % GRADIENT_PALETTE.length
  return GRADIENT_PALETTE[index]
}

// Extract first letter from name
function getInitial(name: string = '', fallbackChar: string = '?'): string {
  if (!name) return fallbackChar
  // Remove common prefixes like r/, u/, @, etc.
  const cleaned = name.replace(/^[ru]\/|^@/i, '')
  return cleaned.charAt(0).toUpperCase()
}

export const AvatarField = memo(function AvatarField({
  src,
  alt = '',
  fallback,
  size = 'md',
  className,
  showBorder = true
}: AvatarFieldProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const baseClassName = cn(
    sizeClasses[size],
    'flex items-center justify-center flex-shrink-0',
    designSystem.borders.radius.full,
    'overflow-hidden',
    showBorder && 'border-2 border-gray-200/60',
    className
  )

  // Generate gradient and initial for fallback
  const gradient = getGradientForName(alt)
  const initial = getInitial(alt, typeof fallback === 'string' ? fallback : 'R')

  if (src && !imageError) {
    // Decode HTML entities in URL (e.g., &amp; to &)
    const decodedSrc = src.replace(/&amp;/g, '&')

    return (
      <div className={baseClassName} style={{ background: gradient }}>
        <Image
          src={decodedSrc}
          alt={alt}
          width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
          height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
          className="object-cover w-full h-full"
          unoptimized
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  // Fallback: Show gradient with initial
  return (
    <div
      className={baseClassName}
      style={{ background: gradient }}
    >
      {typeof fallback === 'string' || !fallback ? (
        <span className="font-semibold text-white">
          {initial}
        </span>
      ) : (
        fallback
      )}
    </div>
  )
})
