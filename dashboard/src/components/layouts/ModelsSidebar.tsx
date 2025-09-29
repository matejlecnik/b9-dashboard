'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { supabase as supabaseClient } from '@/lib/supabase'
import { UserCircle2, ChevronLeft, User, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type ModelsSidebarProps = Record<string, never>

export const ModelsSidebar = React.memo<ModelsSidebarProps>(() => {
  const router = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)
  // Lazy initialize Supabase client to prevent hydration issues
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    // Initialize Supabase client only on the client side
    setSupabase(supabaseClient)
  }, [])


  const handleLogout = async () => {
    if (!supabase) {
      router.push('/login')
      return
    }

    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      router.push('/login')
    }
  }

  return (
    <aside
      ref={sidebarRef}
      className="glass-sidebar sticky top-3 my-3 ml-3 flex flex-col rounded-2xl z-30 w-64 lg:w-72"
      style={{
        height: 'calc(100vh - 1.5rem)',
        background: 'linear-gradient(180deg, rgba(248,250,252,0.85) 0%, rgba(240,242,247,0.75) 100%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.02)',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        contain: 'layout style'
      }}
      aria-label="Models navigation"
      role="navigation"
    >

      {/* Header */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link href="/dashboards" className="group">
            <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-inset ring-black/10 flex items-center justify-center transition-all duration-300 ease-out group-hover:bg-white/90 group-hover:scale-105 relative">
              {/* Models Icon */}
              <UserCircle2
                className="h-6 w-6 text-purple-600 transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75"
                aria-hidden="true"
              />
              {/* Back Arrow - appears on hover */}
              <ChevronLeft className="h-6 w-6 text-gray-700 absolute inset-0 m-auto opacity-0 scale-125 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100" />
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
              Models
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area - Empty since there are no navigation items */}
      <div className="flex-1 px-3 py-2">
        {/* This area is intentionally left empty as Models only has one page */}
        <div className="text-xs text-gray-400 px-3 py-2">
          {/* Optional: Add a subtle hint or leave completely empty */}
        </div>
      </div>

      {/* Team Section */}
      <div className="px-3 py-4 border-t border-black/10">
        <div className="flex items-center p-3 rounded-xl bg-gradient-to-r from-white/90 to-white/70 ring-1 ring-inset ring-white/50 backdrop-blur-md shadow-lg">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF8395] to-[#FF6B80] rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/30">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-[#FF6B80] to-[#FF4D68] rounded-full border-2 border-white shadow-md"></div>
          </div>
          <div className="ml-3 flex-1">
            <div className="font-semibold text-sm text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
              B9 Agency Team
            </div>
            <div className="text-xs text-gray-600 mt-0.5 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
              Premium Account • Online
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-2 h-8 w-8 p-0 rounded-lg transition-all duration-300 ease-out hover:bg-white/60 hover:scale-110 active:scale-95 text-gray-700 hover:text-gray-900"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Footer removed */}
    </aside>
  )
})

ModelsSidebar.displayName = 'ModelsSidebar'