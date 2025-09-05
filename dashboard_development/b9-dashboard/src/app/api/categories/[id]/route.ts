import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// PUT - Update an existing category
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const categoryId = parseInt(id, 10)

    if (isNaN(categoryId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid category ID' 
      }, { status: 400 })
    }

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
    
    const updateData = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#EC4899',
      updated_at: new Date().toISOString()
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
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
        error: 'Failed to update category' 
      }, { status: 500 })
    }

    if (!category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Category not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      category 
    })

  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE - Delete a category
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const categoryId = parseInt(id, 10)

    if (isNaN(categoryId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid category ID' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // First check if any subreddits are using this category
    const { data: subredditsUsingCategory, error: checkError } = await supabase
      .from('subreddits')
      .select('id, name')
      .eq('category_id', categoryId)
      .limit(5) // Just need to know if any exist

    if (checkError) {
      console.error('Database error checking category usage:', checkError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check category usage' 
      }, { status: 500 })
    }

    if (subredditsUsingCategory && subredditsUsingCategory.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete category. ${subredditsUsingCategory.length} subreddit(s) are still using this category. Please reassign them first.`,
        subredditsCount: subredditsUsingCategory.length
      }, { status: 409 })
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (deleteError) {
      console.error('Database error:', deleteError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete category' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Category deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET - Get a specific category by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const categoryId = parseInt(id, 10)

    if (isNaN(categoryId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid category ID' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false, 
          error: 'Category not found' 
        }, { status: 404 })
      }
      
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch category' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      category 
    })

  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
