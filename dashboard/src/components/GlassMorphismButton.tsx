'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

export type ButtonVariant = 'ai' | 'start' | 'stop' | 'process' | 'brand' | 'success' | 'warning' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ColorScheme {
  background: string
  hoverOverlay: string
  boxShadow: string
  iconColor: string
  iconHoverColor: string
  textGradient: string
}

const colorSchemes: Record<ButtonVariant, ColorScheme> = {
  // AI/Magic operations - Pink/Purple/Blue gradient (matches AI categorization)
  ai: {
    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20',
    boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-pink-500',
    iconHoverColor: 'group-hover:text-pink-600',
    textGradient: 'from-pink-600 to-purple-600'
  },

  // Brand colors - B9 Pink gradient
  brand: {
    background: 'linear-gradient(135deg, rgba(255, 131, 149, 0.1), rgba(255, 107, 128, 0.1), rgba(255, 77, 104, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-[#FF8395]/20 via-[#FF6B80]/20 to-[#FF4D68]/20',
    boxShadow: '0 8px 32px 0 rgba(255, 131, 149, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-[#FF6B80]',
    iconHoverColor: 'group-hover:text-[#FF4D68]',
    textGradient: 'from-[#FF6B80] to-[#FF4D68]'
  },

  // Start operations - Brand Pink gradient (lighter shade)
  start: {
    background: 'linear-gradient(135deg, rgba(255, 163, 175, 0.1), rgba(255, 131, 149, 0.1), rgba(255, 107, 128, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-[#FFA3AF]/20 via-[#FF8395]/20 to-[#FF6B80]/20',
    boxShadow: '0 8px 32px 0 rgba(255, 131, 149, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-[#FF8395]',
    iconHoverColor: 'group-hover:text-[#FF6B80]',
    textGradient: 'from-[#FF8395] to-[#FF6B80]'
  },

  // Stop operations - Brand Pink gradient (darker shade)
  stop: {
    background: 'linear-gradient(135deg, rgba(255, 77, 104, 0.1), rgba(255, 51, 85, 0.1), rgba(220, 38, 68, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-[#FF4D68]/20 via-[#FF3355]/20 to-[#DC2644]/20',
    boxShadow: '0 8px 32px 0 rgba(255, 77, 104, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-[#FF4D68]',
    iconHoverColor: 'group-hover:text-[#FF3355]',
    textGradient: 'from-[#FF4D68] to-[#DC2644]'
  },

  // Processing/Loading - Brand Pink gradient (medium shade)
  process: {
    background: 'linear-gradient(135deg, rgba(255, 107, 128, 0.1), rgba(255, 91, 114, 0.1), rgba(255, 77, 104, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-[#FF6B80]/20 via-[#FF5B72]/20 to-[#FF4D68]/20',
    boxShadow: '0 8px 32px 0 rgba(255, 107, 128, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-[#FF6B80]',
    iconHoverColor: 'group-hover:text-[#FF5B72]',
    textGradient: 'from-[#FF6B80] to-[#FF4D68]'
  },

  // Success - Emerald gradient
  success: {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1), rgba(4, 120, 87, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-emerald-400/20 via-emerald-500/20 to-emerald-600/20',
    boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-emerald-500',
    iconHoverColor: 'group-hover:text-emerald-600',
    textGradient: 'from-emerald-600 to-emerald-700'
  },

  // Warning - Amber gradient
  warning: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1), rgba(180, 83, 9, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-amber-400/20 via-amber-500/20 to-amber-600/20',
    boxShadow: '0 8px 32px 0 rgba(245, 158, 11, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-amber-500',
    iconHoverColor: 'group-hover:text-amber-600',
    textGradient: 'from-amber-600 to-amber-700'
  },

  // Danger - Rose gradient
  danger: {
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(225, 29, 72, 0.1), rgba(190, 18, 60, 0.1))',
    hoverOverlay: 'bg-gradient-to-br from-rose-400/20 via-rose-500/20 to-rose-600/20',
    boxShadow: '0 8px 32px 0 rgba(244, 63, 94, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
    iconColor: 'text-rose-500',
    iconHoverColor: 'group-hover:text-rose-600',
    textGradient: 'from-rose-600 to-rose-700'
  }
}

const sizeClasses = {
  sm: {
    padding: 'px-4 py-2.5',
    minWidth: 'min-w-[100px]',
    icon: 'h-4 w-4',
    mainText: 'text-xs',
    subText: 'text-[9px]'
  },
  md: {
    padding: 'px-5 py-3.5',
    minWidth: 'min-w-[130px]',
    icon: 'h-5 w-5',
    mainText: 'text-xs',
    subText: 'text-[10px]'
  },
  lg: {
    padding: 'px-6 py-4',
    minWidth: 'min-w-[160px]',
    icon: 'h-6 w-6',
    mainText: 'text-sm',
    subText: 'text-[11px]'
  }
}

export interface GlassMorphismButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  label: string
  sublabel?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
  style?: React.CSSProperties
}

export const GlassMorphismButton = React.memo<GlassMorphismButtonProps>(({
  variant = 'brand',
  size = 'md',
  icon: Icon,
  label,
  sublabel,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  style
}) => {
  const colorScheme = colorSchemes[variant]
  const sizeClass = sizeClasses[size]

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        group relative ${sizeClass.padding} ${sizeClass.minWidth}
        overflow-hidden rounded-2xl transition-all duration-300
        hover:scale-[1.05] disabled:opacity-50 disabled:cursor-not-allowed
        flex flex-col items-center justify-center
        ${className}
      `}
      style={{
        background: colorScheme.background,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: colorScheme.boxShadow,
        ...style
      }}
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colorScheme.hoverOverlay}`} />

      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {Icon && (
          <Icon className={`${sizeClass.icon} ${colorScheme.iconColor} mb-1 ${colorScheme.iconHoverColor} transition-colors ${loading ? 'animate-spin' : ''}`} />
        )}
        <span className={`${sizeClass.mainText} font-semibold bg-gradient-to-r ${colorScheme.textGradient} bg-clip-text text-transparent`}>
          {label}
        </span>
        {sublabel && (
          <span className={`${sizeClass.subText} text-gray-600 mt-0.5`}>
            {sublabel}
          </span>
        )}
      </div>
    </button>
  )
})

GlassMorphismButton.displayName = 'GlassMorphismButton'

// Export preset button components for common use cases
export const AIButton = React.memo<Omit<GlassMorphismButtonProps, 'variant'>>(
  (props) => <GlassMorphismButton variant="ai" {...props} />
)
AIButton.displayName = 'AIButton'

export const StartButton = React.memo<Omit<GlassMorphismButtonProps, 'variant'>>(
  (props) => <GlassMorphismButton variant="start" {...props} />
)
StartButton.displayName = 'StartButton'

export const StopButton = React.memo<Omit<GlassMorphismButtonProps, 'variant'>>(
  (props) => <GlassMorphismButton variant="stop" {...props} />
)
StopButton.displayName = 'StopButton'

export const ProcessButton = React.memo<Omit<GlassMorphismButtonProps, 'variant'>>(
  (props) => <GlassMorphismButton variant="process" {...props} />
)
ProcessButton.displayName = 'ProcessButton'

export const BrandButton = React.memo<Omit<GlassMorphismButtonProps, 'variant'>>(
  (props) => <GlassMorphismButton variant="brand" {...props} />
)
BrandButton.displayName = 'BrandButton'