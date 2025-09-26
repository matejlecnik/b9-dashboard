import { NextRequest, NextResponse } from 'next/server'

// Mock logs for Reddit dashboard endpoints
const mockLogs = [
  {
    timestamp: new Date().toISOString(),
    level: 'success',
    message: 'AI Categorization completed for 30 subreddits',
    context: { subreddits: 30, duration: '2.5s' }
  },
  {
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: 'info',
    message: 'User u/example_user added to tracking',
    context: { username: 'example_user' }
  },
  {
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: 'success',
    message: 'Subreddit search completed: 145 results',
    context: { results: 145 }
  },
  {
    timestamp: new Date(Date.now() - 180000).toISOString(),
    level: 'info',
    message: 'Dashboard stats calculated',
    context: {}
  },
  {
    timestamp: new Date(Date.now() - 240000).toISOString(),
    level: 'warning',
    message: 'Rate limit approaching for Reddit API',
    context: { remaining: 100 }
  },
  {
    timestamp: new Date(Date.now() - 300000).toISOString(),
    level: 'success',
    message: 'Bulk update completed for 50 subreddits',
    context: { updated: 50 }
  },
  {
    timestamp: new Date(Date.now() - 360000).toISOString(),
    level: 'info',
    message: 'User search returned 12 results',
    context: { count: 12 }
  },
  {
    timestamp: new Date(Date.now() - 420000).toISOString(),
    level: 'success',
    message: 'AI Categorization started for batch #234',
    context: { batch: 234 }
  }
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '20')

  // Return mock logs for now
  // In production, this would fetch from Redis or database
  return NextResponse.json({
    logs: mockLogs.slice(0, limit),
    total: mockLogs.length
  })
}