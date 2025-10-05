import { NextResponse } from 'next/server'

// This API route has been deprecated - AI categorization is now handled by the backend API
// These endpoints exist only to maintain compatibility

// POST /api/ai/bulk-categorize - Deprecated
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint has been moved to the backend API. Use /api/ai/categorization/start instead.',
    deprecated: true,
    newEndpoint: '/api/ai/categorization/start'
  }, { status: 410 }) // Gone
}

// GET /api/ai/bulk-categorize - Deprecated
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint has been deprecated. Use the backend API for categorization status.',
    deprecated: true,
    newEndpoint: '/api/ai/categorization/status'
  }, { status: 410 }) // Gone
}