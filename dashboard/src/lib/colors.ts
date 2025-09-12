/**
 * B9 Dashboard Color System
 * Monochromatic Pink & Grayscale Design System
 * 
 * This file provides color constants for consistent usage across components.
 * All colors follow the B9 brand identity using only pink variations and grayscale.
 */

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
  statusOk: 'bg-pink-50 text-pink-700 border-pink-200',
  statusNoSeller: 'bg-gray-100 text-gray-700 border-gray-300',
  statusNonRelated: 'bg-gray-50 text-gray-600 border-gray-200',
  statusUserFeed: 'bg-white text-pink-300 border-pink-100',
  
  // Buttons
  primaryButton: 'bg-pink-500 hover:bg-pink-600 text-white',
  secondaryButton: 'bg-white text-pink-500 border-pink-200 hover:bg-pink-50',
  tertiaryButton: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  
  // Interactive states
  focusRing: 'focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50',
  selectedRow: 'bg-pink-50 ring-2 ring-pink-200',
  hoverRow: 'hover:bg-gray-50',
} as const

export type ReviewStatus = keyof typeof REVIEW_STATUS_COLORS
export type StatusType = keyof typeof STATUS_COLORS
export type PinkShade = keyof typeof PINK_SCALE
export type GrayShade = keyof typeof GRAY_SCALE