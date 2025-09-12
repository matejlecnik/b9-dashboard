import { useToast } from '@/components/ui/toast'

export interface AppError {
  code: string
  message: string
  details?: unknown
  timestamp: Date
  context?: string
}

export class APIError extends Error {
  public code: string
  public details?: unknown
  public status?: number

  constructor(message: string, code: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export class ValidationError extends Error {
  public field?: string
  public code: string

  constructor(message: string, field?: string, code: string = 'VALIDATION_ERROR') {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.code = code
  }
}

// Error handling utility functions
export const errorUtils = {
  // Create a standardized error object
  createError: (
    message: string, 
    code: string, 
    context?: string, 
    details?: unknown
  ): AppError => ({
    code,
    message,
    details,
    context,
    timestamp: new Date()
  }),

  // Handle API errors with proper typing and user-friendly messages
  handleApiError: (error: unknown, context?: string): AppError => {
    if (error instanceof APIError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        context,
        timestamp: new Date()
      }
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        context,
        timestamp: new Date()
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      context,
      timestamp: new Date()
    }
  },

  // Get user-friendly error messages
  getUserFriendlyMessage: (error: AppError): string => {
    const errorMessages: Record<string, string> = {
      'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
      'SERVER_ERROR': 'A server error occurred. Please try again later.',
      'NOT_FOUND': 'The requested resource was not found.',
      'UNAUTHORIZED': 'You are not authorized to perform this action.',
      'FORBIDDEN': 'Access to this resource is forbidden.',
      'VALIDATION_ERROR': 'The provided data is invalid. Please check your input.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait before trying again.',
      'TIMEOUT': 'The request timed out. Please try again.',
      'DATABASE_ERROR': 'A database error occurred. Please try again later.',
      'SUBREDDIT_FETCH_ERROR': 'Failed to load subreddit data. Please refresh the page.',
      'CATEGORY_UPDATE_ERROR': 'Failed to update category. Please try again.',
      'BULK_UPDATE_ERROR': 'Failed to update multiple items. Some changes may not have been saved.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again or contact support.'
    }

    return errorMessages[error.code] || error.message || 'An unexpected error occurred'
  },

  // Log errors for debugging (could be extended to send to error tracking service)
  logError: (error: AppError): void => {
    console.error('Application Error:', {
      code: error.code,
      message: error.message,
      context: error.context,
      details: error.details,
      timestamp: error.timestamp,
      stack: error instanceof Error ? error.stack : undefined
    })

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error)
  },

  // Retry mechanism for failed operations
  withRetry: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }

    throw lastError!
  }
}

// Custom hook for error handling with toast notifications
export function useErrorHandler() {
  const { addToast } = useToast()

  const handleError = (error: unknown, context?: string, showToast: boolean = true) => {
    const appError = errorUtils.handleApiError(error, context)
    errorUtils.logError(appError)

    if (showToast) {
      const userMessage = errorUtils.getUserFriendlyMessage(appError)
      addToast({
        type: 'error',
        title: 'Error',
        description: userMessage,
        duration: 5000
      })
    }

    return appError
  }

  const handleAsyncOperation = async <T>(
    operation: () => Promise<T>,
    options?: {
      context?: string
      showToast?: boolean
      retries?: number
      onError?: (error: AppError) => void
      onSuccess?: (result: T) => void
    }
  ): Promise<T | null> => {
    try {
      const result = options?.retries 
        ? await errorUtils.withRetry(operation, options.retries)
        : await operation()
      
      options?.onSuccess?.(result)
      return result
    } catch (error) {
      const appError = handleError(error, options?.context, options?.showToast)
      options?.onError?.(appError)
      return null
    }
  }

  return {
    handleError,
    handleAsyncOperation,
    createError: errorUtils.createError,
    getUserFriendlyMessage: errorUtils.getUserFriendlyMessage
  }
}

// Network error handling utilities
export const networkUtils = {
  // Check if error is a network error
  isNetworkError: (error: Error): boolean => {
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('NetworkError')
  },

  // Handle fetch errors specifically
  handleFetchError: async (response: Response): Promise<never> => {
    let errorData: { message?: string; error?: string } = {}
    
    try {
      errorData = await response.json()
    } catch {
      // Response body is not JSON
    }

    const errorCode = response.status === 404 ? 'NOT_FOUND'
      : response.status === 401 ? 'UNAUTHORIZED'
      : response.status === 403 ? 'FORBIDDEN'
      : response.status === 429 ? 'RATE_LIMIT_EXCEEDED'
      : response.status >= 500 ? 'SERVER_ERROR'
      : 'API_ERROR'

    const errorMessage = errorData?.message || 
                        errorData?.error || 
                        `HTTP ${response.status}: ${response.statusText}`

    throw new APIError(errorMessage, errorCode, response.status, errorData)
  },

  // Enhanced fetch wrapper with error handling
  safeFetch: async (url: string, options?: RequestInit): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })

      if (!response.ok) {
        await networkUtils.handleFetchError(response)
      }

      return response
    } catch (error) {
      if (networkUtils.isNetworkError(error as Error)) {
        throw new APIError('Network connection failed', 'NETWORK_ERROR')
      }
      throw error
    }
  }
}
