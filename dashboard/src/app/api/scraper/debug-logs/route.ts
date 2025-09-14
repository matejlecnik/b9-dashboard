import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get today's start
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get logs from today
    const { data: logs, error } = await supabase!
      .from('reddit_scraper_logs')
      .select('message, level, timestamp')
      .gte('timestamp', today.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Analyze the logs
    const stats = {
      total: logs?.length || 0,
      byLevel: {} as Record<string, number>,
      redditRequests: 0,
      successfulRedditRequests: 0,
      failedRedditRequests: 0,
      blockedRequests: 0,
      samples: {
        requests: [] as string[],
        successes: [] as string[],
        failures: [] as string[]
      }
    }

    const uniqueRedditRequests = new Set<string>()
    const uniqueRedditSuccesses = new Set<string>()
    const uniqueRedditFailures = new Set<string>()

    logs?.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1

      const msg = log.message

      // Track Reddit requests
      if (msg.includes('🔍 Request to:') && msg.includes('reddit.com')) {
        const urlMatch = msg.match(/Request to: (https?:\/\/[^\s]+reddit\.com[^\s]+)/)
        if (urlMatch) {
          uniqueRedditRequests.add(urlMatch[1])
          if (stats.samples.requests.length < 5) {
            stats.samples.requests.push(msg.substring(0, 200))
          }
        }
      }

      // Track successful Reddit responses
      if (msg.includes('reddit.com') && (
        msg.includes('200 OK') ||
        msg.includes('Successfully') ||
        msg.includes('✅') ||
        (msg.includes('Response') && !msg.includes('Failed') && !msg.includes('Error'))
      )) {
        const urlMatch = msg.match(/(https?:\/\/[^\s]+reddit\.com[^\s]+)/)
        if (urlMatch) {
          uniqueRedditSuccesses.add(urlMatch[1])
          if (stats.samples.successes.length < 5) {
            stats.samples.successes.push(msg.substring(0, 200))
          }
        }
      }

      // Track Reddit failures
      if (msg.includes('reddit.com') && (
        msg.includes('Failed request for') ||
        msg.includes('404 Client Error') ||
        msg.includes('403 Forbidden') ||
        msg.includes('429 Too Many Requests') ||
        msg.includes('Error')
      )) {
        const urlMatch = msg.match(/(https?:\/\/[^\s:]+reddit\.com[^\s:]+)/)
        if (urlMatch) {
          uniqueRedditFailures.add(urlMatch[1])
          if (stats.samples.failures.length < 5) {
            stats.samples.failures.push(msg.substring(0, 200))
          }

          if (msg.includes('403 Forbidden') || msg.includes('429 Too Many Requests')) {
            stats.blockedRequests++
          }
        }
      }
    })

    stats.redditRequests = uniqueRedditRequests.size
    stats.successfulRedditRequests = uniqueRedditSuccesses.size
    stats.failedRedditRequests = uniqueRedditFailures.size

    return NextResponse.json({
      ...stats,
      analysis: {
        totalLogs: stats.total,
        redditRequestsFound: stats.redditRequests,
        successfulRedditRequests: stats.successfulRedditRequests,
        failedRedditRequests: stats.failedRedditRequests,
        blockedRequests: stats.blockedRequests,
        successRate: stats.redditRequests > 0
          ? ((stats.redditRequests - stats.failedRedditRequests) / stats.redditRequests * 100).toFixed(1) + '%'
          : 'N/A',
        message: stats.successfulRedditRequests === 0
          ? '⚠️ No successful Reddit requests found in logs - they might not be logged'
          : '✅ Found both successful and failed requests'
      }
    })

  } catch (error) {
    console.error('Error analyzing logs:', error)
    return NextResponse.json({ error: 'Failed to analyze logs' }, { status: 500 })
  }
}