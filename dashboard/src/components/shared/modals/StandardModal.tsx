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
            background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid var(--slate-400-alpha-60)',
            boxShadow: '0 20px 50px var(--black-alpha-12), 0 1px 0 var(--white-alpha-60) inset, 0 -1px 0 var(--black-alpha-02) inset'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {icon && (
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid var(--pink-600)',
                      boxShadow: '0 8px 32px var(--pink-alpha-40)'
                    }}
                  >
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className={cn(
                    "text-sm font-semibold font-mac-display break-words",
                    designSystem.typography.color.primary
                  )}>
                    {title}
                  </h2>
                  {subtitle && (
                    <p className={cn("text-[10px] font-mac-text break-words", designSystem.typography.color.subtle)}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  `p-1 ${designSystem.borders.radius.sm}`,
                  "hover:bg-gray-200/50 transition-colors"
                )}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className={cn(
              'px-5 py-4 overflow-y-auto',
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
            <div className="px-5 py-3 border-t border-default">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
})

export { StandardModal }