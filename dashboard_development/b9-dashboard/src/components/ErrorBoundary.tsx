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

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, copied: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call the optional error callback
    this.props.onError?.(error, errorInfo)

    // You could also log this to an error reporting service here
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      copied: false 
    })
  }

  handleGoHome = () => {
    window.location.href = '/categorization'
  }

  handleCopyError = async () => {
    if (!this.state.error) return

    const errorDetails = {
      message: this.state.error.message,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-black mb-2">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-base">
                We encountered an unexpected error. This has been logged for our team to investigate.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Bug className="h-4 w-4 mr-2" />
                    Error Details
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleCopyError}
                    className="h-8 px-3"
                  >
                    {this.state.copied ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Details
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Badge variant="outline" className="mb-2">Error Message</Badge>
                    <p className="text-sm text-gray-700 font-mono bg-white p-2 rounded border">
                      {this.state.error?.message || 'Unknown error occurred'}
                    </p>
                  </div>
                  
                  {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                    <div>
                      <Badge variant="outline" className="mb-2">Stack Trace (Development Only)</Badge>
                      <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className="bg-b9-pink hover:bg-b9-pink/90 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center text-sm text-gray-600 border-t pt-4">
                <p>
                  If this problem persists, please contact our support team with the error details above.
                </p>
                <p className="mt-1">
                  <strong>B9 Agency Dashboard</strong> • Error ID: {Date.now()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: {
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      fallback={errorBoundaryConfig?.fallback}
      onError={errorBoundaryConfig?.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Lightweight error boundary for specific components
export function ComponentErrorBoundary({ 
  children, 
  componentName = 'Component'
}: { 
  children: ReactNode
  componentName?: string 
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <h4 className="font-medium">{componentName} Error</h4>
          </div>
          <p className="text-sm text-red-700 mb-3">
            This component encountered an error and couldn&apos;t load properly.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Reload Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
