'use client'

import { memo } from 'react'
import { Sidebar } from '@/components/Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  showSearch?: boolean
}

const DashboardLayout = memo(function DashboardLayout({ 
  children,
  title,
  subtitle,
  showSearch = true
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
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {(title || subtitle) && (
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h1 className="text-2xl font-bold text-gray-900 truncate">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
                {showSearch && (
                  <div className="ml-4 flex-shrink-0">
                    {/* Search functionality can be added here later */}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        
        {/* Page Content */}
        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
          <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 w-full flex flex-col min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
})

export { DashboardLayout }
