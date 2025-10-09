'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase as supabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { LogOut, User, ChevronLeft } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import { SupabaseClient } from '@supabase/supabase-js'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

// Type for icon props
type IconProps = { className?: string }

export interface SidebarNavigationItem {
  href: string
  title: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
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
  dashboardColor?: string // For applying dashboard-specific color scheme
}

// Memoized navigation item component
const MemoizedNavigationItem = React.memo<{
  item: SidebarNavigationItem
  isActive: boolean
}>(({ item, isActive }) => {
  const Icon = item.icon
  const accessibilityProps = {
    'aria-current': isActive ? ('page' as const) : undefined,
    'aria-label': item.title,
    'tabIndex': 0
  }

  return (
    <Link
      href={item.href}
      {...accessibilityProps}
      className="focus:outline-none rounded-xl relative group"
    >
      <div className={cn(`
        relative flex items-center px-2 py-1.5 rounded-lg cursor-pointer
        justify-start will-change-auto
        ${isActive
          ? 'bg-gray-600/15 text-gray-900 shadow-apple transition-colors duration-200'
          : `${designSystem.typography.color.secondary} transition-all duration-200`
        }
      `)}>
        <div className="flex items-center flex-1">
          <div className={cn(`
            p-1.5 rounded-lg flex-shrink-0 mr-2
            transition-all duration-200 ease-out group-hover:scale-110
            ${isActive ? 'bg-gray-600 text-white' : `${designSystem.background.surface.light} ${designSystem.typography.color.tertiary}`}
          `)}>
            <Icon className={cn(`h-3.5 w-3.5 ${isActive ? 'text-white' : designSystem.typography.color.tertiary}`)} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-xs flex items-center gap-2">
              <span className="transition-transform duration-200 ease-out group-hover:scale-105">{item.title}</span>
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
            <div className={cn(`
              ml-2 px-2 py-0.5 rounded-full text-xs font-medium
              ${item.badge.variant === 'success' ? 'bg-green-100 text-green-700' :
                item.badge.variant === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                item.badge.variant === 'error' ? 'bg-red-100 text-red-700' :
                `${designSystem.background.surface.light} ${designSystem.typography.color.secondary}`}
            `)}>
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
  customFooter,
  dashboardColor
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
      logger.error('Supabase client not available')
      router.push('/login')
      return
    }

    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      logger.error('Logout error:', error)
      router.push('/login')
    }
  }

  const activeStates = useMemo(() =>
    navigationItems.map(item => ({
      ...item,
      isActive: pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
    })),
    [navigationItems, pathname]
  )

  return (
    <aside
      ref={sidebarRef}
      className="glass-sidebar sticky top-3 my-3 ml-3 flex flex-col rounded-xl z-30 w-56 lg:w-60"
      style={{
        height: 'calc(100vh - 1.5rem)',
        background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        // Enhanced multi-layer shadow with inner border for definition
        boxShadow: '0 20px 50px var(--black-alpha-12)',
        border: '1px solid var(--slate-400-alpha-60)',
        contain: 'layout style'
      }}
      aria-label="Main navigation"
      role="navigation"
    >
      {/* Header */}
      <div className="p-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
          {backHref ? (
            <Link href={backHref} className="group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105 relative ${
                dashboardColor || 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600'
              }`}>
                {/* Main Icon */}
                {React.isValidElement(icon) ? (
                  <div className="transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75">
                    {React.cloneElement(icon as React.ReactElement<IconProps>, { className: "h-5 w-5 text-white" })}
                  </div>
                ) : icon ? (
                  React.createElement(icon as LucideIcon, {
                    className: "h-5 w-5 text-white transition-all duration-300 ease-out group-hover:opacity-0 group-hover:scale-75"
                  })
                ) : null}
                {/* Back Arrow - appears on hover */}
                <ChevronLeft className="h-5 w-5 text-white absolute inset-0 m-auto opacity-0 scale-125 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100" />
              </div>
            </Link>
          ) : (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              dashboardColor || 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600'
            }`}>
              {React.isValidElement(icon) ?
                React.cloneElement(icon as React.ReactElement<IconProps>, { className: "h-5 w-5 text-white" })
              : icon ? (
                React.createElement(icon as LucideIcon, {
                  className: "h-5 w-5 text-white"
                })
              ) : null}
            </div>
          )}
          <div>
            <h1 className={cn("text-base font-semibold font-mac-display", designSystem.typography.color.primary)}>
              {title}
            </h1>
            {subtitle && (
              <p className={cn("text-xs mt-0.5", designSystem.typography.color.tertiary)}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      {navigationItems.length > 0 && (
        <nav
          className="flex-1 px-2 py-1"
          aria-label="Primary navigation"
          data-testid="sidebar-nav"
        >
          <div className="space-y-3" aria-label="Navigation items">
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
        <div className="px-2 py-3 border-t border-black/10">
          <div
            className="flex items-center p-2 rounded-lg backdrop-blur-xl backdrop-saturate-150"
            style={{
              background: 'linear-gradient(180deg, var(--gray-100-alpha-90) 0%, var(--gray-200-alpha-85) 100%)',
              border: '1px solid var(--slate-400-alpha-60)',
              boxShadow: '0 10px 30px var(--black-alpha-08), 0 1px 0 0 var(--white-alpha-60) inset, 0 -1px 0 0 var(--black-alpha-02) inset, 0 0 0 1px var(--slate-300-alpha-30) inset'
            }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/30">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gradient-to-br from-primary-hover to-primary-pressed rounded-full border-2 border-white shadow-md"></div>
            </div>
            <div className="ml-2 flex-1">
              <div className={cn("font-semibold text-xs font-mac-display", designSystem.typography.color.primary)}>
                B9 Agency Team
              </div>
              <div className={cn("text-[10px] mt-0.5 font-mac-text", designSystem.typography.color.tertiary)}>
                Premium Account • Online
              </div>
            </div>
            {showLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className={cn("ml-2 h-6 w-6 p-0 rounded-lg transition-all duration-300 ease-out hover:bg-white/60 hover:scale-110 active:scale-95", `hover:${designSystem.typography.color.primary}`, designSystem.typography.color.secondary)}
                title="Sign Out"
              >
                <LogOut className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
})

SidebarTemplate.displayName = 'SidebarTemplate'