'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
        return <CheckCircle className="h-5 w-5 text-gray-700/80" />
      case 'error':
        return <XCircle className="h-5 w-5 text-gray-800/80" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-gray-700/80" />
      case 'info':
      default:
        return <Info className="h-5 w-5 text-gray-600/80" />
    }
  }

  return (
    <div
      className={`
        rounded-xl border border-white/20 p-4
        shadow-2xl backdrop-blur-xl backdrop-saturate-150
        transform transition-all duration-200 ease-out
        ${isVisible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
        }
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.4) 0%, rgba(243, 244, 246, 0.3) 50%, rgba(249, 250, 251, 0.25) 100%)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">
              {toast.title}
            </h4>
            <div className="flex items-center gap-2">
              {toast.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-gray-200/50 text-gray-700 font-medium"
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
                className="p-1 h-6 w-6 hover:bg-gray-200/50 text-gray-500"
                onClick={handleClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {toast.description && (
            <p className="text-sm text-gray-600/90 mt-1">
              {toast.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
