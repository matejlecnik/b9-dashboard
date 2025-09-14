import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const lines = parseInt(searchParams.get('lines') || '100')

    // Fetch logs from the Python API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/api/scraper/logs?lines=${lines}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      // If API is not available, return mock data for development
      if (response.status === 404 || response.status === 500) {
        return NextResponse.json({
          success: true,
          logs: [
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '🚀 Scraper service ready',
              source: 'system'
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Waiting for start command...',
              source: 'scraper'
            }
          ]
        })
      }
      throw new Error(`Failed to fetch logs: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform log data if needed
    const logs = data.logs || []
    const transformedLogs = logs.map((log: any) => {
      // Parse log line if it's a string
      if (typeof log === 'string') {
        // Try to parse structured log format
        const match = log.match(/\[([\d-T:.Z]+)\] \[(\w+)\] (.+)/)
        if (match) {
          return {
            timestamp: match[1],
            level: match[2].toLowerCase(),
            message: match[3],
            source: 'scraper'
          }
        }

        // Fallback for unstructured logs
        return {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: log,
          source: 'scraper'
        }
      }

      // Already structured
      return log
    })

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      lines: lines
    })

  } catch (error) {
    console.error('Error fetching scraper logs:', error)

    // Return error with some context
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch logs',
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
          source: 'system'
        }
      ]
    }, { status: 500 })
  }
}

// Support POST for clearing logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action || 'clear'

    if (action === 'clear') {
      // Clear logs via Python API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/scraper/logs/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to clear logs')
      }

      return NextResponse.json({
        success: true,
        message: 'Logs cleared successfully'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Error clearing logs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear logs'
    }, { status: 500 })
  }
}