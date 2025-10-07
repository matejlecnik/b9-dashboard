'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

/**
 * Platform Theme Provider
 *
 * Dynamically applies platform-specific themes by setting data-platform attribute
 * on the <html> element. This enables CSS variable overrides defined in globals.css.
 *
 * Supported platforms:
 * - instagram: Pink-to-orange gradient (#E4405F → #F77737)
 * - reddit: Orange-to-red gradient (#FF4500 → #FF6B1A)
 * - tracking: Purple gradient (#8B5CF6 → #A78BFA)
 * - default: B9 Pink (#FF8395)
 */

export type PlatformType = 'instagram' | 'reddit' | 'tracking' | 'default'

interface ThemeContextType {
  platform: PlatformType
  setPlatform: (platform: PlatformType) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultPlatform?: PlatformType
}

export function ThemeProvider({ children, defaultPlatform = 'default' }: ThemeProviderProps) {
  const [platform, setPlatform] = useState<PlatformType>(defaultPlatform)

  // Apply platform theme to HTML element
  useEffect(() => {
    // Update data-platform attribute on <html> element
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-platform', platform)
    }

    // Cleanup on unmount
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute('data-platform')
      }
    }
  }, [platform])

  const value = {
    platform,
    setPlatform,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Hook to access platform theme context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { platform, setPlatform } = usePlatformTheme()
 *
 *   // Change theme based on route
 *   useEffect(() => {
 *     if (pathname.includes('/instagram')) {
 *       setPlatform('instagram')
 *     }
 *   }, [pathname, setPlatform])
 *
 *   return <div>Current platform: {platform}</div>
 * }
 * ```
 */
export function usePlatformTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('usePlatformTheme must be used within a ThemeProvider')
  }
  return context
}

/**
 * Hook to automatically set platform theme based on pathname
 *
 * @example
 * ```tsx
 * function RootLayout({ children }: { children: ReactNode }) {
 *   useAutoTheme() // Automatically sets theme based on route
 *   return <>{children}</>
 * }
 * ```
 */
export function useAutoTheme() {
  const { setPlatform } = usePlatformTheme()
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (pathname.includes('/instagram')) {
      setPlatform('instagram')
    } else if (pathname.includes('/reddit')) {
      setPlatform('reddit')
    } else if (pathname.includes('/tracking')) {
      setPlatform('tracking')
    } else {
      setPlatform('default')
    }
  }, [pathname, setPlatform])
}

/**
 * Get platform color for dynamic styling
 *
 * @param platformOverride - Optional platform override
 * @returns Platform color as CSS variable reference
 *
 * @example
 * ```tsx
 * const color = getPlatformColor() // Uses current platform from context
 * const instagramColor = getPlatformColor('instagram') // Force Instagram color
 * ```
 */
export function getPlatformColor(platformOverride?: PlatformType): string {
  const colors: Record<PlatformType, string> = {
    instagram: '#E4405F',
    reddit: '#FF4500',
    tracking: '#8B5CF6',
    default: '#FF8395',
  }
  return colors[platformOverride || 'default']
}

/**
 * Get platform gradient for dynamic styling
 *
 * @param platformOverride - Optional platform override
 * @returns CSS gradient string
 */
export function getPlatformGradient(platformOverride?: PlatformType): string {
  const gradients: Record<PlatformType, string> = {
    instagram: 'linear-gradient(135deg, #E4405F 0%, #F77737 100%)',
    reddit: 'linear-gradient(135deg, #FF4500 0%, #FF6B1A 100%)',
    tracking: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    default: 'linear-gradient(135deg, #FF8395 0%, #FFB3C1 100%)',
  }
  return gradients[platformOverride || 'default']
}
