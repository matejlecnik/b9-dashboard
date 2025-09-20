'use client'

import { memo } from 'react'
import { ModelsSidebar } from '@/components/ModelsSidebar'

interface ModelsDashboardLayoutProps {
  children: React.ReactNode
}

const ModelsDashboardLayout = memo(function ModelsDashboardLayout({
  children
}: ModelsDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)
          `
        }}
      />

      {/* Sidebar */}
      <div className="relative z-50">
        <ModelsSidebar />
      </div>

      {/* Main Content - No header, just children */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  )
})

export { ModelsDashboardLayout }