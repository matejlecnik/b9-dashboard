/**
 * B9 Dashboard Design System v2.0
 * Centralized design tokens for consistent UI across all dashboards
 *
 * All tokens now mapped to CSS variables defined in globals.css
 * This enables dynamic theming and platform-specific color overrides
 */

// ============================================================================
// BORDER SYSTEM
// ============================================================================

export const borders = {
  // Border Width
  width: {
    none: 'border-0',
    thin: 'border',           // 1px - default
    thick: 'border-2',        // 2px - emphasis
  },

  // Border Colors (mapped to CSS variables)
  color: {
    default: 'border-default',           // gray-200 - standard borders
    light: 'border-light',               // gray-100 - subtle dividers
    strong: 'border-strong',             // gray-300 - emphasized borders
    primary: 'border-primary',           // primary/30 - primary highlights
    primaryStrong: 'border-primary-strong', // primary - focus/active states
    error: 'border-error',               // gray-900 - error states
  },

  // Border Radius
  radius: {
    none: 'rounded-none',     // 0px - sharp corners
    xs: 'rounded',            // 4px - tight radius
    sm: 'rounded-lg',         // 8px - buttons, inputs, small elements
    md: 'rounded-xl',         // 12px - cards, modals
    lg: 'rounded-2xl',        // 16px - large containers
    xl: 'rounded-3xl',        // 24px - hero sections
    full: 'rounded-full',     // 9999px - pills, avatars, badges
  },

  // Focus Ring (accessibility)
  focus: {
    default: 'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
    strong: 'focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2',
    error: 'focus:outline-none focus:ring-2 focus:ring-gray-900/50 focus:ring-offset-2',
  },

  // Common combinations
  default: 'border border-default',       // Alias for card border
  card: 'border border-default',
  cardEmphasized: 'border border-strong',
  cardPrimary: 'border border-primary',
  input: 'border border-default focus:border-primary-strong',
  divider: 'border-t border-light',
} as const

// ============================================================================
// SHADOW & ELEVATION SYSTEM
// ============================================================================

export const shadows = {
  // Core elevation levels (1-5)
  none: 'shadow-none',
  xs: 'shadow-xs',          // Minimal shadow - 1px blur
  sm: 'shadow-sm',          // Subtle cards - 3px blur
  md: 'shadow-md',          // Standard cards - 6px blur
  lg: 'shadow-lg',          // Floating elements - 15px blur
  xl: 'shadow-xl',          // Modals, overlays - 25px blur
  '2xl': 'shadow-2xl',      // Maximum elevation - 50px blur

  // Special effects
  pink: 'shadow-pink',      // Pink glow - brand emphasis
  pinkLg: 'shadow-primary-lg', // Strong pink glow - active states
  inner: 'shadow-inner',    // Inset shadow - pressed buttons

  // Semantic aliases
  raised: 'shadow-sm',      // Level 1 - subtle elevation
  elevated: 'shadow-md',    // Level 2 - standard cards
  floating: 'shadow-lg',    // Level 3 - dropdowns, tooltips
  overlay: 'shadow-xl',     // Level 4 - modals, popovers
  maximum: 'shadow-2xl',    // Level 5 - hero sections

  // Interactive states
  card: 'shadow-sm',
  cardHover: 'hover:shadow-md transition-shadow duration-200',
  cardActive: 'active:shadow-xs',
  button: 'shadow-xs hover:shadow-pink transition-shadow duration-150',
  buttonPrimary: 'shadow-sm hover:shadow-primary-lg transition-shadow duration-150',
} as const

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  // Mac System Fonts (SF Pro)
  fonts: {
    mac: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
    macText: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    macDisplay: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
  },

  // Type scale (8 sizes)
  size: {
    xs: 'text-xs',          // 12px / 16px line height - captions, fine print
    sm: 'text-sm',          // 14px / 20px - labels, small text
    base: 'text-base',      // 16px / 24px - body text (default)
    lg: 'text-lg',          // 18px / 28px - large body, subtitles
    xl: 'text-xl',          // 20px / 28px - section headings
    '2xl': 'text-2xl',      // 24px / 32px - H3, card titles
    '3xl': 'text-3xl',      // 30px / 36px - H2, page sections
    '4xl': 'text-4xl',      // 36px / 40px - H1, hero headings
  },

  // Font weights
  weight: {
    normal: 'font-normal',      // 400
    medium: 'font-medium',      // 500
    semibold: 'font-semibold',  // 600
    bold: 'font-bold',          // 700
  },

  // Text colors
  color: {
    primary: 'text-gray-900',       // Primary text - highest contrast
    secondary: 'text-gray-700',     // Body text - standard readability
    tertiary: 'text-gray-600',      // Supporting text - lower emphasis
    subtle: 'text-gray-500',        // Subtle text - minimal emphasis
    disabled: 'text-gray-400',      // Disabled state
    brand: 'text-primary',         // Brand pink accent
    error: 'text-gray-900',         // Error messages
    success: 'text-primary-hover',       // Success messages
  },

  // Semantic text styles (complete combinations)
  semantic: {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-bold text-gray-900',
    h3: 'text-xl font-semibold text-gray-800',
    h4: 'text-lg font-semibold text-gray-800',
    body: 'text-base font-normal text-gray-700',
    bodySm: 'text-sm font-normal text-gray-600',
    label: 'text-xs font-semibold text-gray-800 uppercase tracking-wider',
    caption: 'text-xs font-normal text-gray-500',
    error: 'text-sm font-medium text-gray-900',
    success: 'text-sm font-medium text-primary-hover',
  },

  // Text alignment
  align: {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  },
} as const

