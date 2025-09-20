import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { data: whitelist, error } = await supabase
      .from('subreddit_whitelist')
      .select(`
        *,
        subreddits (
          name,
          title,
          subscribers,
          review,
          primary_category
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching whitelist:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ whitelist })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { subreddit_name, reason = 'Manually added', added_by = 'user' } = await request.json()
    
    if (!subreddit_name) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }
    
    // Check if subreddit exists
    const { data: subreddit, error: subredditError } = await supabase
      .from('subreddits')
      .select('name')
      .eq('name', subreddit_name)
      .single()
    
    if (subredditError && subredditError.code !== 'PGRST116') {
      console.error('Error checking subreddit:', subredditError)
      return NextResponse.json({ error: subredditError.message }, { status: 500 })
    }
    
    if (!subreddit) {
      return NextResponse.json(
        { error: 'Subreddit not found in database' },
        { status: 404 }
      )
    }
    
    // Add to whitelist
    const { data, error } = await supabase
      .from('subreddit_whitelist')
      .insert({
        subreddit_name,
        reason,
        added_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Subreddit is already whitelisted' },
          { status: 409 }
        )
      }
      console.error('Error adding to whitelist:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update subreddit filter status
    await supabase
      .from('subreddits')
      .update({ 
        filter_status: 'whitelist',
        filter_reason: 'Added to whitelist',
        filtered_at: new Date().toISOString()
      })
      .eq('name', subreddit_name)
    
    return NextResponse.json({ whitelistEntry: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { searchParams } = new URL(request.url)
    const subreddit_name = searchParams.get('subreddit_name')
    
    if (!subreddit_name) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('subreddit_whitelist')
      .delete()
      .eq('subreddit_name', subreddit_name)
    
    if (error) {
      console.error('Error removing from whitelist:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update subreddit filter status to unprocessed so it can be re-filtered
    await supabase
      .from('subreddits')
      .update({ 
        filter_status: 'unprocessed',
        filter_reason: null,
        filtered_at: null
      })
      .eq('name', subreddit_name)
    
    return NextResponse.json({ message: 'Subreddit removed from whitelist successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}