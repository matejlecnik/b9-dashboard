'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'


// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

type LoadingVariant = 'spinner' | 'skeleton' | 'progress' | 'apple' | 'minimal'
type LoadingSize = 'sm' | 'md' | 'lg' | 'xl'
type LoadingColor = 'pink' | 'gray' | 'white' | 'blue' | 'green'

interface BaseLoadingProps {
  variant?: LoadingVariant
  size?: LoadingSize
  color?: LoadingColor
  className?: string
  message?: string
  progress?: number
  delay?: number
}

interface LoadingSkeletonProps extends BaseLoadingProps {
  variant: 'skeleton'
  type?: 'card' | 'table' | 'metrics' | 'user-list' | 'text' | 'custom'
  rows?: number
  columns?: number
  showAvatar?: boolean
  showImage?: boolean
  width?: string
  height?: string
}

interface LoadingSpinnerProps extends BaseLoadingProps {
  variant: 'spinner' | 'apple' | 'minimal'
  overlay?: boolean
  children?: React.ReactNode
}

interface LoadingProgressProps extends BaseLoadingProps {
  variant: 'progress'
  progress: number
  showPercentage?: boolean
}

type UniversalLoadingProps = LoadingSkeletonProps | LoadingSpinnerProps | LoadingProgressProps

// ============================================================================
// STYLE CONFIGURATIONS
// ============================================================================

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

