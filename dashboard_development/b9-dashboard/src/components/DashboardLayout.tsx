'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  showSearch?: boolean
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
}

export function DashboardLayout({ 
  children, 
  title, 
  subtitle,
  showSearch = true,
  onSearchChange,
  searchPlaceholder
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Handle responsive sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      } else if (window.innerWidth >= 1280) {
        setSidebarCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex relative">
      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'lg:relative lg:block' : 'fixed lg:relative'} z-50`}>
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header 
          title={title}
          subtitle={subtitle}
          showSearch={showSearch}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </div>
          {/* Bottom-right small B9 logo */}
          <div className="fixed bottom-4 right-4 z-40 select-none pointer-events-auto">
            <a href="/dashboards" title="Back to Dashboards" aria-label="Back to Dashboards" className="block p-2 bg-white/80 backdrop-blur-md rounded-xl ring-1 ring-inset ring-black/10 hover:bg-white/90 transition-colors">
              <Image src="/logo/logo.png" alt="B9 Agency" width={24} height={24} className="w-6 h-6 opacity-90 hover:opacity-100 transition-opacity object-contain" />
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}
