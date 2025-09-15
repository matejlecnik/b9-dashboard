import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch detailed status from the Python API
    const apiUrl = 'https://b9-dashboard.onrender.com'
    const response = await fetch(`${apiUrl}/api/scraper/status-detailed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      // Return mock data for development with cycle information
      return NextResponse.json({
        enabled: false,
        status: 'stopped',
        statistics: {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          subreddits_processed: 0,
          posts_collected: 0,
          users_discovered: 0,
          daily_requests: 0,
          processing_rate_per_hour: 0
        },
        queue_depths: {
          priority: 0,
          new_discovery: 0,
          update: 0,
          user_analysis: 0
        },
        total_queue_depth: 0,
        accounts: {
          count: 0,
          proxies: 3
        },
        last_activity: null,
        config: {
          batch_size: 10,
          delay_between_batches: 30,
          max_daily_requests: 10000
        },
        cycle: {
          current_cycle: 0,
          cycle_start: null,
          elapsed_seconds: null,
          elapsed_formatted: null,
          last_cycle_duration: null,
          last_cycle_formatted: null,
          items_processed: 0,
          errors: 0
        }
      })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching scraper status:', error)

    // Return default status with cycle data
    return NextResponse.json({
      enabled: false,
      status: 'stopped',
      statistics: {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        subreddits_processed: 0,
        posts_collected: 0,
        users_discovered: 0,
        daily_requests: 0,
        processing_rate_per_hour: 0
      },
      queue_depths: {
        priority: 0,
        new_discovery: 0,
        update: 0,
        user_analysis: 0
      },
      total_queue_depth: 0,
      accounts: {
        count: 0,
        proxies: 3
      },
      last_activity: null,
      config: {
        batch_size: 10,
        delay_between_batches: 30,
        max_daily_requests: 10000
      },
      cycle: {
        current_cycle: 0,
        cycle_start: null,
        elapsed_seconds: null,
        elapsed_formatted: null,
        last_cycle_duration: null,
        last_cycle_formatted: null,
        items_processed: 0,
        errors: 0
      }
    })
  }
}