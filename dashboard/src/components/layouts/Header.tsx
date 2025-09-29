'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/index'
import { useRouter } from 'next/navigation'
import { 
  User, 
  LogOut,
  ChevronDown
} from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  showSearch?: boolean
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
}

export function Header({ 
  title, 
  subtitle
}: HeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    if (!supabase) {
      console.error('Supabase client not available')
      router.push('/login')
      return
    }
    
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  return (
    <div className="bg-transparent sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title / Subtitle */}
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-gray-900">
              {title}
            </div>
            {subtitle && (
              <div className="truncate text-sm text-gray-500">
                {subtitle}
              </div>
            )}
          </div>
          {/* User Profile Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="h-10 px-3 transition-all duration-300 ease-out hover:scale-105"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-[#FF8395] to-[#FF6B80] rounded-full flex items-center justify-center shadow-sm">
                  <User className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                  B9 Team
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
              </div>
            </Button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-[rgba(248,250,252,0.95)] backdrop-blur-[20px] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-white/30 py-2 z-50 animate-scale-in">
                <div className="px-4 py-3 border-b border-white/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF8395] to-[#FF6B80] rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/20">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
                        B9 Agency Team
                      </div>
                      <div className="text-sm text-gray-600 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
                        team@b9-agency.com
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="py-2" />

                <div className="border-t border-white/20 py-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-white/50 flex items-center transition-all duration-200 ease-out hover:scale-[1.02] rounded-lg mx-2 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]"
                  >
                    <LogOut className="h-4 w-4 mr-3 text-gray-600" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
