'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, ReactNode, ErrorInfo } from 'react'
import { memoryTracker } from '@/lib/memory-management'
import { logger } from '@/lib/logger'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorCount: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error caught by boundary:', error, errorInfo)

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Clean up memory resources to prevent leaks
    this.cleanupMemoryResources()

    // Auto-reset after 5 seconds for first 2 errors
    if (this.state.errorCount < 2) {
      this.resetTimeoutId = setTimeout(() => this.reset(), 5000)
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
    this.cleanupMemoryResources()
  }

  private cleanupMemoryResources = () => {
    if (process.env.NODE_ENV === 'development' && this.props.isolate) {
      logger.log('[ErrorBoundary] Cleaning up memory resources')
      const status = memoryTracker.getStatus()
      if (status.total > 0) {
        logger.log('[ErrorBoundary] Active resources:', status)
        memoryTracker.clearAll()
      }
    }
  }

  private reset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      const showDetails = this.props.showDetails ?? process.env.NODE_ENV === 'development'

      return (
        <div className="p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An error occurred{this.state.errorCount > 1 && ` (${this.state.errorCount} times)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <p className="text-sm font-mono">{this.state.error.message}</p>
              </div>

              {showDetails && this.state.errorInfo && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className={`mt-2 p-2 ${designSystem.background.surface.light} dark:${designSystem.background.surface.darkest} rounded overflow-auto`}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <Button onClick={this.reset} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              {this.state.errorCount < 2 && (
                <p className={cn("text-xs", designSystem.typography.color.subtle)}>Auto-retry in 5 seconds...</p>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Keep the old name for compatibility
export class ComponentErrorBoundary extends ErrorBoundary {}

export default ErrorBoundary

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}