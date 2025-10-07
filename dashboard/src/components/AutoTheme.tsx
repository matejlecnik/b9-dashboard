'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePlatformTheme } from '@/providers/ThemeProvider'

/**
 * AutoTheme Component
 *
 * Automatically sets the platform theme based on the current route.
 * This component should be placed inside ThemeProvider.
 *
 * Route mapping:
 * - /instagram/* → instagram theme
 * - /reddit/* → reddit theme
 * - /tracking → tracking theme
 * - all others → default theme
 */
export function AutoTheme() {
  const { setPlatform } = usePlatformTheme()
  const pathname = usePathname()

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

  // This component doesn't render anything
  return null
}