// ============================================================================
// BACKGROUND COLOR SYSTEM
// ============================================================================

export const background = {
  // Neutral backgrounds (gray scale)
  surface: {
    base: 'bg-white',                 // Pure white - cards, modals, main surfaces
    subtle: 'bg-gray-50',             // Lightest gray - page backgrounds, subtle containers
    light: 'bg-gray-100',             // Light gray - secondary containers, hover states
    neutral: 'bg-gray-200',           // Neutral gray - borders, dividers, inactive states
    medium: 'bg-gray-300',            // Medium gray - disabled backgrounds
    muted: 'bg-gray-400',             // Muted gray - placeholder backgrounds
    dark: 'bg-gray-500',              // Dark gray - inverted sections
    darker: 'bg-gray-600',            // Darker gray - dark mode backgrounds
    darkest: 'bg-gray-700',           // Darkest gray - strong contrast
    strong: 'bg-gray-800',            // Strong dark - near-black backgrounds
    inverse: 'bg-gray-900',           // Inverse background - footer, headers
    deepest: 'bg-gray-950',           // Deepest - maximum contrast
  },

  // Interactive states
  hover: {
    subtle: 'hover:bg-gray-50',       // Light hover - minimal emphasis
    light: 'hover:bg-gray-100',       // Standard hover - buttons, cards
    neutral: 'hover:bg-gray-200',     // Emphasized hover - active states
    medium: 'hover:bg-gray-300',      // Strong hover
  },

  // Semantic backgrounds
  semantic: {
    page: 'bg-gray-50',               // Default page background
    card: 'bg-white',                 // Card background
    input: 'bg-white',                // Input field background
    disabled: 'bg-gray-100',          // Disabled element background
    selected: 'bg-gray-100',          // Selected state background
    highlight: 'bg-primary/10',       // Highlight/accent background
    error: 'bg-red-50',               // Error state background
    success: 'bg-green-50',           // Success state background
    warning: 'bg-yellow-50',          // Warning state background
    info: 'bg-blue-50',               // Info state background
  },
} as const

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  // Semantic page-level spacing
  page: {
    padding: 'px-4 sm:px-6 py-4 sm:py-5',
    paddingX: 'px-4 sm:px-6',
    paddingY: 'py-4 sm:py-5',
  },

  // Card padding variants
  card: {
    compact: 'p-3 sm:p-4',      // 12-16px - tight cards
    default: 'p-4 sm:p-6',      // 16-24px - standard cards
    spacious: 'p-6 sm:p-8',     // 24-32px - feature cards
  },

  // Section spacing
  section: {
    tight: 'mb-4',              // 16px
    default: 'mb-6',            // 24px - standard section gap
    loose: 'mb-8',              // 32px
  },

  // Stack spacing (vertical)
  stack: {
    tight: 'space-y-2',         // 8px - compact lists
    default: 'space-y-4',       // 16px - standard stacking
    loose: 'space-y-6',         // 24px - spacious sections
  },

  // Inline spacing (horizontal)
  inline: {
    tight: 'space-x-2',         // 8px - tight button groups
    default: 'space-x-3',       // 12px - standard inline
    loose: 'space-x-4',         // 16px - spacious inline
  },

  // Gap (for flex/grid)
  gap: {
    tight: 'gap-2',             // 8px
    default: 'gap-4',           // 16px
    loose: 'gap-6',             // 24px
  },
} as const

