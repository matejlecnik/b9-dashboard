'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase/index'

interface ApiActivityDetails {
  new_status?: boolean
  query?: string
  results_count?: number
  batch_size?: number
  categorized?: number
  total?: number
  [key: string]: unknown
}

interface RedditCategorizationLog {
  id: string
  timestamp: string
  subreddit_name: string
  category_assigned?: string
  success?: boolean
}

interface RedditScraperLog {
  id: string
  timestamp: string
  message?: string
  source: string
  level?: string
  context?: Record<string, unknown>
}

interface UserDiscoveryLog {
  id: string
  timestamp: string
  username: string
  action: string
  success: boolean
  details?: Record<string, unknown>
  error?: string | null
}

type ApiActivity = {
  id: string
  timestamp: string
  endpoint: string
  status: 'success' | 'error' | 'pending'
  message: string
  details?: ApiActivityDetails
}

interface ApiActivityLogProps {
  title: string
  endpoint: 'users' | 'categorization'
  height?: string
  maxLogs?: number
  useSystemLogs?: boolean
}

export function ApiActivityLog({
  title,
  endpoint,
  height = '120px',
  maxLogs = 20,
  useSystemLogs = true
}: ApiActivityLogProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        if (!supabase) {
          console.error('Supabase client not initialized')
          return
        }

        let data: any[] | null = null
        let error: unknown = null

        if (useSystemLogs) {
          // Fetch from system_logs table
          let query = supabase
            .from('system_logs')
            .select('id, timestamp, source, script_name, level, message, context, items_processed, duration_ms')
            .order('timestamp', { ascending: false })
            .limit(maxLogs)

          // Filter by source based on endpoint
          if (endpoint === 'categorization') {
            // Include both old categorizer and new tag-based tagger logs
            query = query.or('source.eq.reddit_categorizer,source.eq.reddit_tagger')
          } else if (endpoint === 'users') {
            query = query.or('source.eq.user_discovery,source.eq.api_user_discovery')
          }

          const response = await query
          data = response.data
          error = response.error
        } else {
          // Use legacy tables
          if (endpoint === 'categorization') {
            const response = await supabase
              .from('reddit_categorization_logs')
              .select('id, timestamp, subreddit_name, category_assigned, success')
              .order('timestamp', { ascending: false })
              .limit(maxLogs)
            data = response.data as RedditCategorizationLog[] | null
            error = response.error
          } else if (endpoint === 'users') {
            // Fetch from user_discovery_logs table for user activity
            const response = await supabase
              .from('user_discovery_logs')
              .select('id, timestamp, username, action, success, details, error')
              .order('timestamp', { ascending: false })
              .limit(maxLogs)
            data = response.data as UserDiscoveryLog[] | null
            error = response.error
          } else {
            const response = await supabase
              .from('reddit_scraper_logs')
              .select('id, timestamp, message, source, level, context')
              .eq('source', 'scraper')
              .order('timestamp', { ascending: false })
              .limit(maxLogs)
            data = response.data as RedditScraperLog[] | null
            error = response.error
          }
        }

        if (data && !error) {
          const mappedActivities: ApiActivity[] = data.map((log) => {
            let displayMessage = ''
            let status: 'success' | 'error' | 'pending' = 'success'

            if (useSystemLogs) {
              // Handle system_logs table structure
              const sysLog = log as any

              // Determine status from level
              if (sysLog.level === 'error' || sysLog.level === 'critical') {
                status = 'error'
              } else if (sysLog.level === 'warning') {
                status = 'pending'
              } else {
                status = 'success'
              }

              // Format message based on endpoint and context
              if (endpoint === 'categorization') {
                // Extract subreddit and category from message or context
                const context = sysLog.context || {}
                if (context.subreddit_name && context.category) {
                  displayMessage = `r/${context.subreddit_name} → ${context.category}`
                } else if (sysLog.message.includes('Categorizing')) {
                  const match = sysLog.message.match(/r\/([\w_]+)/)
                  displayMessage = match ? `Categorizing r/${match[1]}...` : sysLog.message
                } else {
                  displayMessage = sysLog.message
                }
              } else if (endpoint === 'users') {
                // Extract username from message or context
                const context = sysLog.context || {}
                if (context.username) {
                  displayMessage = `u/${context.username}: ${sysLog.message}`
                } else if (sysLog.message.includes('u/')) {
                  displayMessage = sysLog.message
                } else {
                  displayMessage = sysLog.message
                }
              } else {
                displayMessage = sysLog.message
              }

              return {
                id: sysLog.id.toString(),
                timestamp: sysLog.timestamp,
                endpoint,
                status,
                message: displayMessage.length > 100 ? displayMessage.substring(0, 97) + '...' : displayMessage,
                details: sysLog.context || {}
              }
            } else if (endpoint === 'categorization') {
              const catLog = log as RedditCategorizationLog
              if ('category_assigned' in catLog && catLog.category_assigned) {
                displayMessage = `r/${catLog.subreddit_name} → ${catLog.category_assigned}`
                status = catLog.success ? 'success' : 'error'
              } else if ('subreddit_name' in catLog && catLog.subreddit_name) {
                displayMessage = `Categorizing r/${catLog.subreddit_name}...`
                status = 'pending'
              } else {
                displayMessage = 'Processing categorization...'
                status = 'pending'
              }
              return {
                id: catLog.id,
                timestamp: catLog.timestamp,
                endpoint,
                status,
                message: displayMessage,
                details: {}
              }
            } else if (endpoint === 'users') {
              // Handle user discovery logs
              const userLog = log as UserDiscoveryLog
              status = userLog.success ? 'success' : 'error'

              // Format message based on action type
              switch (userLog.action) {
                case 'fetch_started':
                  displayMessage = `Fetching user u/${userLog.username}...`
                  status = 'pending'
                  break
                case 'reddit_api_success':
                  displayMessage = `Successfully fetched u/${userLog.username}`
                  break
                case 'quality_calculated':
                  const score = (userLog.details as any)?.scores?.overall_score
                  displayMessage = score
                    ? `u/${userLog.username} scored ${score.toFixed(2)}`
                    : `u/${userLog.username} quality calculated`
                  break
                case 'posts_fetched':
                  const postCount = (userLog.details as any)?.post_count
                  displayMessage = `Fetched ${postCount || 0} posts for u/${userLog.username}`
                  break
                case 'saved_to_database':
                  displayMessage = `u/${userLog.username} added to database`
                  break
                default:
                  displayMessage = userLog.error
                    ? `Failed: ${userLog.error}`
                    : `u/${userLog.username}: ${userLog.action}`
              }

              return {
                id: userLog.id.toString(),
                timestamp: userLog.timestamp,
                endpoint,
                status,
                message: displayMessage,
                details: (userLog.details as ApiActivityDetails) || {}
              }
            } else {
              const scrLog = log as RedditScraperLog
              displayMessage = scrLog.message || ''
              status = scrLog.level === 'ERROR' ? 'error' : 'success'

              return {
                id: scrLog.id,
                timestamp: scrLog.timestamp,
                endpoint,
                status,
                message: displayMessage,
                details: (scrLog.context as ApiActivityDetails) || {}
              }
            }
          })
          setActivities(mappedActivities)
        }
      } catch (err) {
        console.error('Error fetching activities from logs:', err)
      }
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 10000)
    return () => clearInterval(interval)
  }, [endpoint, maxLogs, useSystemLogs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'pending': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card className="border-gray-200/50 bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/40 backdrop-blur-xl shadow-xl">
      <div className="px-2 py-1 border-b border-gray-200/30">
        <h3 className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{title}</h3>
      </div>
      <CardContent className="p-0">
        <div
          ref={scrollAreaRef}
          className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          style={{ height }}
        >
          {activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[9px] text-gray-400">
              No recent activity
            </div>
          ) : (
            <div className="space-y-0.5 p-1">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-1 px-1 py-0.5 hover:bg-gray-100/50 rounded transition-colors">
                  <span className={`text-[8px] ${getStatusColor(activity.status)} mt-0.5`}>●</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-gray-700 truncate">
                      {activity.message}
                    </p>
                    <p className="text-[8px] text-gray-400">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}