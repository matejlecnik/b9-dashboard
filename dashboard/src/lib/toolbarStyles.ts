import { designSystem } from '@/lib/design-system'

export const UNIFIED_TOOLBAR_STYLES = {
  // Main container style - standardized across all toolbars
  container: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
    boxShadow: `
      0 4px 20px rgba(0, 0, 0, 0.06),
      0 2px 8px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.2)
    `,
    border: '1px solid rgba(255, 255, 255, 0.3)'
  },

  // Search input styling
  search: {
    base: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px) saturate(150%)',
      WebkitBackdropFilter: 'blur(10px) saturate(150%)',
      border: '2px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
    },
    focused: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '2px solid #FF8395',
      boxShadow: '0 0 0 3px rgba(255, 131, 149, 0.1), 0 4px 16px rgba(0, 0, 0, 0.08)'
    }
  },

  // Filter button styling
  filterButton: {
    base: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      background: 'rgba(255, 255, 255, 0.8)',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
    },
    hover: {
      background: 'rgba(255, 255, 255, 0.95)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
    },
    active: {
      boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
    }
  },

  // Badge styling
  badge: {
    base: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      backdropFilter: 'blur(8px)'
    },
    inactive: {
      background: 'rgba(0, 0, 0, 0.08)',
      color: 'rgba(0, 0, 0, 0.75)'
    },
    active: {
      background: 'rgba(255, 255, 255, 0.25)',
      color: 'white'
    }
  }
} as const

// B9 Brand color gradients
export const B9_GRADIENTS = {
  primary: 'linear-gradient(135deg, #FF6B80, #FF8395)', // Main B9 pink
  primaryLight: 'linear-gradient(135deg, #FF8395, #FFB3C1)', // Lighter variant
  neutral: 'linear-gradient(135deg, #525252, #737373)', // Dark gray
  neutralDark: 'linear-gradient(135deg, #404040, #525252)', // Darker gray
  success: 'linear-gradient(135deg, #FF99A9, #FFB3C1)' // Success light pink for high quality
} as const

// Standard spacing and sizing
export const TOOLBAR_DIMENSIONS = {
  padding: 'p-4',
  borderRadius: designSystem.borders.radius.md,
  searchMaxWidth: 'lg:max-w-[45%]',
  buttonHeight: 'h-auto',
  buttonPadding: 'px-4 py-3'
} as const