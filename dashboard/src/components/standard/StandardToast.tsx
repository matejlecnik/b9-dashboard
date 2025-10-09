'use client'

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode
  position?: ToastPosition
  maxToasts?: number
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }

    setToasts(prev => {
      const updated = [...prev, newToast]
      // Keep only the latest maxToasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts)
      }
      return updated
    })

    return id
  }, [maxToasts])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} position={position} />
    </ToastContext.Provider>
  )
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
  position: ToastPosition
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  removeToast,
  position
}) => {
  const positionClasses: Record<ToastPosition, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  }

  const stackDirection = position.includes('top') ? 'flex-col' : 'flex-col-reverse'

  return (
    <div
      className={cn(
        'fixed z-50 flex gap-2',
        stackDirection,
        positionClasses[position]
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

// ============================================================================
// TOAST ITEM
// ============================================================================

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 200) // Match animation duration
  }, [toast.id, onRemove])

  useEffect(() => {
    const duration = toast.duration ?? 5000

    if (duration > 0) {
      const timer = setTimeout(() => {
        handleRemove()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, handleRemove])

  const typeConfig: Record<ToastType, { icon: LucideIcon; color: string; bg: string }> = {
    success: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200'
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border-yellow-200'
    },
    info: {
      icon: Info,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    }
  }

  const config = typeConfig[toast.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 min-w-[320px] max-w-md p-4',
        'bg-white border',
        config.bg,
        designSystem.radius.md,
        designSystem.shadows.md,
        'transition-all duration-200',
        isExiting ? 'animate-out fade-out slide-out-to-right' : 'animate-in fade-in slide-in-from-right'
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.color)} />

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', designSystem.typography.color.primary)}>
          {toast.title}
        </p>
        {toast.message && (
          <p className={cn('mt-1 text-sm', designSystem.typography.color.tertiary)}>
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className={cn(
              'mt-2 text-sm font-medium',
              config.color.replace('text-', 'text-'),
              'hover:underline focus:outline-none'
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleRemove}
        className={cn(
          'flex-shrink-0 ml-2',
          designSystem.typography.color.disabled,
          `hover:${designSystem.typography.color.tertiary}`,
          'focus:outline-none focus:ring-2 focus:ring-b9-pink/50',
          `${designSystem.borders.radius.sm} p-1`
        )}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================================================
// STANDALONE TOAST FUNCTION (for use without context)
// ============================================================================

let toastContainer: HTMLDivElement | null = null
let toastQueue: Toast[] = []

export const showToast = (toast: Omit<Toast, 'id'>) => {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'standalone-toast-container'
    document.body.appendChild(toastContainer)
  }

  const id = Math.random().toString(36).substring(7)
  const newToast = { ...toast, id }

  toastQueue.push(newToast)
  renderStandaloneToasts()

  // Auto remove after duration
  const duration = toast.duration ?? 5000
  if (duration > 0) {
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id)
      renderStandaloneToasts()
    }, duration)
  }

  return id
}

const renderStandaloneToasts = () => {
  // This is a simplified version - in production you'd use React.createRoot
  // For now, we'll just log that this needs a proper implementation
}

// ============================================================================
// TOAST HELPERS
// ============================================================================

export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    showToast({ type: 'success', title, message, duration }),

  error: (title: string, message?: string, duration?: number) =>
    showToast({ type: 'error', title, message, duration }),

  warning: (title: string, message?: string, duration?: number) =>
    showToast({ type: 'warning', title, message, duration }),

  info: (title: string, message?: string, duration?: number) =>
    showToast({ type: 'info', title, message, duration }),
}