'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home, ChevronLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export type ErrorVariant = 'inline' | 'page' | 'card' | 'banner'
export type ErrorSeverity = 'warning' | 'error' | 'info'

export interface StandardErrorProps {
  // Content
  title?: string
  message: string
  details?: string | Error

  // Actions
  onRetry?: () => void
  onGoBack?: () => void
  onGoHome?: () => void
  customAction?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }

  // Styling
  variant?: ErrorVariant
  severity?: ErrorSeverity
  icon?: LucideIcon
  className?: string
  showIcon?: boolean
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class StandardErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error: Error; reset: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} reset={this.reset} />
      }

      return (
        <StandardError
          variant="page"
          severity="error"
          title="Something went wrong"
          message="An unexpected error occurred while rendering this component."
          details={this.state.error}
          onRetry={this.reset}
        />
      )
    }

    return this.props.children
  }
}

// ============================================================================
// MAIN ERROR COMPONENT
// ============================================================================

export const StandardError: React.FC<StandardErrorProps> = ({
  title,
  message,
  details,

  onRetry,
  onGoBack,
  onGoHome,
  customAction,

  variant = 'inline',
  severity = 'error',
  icon: CustomIcon,
  className,
  showIcon = true
}) => {

  const severityConfig = {
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      buttonVariant: 'destructive' as const
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      buttonVariant: 'outline' as const
    },
    info: {
      icon: AlertCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      buttonVariant: 'outline' as const
    }
  }

  const config = severityConfig[severity]
  const Icon = CustomIcon || config.icon

  // Format error details if it's an Error object
  const errorDetails = details instanceof Error
    ? details.message
    : details

  // Inline variant - small, fits within content
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-start gap-3 p-4',
        config.bg,
        'border',
        config.border,
        designSystem.radius.md,
        className
      )}>
        {showIcon && (
          <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.color)} />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-medium text-sm text-gray-900 mb-1">
              {title}
            </p>
          )}
          <p className="text-sm text-gray-600">{message}</p>
          {errorDetails && (
            <p className="text-xs text-gray-500 mt-2 font-mono">
              {errorDetails}
            </p>
          )}
          {onRetry && (
            <Button
              size="sm"
              variant={config.buttonVariant}
              onClick={onRetry}
              className="mt-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Banner variant - full width, dismissible
  if (variant === 'banner') {
    return (
      <div className={cn(
        'w-full px-4 py-3',
        config.bg,
        'border-b',
        config.border,
        className
      )}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          {showIcon && (
            <Icon className={cn('h-5 w-5 flex-shrink-0', config.color)} />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {title || message}
            </p>
            {title && message && (
              <p className="text-sm text-gray-600 mt-0.5">{message}</p>
            )}
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Card variant - contained within a card
  if (variant === 'card') {
    return (
      <div className={cn(
        designSystem.card.default,
        designSystem.radius.lg,
        'p-6',
        className
      )}>
        <div className="flex flex-col items-center text-center">
          {showIcon && (
            <div className={cn(
              'mb-4 p-3 rounded-full',
              config.bg
            )}>
              <Icon className={cn('h-8 w-8', config.color)} />
            </div>
          )}
          {title && (
            <h3 className={cn(designSystem.text.h3, 'mb-2')}>
              {title}
            </h3>
          )}
          <p className={cn(designSystem.text.body, 'text-gray-600 max-w-md')}>
            {message}
          </p>
          {errorDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg w-full max-w-md">
              <p className="text-xs text-gray-600 font-mono text-left">
                {errorDetails}
              </p>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            {onGoBack && (
              <Button variant="outline" onClick={onGoBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Go Back
              </Button>
            )}
            {onRetry && (
              <Button variant={config.buttonVariant} onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Try Again
              </Button>
            )}
            {onGoHome && (
              <Button variant="outline" onClick={onGoHome}>
                <Home className="h-4 w-4 mr-1" />
                Go Home
              </Button>
            )}
            {customAction && (
              <Button onClick={customAction.onClick}>
                {customAction.icon && (
                  <customAction.icon className="h-4 w-4 mr-1" />
                )}
                {customAction.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Page variant - full page error
  return (
    <div className={cn(
      'min-h-[400px] flex items-center justify-center p-8',
      className
    )}>
      <div className="text-center max-w-md">
        {showIcon && (
          <div className={cn(
            'mx-auto mb-6 p-4 rounded-full inline-block',
            config.bg
          )}>
            <Icon className={cn('h-12 w-12', config.color)} />
          </div>
        )}
        {title && (
          <h1 className={cn(designSystem.text.h1, 'mb-4')}>
            {title}
          </h1>
        )}
        <p className={cn(designSystem.text.body, 'text-gray-600 mb-8')}>
          {message}
        </p>
        {errorDetails && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg text-left">
            <p className="text-xs text-gray-600 font-mono">
              {errorDetails}
            </p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          {onGoBack && (
            <Button variant="outline" size="lg" onClick={onGoBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Go Back
            </Button>
          )}
          {onRetry && (
            <Button variant="default" size="lg" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          )}
          {onGoHome && (
            <Button variant="outline" size="lg" onClick={onGoHome}>
              <Home className="h-4 w-4 mr-1" />
              Go Home
            </Button>
          )}
          {customAction && (
            <Button size="lg" onClick={customAction.onClick}>
              {customAction.icon && (
                <customAction.icon className="h-4 w-4 mr-1" />
              )}
              {customAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch')
  }
  return false
}

export const is404Error = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes('404') ||
           error.message.toLowerCase().includes('not found')
  }
  return false
}