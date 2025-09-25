
import { NextRequest, NextResponse } from 'next/server'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

// Simple liveness probe - no authentication required
// Used by Kubernetes/Docker/monitoring systems to check if the app is alive
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  }, { status: 200 })
}