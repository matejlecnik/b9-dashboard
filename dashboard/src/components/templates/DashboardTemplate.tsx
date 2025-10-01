'use client'

import React, { ReactNode } from 'react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { UnifiedSidebar } from '@/components/shared/layouts/UnifiedSidebar'

interface DashboardTemplateProps {
  // Page metadata
  title: string
  subtitle?: string

  // Layout options
  showSearch?: boolean
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
 *
 * Usage:
 * ```tsx
 * <DashboardTemplate
 *   title="Your Dashboard"
 *   subtitle="Dashboard description"
 * >
 *   <YourContent />
 * </DashboardTemplate>
 * ```
 */
export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  title,
  subtitle,
  showSearch = true,
  fullWidth = false,
  children,
  errorFallback
}) => {
  const defaultErrorFallback = (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600">
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
        showSearch={showSearch}
      >
        <div className={fullWidth ? 'w-full' : 'max-w-7xl mx-auto'}>
          {children}
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  )
}

export default DashboardTemplate