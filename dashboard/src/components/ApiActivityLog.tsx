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

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        if (!supabase) {
          console.error('Supabase client not initialized')
          return
        }

        let data: RedditCategorizationLog[] | RedditScraperLog[] | null = null
        let error: unknown = null

        if (endpoint === 'categorization') {
          const response = await supabase
            .from('reddit_categorization_logs')
            .select('id, timestamp, subreddit_name, category_assigned, success')
            .order('timestamp', { ascending: false })
            .limit(maxLogs)
          data = response.data as RedditCategorizationLog[] | null
          error = response.error
        } else {
          const sourceFilter = endpoint === 'users' ? 'user_tracking' : 'scraper'
          const response = await supabase
            .from('reddit_scraper_logs')
            .select('id, timestamp, message, source, level, context')
            .eq('source', sourceFilter)
            .order('timestamp', { ascending: false })
            .limit(maxLogs)
          data = response.data as RedditScraperLog[] | null
          error = response.error
        }

        if (data && !error) {
          const mappedActivities: ApiActivity[] = data.map((log) => {
            let displayMessage = ''
            let status: 'success' | 'error' | 'pending' = 'success'

            if (endpoint === 'categorization') {
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
            } else {
              const scrLog = log as RedditScraperLog
              displayMessage = scrLog.message || ''

              if (scrLog.source === 'user_tracking') {
                const context = scrLog.context as Record<string, unknown> | undefined
                if (context?.username && typeof context.username === 'string') {
                  const username = context.username
                  displayMessage = `New user discovered: ${username.startsWith('u/') ? username : `u/${username}`}`
                } else if (scrLog.message?.includes('toggle-creator')) {
                  const newStatus = context?.new_status ? 'marked as creator' : 'unmarked as creator'
                  const username = typeof context?.username === 'string' ? context.username : 'User'
                  displayMessage = `${username.startsWith('u/') ? username : `u/${username}`} ${newStatus}`
                } else if (scrLog.message?.includes('search')) {
                  const count = typeof context?.results_count === 'number' ? context.results_count : 0
                  displayMessage = `Search: "${context?.query ?? ''}" → ${count} results`
                }
              }

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