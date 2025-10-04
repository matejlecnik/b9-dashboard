'use client'

import { memo } from 'react'
import { UnifiedSidebar } from '@/components/shared/layouts/UnifiedSidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string // For metadata/SEO only - not displayed
  subtitle?: string // For metadata/SEO only - not displayed
}

const DashboardLayout = memo(function DashboardLayout({
  children
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Apple-style background texture */}
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
      <div className="relative z-50">
        <UnifiedSidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-transparent flex flex-col">
          <div className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
})

export { DashboardLayout }
