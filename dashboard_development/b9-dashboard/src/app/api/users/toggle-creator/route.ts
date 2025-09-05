import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { id, our_creator } = await req.json()
    if (!id || typeof our_creator !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('users')
      .update({ our_creator })
      .eq('id', id)

    if (error) {
      console.error('Toggle creator error:', error)
      return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}


