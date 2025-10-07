'use client'

import React, { ReactNode } from 'react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
// import { UnifiedSidebar } from '@/components/shared/layouts/UnifiedSidebar'

interface DashboardTemplateProps {
  // Page metadata (for SEO/debugging only - not displayed)
  title: string
  subtitle?: string

  // Layout options
  fullWidth?: boolean

  // Content
  children: ReactNode

  // Error handling
  errorFallback?: ReactNode
}

/**
 * DashboardTemplate - Base template for all dashboard pages
 *
 * Features:
 * - Integrated sidebar navigation
 * - Error boundary protection
 * - Consistent layout structure
 * - Gradient backgrounds
 * - NO page headers (navigation via sidebar only)
 *
 * Usage:
 * ```tsx
 * <DashboardTemplate
 *   title="Your Dashboard" // Metadata only
 *   subtitle="Dashboard description" // Metadata only
 * >
 *   <YourContent />
 * </DashboardTemplate>
 * ```
 */
export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  title,
  subtitle,
  fullWidth = false,
  children,
  errorFallback
}) => {
  const defaultErrorFallback = (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className={cn("text-2xl font-bold mb-2", designSystem.typography.color.primary)}>
          Something went wrong
        </h2>
        <p className={cn(designSystem.typography.color.tertiary)}>
          Please refresh the page or try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-b9-pink text-white rounded-lg hover:bg-b9-pink/90 transition"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={errorFallback || defaultErrorFallback}>
      <DashboardLayout
        title={title}
        subtitle={subtitle}
      >
        <div className={fullWidth ? 'w-full' : 'max-w-7xl mx-auto'}>
          {children}
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  )
}

export default DashboardTemplate