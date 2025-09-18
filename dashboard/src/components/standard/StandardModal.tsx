'use client'

import React, { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ModalVariant = 'default' | 'glass' | 'danger'

export interface StandardModalProps {
  // State
  isOpen: boolean
  onClose: () => void

  // Content
  title?: string
  subtitle?: string
  children: React.ReactNode

  // Footer actions
  primaryAction?: {
    label: string
    onClick: () => void | Promise<void>
    variant?: 'default' | 'destructive'
    loading?: boolean
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'outline' | 'ghost'
  }
  showCloseButton?: boolean

  // Styling
  size?: ModalSize
  variant?: ModalVariant
  icon?: LucideIcon
  iconColor?: string
  className?: string
  contentClassName?: string

  // Behavior
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  preventScroll?: boolean
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]'
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const StandardModal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,

  title,
  subtitle,
  children,

  primaryAction,
  secondaryAction,
  showCloseButton = true,

  size = 'md',
  variant = 'default',
  icon: Icon,
  iconColor,
  className,
  contentClassName,

  closeOnEscape = true,
  closeOnBackdrop = true,
  preventScroll = true
}) => {

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!preventScroll) return

    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen, preventScroll])

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }, [closeOnBackdrop, onClose])

  if (!isOpen) return null

  const variantClasses = {
    default: 'bg-white',
    glass: cn(designSystem.glass.medium, 'bg-white/95'),
    danger: 'bg-white border-2 border-red-200'
  }

  const iconColors = {
    default: 'text-gray-600',
    danger: 'text-red-600',
    primary: 'text-b9-pink'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto w-full',
            sizeClasses[size],
            variantClasses[variant],
            designSystem.radius.lg,
            designSystem.shadows.xl,
            'animate-in zoom-in-95 duration-200',
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={cn(
              'flex items-start justify-between px-6 py-4',
              subtitle && 'pb-2',
              'border-b border-gray-200'
            )}>
              <div className="flex items-start gap-3">
                {Icon && (
                  <div className={cn(
                    'mt-0.5',
                    iconColor || iconColors[variant === 'danger' ? 'danger' : 'default']
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  {title && (
                    <h2
                      id="modal-title"
                      className={cn(
                        designSystem.text.h3,
                        variant === 'danger' && 'text-red-900'
                      )}
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className={cn(designSystem.text.subtitle, 'mt-1')}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={cn(
                    'ml-auto rounded-lg p-1.5',
                    'text-gray-400 hover:text-gray-600',
                    'hover:bg-gray-100 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-b9-pink/50'
                  )}
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={cn(
            'px-6 py-4',
            contentClassName
          )}>
            {children}
          </div>

          {/* Footer */}
          {(primaryAction || secondaryAction) && (
            <div className={cn(
              'flex items-center justify-end gap-3 px-6 py-4',
              'border-t border-gray-200 bg-gray-50/50'
            )}>
              {secondaryAction && (
                <Button
                  variant={secondaryAction.variant || 'outline'}
                  onClick={secondaryAction.onClick}
                  className={designSystem.radius.sm}
                >
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || 'default'}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className={cn(
                    designSystem.radius.sm,
                    primaryAction.variant === 'destructive' && 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {primaryAction.loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    primaryAction.label
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// CONFIRM DIALOG PRESET
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false
}) => {
  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      variant={variant === 'danger' ? 'danger' : 'default'}
      primaryAction={{
        label: confirmLabel,
        onClick: onConfirm,
        variant: variant === 'danger' ? 'destructive' : 'default',
        loading
      }}
      secondaryAction={{
        label: cancelLabel,
        onClick: onClose,
        variant: 'outline'
      }}
    >
      <p className={cn(designSystem.text.body, 'text-gray-600')}>
        {message}
      </p>
    </StandardModal>
  )
}

// ============================================================================
// ALERT DIALOG PRESET
// ============================================================================

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  variant?: 'info' | 'warning' | 'error' | 'success'
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title = 'Alert',
  message,
  variant = 'info'
}) => {
  const variantConfig = {
    info: { icon: undefined, color: 'default' },
    warning: { icon: undefined, color: 'text-yellow-600' },
    error: { icon: undefined, color: 'text-red-600' },
    success: { icon: undefined, color: 'text-green-600' }
  }

  const config = variantConfig[variant]

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      iconColor={config.color}
      primaryAction={{
        label: 'OK',
        onClick: onClose
      }}
    >
      <p className={cn(designSystem.text.body, 'text-gray-600')}>
        {message}
      </p>
    </StandardModal>
  )
}