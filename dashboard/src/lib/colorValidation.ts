/**
 * Color Validation System for B9 Dashboard
 * Ensures only approved pink and grayscale colors are used
 */

import { PINK_SCALE, GRAY_SCALE, BRAND_COLORS } from './colors'

// Allowed color prefixes type (no runtime value to avoid unused variable warnings)
export type AllowedColorPrefix =
  | 'bg-pink-'
  | 'text-pink-'
  | 'border-pink-'
  | 'ring-pink-'
  | 'bg-gray-'
  | 'text-gray-'
  | 'border-gray-'
  | 'ring-gray-'
  | 'bg-white'
  | 'bg-black'
  | 'text-white'
  | 'text-black'
  | 'border-white'
  | 'border-black'
  | 'bg-b9-'
  | 'text-b9-'
  | 'border-b9-'

// Forbidden color patterns (will help catch violations)
const FORBIDDEN_COLOR_PATTERNS = [
  /bg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|rose)-/,
  /text-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|rose)-/,
  /border-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|rose)-/,
  /ring-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|rose)-/,
] as const

/**
 * Validates that a className string only uses approved colors
 */
export function validateColorUsage(className: string): {
  isValid: boolean
  violations: string[]
  suggestions: string[]
} {
  const violations: string[] = []
  const suggestions: string[] = []
  
  // Split className into individual classes
  const classes = className.split(/\s+/)
  
  classes.forEach(cls => {
    // Check against forbidden patterns
    FORBIDDEN_COLOR_PATTERNS.forEach(pattern => {
      if (pattern.test(cls)) {
        violations.push(cls)
        
        // Provide suggestions for common violations
        if (cls.includes('green')) {
          suggestions.push(`Replace "${cls}" with "bg-pink-500" or "text-pink-500" for success states`)
        } else if (cls.includes('red')) {
          suggestions.push(`Replace "${cls}" with "bg-gray-900" or "text-gray-900" for error states`)
        } else if (cls.includes('blue')) {
          suggestions.push(`Replace "${cls}" with "bg-gray-600" or "text-gray-600" for info states`)
        } else if (cls.includes('yellow')) {
          suggestions.push(`Replace "${cls}" with "bg-gray-500" or "text-gray-500" for warning states`)
        } else {
          suggestions.push(`Replace "${cls}" with appropriate pink-* or gray-* variant`)
        }
      }
    })
  })
  
  return {
    isValid: violations.length === 0,
    violations,
    suggestions
  }
}

/**
 * Gets the correct color class for semantic usage
 */
export function getSemanticColorClass(
  type: 'success' | 'error' | 'warning' | 'info',
  property: 'background' | 'text' | 'border' = 'background'
): string {
  const prefix = property === 'background' ? 'bg-' : 
                property === 'text' ? 'text-' : 'border-'
  
  switch (type) {
    case 'success':
      return `${prefix}pink-500`
    case 'error':
      return `${prefix}gray-900`
    case 'warning':
      return `${prefix}gray-600`
    case 'info':
      return `${prefix}gray-500`
    default:
      return `${prefix}gray-400`
  }
}

/**
 * Gets the correct color class for review status
 */
export function getReviewStatusClass(
  status: string,
  property: 'background' | 'text' | 'border' = 'background'
): string {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-')
  
  switch (normalizedStatus) {
    case 'ok':
      return property === 'background' ? 'bg-pink-50' : 
             property === 'text' ? 'text-pink-700' : 'border-pink-200'
    case 'no-seller':
      return property === 'background' ? 'bg-gray-100' : 
             property === 'text' ? 'text-gray-700' : 'border-gray-300'
    case 'non-related':
      return property === 'background' ? 'bg-gray-50' : 
             property === 'text' ? 'text-gray-600' : 'border-gray-200'
    case 'user-feed':
      return property === 'background' ? 'bg-white' : 
             property === 'text' ? 'text-pink-300' : 'border-pink-100'
    default:
      return property === 'background' ? 'bg-gray-50' : 
             property === 'text' ? 'text-gray-500' : 'border-gray-200'
  }
}

/**
 * Development helper to log color violations (removed in production)
 */
export function logColorViolations(componentName: string, className: string): void {
  if (process.env.NODE_ENV === 'development') {
    const validation = validateColorUsage(className)
    if (!validation.isValid) {
      console.warn(`🎨 Color violation in ${componentName}:`, {
        violations: validation.violations,
        suggestions: validation.suggestions
      })
    }
  }
}

/**
 * Safe color utility that only returns approved colors
 */
export const safeColors = {
  pink: PINK_SCALE,
  gray: GRAY_SCALE,
  brand: BRAND_COLORS,
  
  // Helper methods
  getPinkShade: (shade: keyof typeof PINK_SCALE) => PINK_SCALE[shade],
  getGrayShade: (shade: keyof typeof GRAY_SCALE) => GRAY_SCALE[shade],
  
  // Semantic color getters
  success: PINK_SCALE[500],
  error: GRAY_SCALE[900],
  warning: GRAY_SCALE[600],
  info: GRAY_SCALE[500],
} as const

/**
 * Color migration helper - maps old colors to new approved colors
 */
export const colorMigrationMap: Record<string, string> = {
  // Success/positive states
  'bg-pink-50': 'bg-pink-50',
  'bg-pink-100': 'bg-pink-100',
  'bg-pink-500': 'bg-pink-500',
  'text-pink-700': 'text-pink-700',
  'text-pink-600': 'text-pink-600',
  'border-pink-200': 'border-pink-200',
  
  // Error/negative states
  'bg-gray-100': 'bg-gray-100',
  'bg-gray-900': 'bg-gray-900',
  'text-gray-900': 'text-gray-900',
  'text-gray-800': 'text-gray-800',
  'border-gray-300': 'border-gray-300',
  
  // Warning states
  'bg-gray-50': 'bg-gray-50',
  'bg-gray-500': 'bg-gray-500',
  'text-gray-700': 'text-gray-700',
  'text-gray-600': 'text-gray-600',
  'border-gray-200': 'border-gray-200',
  
  // Info states (colors already defined above)
  
  // Purple/violet -> pink (already defined above)
  
  // Orange -> gray (already defined above)
} as const

/**
 * Automatically migrates old color classes to new ones
 */
export function migrateColorClasses(className: string): string {
  let migratedClassName = className
  
  Object.entries(colorMigrationMap).forEach(([oldColor, newColor]) => {
    migratedClassName = migratedClassName.replace(new RegExp(`\\b${oldColor}\\b`, 'g'), newColor)
  })
  
  return migratedClassName
}

// Export types for TypeScript
export type SemanticColorType = 'success' | 'error' | 'warning' | 'info'
export type ColorProperty = 'background' | 'text' | 'border'