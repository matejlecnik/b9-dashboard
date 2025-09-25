/**
 * Production-safe logger utility
 * Automatically strips console logs in production builds
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors, even in production (for debugging)
    console.error(...args)
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data)
    }
  },

  time: (label: string) => {
    if (isDevelopment) {
      console.time(label)
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label)
    }
  },

  group: (label?: string) => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  }
}

// For critical production logging (e.g., error reporting)
export const prodLogger = {
  error: (title: string, data?: unknown) => {
    // In production, you could send this to an error tracking service
    console.error(`[ERROR] ${title}`, data)

    // TODO: Send to error tracking service like Sentry
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(new Error(message), { extra: data })
    // }
  },

  metric: (event: string, data?: unknown) => {
    // In production, send to analytics
    if (isDevelopment) {
      console.log(`[METRIC] ${event}`, data)
    }
    // TODO: Send to analytics service
  }
}