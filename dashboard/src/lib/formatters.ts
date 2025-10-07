/**
 * Standardized formatting utilities for consistent display across the dashboard
 */

import { designSystem } from '@/lib/design-system'

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format large numbers with abbreviations (1.2K, 500M, etc.)
 * This should be used for all counts, stats, and metrics in the UI
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'

  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1).replace(/\.0$/, '')}B`
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return num.toLocaleString('en-US')
}

/**
 * Format number with commas (1,234,567)
 */
export function formatNumberWithCommas(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString('en-US')
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  includeSign: boolean = true
): string {
  const formatted = value.toFixed(decimals).replace(/\.0+$/, '')
  return includeSign ? `${formatted}%` : formatted
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  compact: boolean = false
): string {
  if (compact && amount >= 1000) {
    return `$${formatNumber(amount)}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date to readable string
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (format === 'relative') {
    return formatRelativeTime(dateObj)
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }

  return dateObj.toLocaleDateString('en-US', options)
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  const dateStr = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const timeStr = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  })

  return `${dateStr} at ${timeStr}`
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  }

  if (diffInSeconds < 0) {
    // Future date
    const absDiff = Math.abs(diffInSeconds)
    for (const [unit, seconds] of Object.entries(intervals)) {
      const count = Math.floor(absDiff / seconds)
      if (count >= 1) {
        return `in ${count} ${unit}${count !== 1 ? 's' : ''}`
      }
    }
    return 'just now'
  }

  // Past date
  for (const [unit, seconds] of Object.entries(intervals)) {
    const count = Math.floor(diffInSeconds / seconds)
    if (count >= 1) {
      return `${count} ${unit}${count !== 1 ? 's' : ''} ago`
    }
  }

  return 'just now'
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - ellipsis.length) + ellipsis
}

/**
 * Format subreddit name (ensure r/ prefix)
 */
export function formatSubredditName(name: string): string {
  if (!name) return ''
  return name.startsWith('r/') ? name : `r/${name}`
}

/**
 * Format username (ensure u/ prefix for Reddit)
 */
export function formatUsername(
  username: string,
  platform: 'reddit' | 'twitter' | 'instagram' = 'reddit'
): string {
  if (!username) return ''

  switch (platform) {
    case 'reddit':
      return username.startsWith('u/') ? username : `u/${username}`
    case 'twitter':
      return username.startsWith('@') ? username : `@${username}`
    case 'instagram':
      return username.startsWith('@') ? username : `@${username}`
    default:
      return username
  }
}

// ============================================================================
// SCORE & RATING FORMATTING
// ============================================================================

/**
 * Get color class based on score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Get background color class based on score
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100'
  if (score >= 60) return 'bg-yellow-100'
  if (score >= 40) return 'bg-orange-100'
  return 'bg-red-100'
}

/**
 * Format score with color
 */
export function formatScore(score: number | null | undefined): {
  value: string
  color: string
  bgColor: string
} {
  const scoreValue = score ?? 0

  return {
    value: scoreValue.toString(),
    color: getScoreColor(scoreValue),
    bgColor: getScoreBgColor(scoreValue)
  }
}

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Format bytes to human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// ============================================================================
// DURATION FORMATTING
// ============================================================================

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 && hours === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

// ============================================================================
// STATUS FORMATTING
// ============================================================================

/**
 * Get status color classes
 */
export function getStatusColor(status: string): {
  bg: string
  text: string
  border?: string
} {
  const statusColors: Record<string, { bg: string; text: string; border?: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    banned: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    pending: { bg: designSystem.background.surface.light, text: designSystem.typography.color.secondary, border: 'border-gray-200' },
    inactive: { bg: designSystem.background.surface.light, text: designSystem.typography.color.secondary, border: 'border-gray-200' },
  }

  return statusColors[status.toLowerCase()] || statusColors.inactive
}