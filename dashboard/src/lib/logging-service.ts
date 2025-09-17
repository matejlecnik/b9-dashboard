import { createClient } from '@/lib/supabase/index'

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
export type LogSource = 'user_tracking' | 'ai_categorization' | 'reddit_scraper' | 'api_operation'

// Type for log context data - allows string, number, boolean, null, or nested objects
export type LogContextValue = string | number | boolean | null | undefined | LogContextValue[] | { [key: string]: LogContextValue }
export type LogContext = Record<string, LogContextValue>

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  source: LogSource
  context?: LogContext

  // Optional fields for specific tracking
  request_type?: string
  http_status?: number
  response_time_ms?: number
  url?: string
  subreddit?: string
  username?: string
  success?: boolean
  error_type?: string
  retry_count?: number
  proxy_used?: string
  account_used?: string
  data_collected?: LogContext
  session_id?: string
}

class LoggingService {
  private static instance: LoggingService
  private buffer: LogEntry[] = []
  private readonly bufferSize = 20
  private readonly flushInterval = 30000 // 30 seconds
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private isProcessing = false

  private constructor() {
    // Start periodic flush
    this.startPeriodicFlush()

    // Flush on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.flush())
      process.on('SIGINT', () => this.flush())
      process.on('SIGTERM', () => this.flush())
    }
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService()
    }
    return LoggingService.instance
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  async log(entry: Partial<LogEntry> & { message: string; source: LogSource }) {
    const fullEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: entry.level || 'info',
      ...entry
    }

    this.buffer.push(fullEntry)

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }

  async flush() {
    if (this.isProcessing || this.buffer.length === 0) {
      return
    }

    this.isProcessing = true
    const logsToFlush = [...this.buffer]
    this.buffer = []

    try {
      const supabase = await createClient()
      if (!supabase) {
        console.error('Failed to create Supabase client for logging')
        // Re-add logs to buffer to try again later
        this.buffer.unshift(...logsToFlush)
        return
      }

      const { error } = await supabase
        .from('reddit_scraper_logs')
        .insert(logsToFlush)

      if (error) {
        console.error('Error flushing logs to Supabase:', error)
        // Re-add logs to buffer to try again later
        this.buffer.unshift(...logsToFlush)
      } else {
        console.debug(`✅ Flushed ${logsToFlush.length} logs to Supabase`)
      }
    } catch (error) {
      console.error('Exception while flushing logs:', error)
      // Re-add logs to buffer to try again later
      this.buffer.unshift(...logsToFlush)
    } finally {
      this.isProcessing = false
    }
  }

  // Helper methods for specific log types
  async logUserTracking(
    action: string,
    username?: string,
    details?: LogContext,
    success: boolean = true,
    processingTimeMs?: number
  ) {
    await this.log({
      source: 'user_tracking',
      message: `User tracking: ${action}`,
      level: success ? 'info' : 'error',
      username,
      success,
      response_time_ms: processingTimeMs,
      context: {
        action,
        ...details
      }
    })
  }

  async logAICategorization(
    action: string,
    details?: LogContext,
    success: boolean = true,
    processingTimeMs?: number
  ) {
    await this.log({
      source: 'ai_categorization',
      message: `AI categorization: ${action}`,
      level: success ? 'info' : 'error',
      success,
      response_time_ms: processingTimeMs,
      context: {
        action,
        ...details
      }
    })
  }

  async logApiOperation(
    endpoint: string,
    method: string,
    statusCode: number,
    processingTimeMs?: number,
    details?: LogContext
  ) {
    const success = statusCode >= 200 && statusCode < 300
    await this.log({
      source: 'api_operation',
      message: `${method} ${endpoint} -> ${statusCode}`,
      level: success ? 'info' : 'error',
      url: endpoint,
      http_status: statusCode,
      success,
      response_time_ms: processingTimeMs,
      context: {
        method,
        endpoint,
        ...details
      }
    })
  }

  // Force flush all logs immediately
  async forceFlush() {
    await this.flush()
  }

  // Clean up resources
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush()
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance()