import { NextResponse } from 'next/server'

// This endpoint has been deprecated - AI categorization is now handled via the Render API
// Redirect users to use the new AI categorization endpoint

export async function POST() {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been deprecated. Use /api/ai/categorize-batch instead.',
    deprecated: true,
    redirect_to: '/api/ai/categorize-batch',
    message: 'AI categorization is now handled by the backend service for better performance and reliability.'
  }, { status: 410 }) // Gone
}

export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'This endpoint has been deprecated. Use /api/ai/categorize-batch instead.',
    deprecated: true,
    redirect_to: '/api/ai/categorize-batch'
  }, { status: 410 }) // Gone
}