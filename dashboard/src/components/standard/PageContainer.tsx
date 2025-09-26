'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Sidebar } from '@/components/Sidebar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  showSidebar?: boolean
  showBackButton?: boolean
  backHref?: string
  actions?: React.ReactNode
  className?: string
  contentClassName?: string
  fullWidth?: boolean
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  showSidebar = true,
  showBackButton = false,
  backHref = '/dashboards',
  actions,
  className,
  contentClassName,
  fullWidth = false
}) => {
  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative',
      className
    )}>
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 131, 149, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 131, 149, 0.05) 0%, transparent 50%)
          `
        }}
      />

      {/* Sidebar */}
      {showSidebar && (
        <div className="relative z-50">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {(title || subtitle || showBackButton) && (
          <header className={cn(
            designSystem.glass.medium,
            'border-b shadow-sm'
          )}>
            <div className={cn(
              fullWidth ? 'px-4 sm:px-6' : 'max-w-7xl mx-auto px-4 sm:px-6',
              'py-4 sm:py-5'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  {showBackButton && (
                    <Link href={backHref}>
                      <Button variant="ghost" size="icon" className={designSystem.radius.sm}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h1 className={cn(designSystem.text.h1, 'truncate')}>
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className={cn(designSystem.text.subtitle, 'mt-1 truncate')}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {actions && (
                  <div className="ml-4 flex-shrink-0">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          <div className={cn(
            fullWidth ? 'px-4 sm:px-6' : 'max-w-7xl mx-auto px-4 sm:px-6',
            'py-4 sm:py-5 w-full flex flex-col min-h-0',
            contentClassName
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Simple page wrapper without sidebar (for login, etc.)
interface SimplePageContainerProps {
  children: React.ReactNode
  className?: string
  center?: boolean
}

export const SimplePageContainer: React.FC<SimplePageContainerProps> = ({
  children,
  className,
  center = false
}) => {
  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100',
      center && 'flex items-center justify-center',
      className
    )}>
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 131, 149, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 131, 149, 0.05) 0%, transparent 50%)
          `
        }}
      />
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  )
}

// Section container for organizing content within pages
interface PageSectionProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
  noPadding?: boolean
}

export const PageSection: React.FC<PageSectionProps> = ({
  children,
  title,
  subtitle,
  actions,
  className,
  noPadding = false
}) => {
  return (
    <section className={cn(designSystem.spacing.section, className)}>
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className={designSystem.text.h3}>{title}</h2>}
            {subtitle && <p className={cn(designSystem.text.subtitle, 'mt-1')}>{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={!noPadding ? '' : ''}>
        {children}
      </div>
    </section>
  )
}