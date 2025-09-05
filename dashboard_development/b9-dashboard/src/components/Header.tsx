'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  User, 
  LogOut,
  ChevronDown
} from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  showSearch?: boolean
  lastUpdated?: Date
  onRefresh?: () => void
  isRefreshing?: boolean
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
}

export function Header({ 
  title, 
  subtitle, 
  showSearch = true, 
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  onSearchChange,
  searchPlaceholder = "Search subreddits, users..."
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Debounced search
  React.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearchChange?.(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, onSearchChange])

  return (
    <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Title and Breadcrumb */}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-black">{title}</h1>
              {/* Live indicator removed for simplicity */}
            </div>
            {subtitle && (
              <p className="text-gray-600 text-sm mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* Right: Search, Notifications, User */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {/* Global Search */}
            {showSearch && (
              <div className="relative flex-1 sm:flex-none max-w-xs sm:max-w-none">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-b9-pink focus:border-b9-pink bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
            )}

            {/* Refresh buttons removed for simplicity */}

            {/* Last Updated */}
            {/* Last updated indicator removed */}

            {/* Notifications removed */}

            {/* User Profile Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="h-10 px-3 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-b9-pink rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden md:block">
                    B9 Team
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </Button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-b9-pink rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-black">B9 Agency Team</div>
                        <div className="text-sm text-gray-500">team@b9-agency.com</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2" />

                  <div className="border-t border-gray-100 py-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
