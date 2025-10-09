'use client'

import { memo } from 'react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { designSystem } from '@/lib/design-system'

export interface StandardModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
  maxHeight?: string
  loading?: boolean
}

const StandardModal = memo(function StandardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  className = '',
  contentClassName = '',
  maxWidth = 'md',
  maxHeight = '80vh',
  loading = false
}: StandardModalProps) {
  if (!isOpen) return null

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-md z-50 transition-opacity duration-300"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            `relative w-full overflow-hidden ${designSystem.borders.radius.xl}`,
            widthClasses[maxWidth],
            className
          )}
          style={{
            maxHeight,
            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(243, 244, 246, 0.92))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.08), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-pink-50/30 to-purple-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {icon && (
                  <div className={`p-1.5 ${designSystem.borders.radius.sm} bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-sm`}>
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[10px] text-gray-500">{subtitle}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1 ${designSystem.borders.radius.sm} hover:bg-pink-100/50 transition-colors`}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className={cn(
              'px-5 py-3 overflow-y-auto',
              contentClassName
            )}
            style={{
              maxHeight: `calc(${maxHeight} - ${footer ? '140px' : '80px'})`
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-3 border-t border-gray-200 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
})

export { StandardModal }