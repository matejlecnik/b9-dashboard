'use client'
import React, { useMemo, useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, User, LogOut } from 'lucide-react'
import { navigationConfig, isActiveHref, NavigationItem } from '@/config/navigation'
import { NavigationBadge } from '@/components/shared/NavigationBadge'
import { supabase as supabaseClient } from '@/lib/supabase/index'
import type { SupabaseClient } from '@supabase/supabase-js'

type SidebarProps = Record<string, never>

// Memoized navigation item component with enhanced accessibility
const MemoizedNavigationItem = React.memo<{
  item: NavigationItem
  isActive: boolean
}>(({ item, isActive }) => {
  const Icon = item.icon
  const linkRef = useRef<HTMLAnchorElement>(null)
  const isComingSoon = item.isComingSoon === true

  // Enhanced accessibility attributes
  const accessibilityProps = {
    'aria-current': isActive ? ('page' as const) : undefined,
    'aria-label': isComingSoon ? `${item.title} - Coming Soon` : item.title,
    'aria-disabled': isComingSoon,
    'tabIndex': isComingSoon ? -1 : 0
  }

  const itemContent = (
    <div className={`
      relative flex items-center px-3 py-2.5 rounded-xl cursor-pointer transform
      ${isComingSoon
        ? 'text-gray-400 bg-gray-50/50 cursor-not-allowed opacity-60'
        : isActive
          ? 'bg-b9-pink/15 text-b9-pink shadow-apple transition-colors duration-200'
          : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
      }
      justify-start will-change-auto
    `}>
      <div className="flex items-center flex-1">
        <Icon className={`h-5 w-5 ${isComingSoon ? 'text-gray-400' : isActive ? 'text-b9-pink' : ''} mr-3 transition-transform duration-200 ease-out ${!isComingSoon ? 'group-hover:scale-110' : ''}`} aria-hidden="true" />
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-2">
            <span className={`transition-transform duration-200 ease-out ${!isComingSoon ? 'group-hover:translate-x-0.5' : ''}`}>{item.title}</span>
          </div>
        </div>
      </div>

      {/* Coming Soon Badge */}
      {isComingSoon && (
        <div className="px-2 py-0.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 text-[10px] font-medium rounded-md shadow-sm">
          Coming Soon
        </div>
      )}

      {/* Regular Badge rendering */}
      {!isComingSoon && item.badge && (
        <NavigationBadge config={item.badge} className="ml-2" />
      )}
    </div>
  )

  // If coming soon, render as a div instead of a link
  if (isComingSoon) {
    return (
      <div
        title={`${item.title} - This feature is coming soon!`}
        className="rounded-xl relative group"
        {...accessibilityProps}
      >
        {itemContent}
      </div>
    )
  }

  return (
    <Link
      ref={linkRef}
      href={item.href}
      {...accessibilityProps}
      className="focus:outline-none focus:ring-2 focus:ring-b9-pink/50 focus:ring-offset-2 focus:ring-offset-transparent rounded-xl relative group"
    >
      {itemContent}
    </Link>
  )
})

MemoizedNavigationItem.displayName = 'MemoizedNavigationItem'

export const Sidebar = React.memo<SidebarProps>(() => {
  const pathname = usePathname()
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

  const navigationItems = useMemo(() => navigationConfig.sections[0].items, [])
  
  const activeStates = useMemo(() => 
    navigationItems.map(item => ({
      ...item,
      isActive: isActiveHref(item.href, pathname)
    })),
    [navigationItems, pathname]
  )
  

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
      aria-label="Main navigation"
      role="navigation"
    >

      {/* Header */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link href="/dashboards" className="group">
            <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-inset ring-black/10 flex items-center justify-center transition-all duration-300 ease-out group-hover:bg-white/90 group-hover:scale-105 relative">
              {/* Reddit Icon */}
              <svg 
                role="img" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 text-gray-600 transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75" 
                fill="currentColor" 
                aria-hidden="true"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/>
              </svg>
              {/* Back Arrow - appears on hover */}
              <ChevronLeft className="h-6 w-6 text-gray-700 absolute inset-0 m-auto opacity-0 scale-125 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100" />
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
              Reddit Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-3 py-2"
        aria-label="Primary navigation"
        data-testid="sidebar-nav"
      >
        {/* Navigation items */}
        <div className="space-y-1.5" aria-label="Navigation items">
          {activeStates.map((item) => (
            <MemoizedNavigationItem
              key={item.href}
              item={item}
              isActive={item.isActive}
            />
          ))}
        </div>
      </nav>

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

Sidebar.displayName = 'Sidebar'
