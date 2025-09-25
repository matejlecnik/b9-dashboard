import React, { useEffect, useState } from 'react'
import type { IconType } from 'react-icons'
import { logger } from '@/lib/logger'
/**

 * Dynamic Icon Loader
 * Load icons on-demand to reduce bundle size
 *
 * Instead of importing all react-icons (83MB), load only what's needed
 */


// Cache loaded icons
const iconCache = new Map<string, IconType>()

/**
 * Dynamically load an icon from react-icons
 * @param library - Icon library (fa, ai, bi, bs, etc.)
 * @param iconName - Name of the icon
 * @returns Promise<IconType>
 */
export async function loadIcon(library: string, iconName: string): Promise<IconType | null> {
  const cacheKey = `${library}:${iconName}`

  // Check cache
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!
  }

  try {
    let iconsModule: Record<string, unknown>

    // Map library names to import paths
    switch (library.toLowerCase()) {
      case 'fa':
      case 'fa6':
        iconsModule = await import(`react-icons/fa6`)
        break
      case 'ai':
        iconsModule = await import(`react-icons/ai`)
        break
      case 'bi':
        iconsModule = await import(`react-icons/bi`)
        break
      case 'bs':
        iconsModule = await import(`react-icons/bs`)
        break
      case 'ci':
        iconsModule = await import(`react-icons/ci`)
        break
      case 'di':
        iconsModule = await import(`react-icons/di`)
        break
      case 'fi':
        iconsModule = await import(`react-icons/fi`)
        break
      case 'gi':
        iconsModule = await import(`react-icons/gi`)
        break
      case 'go':
        iconsModule = await import(`react-icons/go`)
        break
      case 'gr':
        iconsModule = await import(`react-icons/gr`)
        break
      case 'hi':
      case 'hi2':
        iconsModule = await import(`react-icons/hi2`)
        break
      case 'im':
        iconsModule = await import(`react-icons/im`)
        break
      case 'io':
      case 'io5':
        iconsModule = await import(`react-icons/io5`)
        break
      case 'lu':
        iconsModule = await import(`react-icons/lu`)
        break
      case 'md':
        iconsModule = await import(`react-icons/md`)
        break
      case 'pi':
        iconsModule = await import(`react-icons/pi`)
        break
      case 'ri':
        iconsModule = await import(`react-icons/ri`)
        break
      case 'rx':
        iconsModule = await import(`react-icons/rx`)
        break
      case 'si':
        iconsModule = await import(`react-icons/si`)
        break
      case 'sl':
        iconsModule = await import(`react-icons/sl`)
        break
      case 'tb':
        iconsModule = await import(`react-icons/tb`)
        break
      case 'tfi':
        iconsModule = await import(`react-icons/tfi`)
        break
      case 'ti':
        iconsModule = await import(`react-icons/ti`)
        break
      case 'vsc':
        iconsModule = await import(`react-icons/vsc`)
        break
      case 'wi':
        iconsModule = await import(`react-icons/wi`)
        break
      default:
        logger.warn(`Unknown icon library: ${library}`)
        return null
    }

    const icon = iconsModule[iconName]
    if (icon && typeof icon === 'function') {
      iconCache.set(cacheKey, icon as IconType)
      return icon as IconType
    } else {
      logger.warn(`Icon ${iconName} not found in ${library}`)
      return null
    }
  } catch (error) {
    logger.error(`Failed to load icon ${library}:${iconName}`, error)
    return null
  }
}

/**
 * Preload commonly used icons
 */
export async function preloadCommonIcons() {
  const commonIcons = [
    { lib: 'fa6', name: 'FaUser' },
    { lib: 'fa6', name: 'FaHome' },
    { lib: 'fa6', name: 'FaSearch' },
    { lib: 'fa6', name: 'FaBars' },
    { lib: 'fa6', name: 'FaTimes' },
    { lib: 'fa6', name: 'FaCheck' },
    { lib: 'fa6', name: 'FaChevronDown' },
    { lib: 'fa6', name: 'FaChevronUp' },
    { lib: 'fa6', name: 'FaChevronLeft' },
    { lib: 'fa6', name: 'FaChevronRight' },
    { lib: 'ai', name: 'AiOutlineLoading' },
    { lib: 'bi', name: 'BiLoader' },
    { lib: 'md', name: 'MdClose' },
    { lib: 'md', name: 'MdMenu' },
    { lib: 'md', name: 'MdSettings' },
  ]

  await Promise.all(
    commonIcons.map(({ lib, name }) => loadIcon(lib, name))
  )
}

/**
 * React hook for dynamically loading icons
 */

export function useDynamicIcon(library: string, iconName: string) {
  const [Icon, setIcon] = useState<IconType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const icon = await loadIcon(library, iconName)
        if (mounted) {
          if (icon) {
            setIcon(() => icon)
          } else {
            setError(`Icon ${iconName} not found in ${library}`)
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load icon')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [library, iconName])

  return { Icon, loading, error }
}

/**
 * Dynamic Icon Component
 */

interface DynamicIconProps {
  library: string
  name: string
  size?: number
  className?: string
  fallback?: React.ReactNode
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  library,
  name,
  size = 24,
  className,
  fallback,
}) => {
  const { Icon, loading, error } = useDynamicIcon(library, name)

  if (loading) {
    return (
      <div
        className={`inline-block animate-pulse bg-gray-200 rounded ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  if (error || !Icon) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div
        className={`inline-flex items-center justify-center text-gray-400 ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    )
  }

  return <Icon size={size} className={className} />
}

/**
 * Lazy load icon libraries
 */
export const IconLibraries = {
  async FontAwesome() {
    return import('react-icons/fa6')
  },
  async AntDesign() {
    return import('react-icons/ai')
  },
  async Bootstrap() {
    return import('react-icons/bs')
  },
  async Feather() {
    return import('react-icons/fi')
  },
  async MaterialDesign() {
    return import('react-icons/md')
  },
  async Heroicons() {
    return import('react-icons/hi2')
  },
  async Lucide() {
    // Note: lucide-react is separate but similar pattern
    return import('lucide-react')
  },
  async Tabler() {
    return import('react-icons/tb')
  },
  async Phosphor() {
    return import('react-icons/pi')
  },
  async Remix() {
    return import('react-icons/ri')
  },
} as const

/**
 * Get all available icons from a library (for icon pickers)
 */
export async function getLibraryIcons(library: keyof typeof IconLibraries) {
  const iconsModule = await IconLibraries[library]()
  return Object.keys(iconsModule).filter(key =>
    // Filter out non-icon exports
    key !== 'default' &&
    key !== '__esModule' &&
    typeof iconsModule[key as keyof typeof iconsModule] === 'function'
  )
}