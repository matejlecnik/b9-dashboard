/**
 * B9 Dashboard Design System
 * Centralized design tokens for consistent UI across all dashboards
 */

export const designSystem = {
  // Standard shadows - consistent depth hierarchy
  shadows: {
    xs: 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
    sm: 'shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
    md: 'shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
    lg: 'shadow-[0_8px_24px_rgba(0,0,0,0.10)]',
    xl: 'shadow-[0_12px_32px_rgba(0,0,0,0.12)]',
    card: 'shadow-[0_2px_8px_rgba(255,131,149,0.08)]', // Pink tinted for cards
    hover: 'hover:shadow-[0_8px_24px_rgba(255,131,149,0.15)]', // Pink hover effect
    focus: 'focus:shadow-[0_0_0_3px_rgba(255,131,149,0.20)]', // Pink focus ring
  },

  // Standard border radius - consistent roundness
  radius: {
    sm: 'rounded-lg',     // 8px - buttons, inputs, small elements
    md: 'rounded-xl',     // 12px - cards, modals, containers
    lg: 'rounded-2xl',    // 16px - main containers, sections
    full: 'rounded-full'  // pills, avatars, badges
  },

  // Standard spacing - consistent padding/margins
  spacing: {
    page: 'px-4 sm:px-6 py-4 sm:py-5',
    card: 'p-4 sm:p-6',
    compact: 'p-3 sm:p-4',
    section: 'mb-6',
    stack: 'space-y-4',
    inline: 'space-x-3'
  },

  // Text styles - consistent typography
  text: {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-bold text-gray-900',
    h3: 'text-xl font-semibold text-gray-800',
    h4: 'text-lg font-semibold text-gray-800',
    subtitle: 'text-sm text-gray-500',
    body: 'text-base text-gray-700',
    small: 'text-sm text-gray-600',
    label: 'text-xs font-semibold text-gray-800 uppercase tracking-wider',
    error: 'text-sm text-red-600',
    success: 'text-sm text-green-600'
  },

  // Glass morphism effects - consistent transparency
  glass: {
    light: 'bg-white/60 backdrop-blur-sm border border-gray-200/50',
    medium: 'bg-white/80 backdrop-blur-sm border border-gray-200/50',
    heavy: 'bg-white/90 backdrop-blur-md border border-gray-200/60',
    pink: 'bg-pink-50/40 backdrop-blur-sm border border-pink-200/30'
  },

  // Button styles - consistent interactive elements
  button: {
    primary: 'bg-b9-pink hover:bg-pink-600 text-white font-medium',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium',
    ghost: 'hover:bg-gray-100 text-gray-700 font-medium',
    danger: 'bg-red-500 hover:bg-red-600 text-white font-medium',
    sizes: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    }
  },

  // Card variants - consistent container styles
  card: {
    default: 'bg-white border border-gray-200 shadow-sm',
    glass: 'bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-md',
    elevated: 'bg-white border border-gray-100 shadow-lg',
    flat: 'bg-gray-50 border-0',
    interactive: 'bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-shadow cursor-pointer'
  },

  // Status colors - consistent semantic colors
  status: {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600'
    },
    pink: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-800',
      icon: 'text-pink-600'
    }
  },

  // Animation classes - consistent transitions
  animation: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
    spring: 'transition-all duration-300 ease-out transform',
    fade: 'transition-opacity duration-300',
    scale: 'transition-transform duration-200 ease-out'
  },

  // Grid layouts - consistent grid systems
  grid: {
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    cols5: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4',
    cols6: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'
  },

  // Z-index hierarchy - consistent layering
  zIndex: {
    base: 'z-0',
    dropdown: 'z-10',
    sticky: 'z-20',
    fixed: 'z-30',
    modalBackdrop: 'z-40',
    modal: 'z-50',
    popover: 'z-50',
    tooltip: 'z-60',
    notification: 'z-70'
  }
} as const

// Helper function to combine design system classes
export function getDesignClasses(...paths: string[]): string {
  return paths.map(path => {
    const parts = path.split('.')
    let value: any = designSystem
    for (const part of parts) {
      value = value?.[part]
    }
    return typeof value === 'string' ? value : ''
  }).filter(Boolean).join(' ')
}

// Common component combinations
export const commonStyles = {
  pageHeader: `${designSystem.text.h1} ${designSystem.spacing.page}`,
  sectionTitle: `${designSystem.text.h3} ${designSystem.spacing.section}`,
  cardContainer: `${designSystem.card.glass} ${designSystem.radius.lg} ${designSystem.spacing.card}`,
  primaryButton: `${designSystem.button.primary} ${designSystem.button.sizes.md} ${designSystem.radius.sm}`,
  inputField: `${designSystem.radius.sm} border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent`,
  badge: `${designSystem.radius.full} px-2 py-1 text-xs font-medium`,
  tableWrapper: `${designSystem.card.default} ${designSystem.radius.lg} overflow-hidden`
}