// ============================================================================
// GLASSMORPHISM & BACKDROP EFFECTS
// ============================================================================

export const glass = {
  // Light glass - subtle overlay
  light: 'bg-white/60 backdrop-blur-glass-sm backdrop-saturate-glass-sm border border-white/20',

  // Medium glass - standard (current preference)
  medium: 'bg-white/80 backdrop-blur-glass-md backdrop-saturate-glass-md border border-white/30',

  // Heavy glass - opaque, strong blur
  heavy: 'bg-white/90 backdrop-blur-glass-lg backdrop-saturate-glass-lg border border-white/40',

  // Pink tinted glass - brand variant
  pink: 'bg-primary/10 backdrop-blur-glass-sm backdrop-saturate-glass-sm border border-primary/30',

  // Modal/Overlay backdrop
  backdrop: 'bg-black/40 backdrop-blur-[32px] backdrop-saturate-[200%]',

  // Common combinations
  card: 'bg-white/80 backdrop-blur-glass-md border border-gray-200/50 shadow-md',
  modal: 'bg-white/95 backdrop-blur-glass-lg border border-gray-200/60 shadow-xl',
} as const

// ============================================================================
// ANIMATION & TRANSITIONS
// ============================================================================

export const animation = {
  // Transition speeds
  duration: {
    fast: 'duration-150',       // 150ms - micro-interactions
    normal: 'duration-200',     // 200ms - standard (default)
    slow: 'duration-300',       // 300ms - deliberate transitions
    slower: 'duration-500',     // 500ms - attention-grabbing
  },

  // Easing curves
  ease: {
    default: 'ease-in-out',
    in: 'ease-in',
    out: 'ease-out',
    linear: 'ease-linear',
  },

  // Common transition combinations
  transition: {
    default: 'transition-all duration-200 ease-in-out', // Alias for all
    all: 'transition-all duration-200 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    opacity: 'transition-opacity duration-200 ease-in-out',
    transform: 'transition-transform duration-200 ease-out',
    shadow: 'transition-shadow duration-200 ease-in-out',
    fast: 'transition-all duration-150 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },

  // Keyframe animations
  keyframe: {
    fadeIn: 'animate-fade-in',
    shimmer: 'animate-shimmer',
  },

  // Interactive states
  hover: {
    scale: 'hover:scale-105 transition-transform duration-200',
    scaleSm: 'hover:scale-102 transition-transform duration-150',
    lift: 'hover:-translate-y-1 transition-transform duration-200',
    glow: 'hover:shadow-primary-lg transition-shadow duration-200',
  },

  active: {
    scale: 'active:scale-95 transition-transform duration-100',
    press: 'active:translate-y-0.5 transition-transform duration-100',
  },
} as const

// Alias for backwards compatibility (components use designSystem.transitions.default)
export const transitions = animation.transition

// ============================================================================
// BUTTON SYSTEM
// ============================================================================

export const buttons = {
  // Button variants
  variant: {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed font-medium',
    secondary: `${background.surface.light} hover:${background.hover.neutral} active:${background.surface.medium} text-gray-700 font-medium`,
    outline: `border border-default hover:${background.hover.subtle} active:${background.surface.light} text-gray-700 font-medium`,
    ghost: `hover:${background.surface.light} active:${background.hover.neutral} text-gray-700 font-medium`,
    danger: `${background.surface.inverse} hover:${background.surface.deepest} text-white font-medium`,
    success: 'bg-primary hover:bg-primary-hover text-white font-medium',
  },

  // Button sizes
  size: {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  },

  // Complete button styles
  primary: {
    sm: `bg-primary text-white hover:bg-primary-hover px-3 py-1.5 text-sm font-medium ${borders.radius.sm} shadow-sm hover:shadow-pink transition-all duration-150`,
    md: `bg-primary text-white hover:bg-primary-hover px-4 py-2 text-base font-medium ${borders.radius.sm} shadow-sm hover:shadow-pink transition-all duration-150`,
    lg: `bg-primary text-white hover:bg-primary-hover px-6 py-3 text-lg font-medium ${borders.radius.sm} shadow-md hover:shadow-primary-lg transition-all duration-150`,
  },

  secondary: {
    sm: `${background.surface.light} hover:${background.hover.neutral} text-gray-700 px-3 py-1.5 text-sm font-medium ${borders.radius.sm} transition-colors duration-150`,
    md: `${background.surface.light} hover:${background.hover.neutral} text-gray-700 px-4 py-2 text-base font-medium ${borders.radius.sm} transition-colors duration-150`,
    lg: `${background.surface.light} hover:${background.hover.neutral} text-gray-700 px-6 py-3 text-lg font-medium ${borders.radius.sm} transition-colors duration-150`,
  },
} as const

// ============================================================================
// CARD SYSTEM
// ============================================================================

export const cards = {
  // Card variants
  variant: {
    default: 'bg-white border border-default shadow-sm',
    glass: 'bg-white/80 backdrop-blur-glass-md border border-gray-200/50 shadow-md',
    elevated: 'bg-white border border-light shadow-lg',
    flat: `${background.surface.subtle} border-0`,
    outline: 'bg-transparent border border-default',
  },

  // Interactive cards
  interactive: {
    default: 'bg-white border border-default shadow-sm hover:shadow-md hover:border-strong transition-all duration-200 cursor-pointer',
    glass: 'bg-white/80 backdrop-blur-glass-md border border-gray-200/50 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer',
    elevated: 'bg-white border border-light shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
  },

  // Complete card styles
  standard: `bg-white border border-default ${borders.radius.md} p-4 sm:p-6 shadow-sm`,
  feature: `bg-white border border-default ${borders.radius.lg} p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow duration-200`,
  glassMorph: `bg-white/80 backdrop-blur-glass-md border border-gray-200/50 ${borders.radius.md} p-4 sm:p-6 shadow-md`,
} as const

// ============================================================================
// STATUS & SEMANTIC COLORS
// ============================================================================

export const status = {
  success: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    text: 'text-primary-text',
    icon: 'text-primary-hover',
  },
  warning: {
    bg: background.surface.light,
    border: 'border-gray-300',
    text: 'text-gray-800',
    icon: 'text-gray-600',
  },
  error: {
    bg: background.surface.subtle,
    border: 'border-gray-900',
    text: 'text-gray-900',
    icon: 'text-gray-900',
  },
  info: {
    bg: background.surface.subtle,
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-500',
  },
  // Status indicators (dots for monitor pages)
  indicator: {
    running: 'bg-green-500 border-2 border-white shadow-sm',
    stopped: 'bg-red-500 border-2 border-white shadow-sm',
    loading: 'bg-yellow-500 border-2 border-white shadow-sm animate-pulse',
  },
} as const

