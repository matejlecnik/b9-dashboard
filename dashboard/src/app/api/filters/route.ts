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
    
    const { data: filterSettings, error } = await supabase
      .from('filter_settings')
      .select('*')
      .order('category', { ascending: true })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ filterSettings })
  } catch (_error) {
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
    
    const { category, keywords, is_active = true, weight = 1.0 } = await request.json()
    
    if (!category || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Category and keywords array are required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('filter_settings')
      .insert({
        category,
        keywords,
        is_active,
        weight,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ filterSetting: data }, { status: 201 })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const { id, category, keywords, is_active, weight } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Filter setting ID is required' },
        { status: 400 }
      )
    }
    
    const updateData: {
      updated_at: string
      category?: string
      keywords?: string[]
      is_active?: boolean
      weight?: number
    } = {
      updated_at: new Date().toISOString()
    }
    
    if (category !== undefined) updateData.category = category
    if (keywords !== undefined) updateData.keywords = keywords
    if (is_active !== undefined) updateData.is_active = is_active
    if (weight !== undefined) updateData.weight = weight
    
    const { data, error } = await supabase
      .from('filter_settings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ filterSetting: data })
  } catch (_error) {
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
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Filter setting ID is required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('filter_settings')
      .delete()
      .eq('id', id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'Filter setting deleted successfully' })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}