'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDistanceToNow } from 'date-fns'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { LogTerminalBase } from './LogTerminalBase'
// Type definitions
interface ApiActivityDetails {
  [key: string]: unknown
}

interface ApiActivity {
  id: string
  timestamp: string
  endpoint: string
  status: 'success' | 'error' | 'pending'
  title: string
  message?: string
  details?: ApiActivityDetails
}

interface SystemLog {
  id: string | number
  timestamp: string
  level?: string
  message: string
  context?: Record<string, unknown>
}

interface CombinedActivityLogProps {
  title: string
  height?: string
  maxLogs?: number
  useSystemLogs?: boolean
  fadeHeight?: string
}

export function CombinedActivityLog({
  title,
  height = '120px',
  maxLogs = 40,
  useSystemLogs = true,
  fadeHeight = '2%'
}: CombinedActivityLogProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase client not initialized')
          return
        }

        if (useSystemLogs) {
          // Fetch from BOTH endpoints in parallel
          const halfLogs = Math.floor(maxLogs / 2)

          const [usersResponse, categorizationResponse] = await Promise.all([
            // Fetch user activity logs
            supabase
              .from('system_logs')
              .select('id, timestamp, source, script_name, level, message, context')
              .or('source.eq.user_discovery,source.eq.api_user_discovery')
              .order('timestamp', { ascending: false })
              .limit(halfLogs),

            // Fetch categorization logs
            supabase
              .from('system_logs')
              .select('id, timestamp, source, script_name, level, message, context')
              .or('source.eq.reddit_categorizer,source.eq.reddit_tagger')
              .order('timestamp', { ascending: false })
              .limit(halfLogs)
          ])

          const usersData = (usersResponse.data || []) as SystemLog[]
          const categorizationData = (categorizationResponse.data || []) as SystemLog[]

          // Map users data
          const userActivities: ApiActivity[] = usersData.map((sysLog) => {
            const context = sysLog.context || {}
            let displayMessage = ''

            if (context.username) {
              displayMessage = `u/${context.username}: ${sysLog.message}`
            } else if (sysLog.message.includes('u/')) {
              displayMessage = sysLog.message
            } else {
              displayMessage = sysLog.message
            }

            return {
              id: sysLog.id.toString(),
              timestamp: sysLog.timestamp,
              endpoint: 'users',
              status: (sysLog.level === 'error' || sysLog.level === 'critical') ? 'error' :
                      (sysLog.level === 'warning' ? 'pending' : 'success'),
              title: displayMessage.length > 100 ? displayMessage.substring(0, 97) + '...' : displayMessage,
              details: context
            }
          })

          // Map categorization data
          const categorizationActivities: ApiActivity[] = categorizationData.map((sysLog) => {
            const context = sysLog.context || {}
            let displayMessage = ''

            if (context.subreddit_name && context.category) {
              displayMessage = `r/${context.subreddit_name} → ${context.category}`
            } else if (sysLog.message.includes('Categorizing')) {
              const match = sysLog.message.match(/r\/([\w_]+)/)
              displayMessage = match ? `Categorizing r/${match[1]}...` : sysLog.message
            } else {
              displayMessage = sysLog.message
            }

            return {
              id: sysLog.id.toString(),
              timestamp: sysLog.timestamp,
              endpoint: 'categorization',
              status: (sysLog.level === 'error' || sysLog.level === 'critical') ? 'error' :
                      (sysLog.level === 'warning' ? 'pending' : 'success'),
              title: displayMessage.length > 100 ? displayMessage.substring(0, 97) + '...' : displayMessage,
              details: context
            }
          })

          // Merge and sort by timestamp
          const allActivities = [...userActivities, ...categorizationActivities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, maxLogs)

          setActivities(allActivities)
        } else {
          // Legacy table support (if needed)
          setActivities([])
        }
      } catch (err) {
        logger.error('Error fetching activities from logs:', err)
      }
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 10000)
    return () => clearInterval(interval)
  }, [maxLogs, useSystemLogs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'pending': return 'text-yellow-600'
      default: return designSystem.typography.color.tertiary
    }
  }

  return (
    <LogTerminalBase
      title={title}
      height={height}
      fadeHeight={fadeHeight}
    >
      {/* Scroll container - extends to full height */}
      <div
        ref={scrollAreaRef}
        className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        {activities.length === 0 ? (
          <div className={cn("flex items-center justify-center h-full text-[9px]", designSystem.typography.color.disabled)}>
            No recent activity
          </div>
        ) : (
          <div className="space-y-0 pb-1 px-1">
            {activities.map((activity) => (
              <div key={activity.id} className={`flex items-start gap-1 px-1 hover:${designSystem.background.hover.light}/50 rounded transition-colors`}>
                <span className={`text-[8px] ${getStatusColor(activity.status)} mt-0.5`}>●</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[9px] truncate", designSystem.typography.color.primary)}>
                    {activity.message || activity.title}
                  </p>
                  <p className={cn("text-[8px]", designSystem.typography.color.tertiary)}>
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LogTerminalBase>
  )
}