// ============================================================================
// PLATFORM THEME HELPERS
// ============================================================================

export const platform = {
  // Platform color classes
  colors: {
    instagram: 'text-[var(--instagram-primary)]',
    reddit: 'text-[var(--reddit-primary)]',
    tracking: 'text-[var(--purple-500)]',
    default: 'text-primary',
  },

  // Platform background classes
  backgrounds: {
    instagram: 'bg-[var(--instagram-primary)]',
    reddit: 'bg-[var(--reddit-primary)]',
    tracking: 'bg-[var(--purple-500)]',
    default: 'bg-primary',
  },

  // Platform gradient classes
  gradients: {
    instagram: 'bg-gradient-to-r from-[var(--instagram-primary)] to-[var(--instagram-secondary)]',
    reddit: 'bg-gradient-to-r from-[var(--reddit-primary)] to-[var(--reddit-secondary)]',
    tracking: 'bg-gradient-to-r from-[var(--purple-500)] to-[var(--purple-400)]',
    default: 'bg-gradient-to-r from-primary to-primary/40',
  },
} as const

// ============================================================================
// DASHBOARD CARD THEME SYSTEM
// ============================================================================

/**
 * Dashboard card styling - Centralized theme configuration
 * Each dashboard has consistent text color, background, and accent gradient
 */
export const dashboards = {
  reddit: {
    text: 'text-[var(--reddit-primary)]',
    bg: 'bg-orange-50',
    accent: 'bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 text-white',
  },
  instagram: {
    text: 'text-fuchsia-600',
    bg: 'bg-fuchsia-50',
    accent: 'bg-gradient-to-br from-fuchsia-600 via-pink-500 to-purple-600 text-white',
  },
  models: {
    text: 'text-secondary',
    bg: 'bg-secondary/10',
    accent: 'bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-500 text-white',
  },
  tracking: {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    accent: 'bg-gradient-to-br from-rose-700 via-rose-500 to-pink-600 text-white',
  },
  monitor: {
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    accent: 'bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500 text-white',
  },
} as const

/**
 * Get dashboard theme by ID with fallback
 * @param dashboardId - Dashboard identifier (reddit, instagram, etc.)
 * @returns Theme object with text, bg, and accent classes
 */
export function getDashboardTheme(dashboardId: string) {
  return dashboards[dashboardId as keyof typeof dashboards] || {
    text: typography.color.subtle,
    bg: background.surface.subtle,
    accent: `${background.surface.darker} text-white`
  }
}

/**
 * Get platform-specific color
 * @param platformName - 'instagram' | 'reddit' | 'tracking'
 * @returns CSS variable reference for platform color
 */
export function getPlatformColor(platformName: 'instagram' | 'reddit' | 'tracking' | 'default' = 'default'): string {
  const colors = {
    instagram: 'var(--instagram-primary)',
    reddit: 'var(--reddit-primary)',
    tracking: 'var(--purple-500)',
    default: 'var(--pink-500)',
  }
  return colors[platformName]
}

// ============================================================================
// LAYOUT & GRID SYSTEM
// ============================================================================

export const layout = {
  // Grid layouts
  grid: {
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    cols5: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4',
    cols6: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4',
  },

  // Flex layouts (common patterns used 26+ times across app)
  flex: {
    row: 'flex flex-row items-center',
    rowBetween: 'flex flex-row items-center justify-between', // Most common: 26 uses
    rowCenter: 'flex flex-row items-center justify-center',
    rowStart: 'flex flex-row items-center justify-start',
    rowEnd: 'flex flex-row items-center justify-end',
    col: 'flex flex-col',
    colCenter: 'flex flex-col items-center justify-center',
    colStart: 'flex flex-col items-start',
    colBetween: 'flex flex-col justify-between',
  },

  // Z-index hierarchy
  zIndex: {
    base: 'z-0',
    dropdown: 'z-10',
    sticky: 'z-20',
    fixed: 'z-30',
    modalBackdrop: 'z-40',
    modal: 'z-50',
    popover: 'z-50',
    tooltip: 'z-60',
    notification: 'z-70',
  },
} as const

// ============================================================================
// INPUT SYSTEM
// ============================================================================

export const inputs = {
  // Base input styles
  base: `border border-default ${borders.radius.sm} px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:border-primary-strong transition-colors duration-150`,

  // Input sizes
  size: {
    sm: `px-2.5 py-1.5 text-sm ${borders.radius.sm}`,
    md: `px-3 py-2 text-base ${borders.radius.sm}`,
    lg: `px-4 py-3 text-lg ${borders.radius.sm}`,
  },

  // Input states
  state: {
    default: 'border-default',
    error: 'border-error focus:ring-gray-900/50',
    success: 'border-primary focus:ring-primary/40',
    disabled: `${background.surface.subtle} text-gray-400 cursor-not-allowed border-gray-200`,
  },

  // Complete input combinations
  text: `border border-default ${borders.radius.sm} px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-strong`,
  search: `border border-default ${borders.radius.sm} px-3 py-2 pl-10 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-strong`,
  textarea: `border border-default ${borders.radius.sm} px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-strong resize-none`,
} as const

// ============================================================================
// COMMON COMPONENT COMBINATIONS
// ============================================================================

export const commonStyles = {
  // Page layouts
  pageHeader: `${typography.semantic.h1} ${spacing.page.padding}`,
  pageContainer: `${spacing.page.padding} max-w-7xl mx-auto`,

  // Sections
  sectionTitle: `${typography.semantic.h3} ${spacing.section.default}`,
  sectionSubtitle: `${typography.semantic.bodySm} ${spacing.section.tight}`,

  // Cards
  cardContainer: `${cards.standard}`,
  cardGlass: `${cards.glassMorph}`,
  cardFeature: `${cards.feature}`,

  // Buttons
  primaryButton: `${buttons.primary.md}`,
  secondaryButton: `${buttons.secondary.md}`,

  // Inputs
  inputField: `${inputs.text}`,
  searchField: `${inputs.search}`,

  // Tables
  tableWrapper: `${cards.variant.default} ${borders.radius.lg} overflow-hidden`,
  tableHeader: `${background.surface.subtle} border-b border-default`,
  tableCell: 'px-4 py-3 text-sm text-gray-700',

  // Badges
  badge: `${borders.radius.full} px-2 py-1 text-xs font-medium`,
  badgePrimary: `${borders.radius.full} px-2 py-1 text-xs font-medium bg-primary/10 text-primary-pressed border border-primary/30`,
  badgeSecondary: `${borders.radius.full} px-2 py-1 text-xs font-medium ${background.surface.light} text-gray-700 border border-gray-200`,

  // Dividers
  dividerHorizontal: 'border-t border-light',
  dividerVertical: 'border-l border-light h-full',
} as const

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Combine design system classes from dot-notation paths
 * @example getDesignClasses('shadows.elevated', 'borders.radius.md')
 */
