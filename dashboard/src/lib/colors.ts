/**
 * B9 Dashboard Color System
 * Monochromatic Pink & Grayscale Design System
 *
 * This file provides color constants for consistent usage across components.
 * All colors follow the B9 brand identity using only pink variations and grayscale.
 */

import { designSystem } from '@/lib/design-system'

// B9 Brand Colors
export const BRAND_COLORS = {
  pink: '#FF8395',
  black: '#000000',
  white: '#FFFFFF',
  grey: '#6B7280',
} as const

// Complete Pink Scale
export const PINK_SCALE = {
  50: '#FFF5F7',   // Lightest tint - backgrounds
  100: '#FFE4E9',  // Very light - hover states
  200: '#FFCCD5',  // Light - borders
  300: '#FFB3C1',  // Medium light - badges
  400: '#FF99A9',  // Medium - active states
  500: '#FF8395',  // B9 Pink - primary actions
  600: '#FF6B80',  // Medium dark - hover on primary
  700: '#FF4D68',  // Dark - pressed states
  800: '#E63950',  // Very dark - critical actions
  900: '#CC2038',  // Darkest - high contrast
} as const

// Grayscale System (following Tailwind conventions)
export const GRAY_SCALE = {
  50: '#FAFAFA',   // Nearly white - subtle backgrounds
  100: '#F5F5F5',  // Light backgrounds
  200: '#E5E5E5',  // Borders, dividers
  300: '#D4D4D4',  // Disabled borders
  400: '#A3A3A3',  // Placeholder text
  500: '#737373',  // Secondary text
  600: '#525252',  // Body text
  700: '#404040',  // Headings
  800: '#262626',  // Primary text
  900: '#171717',  // Nearly black
} as const

// Semantic Colors - Pink & Gray Only
export const SEMANTIC_COLORS = {
  success: PINK_SCALE[500],    // Pink for positive actions
  error: GRAY_SCALE[900],      // Near black for errors
  warning: GRAY_SCALE[600],    // Medium gray for warnings
  info: GRAY_SCALE[500],       // Gray for informational
} as const

// Review Status Colors
export const REVIEW_STATUS_COLORS = {
  ok: {
    text: PINK_SCALE[500],     // B9 Pink
    background: PINK_SCALE[50], // Lightest pink
    border: PINK_SCALE[200],   // Light pink border
  },
  'no-seller': {
    text: GRAY_SCALE[700],     // Dark gray
    background: GRAY_SCALE[100], // Light gray background
    border: GRAY_SCALE[300],   // Medium gray border
  },
  'non-related': {
    text: GRAY_SCALE[500],     // Medium gray
    background: GRAY_SCALE[50], // Very light gray
    border: GRAY_SCALE[200],   // Light gray border
  },
  'user-feed': {
    text: PINK_SCALE[300],     // Medium light pink
    background: BRAND_COLORS.white, // White background
    border: PINK_SCALE[100],   // Very light pink border
  },
} as const

// Interactive Element Colors
export const INTERACTIVE_COLORS = {
  primary: {
    default: PINK_SCALE[500],
    hover: PINK_SCALE[600],
    pressed: PINK_SCALE[700],
    disabled: GRAY_SCALE[300],
  },
  secondary: {
    default: BRAND_COLORS.white,
    text: PINK_SCALE[500],
    border: PINK_SCALE[200],
    hover: PINK_SCALE[50],
  },
  tertiary: {
    default: GRAY_SCALE[100],
    text: GRAY_SCALE[700],
    hover: GRAY_SCALE[200],
  },
  focus: {
    ring: PINK_SCALE[300],
    opacity: '50%',
  },
  link: {
    default: PINK_SCALE[600],
    hover: PINK_SCALE[700],
    visited: PINK_SCALE[800],
  },
} as const

// Form Element Colors
export const FORM_COLORS = {
  input: {
    background: BRAND_COLORS.white,
    border: GRAY_SCALE[300],
    focusBorder: PINK_SCALE[400],
    focusBackground: PINK_SCALE[50],
    placeholder: GRAY_SCALE[400],
  },
  checkbox: {
    default: GRAY_SCALE[300],
    checked: PINK_SCALE[500],
    disabled: GRAY_SCALE[200],
  },
} as const

// Chart/Data Visualization Colors
export const CHART_COLORS = {
  primary: PINK_SCALE[500],
  secondary: GRAY_SCALE[600],
  tertiary: PINK_SCALE[300],
  background: GRAY_SCALE[100],
  gridLines: GRAY_SCALE[200],
  // Multi-series chart colors (all pink/gray variations)
  series: [
    PINK_SCALE[500],
    GRAY_SCALE[700],
    PINK_SCALE[300],
    GRAY_SCALE[500],
    PINK_SCALE[700],
    GRAY_SCALE[800],
  ],
} as const

