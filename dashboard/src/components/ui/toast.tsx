'use client'

import * as React from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { Button } from './button'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // Auto remove after duration (default 5 seconds)
    setTimeout(() => {
      removeToast(id)
    }, toast.duration || 5000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  // Helper functions for different toast types
  const showSuccess = (title: string, description?: string, duration?: number) => {
    context.addToast({ type: 'success', title, description, duration })
  }

  const showError = (title: string, description?: string, duration?: number) => {
    context.addToast({ type: 'error', title, description, duration })
  }

  const showWarning = (title: string, description?: string, duration?: number) => {
    context.addToast({ type: 'warning', title, description, duration })
  }

  const showInfo = (title: string, description?: string, duration?: number) => {
    context.addToast({ type: 'info', title, description, duration })
  }

  return {
    ...context,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}

function ToastContainer() {
  const context = useContext(ToastContext)
  if (!context) return null

  const { toasts, removeToast } = context

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastCardProps {
  toast: Toast
  onClose: () => void
}

function ToastCard({ toast, onClose }: ToastCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for exit animation
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className={cn("h-5 w-5", `${designSystem.typography.color.secondary}/80`)} />
      case 'error':
        return <XCircle className={cn("h-5 w-5", `${designSystem.typography.color.primary}/80`)} />
      case 'warning':
        return <AlertCircle className={cn("h-5 w-5", `${designSystem.typography.color.secondary}/80`)} />
      case 'info':
      default:
        return <Info className={cn("h-5 w-5", `${designSystem.typography.color.tertiary}/80`)} />
    }
  }

  return (
    <div
      className={`
        ${designSystem.borders.radius.md} border border-white/20 p-4
        shadow-2xl backdrop-blur-xl backdrop-saturate-150
        transform transition-all duration-200 ease-out
        ${isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
        }
      `}
      style={{
        background: 'linear-gradient(135deg, var(--gray-50-alpha-40) 0%, var(--gray-100-alpha-30) 50%, var(--gray-50-alpha-25) 100%)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 20px 25px -5px var(--black-alpha-10), 0 10px 10px -5px var(--black-alpha-04), inset 0 1px 1px 0 var(--white-alpha-10)',
      }}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={cn("text-sm font-semibold", designSystem.typography.color.primary)}>
              {toast.title}
            </h4>
            <div className="flex items-center gap-2">
              {toast.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(`h-6 px-2 text-xs hover:${designSystem.background.hover.neutral}/50 font-medium`, designSystem.typography.color.secondary)}
                  onClick={() => {
                    try { toast.action?.onClick() } finally { handleClose() }
                  }}
                >
                  {toast.action.label}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn(`p-1 h-6 w-6 hover:${designSystem.background.hover.neutral}/50`, designSystem.typography.color.subtle)}
                onClick={handleClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {toast.description && (
            <p className={cn("text-sm mt-1", `${designSystem.typography.color.tertiary}/90`)}>
              {toast.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

