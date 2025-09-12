import { NextResponse } from 'next/server'

// This API route has been deprecated - AI categorization is now handled by the Render backend API
// Use the new proxy endpoint for better integration

// POST /api/ai/categorize - Deprecated
export async function POST() {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been moved. Use /api/ai/categorize-batch instead.',
    deprecated: true,
    redirect_to: '/api/ai/categorize-batch',
    message: 'AI categorization now uses the Render backend API for improved performance and cost tracking.'
  }, { status: 410 }) // Gone
}

// GET /api/ai/categorize - Deprecated  
export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been deprecated. Use /api/ai/categorize-batch instead.',
    deprecated: true,
    redirect_to: '/api/ai/categorize-batch'
  }, { status: 410 }) // Gone
}

// PUT /api/ai/categorize - Deprecated
export async function PUT() {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been deprecated. Use /api/ai/categorize-batch instead.',
    deprecated: true,
    redirect_to: '/api/ai/categorize-batch'
  }, { status: 410 }) // Gone
}