'use client'
import React, { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, User, LogOut, LucideIcon } from 'lucide-react'
import { supabase as supabaseClient } from '@/lib/supabase/index'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SidebarNavigationItem {
  href: string
  title: string
  icon: LucideIcon
  badge?: {
    type: 'count' | 'status'
    value: string | number | React.ReactElement
    variant?: 'default' | 'success' | 'warning' | 'error' | 'custom'
  }
}

export interface SidebarTemplateProps {
  title: string
  subtitle?: string
  icon?: LucideIcon | React.ReactNode
  backHref?: string
  navigationItems?: SidebarNavigationItem[]
  showTeamSection?: boolean
  showLogout?: boolean
  customFooter?: React.ReactNode
}

// Memoized navigation item component
const MemoizedNavigationItem = React.memo<{
  item: SidebarNavigationItem
  isActive: boolean
}>(({ item, isActive }) => {
  const Icon = item.icon
  const linkRef = useRef<HTMLAnchorElement>(null)

  const accessibilityProps = {
    'aria-current': isActive ? ('page' as const) : undefined,
    'aria-label': item.title,
    'tabIndex': 0
  }

  return (
    <Link
      ref={linkRef}
      href={item.href}
      {...accessibilityProps}
      className="focus:outline-none focus:ring-2 focus:ring-b9-pink/50 focus:ring-offset-2 focus:ring-offset-transparent rounded-xl relative group"
    >
      <div className={`
        relative flex items-center px-3 py-2.5 rounded-xl cursor-pointer transform
        ${isActive
          ? 'bg-b9-pink/15 text-b9-pink shadow-apple transition-colors duration-200'
          : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
        }
        justify-start will-change-auto
      `}>
        <div className="flex items-center flex-1">
          <Icon className={`h-5 w-5 ${isActive ? 'text-b9-pink' : ''} mr-3 transition-transform duration-200 ease-out group-hover:scale-110`} aria-hidden="true" />
          <div className="flex-1">
            <div className="font-medium text-sm flex items-center gap-2">
              <span className="transition-transform duration-200 ease-out group-hover:translate-x-0.5">{item.title}</span>
            </div>
          </div>
        </div>

        {/* Badge rendering */}
        {item.badge && (
          item.badge.variant === 'custom' ? (
            <div className="ml-2 flex items-center justify-center">
              {item.badge.value}
            </div>
          ) : (
            <div className={`
              ml-2 px-2 py-0.5 rounded-full text-xs font-medium
              ${item.badge.variant === 'success' ? 'bg-green-100 text-green-700' :
                item.badge.variant === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                item.badge.variant === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'}
            `}>
              {item.badge.value}
            </div>
          )
        )}
      </div>
    </Link>
  )
})

MemoizedNavigationItem.displayName = 'MemoizedNavigationItem'

export const SidebarTemplate = React.memo<SidebarTemplateProps>(({
  title,
  subtitle,
  icon,
  backHref,
  navigationItems = [],
  showTeamSection = true,
  showLogout = true,
  customFooter
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
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

  const activeStates = useMemo(() =>
    navigationItems.map(item => ({
      ...item,
      isActive: pathname === item.href || pathname.startsWith(item.href + '/')
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
          {backHref ? (
            <Link href={backHref} className="group">
              <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-inset ring-black/10 flex items-center justify-center transition-all duration-300 ease-out group-hover:bg-white/90 group-hover:scale-105 relative">
                {/* Main Icon */}
                {React.isValidElement(icon) ? (
                  <div className="transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75">
                    {icon}
                  </div>
                ) : icon ? (
                  React.createElement(icon as LucideIcon, {
                    className: "h-6 w-6 text-gray-600 transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75"
                  })
                ) : null}
                {/* Back Arrow - appears on hover */}
                <ChevronLeft className="h-6 w-6 text-gray-700 absolute inset-0 m-auto opacity-0 scale-125 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100" />
              </div>
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-inset ring-black/10 flex items-center justify-center">
              {React.isValidElement(icon) ? icon : icon ? (
                React.createElement(icon as LucideIcon, {
                  className: "h-6 w-6 text-gray-600"
                })
              ) : null}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Helvetica_Neue',sans-serif]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      {navigationItems.length > 0 && (
        <nav
          className="flex-1 px-3 py-2"
          aria-label="Primary navigation"
          data-testid="sidebar-nav"
        >
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
      )}

      {/* Spacer if no navigation */}
      {navigationItems.length === 0 && <div className="flex-1" />}

      {/* Custom Footer */}
      {customFooter}

      {/* Team Section */}
      {showTeamSection && (
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
            {showLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2 h-8 w-8 p-0 rounded-lg transition-all duration-300 ease-out hover:bg-white/60 hover:scale-110 active:scale-95 text-gray-700 hover:text-gray-900"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
})

SidebarTemplate.displayName = 'SidebarTemplate'