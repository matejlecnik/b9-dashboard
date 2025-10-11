'use client'

import { memo } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

/**
 * StandardActionButton Component v3.0 - Mac-Style Simplified
 *
 * Redesigned for monitor pages with:
 * - Cleaner, more minimal design
 * - Better platform color integration
 * - Circular/rounded aesthetic (Mac-inspired)
 * - Removed conflicting gradient effects
 * - Improved text visibility
 */

export interface StandardActionButtonProps {
  onClick: () => void
  label: string
  icon?: LucideIcon
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'stop' | 'danger' | 'secondary' | 'reddit' | 'instagram'
  className?: string
  size?: 'small' | 'normal' | 'large'
}

const StandardActionButton = memo(function StandardActionButton({
  onClick,
  label,
  icon: Icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  size = 'normal'
}: StandardActionButtonProps) {
  const isDisabled = disabled || loading

  // Variant-specific styles - Mac glassmorphic design
  const variantStyles = {
    primary: {
      glassStyle: {
        background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--pink-600)',
        boxShadow: '0 8px 32px var(--pink-alpha-40)'
      },
      hoverGlass: {
        background: 'linear-gradient(135deg, rgba(255, 131, 149, 0.7) 0%, var(--pink-alpha-50) 100%)',
        boxShadow: '0 12px 40px var(--pink-alpha-50)'
      },
      icon: 'text-white',
      text: 'text-white'
    },
    reddit: {
      background: 'bg-gradient-to-br from-[var(--reddit-primary)] via-[var(--reddit-primary)]/90 to-[var(--reddit-secondary)]',
      hoverBg: 'hover:from-[var(--reddit-primary)]/90 hover:via-[var(--reddit-primary)]/80 hover:to-[var(--reddit-secondary)]/90',
      shadow: 'shadow-[0_8px_24px_-4px_var(--reddit-primary-alpha-30)]',
      hoverShadow: 'hover:shadow-[0_12px_32px_-4px_var(--reddit-primary-alpha-50)]',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-[var(--reddit-primary)]/30'
    },
    instagram: {
      background: 'bg-gradient-to-br from-[var(--instagram-primary)] via-[var(--instagram-primary)]/90 to-[var(--instagram-secondary)]',
      hoverBg: 'hover:from-[var(--instagram-primary)]/90 hover:via-[var(--instagram-primary)]/80 hover:to-[var(--instagram-secondary)]/90',
      shadow: 'shadow-[0_8px_24px_-4px_var(--instagram-primary-alpha-30)]',
      hoverShadow: 'hover:shadow-[0_12px_32px_-4px_var(--instagram-primary-alpha-50)]',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-[var(--instagram-primary)]/30'
    },
    stop: {
      glassStyle: {
        background: 'linear-gradient(135deg, var(--pink-alpha-30) 0%, var(--pink-alpha-20) 100%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        border: '1px solid var(--pink-alpha-25)',
        boxShadow: '0 8px 24px var(--pink-alpha-20)'
      },
      hoverGlass: {
        background: 'linear-gradient(135deg, var(--pink-alpha-40) 0%, var(--pink-alpha-30) 100%)',
        boxShadow: '0 10px 32px var(--pink-alpha-30)'
      },
      icon: 'text-primary/80',
      text: 'text-primary/80'
    },
    danger: {
      background: 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900',
      hoverBg: 'hover:from-gray-700 hover:via-gray-800 hover:to-gray-850',
      shadow: 'shadow-[0_8px_24px_-4px_var(--black-alpha-30)]',
      hoverShadow: 'hover:shadow-[0_12px_32px_-4px_var(--black-alpha-50)]',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-strong'
    },
    secondary: {
      background: 'bg-gradient-to-br from-gray-100 via-gray-100 to-gray-200',
      hoverBg: 'hover:from-gray-200 hover:via-gray-200 hover:to-gray-300',
      shadow: 'shadow-[0_4px_16px_-4px_var(--black-alpha-10)]',
      hoverShadow: 'hover:shadow-[0_8px_24px_-4px_var(--black-alpha-15)]',
      icon: designSystem.typography.color.secondary,
      text: designSystem.typography.color.secondary,
      border: 'border-default'
    }
  }

  const sizeStyles = {
    small: 'h-8 px-3 py-1.5',
    normal: 'h-[90px] w-full px-4 py-3',
    large: 'h-[90px] w-full px-4 py-3'
  }

  const iconSizes = {
    small: 'h-3.5 w-3.5',
    normal: 'h-6 w-6',
    large: 'h-6 w-6'
  }

  const styles = variantStyles[variant]
  const isGlassmorphic = 'glassStyle' in styles

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        `group relative overflow-hidden ${designSystem.borders.radius.lg} transition-all duration-300`,
        size === 'small' ? 'flex flex-row items-center justify-center gap-1.5' : 'flex flex-col items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'hover:scale-[1.02] active:scale-[0.98]',
        'font-mac-text',
        // Apply classes for solid variants only
        !isGlassmorphic && [
          'border',
          styles.background,
          styles.hoverBg,
          styles.shadow,
          styles.hoverShadow,
          styles.border
        ],
        sizeStyles[size],
        className
      )}
      style={isGlassmorphic ? {
        background: styles.glassStyle.background,
        backdropFilter: styles.glassStyle.backdropFilter,
        border: styles.glassStyle.border,
        boxShadow: styles.glassStyle.boxShadow,
        WebkitBackdropFilter: styles.glassStyle.backdropFilter
      } : undefined}
      onMouseEnter={isGlassmorphic ? (e) => {
        e.currentTarget.style.background = styles.hoverGlass.background
        e.currentTarget.style.boxShadow = styles.hoverGlass.boxShadow
      } : undefined}
      onMouseLeave={isGlassmorphic ? (e) => {
        e.currentTarget.style.background = styles.glassStyle.background
        e.currentTarget.style.boxShadow = styles.glassStyle.boxShadow
      } : undefined}
    >
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Icon */}
      {Icon && (
        <Icon className={cn(
          iconSizes[size],
          'transition-transform duration-200',
          'group-hover:scale-110',
          styles.icon,
          loading && 'animate-spin'
        )} />
      )}

      {/* Label */}
      <span className={cn(
        'text-xs font-semibold tracking-wide',
        'transition-all duration-200',
        styles.text,
        variant === 'primary' && 'drop-shadow-sm'
      )}>
        {label}
      </span>
    </button>
  )
})

export { StandardActionButton }
