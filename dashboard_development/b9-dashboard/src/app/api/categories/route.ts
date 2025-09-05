import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export interface Category {
  id: number
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

// GET - Fetch all categories
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch categories' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      categories: categories || [] 
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Category name is required' 
      }, { status: 400 })
    }

    // Validate color format (hex color)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (color && !colorRegex.test(color)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Color must be a valid hex color (e.g., #EC4899)' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    const categoryData = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#EC4899' // Default to pink
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          success: false, 
          error: 'A category with this name already exists' 
        }, { status: 409 })
      }
      
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create category' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      category 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
