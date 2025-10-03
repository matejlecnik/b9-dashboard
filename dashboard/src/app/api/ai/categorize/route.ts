import { NextResponse } from 'next/server'

// This API route has been deprecated - AI categorization is now handled by the backend API
// These endpoints exist only to maintain compatibility

// POST /api/ai/categorize - Deprecated
export async function POST(_request: Request) {
  return NextResponse.json({
    success: false,
    error: 'This endpoint has been moved to the backend API. Use /api/ai/categorization/start instead.',
    deprecated: true
  }, { status: 410 }) // Gone
}

// GET /api/ai/categorize - Deprecated  
export async function GET(_request: Request) {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been deprecated. AI categorization is now handled by the backend API.',
    deprecated: true
  }, { status: 410 }) // Gone
}

// PUT /api/ai/categorize - Deprecated
export async function PUT(_request: Request) {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been deprecated. Use the backend API for categorization feedback.',
    deprecated: true
  }, { status: 410 }) // Gone
}