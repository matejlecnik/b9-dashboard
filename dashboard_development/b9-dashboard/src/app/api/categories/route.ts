import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    // Check if we have a categories table, if not fall back to category_text approach
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (!categoriesError && categories) {
      // We have a categories table, use it
      return NextResponse.json({ 
        success: true, 
        categories 
      })
    }
    
    // Fall back to extracting categories from category_text field
    const { data, error } = await supabase
      .from('subreddits')
      .select('category_text')
      .not('category_text', 'is', null)
      .neq('category_text', '')
      .eq('review', 'Ok')
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch categories' 
      }, { status: 500 })
    }

    // Extract unique categories and count their usage
    const categoryMap = new Map<string, number>()
    data.forEach(item => {
      if (item.category_text) {
        categoryMap.set(item.category_text, (categoryMap.get(item.category_text) || 0) + 1)
      }
    })

    const categoryList = Array.from(categoryMap.entries()).map(([name, count]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      description: null,
      color: '#EC4899', // Default B9 pink
      usage_count: count,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })).sort((a, b) => b.usage_count - a.usage_count)

    return NextResponse.json({ 
      success: true, 
      categories: categoryList 
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/categories - Create a new category
export async function POST(request: Request) {
  try {
    const { name, description, color } = await request.json()
    
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
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    const categoryData = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#EC4899', // Default B9 pink
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert(categoryData)
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
    })

  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}