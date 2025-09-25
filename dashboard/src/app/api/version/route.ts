import { publicApi } from '@/lib/api-wrapper'
import { NextResponse } from 'next/server'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

// API version information endpoint
export const GET = publicApi(async () => {
  return NextResponse.json({
    current_version: 'v1',
    supported_versions: ['v1'],
    deprecated_versions: [],
    api_endpoints: {
      v1: {
        base_url: '/api',
        reddit: '/api/reddit',
        instagram: '/api/instagram',
        models: '/api/models',
        health: '/api/health'
      }
    },
    migration_guide: 'https://docs.b9-dashboard.com/api/migration',
    deprecation_policy: 'APIs are deprecated with 90 days notice',
    timestamp: new Date().toISOString()
  })
})