export function getDesignClasses(...paths: string[]): string {
  const designSystem = {
    borders,
    shadows,
    typography,
    spacing,
    glass,
    animation,
    buttons,
    cards,
    status,
    platform,
    layout,
    inputs,
  }

  return paths
    .map((path) => {
      const parts = path.split('.')
      let value: unknown = designSystem
      for (const part of parts) {
        value = (value as Record<string, unknown> | undefined)?.[part]
      }
      return typeof value === 'string' ? value : ''
    })
    .filter(Boolean)
    .join(' ')
}

// ============================================================================
// EXPORTS
// ============================================================================

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================
// These aliases maintain compatibility with the old design system structure
// TODO: Remove these in Phase 3 after component migration

// Extend cards.variant to include interactive
const cardsVariantWithBackwardCompat = {
  ...cards.variant,
  // Old: cards.variant.interactive → New: cards.interactive.default
  interactive: cards.interactive.default,
} as const

// Extend typography.semantic to include missing old properties
const textWithBackwardCompat = {
  ...typography.semantic,
  // Old: text.subtitle → New: text.bodySm (closest match)
  subtitle: typography.semantic.bodySm,
  // Old: text.small → New: text.bodySm
  small: typography.semantic.bodySm,
} as const

const backwardCompatibilityAliases = {
  // Old: designSystem.card → New: designSystem.cards.variant
  card: cardsVariantWithBackwardCompat,

  // Old: designSystem.radius → New: designSystem.borders.radius
  radius: borders.radius,

  // Old: designSystem.text → New: designSystem.typography.semantic
  text: textWithBackwardCompat,

  // Old: designSystem.grid → New: designSystem.layout.grid
  grid: layout.grid,

  // Old: designSystem.zIndex → New: designSystem.layout.zIndex
  zIndex: layout.zIndex,
} as const

// Additional shadow backward compatibility (extend shadows object)
const shadowsWithBackwardCompat = {
  ...shadows,
  // Old: shadows.hover → New: shadows.cardHover
  hover: shadows.cardHover,
  // Old: shadows.focus → Approximate with pink glow
  focus: shadows.pink,
} as const

// Additional animation backward compatibility (extend animation object)
const animationWithBackwardCompat = {
  ...animation,
  // Old: animation.normal → New: animation.transition.all
  normal: animation.transition.all,
  // Old: animation.fast → New: animation.transition.fast
  fast: animation.transition.fast,
  // Old: animation.slow → New: animation.transition.slow
  slow: animation.transition.slow,
  // Old: animation.spring → New: animation.transition.transform
  spring: animation.transition.transform,
  // Old: animation.fade → New: animation.transition.opacity
  fade: animation.transition.opacity,
  // Old: animation.scale → New: animation.transition.transform
  scale: animation.transition.transform,
} as const

// Additional spacing backward compatibility (flatten spacing structure)
const spacingWithBackwardCompat = {
  ...spacing,
  // Old: spacing.page → New: spacing.page.padding
  page: spacing.page.padding,
  // Old: spacing.card → New: spacing.card.default
  card: spacing.card.default,
  // Old: spacing.compact → New: spacing.card.compact
  compact: spacing.card.compact,
  // Old: spacing.section → New: spacing.section.default
  section: spacing.section.default,
  // Old: spacing.stack → New: spacing.stack.default
  stack: spacing.stack.default,
  // Old: spacing.inline → New: spacing.inline.default
  inline: spacing.inline.default,
} as const

export const designSystem = {
  borders,
  shadows: shadowsWithBackwardCompat,
  typography,
  background,
  spacing: spacingWithBackwardCompat,
  glass,
  animation: animationWithBackwardCompat,
  transitions, // Alias for animation.transition
  buttons,
  cards,
  status,
  platform,
  layout,
  inputs,
  commonStyles,
  // Backward compatibility aliases (deprecated)
  ...backwardCompatibilityAliases,
} as const

export default designSystem
