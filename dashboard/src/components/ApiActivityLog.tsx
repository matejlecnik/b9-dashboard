'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'

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
}

export function ApiActivityLog({
  title,
  endpoint,
  height = '120px',
  maxLogs = 20
}: ApiActivityLogProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fetch real activity from appropriate tables
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Check if supabase client is available
        if (!supabase) {
          console.error('Supabase client not initialized')
          return
        }

        let data, error

        if (endpoint === 'categorization') {
          // Fetch from reddit_categorization_logs for categorization
          const response = await supabase
            .from('reddit_categorization_logs')
            .select('id, timestamp, subreddit_name, category_assigned, success')
            .order('timestamp', { ascending: false })
            .limit(maxLogs)

          data = response.data
          error = response.error
        } else {
          // Fetch from reddit_scraper_logs for other endpoints
          const sourceFilter = endpoint === 'users' ? 'user_tracking' : 'scraper'

          const response = await supabase
            .from('reddit_scraper_logs')
            .select('id, timestamp, message, source, level, context')
            .eq('source', sourceFilter)
            .order('timestamp', { ascending: false })
            .limit(maxLogs)

          data = response.data
          error = response.error
        }

        if (data && !error) {
          const mappedActivities = data.map((log: any) => {
            let displayMessage = ''
            let status: 'success' | 'error' | 'pending' = 'success'

            if (endpoint === 'categorization') {
              // Handle data from reddit_categorization_logs table
              if ('category_assigned' in log && log.category_assigned) {
                displayMessage = `r/${log.subreddit_name} → ${log.category_assigned}`
                status = log.success ? 'success' : 'error'
              } else if ('subreddit_name' in log) {
                displayMessage = `Categorizing r/${log.subreddit_name}...`
                status = 'pending'
              } else {
                displayMessage = 'Processing categorization...'
                status = 'pending'
              }
            } else {
              // Handle data from reddit_scraper_logs table for users
              displayMessage = log.message || ''

              // Format message based on source and context
              if (log.source === 'user_tracking') {
                // For user tracking, focus on new users discovered
                if (log.context?.username) {
                  const username = log.context.username
                  displayMessage = `New user discovered: ${username.startsWith('u/') ? username : `u/${username}`}`
                } else if (log.message?.includes('toggle-creator')) {
                  const status = log.context?.new_status ? 'marked as creator' : 'unmarked as creator'
                  const username = log.context?.username || 'User'
                  displayMessage = `${username.startsWith('u/') ? username : `u/${username}`} ${status}`
                } else if (log.message?.includes('search')) {
                  const count = log.context?.results_count || 0
                  displayMessage = `Search: "${log.context?.query}" → ${count} results`
                }
              }

              status = log.level === 'ERROR' ? 'error' : 'success'
            }

            return {
              id: log.id,
              timestamp: log.timestamp,
              endpoint: endpoint,
              status: status,
              message: displayMessage,
              details: log.context || {}
            }
          })
          setActivities(mappedActivities)
        }
      } catch (err) {
        console.error('Error fetching activities from logs:', err)
      }
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [endpoint, maxLogs])

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