// Status Indicator Colors
export const STATUS_COLORS = {
  online: PINK_SCALE[500],
  warning: GRAY_SCALE[500],
  error: GRAY_SCALE[900],
  offline: GRAY_SCALE[300],
} as const

// Utility Functions
export const getReviewStatusColor = (status: string) => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-') as keyof typeof REVIEW_STATUS_COLORS
  return REVIEW_STATUS_COLORS[normalizedStatus] || REVIEW_STATUS_COLORS['non-related']
}

export const getStatusColor = (status: keyof typeof STATUS_COLORS) => {
  return STATUS_COLORS[status] || STATUS_COLORS.offline
}

// CSS Variable Names (for use in CSS-in-JS)
export const CSS_VARIABLES = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  statusOk: 'var(--status-ok)',
  statusOkBg: 'var(--status-ok-bg)',
  statusNoSeller: 'var(--status-no-seller)',
  statusNoSellerBg: 'var(--status-no-seller-bg)',
  statusNonRelated: 'var(--status-non-related)',
  statusNonRelatedBg: 'var(--status-non-related-bg)',
  statusUserFeed: 'var(--status-user-feed)',
  statusUserFeedBg: 'var(--status-user-feed-bg)',
} as const

// Tailwind Class Names for Common Patterns
export const TAILWIND_CLASSES = {
  // Status badges
  statusOk: 'bg-primary/10 text-primary-pressed border-primary/30',
  statusNoSeller: `${designSystem.background.surface.light} text-gray-700 border-gray-300`,
  statusNonRelated: `${designSystem.background.surface.subtle} text-gray-600 border-gray-200`,
  statusUserFeed: 'bg-white text-primary/50 border-primary/20',

  // Buttons
  primaryButton: 'bg-primary hover:bg-primary-hover text-white',
  secondaryButton: 'bg-white text-primary border-primary/30 hover:bg-primary/10',
  tertiaryButton: `${designSystem.background.surface.light} text-gray-700 hover:${designSystem.background.hover.neutral}`,

  // Interactive states
  focusRing: 'focus:ring-2 focus:ring-primary/40 focus:ring-opacity-50',
  selectedRow: 'bg-primary/10 ring-2 ring-primary/30',
  hoverRow: `hover:${designSystem.background.hover.subtle}`,
} as const

export type ReviewStatus = keyof typeof REVIEW_STATUS_COLORS
export type StatusType = keyof typeof STATUS_COLORS
export type PinkShade = keyof typeof PINK_SCALE
export type GrayShade = keyof typeof GRAY_SCALE

// Category color system
export interface CategoryColor {
  bg: string // Background color class
  text: string // Text color class
  border: string // Border color class
}

