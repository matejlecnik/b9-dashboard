'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug,
  Copy,
  CheckCircle
} from 'lucide-react'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

type ErrorBoundaryVariant = 'full' | 'simple' | 'apple' | 'minimal'

interface Props {
  children: ReactNode
  variant?: ErrorBoundaryVariant
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  componentName?: string
  showDetails?: boolean
  showRetry?: boolean
  showCopy?: boolean
  className?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  copied: boolean
  retryCount: number
}

// ============================================================================
// UNIVERSAL ERROR BOUNDARY COMPONENT
// ============================================================================

export class UniversalErrorBoundary extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout

  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      copied: false, 
      retryCount: 0 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { variant = 'full', componentName, onError } = this.props
    
    // Enhanced logging based on variant
    if (variant === 'full' || variant === 'apple') {
      console.group(`🚨 ${componentName || 'Component'} Error Boundary`)
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.error('Error Stack:', error.stack)
      console.groupEnd()
    } else {
      console.error(`🔥 ${componentName || 'Component'} Error:`, error, errorInfo)
    }
    
    this.setState({
      error,
      errorInfo
    })

    // Call the optional error callback
    onError?.(error, errorInfo)

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { errorInfo } })
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleCopy = async () => {
    const { error, errorInfo } = this.state
    const { componentName } = this.props
    
    const errorDetails = `
Component: ${componentName || 'Unknown'}
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
Retry Count: ${this.state.retryCount}
    `.trim()

    try {
      await navigator.clipboard.writeText(errorDetails)
      this.setState({ copied: true })
      
      // Reset copied state after 2 seconds
      this.retryTimeout = setTimeout(() => {
        this.setState({ copied: false })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  renderMinimalError = () => (
    <div className="flex items-center justify-center p-4 text-red-500 bg-red-50 rounded-lg border border-red-200">
      <AlertTriangle className="h-5 w-5 mr-2" />
      <span className="text-sm">Something went wrong</span>
      {this.props.showRetry !== false && (
        <Button
          variant="ghost"
          size="sm"
          onClick={this.handleRetry}
          className="ml-2 h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  )

  renderSimpleError = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-lg border border-red-200">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-700 mb-2">
        {this.props.componentName || 'Component'} Error
      </h3>
      <p className="text-sm text-red-600 mb-4">
        {this.state.error?.message || 'An unexpected error occurred'}
      </p>
      <div className="flex gap-2">
        <Button
          onClick={this.handleRetry}
          size="sm"
          className="bg-red-500 hover:bg-red-600"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        <Button
          onClick={() => window.location.href = '/'}
          variant="outline"
          size="sm"
        >
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  )

  renderAppleError = () => (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-md mx-auto shadow-lg border-0" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)',
      }}>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Oops! Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            {this.props.componentName && `The ${this.props.componentName} component `}
            encountered an unexpected error.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {this.props.showDetails && this.state.error && (
            <div className="p-3 bg-gray-50 rounded-lg text-left">
              <p className="text-xs font-mono text-gray-700 break-all">
                {this.state.error.message}
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={this.handleRetry}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              
              {this.props.showCopy !== false && (
                <Button
                  onClick={this.handleCopy}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={this.state.copied}
                >
                  {this.state.copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Details
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {this.state.retryCount > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Retry attempt: {this.state.retryCount}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )

  renderFullError = () => (
    <div className="flex items-center justify-center min-h-[400px] p-8 bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Bug className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            Application Error
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            {this.props.componentName 
              ? `The ${this.props.componentName} component has encountered an error.`
              : 'An unexpected error has occurred in the application.'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Details */}
          {this.state.error && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Error Details
                </h4>
                <p className="text-sm text-red-700 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
              
              {this.state.error.stack && this.props.showDetails && (
                <details className="p-4 bg-gray-50 rounded-lg border">
                  <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                    Technical Details (Click to expand)
                  </summary>
                  <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={this.handleRetry}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Component
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Copy Error Details */}
          {this.props.showCopy !== false && (
            <div className="pt-4 border-t">
              <Button
                onClick={this.handleCopy}
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={this.state.copied}
              >
                {this.state.copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Error details copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy error details for support
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Retry Counter */}
          {this.state.retryCount > 0 && (
            <div className="text-center">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Retry attempts: {this.state.retryCount}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render based on variant
      switch (this.props.variant) {
        case 'minimal':
          return this.renderMinimalError()
        case 'simple':
          return this.renderSimpleError()
        case 'apple':
          return this.renderAppleError()
        case 'full':
        default:
          return this.renderFullError()
      }
    }

    return this.props.children
  }
}

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

// Backward compatibility exports
export const ErrorBoundary = (props: Omit<Props, 'variant'>) => (
  <UniversalErrorBoundary {...props} variant="full" />
)

export const SimpleErrorBoundary = (props: Omit<Props, 'variant'>) => (
  <UniversalErrorBoundary {...props} variant="simple" />
)

export const AppleErrorBoundary = (props: Omit<Props, 'variant'>) => (
  <UniversalErrorBoundary {...props} variant="apple" />
)

export const ComponentErrorBoundary = ({ 
  componentName, 
  children, 
  ...props 
}: Props) => (
  <UniversalErrorBoundary 
    {...props}
    variant="simple"
    componentName={componentName}
    showDetails={false}
    showRetry={true}
    showCopy={false}
  >
    {children}
  </UniversalErrorBoundary>
)

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const createMinimalErrorBoundary = (componentName: string) => {
  const MinimalErrorBoundaryWrapper = (props: { children: ReactNode }) => (
    <UniversalErrorBoundary 
      variant="minimal"
      componentName={componentName}
      showRetry={true}
      showCopy={false}
      showDetails={false}
    >
      {props.children}
    </UniversalErrorBoundary>
  )
  MinimalErrorBoundaryWrapper.displayName = `MinimalErrorBoundary(${componentName})`
  return MinimalErrorBoundaryWrapper
}

export const createFullErrorBoundary = (componentName: string) => {
  const FullErrorBoundaryWrapper = (props: { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void }) => (
    <UniversalErrorBoundary 
      variant="full"
      componentName={componentName}
      showRetry={true}
      showCopy={true}
      showDetails={true}
      onError={props.onError}
    >
      {props.children}
    </UniversalErrorBoundary>
  )
  FullErrorBoundaryWrapper.displayName = `FullErrorBoundary(${componentName})`
  return FullErrorBoundaryWrapper
}
