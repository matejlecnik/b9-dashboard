import { NextRequest, NextResponse } from 'next/server'

// Render service ID for the scraper service
const RENDER_SERVICE_ID = 'srv-d2vv90vdiees738q6mjg'
const RENDER_API_KEY = process.env.RENDER_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!action || !['start', 'stop', 'status'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "start", "stop", or "status"'
      }, { status: 400 })
    }

    // Check if we have Render API key
    if (!RENDER_API_KEY) {
      console.error('RENDER_API_KEY not set in environment variables')

      // Fallback to mock response for development
      return NextResponse.json({
        success: true,
        message: `Scraper ${action === 'start' ? 'started' : 'stopped'} successfully (mock mode)`,
        status: action === 'start' ? 'running' : 'stopped',
        scraperEnabled: action === 'start',
        warning: 'Running in mock mode - RENDER_API_KEY not configured'
      })
    }

    // For status check, get current env vars
    if (action === 'status') {
      try {
        const response = await fetch(
          `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars`,
          {
            headers: {
              'Authorization': `Bearer ${RENDER_API_KEY}`,
              'Accept': 'application/json'
            }
          }
        )

        if (!response.ok) {
          throw new Error(`Render API error: ${response.status}`)
        }

        const envVars = await response.json()
        const scraperVar = envVars.find((v: any) => v.key === 'SCRAPER_ENABLED')
        const isEnabled = scraperVar?.value === 'true'

        return NextResponse.json({
          success: true,
          status: isEnabled ? 'running' : 'stopped',
          scraperEnabled: isEnabled,
          message: `Scraper is ${isEnabled ? 'running' : 'stopped'}`,
          lastChecked: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error checking status:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to check scraper status'
        }, { status: 500 })
      }
    }

    // Update SCRAPER_ENABLED environment variable
    const scraperEnabled = action === 'start' ? 'true' : 'false'

    try {
      // First, get all existing env vars
      const getResponse = await fetch(
        `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars`,
        {
          headers: {
            'Authorization': `Bearer ${RENDER_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!getResponse.ok) {
        throw new Error(`Failed to get env vars: ${getResponse.status}`)
      }

      const currentEnvVars = await getResponse.json()

      // Update or add SCRAPER_ENABLED
      const updatedEnvVars = currentEnvVars.filter((v: any) => v.key !== 'SCRAPER_ENABLED')
      updatedEnvVars.push({
        key: 'SCRAPER_ENABLED',
        value: scraperEnabled
      })

      // Update all env vars (Render API requires sending all vars)
      const updateResponse = await fetch(
        `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${RENDER_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedEnvVars.map((v: any) => ({
            key: v.key,
            value: v.value
          })))
        }
      )

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        throw new Error(`Failed to update env vars: ${updateResponse.status} - ${errorText}`)
      }

      // Trigger a new deployment to apply the changes
      const deployResponse = await fetch(
        `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RENDER_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clearCache: false
          })
        }
      )

      if (!deployResponse.ok) {
        console.warn('Failed to trigger deployment, but env var was updated')
      }

      return NextResponse.json({
        success: true,
        message: `Scraper ${action === 'start' ? 'started' : 'stopped'} successfully`,
        status: action === 'start' ? 'running' : 'stopped',
        scraperEnabled: scraperEnabled === 'true',
        instruction: `SCRAPER_ENABLED set to ${scraperEnabled} on Render`,
        note: 'A new deployment has been triggered. The scraper will respond to this change within 1-2 minutes.',
        deploymentTriggered: deployResponse.ok
      })

    } catch (error) {
      console.error('Error updating Render env var:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scraper state'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Render control error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!RENDER_API_KEY) {
      return NextResponse.json({
        success: true,
        scraperEnabled: false,
        status: 'unknown',
        message: 'RENDER_API_KEY not configured - running in mock mode',
        warning: 'Cannot check actual scraper status without RENDER_API_KEY'
      })
    }

    // Get current env vars from Render
    const response = await fetch(
      `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars`,
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Render API error: ${response.status}`)
    }

    const envVars = await response.json()
    const scraperVar = envVars.find((v: any) => v.key === 'SCRAPER_ENABLED')
    const isEnabled = scraperVar?.value === 'true'

    return NextResponse.json({
      success: true,
      scraperEnabled: isEnabled,
      status: isEnabled ? 'running' : 'stopped',
      message: `Scraper is ${isEnabled ? 'running' : 'stopped'}`,
      lastChecked: new Date().toISOString(),
      renderServiceId: RENDER_SERVICE_ID
    })

  } catch (error) {
    console.error('Error getting Render status:', error)
    return NextResponse.json({
      success: false,
      scraperEnabled: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}