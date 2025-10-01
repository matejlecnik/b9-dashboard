// Core Utilities
export { cn } from './utils'
export type { ClassValue } from 'clsx'

// Formatting
export {
  formatNumber,
  formatNumberWithCommas,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatPercentage,
  formatBytes,
  formatDuration
} from './formatters'

// API & Authentication
export { apiAuth, withAuth, validateApiKey } from './api-auth'
export { apiVersion, getApiEndpoint, API_VERSIONS } from './api-versioning'

// Database & Supabase
export { supabase, createClient } from './supabase'
// export { getSupabaseClient, getSupabaseAdmin } from './supabase-client'
export { performanceMonitor } from './database-performance'

// AI & OpenAI
export { openai, generateCompletion, generateEmbedding } from './openai'

// Performance & Optimization
export { LRUCache } from './lru-cache'
export { debounce, throttle, memoize } from './performance-utils'
export { measurePerformance, PerformanceProfiler } from './performance-monitor'

// Validation & Security
export {
  validateEmail,
  validateUrl,
  validateUsername,
  validatePassword,
  sanitizeInput,
  escapeHtml
} from './validations'

// UI & Styling
export { colors, getColorByIndex, getContrastColor } from './colors'
export { animations, transitions, easings } from './animation-variants'
export { a11y, skipToMain, focusStyles } from './accessibility'

// Error Handling
export {
  handleError,
  ErrorWithCode,
  ApiError,
  ValidationError,
  NetworkError
} from './errorUtils'

// Permissions & Auth
export {
  checkPermission,
  hasRole,
  canEdit,
  canDelete,
  canView,
  ROLES,
  PERMISSIONS
} from './permissions'

// Icons & Assets
export {
  loadIcon,
  getIconPath,
  IconLibrary,
  socialIcons,
  platformIcons
} from './icon-loader'

// Dynamic Imports
export {
  DynamicInstagramDashboard,
  DynamicRedditDashboard,
  DynamicAnalyticsDashboard,
  createDynamicComponent
} from './dynamic-imports'

// Logging
export { logger } from './logger'

// Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
export const APP_NAME = 'B9 Dashboard'
export const APP_VERSION = '3.3.0'