const colorClasses = {
  pink: 'text-primary border-primary',
  gray: `${designSystem.typography.color.disabled} border-gray-400`,
  white: 'text-white border-white',
  blue: 'text-blue-500 border-blue-500',
  green: 'text-green-500 border-green-500',
}

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .shimmer {
    background: linear-gradient(
      90deg,
      var(--white-alpha-0) 0%,
      var(--white-alpha-30) 50%,
      var(--white-alpha-0) 100%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
`

// ============================================================================
// COMPONENT IMPLEMENTATIONS
// ============================================================================

const ShimmerWrapper = memo(function ShimmerWrapper({ 
  children, 
  className = "", 
  delay = 0 
}: { 
  children: React.ReactNode
  className?: string
  delay?: number 
}) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div 
        suppressHydrationWarning
        className={`animate-pulse shimmer ${className}`}
        style={{ 
          animationDelay: `${delay}ms`,
          background: 'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%)',
          backgroundSize: '200% 100%'
        }}
      >
        {children}
      </div>
    </>
  )
})

const renderSpinner = ({ size = 'md', color = 'pink', className = '' }: LoadingSpinnerProps) => (
  <div 
    className={cn(
      'inline-block animate-spin',
      sizeClasses[size],
      colorClasses[color],
      className
    )}
    role="status"
    aria-label="Loading"
  >
    <svg
      className="w-full h-full"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-25"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
        className="opacity-75"
      />
    </svg>
  </div>
)

const renderAppleSpinner = ({ size = 'md', color = 'pink', className = '' }: LoadingSpinnerProps) => (
  <div 
    className={cn(
      'inline-block animate-spin',
      sizeClasses[size],
      colorClasses[color],
      className
    )}
    role="status"
    aria-label="Loading"
  >
    <svg
      className="w-full h-full"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
        className="opacity-25"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="15"
        strokeDashoffset="15"
        className="opacity-75"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="1s"
          repeatCount="indefinite"
          values="0 12 12;360 12 12"
        />
      </circle>
    </svg>
  </div>
)

const renderSkeleton = ({
  type = 'card',
  rows = 3,
  columns = 1,
  showAvatar = false,
  showImage = false,
  className = ''
}: LoadingSkeletonProps) => {
  switch (type) {
    case 'metrics':
      return (
        <div className={cn("grid grid-cols-1 md:grid-cols-3", designSystem.spacing.gap.default, className)}>
          {[...Array(3)].map((_, i) => (
            <ShimmerWrapper key={i} delay={i * 100}>
              <div className={cn("glass-card p-6", designSystem.borders.radius.xl)}>
                <div className={cn("w-16 h-4 mb-3", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                <div className={cn("w-24 h-8 mb-2", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                <div className={cn("w-20 h-3", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
              </div>
            </ShimmerWrapper>
          ))}
        </div>
      )
    
    case 'table':
      return (
        <div className={cn("space-y-4", className)}>
          <div className={cn("glass-card overflow-hidden", designSystem.borders.radius.xl)}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-light bg-white/50">
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="py-4 px-6">
                      <ShimmerWrapper delay={i * 50}>
                        <div className={cn("w-16 h-3", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                      </ShimmerWrapper>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(rows)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-light">
                    {[...Array(6)].map((_, colIndex) => (
                      <td key={colIndex} className="py-4 px-6">
                        <ShimmerWrapper delay={rowIndex * 100 + colIndex * 25}>
                          <div className={cn("w-full h-4", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                        </ShimmerWrapper>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    
    case 'user-list':
      return (
        <div className={cn("space-y-3", className)}>
          {[...Array(rows)].map((_, i) => (
            <ShimmerWrapper key={i} delay={i * 100}>
              <div className={cn("flex items-center p-4 bg-white border border-light", designSystem.borders.radius.lg)}>
                {showAvatar && (
                  <div className={cn("w-10 h-10 {designSystem.borders.radius.full} mr-3", designSystem.background.surface.neutral)}></div>
                )}
                <div className="flex-1 space-y-2">
                  <div className={cn("w-32 h-4", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                  <div className={cn("w-48 h-3", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                </div>
                <div className={cn("w-16 h-6", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
              </div>
            </ShimmerWrapper>
          ))}
        </div>
      )

    case 'card':
      return (
        <div className={cn(
          "grid",
          designSystem.spacing.gap.default,
          columns === 1 ? "grid-cols-1" :
          columns === 2 ? "grid-cols-2" :
          columns === 3 ? "grid-cols-3" :
          `grid-cols-${columns}`,
          className
        )}>
          {[...Array(rows * columns)].map((_, i) => (
            <ShimmerWrapper key={i} delay={i * 50}>
              <div className={cn("bg-white border border-light overflow-hidden", designSystem.borders.radius.lg)}>
                {showImage && (
                  <div className={cn("w-full h-48", designSystem.background.surface.neutral)}></div>
                )}
                <div className="p-4 space-y-3">
                  <div className={cn("w-3/4 h-4", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                  <div className={cn("w-full h-3", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                  <div className={cn("w-1/2 h-3", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
                </div>
              </div>
            </ShimmerWrapper>
          ))}
        </div>
      )
    
    case 'text':
      return (
        <div className={cn("space-y-2", className)}>
          {[...Array(rows)].map((_, i) => (
            <ShimmerWrapper key={i} delay={i * 50}>
              <div className={cn("w-full h-4", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
            </ShimmerWrapper>
          ))}
        </div>
      )

    default:
      return (
        <ShimmerWrapper className={className}>
          <div className={cn("w-full h-32", designSystem.background.surface.neutral, designSystem.borders.radius.sm)}></div>
        </ShimmerWrapper>
      )
  }
}

const renderProgress = ({
  progress,
  message = "Loading...",
  showPercentage = true,
  className = ''
}: LoadingProgressProps) => (
  <div className={cn("flex flex-col items-center justify-center py-12 space-y-4", className)}>
    <div className="relative">
      <div className="w-16 h-16 border-4 border-default {designSystem.borders.radius.full} animate-pulse"></div>
      <div className="absolute inset-0 w-16 h-16 border-4 border-primary {designSystem.borders.radius.full} animate-spin border-t-transparent"></div>
    </div>

    <div className="text-center space-y-2">
      <p className={cn(designSystem.typography.weight.medium, designSystem.typography.color.tertiary)}>{message}</p>
      {showPercentage && progress > 0 && (
        <>
          <div className={cn("w-48 h-2 {designSystem.borders.radius.full} overflow-hidden", designSystem.background.surface.neutral)}>
            <div
              className={cn('h-full bg-gradient-to-r from-primary to-primary-hover', designSystem.animation.transition.default)}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className={cn(designSystem.typography.size.sm, designSystem.typography.color.subtle)}>{Math.round(progress)}%</p>
        </>
      )}
    </div>
  </div>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UniversalLoading = memo(function UniversalLoading(props: UniversalLoadingProps) {
  const { variant = 'spinner', className = '' } = props

  switch (variant) {
    case 'skeleton':
      return renderSkeleton(props as LoadingSkeletonProps)
    case 'progress':
      return renderProgress(props as LoadingProgressProps)
    case 'apple':
      return renderAppleSpinner(props as LoadingSpinnerProps)
    case 'minimal':
      return (
        <div className={cn("flex items-center justify-center p-4", className)}>
          {renderSpinner(props as LoadingSpinnerProps)}
          {props.message && (
            <span className={cn('ml-2', designSystem.typography.size.sm, designSystem.typography.color.subtle)}>{props.message}</span>
          )}
        </div>
      )
    case 'spinner':
    default:
      return (
        <div className={cn("flex items-center justify-center py-8", className)}>
          <div className="flex flex-col items-center space-y-3">
            {renderSpinner(props as LoadingSpinnerProps)}
            {props.message && (
              <p className={cn(designSystem.typography.weight.medium, designSystem.typography.color.tertiary)}>{props.message}</p>
            )}
          </div>
        </div>
      )
  }
})

// ============================================================================
// CONVENIENCE COMPONENTS FOR BACKWARD COMPATIBILITY
// ============================================================================

export const AppleSpinner = (props: Omit<LoadingSpinnerProps, 'variant'>) => (
  <UniversalLoading {...props} variant="apple" />
)

export const AppleSpinnerOverlay = ({ 
  children, 
  isLoading, 
  className = '' 
}: {
  children: React.ReactNode
  isLoading: boolean
  className?: string
}) => (
  <div className={cn("relative", className)}>
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <AppleSpinner size="lg" />
      </div>
    )}
  </div>
)

export const SkeletonCard = ({ variant = 'default' }: { variant?: 'default' | 'compact' | 'wide' }) => (
  <UniversalLoading 
    variant="skeleton" 
    type="card" 
    rows={1} 
    columns={1}
    showImage={variant === 'wide'}
    className={variant === 'compact' ? 'h-32' : variant === 'wide' ? 'h-64' : 'h-48'}
  />
)

export const MetricsCardsSkeleton = () => (
  <UniversalLoading variant="skeleton" type="metrics" />
)

export const TableSkeleton = () => (
  <UniversalLoading variant="skeleton" type="table" rows={8} />
)

export const UserListSkeleton = () => (
  <UniversalLoading variant="skeleton" type="user-list" rows={5} showAvatar={true} />
)

export const UserStatsCardSkeleton = () => (
  <UniversalLoading variant="skeleton" type="metrics" />
)

export const UserSearchSkeleton = () => (
  <UniversalLoading variant="skeleton" type="text" rows={1} className="mb-4" />
)

export const ProgressLoader = ({ 
  message = "Loading...", 
  progress = 0 
}: { 
  message?: string
  progress?: number 
}) => (
  <UniversalLoading 
    variant="progress" 
    message={message} 
    progress={progress}
    showPercentage={true}
  />
)

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const createLoadingSpinner = (message?: string, size: LoadingSize = 'md') => (
  <UniversalLoading variant="spinner" message={message} size={size} />
)

export const createTableSkeleton = (rows: number = 8) => (
  <UniversalLoading variant="skeleton" type="table" rows={rows} />
)

export const createCardSkeleton = (rows: number = 3, columns: number = 1, showImage: boolean = false) => (
  <UniversalLoading variant="skeleton" type="card" rows={rows} columns={columns} showImage={showImage} />
)
