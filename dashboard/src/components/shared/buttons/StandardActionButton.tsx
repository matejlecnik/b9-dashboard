'use client'

import { memo } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'


export interface StandardActionButtonProps {
  onClick: () => void
  label: string
  icon?: LucideIcon
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'secondary'
  className?: string
  size?: 'normal' | 'large'
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

  // Different background gradients for variants
  const backgroundStyles = {
    primary: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))',
    danger: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
    secondary: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15), rgba(107, 114, 128, 0.15))'
  }

  // Icon colors for variants
  const iconColors = {
    primary: 'text-pink-500 group-hover:text-pink-600',
    danger: 'text-red-500 group-hover:text-red-600',
    secondary: 'text-gray-500 group-hover:text-gray-600'
  }

  // Text gradient colors for variants
  const textGradients = {
    primary: 'from-pink-600 to-purple-600',
    danger: 'from-red-600 to-red-700',
    secondary: 'from-gray-600 to-gray-700'
  }

  const sizeStyles = {
    normal: 'min-h-[80px] min-w-[120px] px-4 py-2.5',
    large: 'min-h-[100px] min-w-[140px] px-4 py-3'
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed',
        sizeStyles[size],
        className
      )}
      style={{
        background: backgroundStyles[variant],
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 12px 32px -8px rgba(236, 72, 153, 0.25), inset 0 2px 2px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/25 via-purple-400/25 to-blue-400/25 pointer-events-none" />

      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {/* Glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn(
          "absolute inset-0 rounded-xl blur-xl",
          variant === 'primary' && "bg-gradient-to-r from-pink-500/20 to-purple-500/20",
          variant === 'danger' && "bg-gradient-to-r from-red-500/20 to-red-600/20",
          variant === 'secondary' && "bg-gradient-to-r from-gray-500/20 to-gray-600/20"
        )} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {Icon && (
          <Icon className={cn(
            size === 'normal' ? 'h-4 w-4' : 'h-5 w-5',
            'mb-1 transition-colors',
            iconColors[variant],
            loading && 'animate-spin'
          )} />
        )}
        <span className={cn(
          'text-xs font-semibold bg-gradient-to-r bg-clip-text text-transparent',
          textGradients[variant]
        )}>
          {label}
        </span>
      </div>
    </button>
  )
})

export { StandardActionButton }