'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'

interface ApiActivity {
  id: string
  timestamp: string
  endpoint: string
  status: 'success' | 'error' | 'pending'
  message: string
  details?: any
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
  maxLogs = 10
}: ApiActivityLogProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fetch real activity from Supabase
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        if (endpoint === 'users') {
          // Fetch recent user activities from reddit_users table
          const { data, error } = await supabase
            .from('reddit_users')
            .select('id, created_at, username, is_creator')
            .order('created_at', { ascending: false })
            .limit(maxLogs)

          if (data && !error) {
            const userActivities = data.map(user => ({
              id: user.id,
              timestamp: user.created_at,
              endpoint: 'users',
              status: 'success' as const,
              message: `${user.is_creator ? '✓ Creator' : 'User'}: u/${user.username}`
            }))
            setActivities(userActivities)
          }
        } else {
          // Fetch recent categorization activities from reddit_subreddits table
          const { data, error } = await supabase
            .from('reddit_subreddits')
            .select('id, created_at, display_name, category')
            .not('category', 'is', null)
            .order('created_at', { ascending: false })
            .limit(maxLogs)

          if (data && !error) {
            const catActivities = data.map(sub => ({
              id: sub.id,
              timestamp: sub.created_at,
              endpoint: 'categorization',
              status: 'success' as const,
              message: `r/${sub.display_name} → ${sub.category}`
            }))
            setActivities(catActivities)
          }
        }
      } catch (err) {
        console.error('Error fetching activities:', err)
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
          className="w-full overflow-y-auto overflow-x-auto"
          style={{ height }}
        >
          {activities.length === 0 ? (
            <div className="p-2 text-[9px] text-gray-500 text-center">
              No recent activity
            </div>
          ) : (
            <div className="p-1 space-y-0.5">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-1 text-[9px] py-0.5 px-1 rounded hover:bg-gray-200/30 transition-colors whitespace-nowrap"
                >
                  <span className="text-gray-400 min-w-fit text-[8px] flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }).replace('about ', '').replace(' ago', '')}
                  </span>
                  <span className={`${getStatusColor(activity.status)} truncate`}>
                    {activity.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}