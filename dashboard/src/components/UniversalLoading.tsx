'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'

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

interface SkeletonProps extends BaseLoadingProps {
  variant: 'skeleton'
  type?: 'card' | 'table' | 'metrics' | 'user-list' | 'text' | 'custom'
  rows?: number
  columns?: number
  showAvatar?: boolean
  showImage?: boolean
  width?: string
  height?: string
}

interface SpinnerProps extends BaseLoadingProps {
  variant: 'spinner' | 'apple' | 'minimal'
  overlay?: boolean
  children?: React.ReactNode
}

interface ProgressProps extends BaseLoadingProps {
  variant: 'progress'
  progress: number
  showPercentage?: boolean
}

type UniversalLoadingProps = SkeletonProps | SpinnerProps | ProgressProps

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
  pink: 'text-pink-500 border-pink-500',
  gray: 'text-gray-400 border-gray-400',
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
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
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
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%'
        }}
      >
        {children}
      </div>
    </>
  )
})

const renderSpinner = ({ size = 'md', color = 'pink', className = '' }: SpinnerProps) => (
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

const renderAppleSpinner = ({ size = 'md', color = 'pink', className = '' }: SpinnerProps) => (
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
}: SkeletonProps) => {
  switch (type) {
    case 'metrics':
      return (
        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
          {[...Array(3)].map((_, i) => (
            <ShimmerWrapper key={i} delay={i * 100}>
              <div className="glass-card p-6 rounded-2xl">
                <div className="w-16 h-4 bg-gray-200 rounded mb-3"></div>
                <div className="w-24 h-8 bg-gray-200 rounded mb-2"></div>
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
              </div>
            </ShimmerWrapper>
          ))}
        </div>
      )
    
    case 'table':
      return (
        <div className={cn("space-y-4", className)}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100/80 bg-white/50">
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="py-4 px-6">
                      <ShimmerWrapper delay={i * 50}>
                        <div className="w-16 h-3 bg-gray-200 rounded"></div>
                      </ShimmerWrapper>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(rows)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-50">
                    {[...Array(6)].map((_, colIndex) => (
                      <td key={colIndex} className="py-4 px-6">
                        <ShimmerWrapper delay={rowIndex * 100 + colIndex * 25}>
                          <div className="w-full h-4 bg-gray-200 rounded"></div>
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
              <div className="flex items-center p-4 bg-white rounded-lg border border-gray-100">
                {showAvatar && (
                  <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                  <div className="w-48 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
            </ShimmerWrapper>
          ))}
        </div>
      )
    
    case 'card':
      return (
        <div className={cn(
          "grid gap-3",
          columns === 1 ? "grid-cols-1" :
          columns === 2 ? "grid-cols-2" :
          columns === 3 ? "grid-cols-3" :
          `grid-cols-${columns}`,
          className
        )}>
          {[...Array(rows * columns)].map((_, i) => (
            <ShimmerWrapper key={i} delay={i * 50}>
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                {showImage && (
                  <div className="w-full h-48 bg-gray-200"></div>
                )}
                <div className="p-4 space-y-3">
                  <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                  <div className="w-full h-3 bg-gray-200 rounded"></div>
                  <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
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
              <div className="w-full h-4 bg-gray-200 rounded"></div>
            </ShimmerWrapper>
          ))}
        </div>
      )
    
    default:
      return (
        <ShimmerWrapper className={className}>
          <div className="w-full h-32 bg-gray-200 rounded"></div>
        </ShimmerWrapper>
      )
  }
}

const renderProgress = ({ 
  progress, 
  message = "Loading...", 
  showPercentage = true,
  className = ''
}: ProgressProps) => (
  <div className={cn("flex flex-col items-center justify-center py-12 space-y-4", className)}>
    <div className="relative">
      <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-pulse"></div>
      <div className="absolute inset-0 w-16 h-16 border-4 border-pink-500 rounded-full animate-spin border-t-transparent"></div>
    </div>
    
    <div className="text-center space-y-2">
      <p className="text-gray-600 font-medium">{message}</p>
      {showPercentage && progress > 0 && (
        <>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
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
      return renderSkeleton(props as SkeletonProps)
    case 'progress':
      return renderProgress(props as ProgressProps)
    case 'apple':
      return renderAppleSpinner(props as SpinnerProps)
    case 'minimal':
      return (
        <div className={cn("flex items-center justify-center p-4", className)}>
          {renderSpinner(props as SpinnerProps)}
          {props.message && (
            <span className="ml-2 text-sm text-gray-500">{props.message}</span>
          )}
        </div>
      )
    case 'spinner':
    default:
      return (
        <div className={cn("flex items-center justify-center py-8", className)}>
          <div className="flex flex-col items-center space-y-3">
            {renderSpinner(props as SpinnerProps)}
            {props.message && (
              <p className="text-gray-600 font-medium">{props.message}</p>
            )}
          </div>
        </div>
      )
  }
})

// ============================================================================
// CONVENIENCE COMPONENTS FOR BACKWARD COMPATIBILITY
// ============================================================================

export const AppleSpinner = (props: Omit<SpinnerProps, 'variant'>) => (
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