// Define the color palette - very light shades of pink and grey
const CATEGORY_COLORS: Record<string, CategoryColor> = {
  // Pink shades - body/physical categories
  'Ass & Booty': {
    bg: 'bg-primary/10',
    text: 'text-primary-pressed',
    border: 'border-primary/30'
  },
  'Boobs & Chest': {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20'
  },
  'Full Body & Nude': {
    bg: 'bg-rose-50/50',
    text: 'text-rose-700',
    border: 'border-rose-200'
  },
  'Feet & Foot Fetish': {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20'
  },
  'Specific Body Parts': {
    bg: 'bg-rose-50/40',
    text: 'text-rose-600',
    border: 'border-rose-100'
  },

  // Soft pink shades - appearance/style categories
  'Lingerie & Underwear': {
    bg: 'bg-primary/20',
    text: 'text-primary-pressed',
    border: 'border-primary/30'
  },
  'Clothed & Dressed': {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/25'
  },
  'Cosplay & Fantasy': {
    bg: 'bg-fuchsia-50/40',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200'
  },
  'Goth & Alternative': {
    bg: 'bg-secondary/10',
    text: 'text-secondary-pressed',
    border: 'border-secondary/30'
  },

  // Grey shades - demographic/lifestyle categories
  'Age Demographics': {
    bg: designSystem.background.surface.subtle,
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
  'Body Types & Features': {
    bg: `${designSystem.background.surface.light}/50`,
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
  'Ethnic & Cultural': {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200'
  },
  'Lifestyle & Themes': {
    bg: `${designSystem.background.surface.subtle}/70`,
    text: 'text-gray-600',
    border: 'border-gray-150'
  },
  'Gym & Fitness': {
    bg: 'bg-slate-50/60',
    text: 'text-slate-600',
    border: 'border-slate-150'
  },

  // Special categories - slightly stronger pink
  'OnlyFans Promotion': {
    bg: 'bg-primary/20',
    text: 'text-primary-pressed',
    border: 'border-primary/40'
  },
  'Selfie & Amateur': {
    bg: 'bg-primary/10',
    text: 'text-primary-pressed',
    border: 'border-primary/30'
  },
  'Interactive & Personalized': {
    bg: 'bg-rose-100/40',
    text: 'text-rose-700',
    border: 'border-rose-200'
  },

  // Default fallback
  default: {
    bg: `${designSystem.background.surface.subtle}/50`,
    text: 'text-gray-600',
    border: 'border-gray-200'
  }
}

/**
 * Get color configuration for a category
 */
export function getCategoryColor(category: string): CategoryColor {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default
}

/**
 * Get inline styles for a category (for use in style prop)
 */
export function getCategoryStyles(category: string): {
  backgroundColor: string
  color: string
  borderColor: string
} {
  const colorMap: Record<string, { backgroundColor: string; color: string; borderColor: string }> = {
    // Pink shades - more visible
    'Ass & Booty': {
      backgroundColor: 'rgba(252, 231, 243, 0.8)',
      color: 'rgb(190, 24, 93)',
      borderColor: 'rgba(251, 207, 232, 0.5)'
    },
    'Boobs & Chest': {
      backgroundColor: 'rgba(252, 231, 243, 0.7)',
      color: 'rgb(219, 39, 119)',
      borderColor: 'rgba(252, 231, 243, 0.5)'
    },
    'Full Body & Nude': {
      backgroundColor: 'rgba(255, 241, 242, 0.8)',
      color: 'rgb(190, 18, 60)',
      borderColor: 'rgba(254, 205, 211, 0.5)'
    },
    'Feet & Foot Fetish': {
      backgroundColor: 'rgba(252, 231, 243, 0.6)',
      color: 'rgb(219, 39, 119)',
      borderColor: 'rgba(252, 231, 243, 0.4)'
    },
    'Specific Body Parts': {
      backgroundColor: 'rgba(255, 241, 242, 0.7)',
      color: 'rgb(225, 29, 72)',
      borderColor: 'rgba(255, 241, 242, 0.5)'
    },
    'Lingerie & Underwear': {
      backgroundColor: 'rgba(252, 231, 243, 0.8)',
      color: 'rgb(190, 24, 93)',
      borderColor: 'rgba(251, 207, 232, 0.5)'
    },
    'Clothed & Dressed': {
      backgroundColor: 'rgba(252, 231, 243, 0.9)',
      color: 'rgb(219, 39, 119)',
      borderColor: 'rgba(252, 231, 243, 0.5)'
    },
    'Cosplay & Fantasy': {
      backgroundColor: 'rgba(253, 244, 255, 0.7)',
      color: 'rgb(162, 28, 175)',
      borderColor: 'rgba(243, 232, 255, 0.5)'
    },
    'Goth & Alternative': {
      backgroundColor: 'rgba(250, 245, 255, 0.7)',
      color: 'rgb(126, 34, 206)',
      borderColor: 'rgba(233, 213, 255, 0.5)'
    },
    // Grey shades - more visible
    'Age Demographics': {
      backgroundColor: 'rgba(249, 250, 251, 1)',
      color: 'rgb(55, 65, 81)',
      borderColor: 'rgba(229, 231, 235, 0.8)'
    },
    'Body Types & Features': {
      backgroundColor: 'rgba(243, 244, 246, 0.9)',
      color: 'rgb(55, 65, 81)',
      borderColor: 'rgba(229, 231, 235, 0.6)'
    },
    'Ethnic & Cultural': {
      backgroundColor: 'rgba(248, 250, 252, 1)',
      color: 'rgb(51, 65, 85)',
      borderColor: 'rgba(226, 232, 240, 0.8)'
    },
    'Lifestyle & Themes': {
      backgroundColor: 'rgba(249, 250, 251, 0.95)',
      color: 'rgb(75, 85, 99)',
      borderColor: 'rgba(229, 231, 235, 0.6)'
    },
    'Gym & Fitness': {
      backgroundColor: 'rgba(248, 250, 252, 0.9)',
      color: 'rgb(71, 85, 105)',
      borderColor: 'rgba(226, 232, 240, 0.6)'
    },
    // Special categories - more visible
    'OnlyFans Promotion': {
      backgroundColor: 'rgba(252, 231, 243, 1)',
      color: 'rgb(159, 18, 57)',
      borderColor: 'rgba(251, 207, 232, 0.8)'
    },
    'Selfie & Amateur': {
      backgroundColor: 'rgba(252, 231, 243, 0.95)',
      color: 'rgb(190, 24, 93)',
      borderColor: 'rgba(251, 207, 232, 0.7)'
    },
    'Interactive & Personalized': {
      backgroundColor: 'rgba(254, 205, 211, 0.7)',
      color: 'rgb(190, 18, 60)',
      borderColor: 'rgba(254, 205, 211, 0.5)'
    }
  }

  return colorMap[category] || {
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    color: 'rgb(75, 85, 99)',
    borderColor: 'rgb(229, 231, 235)'
  }
}

/**
 * Get all available categories with their colors
 */
export function getAllCategoryColors(): Array<{ name: string; color: CategoryColor }> {
  return Object.entries(CATEGORY_COLORS)
    .filter(([key]) => key !== 'default')
    .map(([name, color]) => ({ name, color }))
}