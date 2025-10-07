'use client'

import { cn } from '@/lib/utils'
import { XCircle, CheckCircle, Loader2, Zap } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { designSystem } from '@/lib/design-system'

interface ProcessingIndicatorProps {
  isProcessing: boolean
  progress: number
  error?: string | null
  message?: string
  className?: string
  showPercentage?: boolean
  onCancel?: () => void
}

export function ProcessingIndicator({
  isProcessing,
  progress,
  error,
  message,
  className,
  showPercentage = true,
  onCancel
}: ProcessingIndicatorProps) {
  if (!isProcessing && !error && progress === 0) {
    return null
  }

  const isComplete = progress === 100 && !isProcessing
  const hasError = !!error

  return (
    <div
      className={cn(
        `fixed bottom-4 right-4 bg-white ${designSystem.borders.radius.sm} shadow-lg border p-4 min-w-[300px] z-50`,
        'transition-all duration-300 ease-in-out',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {hasError ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isProcessing ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
            <Zap className="h-5 w-5 text-yellow-500" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              {hasError
                ? 'Processing Failed'
                : isComplete
                ? 'Processing Complete'
                : 'Processing Data'}
            </p>
            {onCancel && isProcessing && (
              <button
                onClick={onCancel}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {message && (
            <p className="text-xs text-gray-600">{message}</p>
          )}

          {hasError && error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {!hasError && (
            <>
              <Progress value={progress} className="h-1.5" />
              {showPercentage && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {isComplete ? 'Completed' : 'Processing...'}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {Math.round(progress)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline processing indicator for smaller contexts
 */
export function InlineProcessingIndicator({
  isProcessing,
  progress,
  className
}: {
  isProcessing: boolean
  progress: number
  className?: string
}) {
  if (!isProcessing) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      <span className="text-xs text-gray-600">Processing...</span>
      {progress > 0 && (
        <span className="text-xs font-medium text-gray-700">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  )
}

/**
 * Full-screen processing overlay
 */
export function ProcessingOverlay({
  isProcessing,
  progress,
  message = 'Processing large dataset...',
  subMessage
}: {
  isProcessing: boolean
  progress: number
  message?: string
  subMessage?: string
}) {
  if (!isProcessing) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white ${designSystem.borders.radius.md} shadow-xl p-8 max-w-md w-full mx-4`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className={`absolute inset-0 bg-blue-500 ${designSystem.borders.radius.full} blur-xl opacity-30 animate-pulse`} />
            <Zap className="h-12 w-12 text-blue-500 relative z-10" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {message}
            </h3>
            {subMessage && (
              <p className="text-sm text-gray-600">{subMessage}</p>
            )}
          </div>

          <div className="w-full space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {progress === 0 ? 'Starting...' : 'Processing...'}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {progress > 0 && (
            <p className="text-xs text-gray-500 text-center">
              This may take a few moments for large datasets
            </p>
          )}
        </div>
      </div>
    </div>
  )
}