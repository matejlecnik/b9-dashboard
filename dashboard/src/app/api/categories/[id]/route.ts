import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'
import type { UpdateCategoryRequest, CategoryResponse } from '@/types/category'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Helper functions (consistent with main categories route)
function normalizeCategoryName(name: string): string {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ')
  return trimmed
    .split(' ')
    .map((word) => word.length === 0 ? '' : word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function normalizationKey(name: string): string {
  return (name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function validateCategoryName(name: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!name || typeof name !== 'string') {
    errors.push('Category name is required')
  } else {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      errors.push('Category name cannot be empty')
    } else if (trimmed.length > 100) {
      errors.push('Category name must be 100 characters or less')
    } else if (!/^[a-zA-Z0-9\s&\-_'.]+$/.test(trimmed)) {
      errors.push('Category name contains invalid characters')
    }
  }
  
  return { isValid: errors.length === 0, errors }
}

// Helper to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Allowed fields for category updates
type CategoryUpdateData = {
  name?: string
  normalized_name?: string
  color?: string
  parent_id?: string | null
  description?: string | null
  icon?: string | null
  sort_order?: number
}

// PATCH /api/categories/[id] - Update a category
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid category ID format' 
      }, { status: 400 })
    }

    const body = await request.json() as UpdateCategoryRequest
    const { name, description, color, icon, parent_id, sort_order } = body
    
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Check if category exists
    const { data: existingCategory, error: existingError } = await supabase
      .from('reddit_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch category' 
      }, { status: 500 })
    }

    if (!existingCategory) {
      return NextResponse.json({ 
        success: false, 
        error: 'Category not found' 
      }, { status: 404 })
    }

    const updateData: CategoryUpdateData = {}

    // Validate and update name if provided
    if (name !== undefined) {
      const validation = validateCategoryName(name)
      if (!validation.isValid) {
        return NextResponse.json({ 
          success: false, 
          error: validation.errors.join(', ')
        }, { status: 400 })
      }

      const normalizedName = normalizeCategoryName(name)
      const normalizedKey = normalizationKey(normalizedName)

      // Check for duplicates (excluding current category)
      if (normalizedKey !== existingCategory.normalized_name) {
        const { data: duplicate, error: duplicateError } = await supabase
          .from('reddit_categories')
          .select('id, name')
          .eq('normalized_name', normalizedKey)
          .neq('id', id)
          .maybeSingle()

        if (duplicateError && duplicateError.code !== 'PGRST116') {
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to validate category name' 
          }, { status: 500 })
        }

        if (duplicate) {
          return NextResponse.json({
            success: false,
            error: `A category with this name already exists: "${duplicate.name}"`,
            existing: duplicate
          }, { status: 409 })
        }
      }

      updateData.name = normalizedName
      updateData.normalized_name = normalizedKey
    }

    // Validate and update color if provided
    if (color !== undefined) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (color && !colorRegex.test(color)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Color must be a valid hex color (e.g., #FF8395)' 
        }, { status: 400 })
      }
      updateData.color = color || '#FF8395'
    }

    // Validate parent_id if provided
    if (parent_id !== undefined) {
      if (parent_id) {
        // Prevent circular references
        if (parent_id === id) {
          return NextResponse.json({ 
            success: false, 
            error: 'Category cannot be its own parent' 
          }, { status: 400 })
        }

        if (!isValidUUID(parent_id)) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid parent category ID format' 
          }, { status: 400 })
        }

        const { data: parent, error: parentError } = await supabase
          .from('reddit_categories')
          .select('id, parent_id')
          .eq('id', parent_id)
          .maybeSingle()

        if (parentError || !parent) {
          return NextResponse.json({ 
            success: false, 
            error: 'Parent category not found' 
          }, { status: 400 })
        }

        // Check for circular reference (parent trying to be child of its descendant)
        if (parent.parent_id === id) {
          return NextResponse.json({ 
            success: false, 
            error: 'Circular reference detected: parent category cannot be a child of this category' 
          }, { status: 400 })
        }
      }
      updateData.parent_id = parent_id
    }

    // Update other fields
    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (icon !== undefined) {
      updateData.icon = icon?.trim() || null
    }

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order
    }

    // If no updates were provided, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid fields to update' 
      }, { status: 400 })
    }

    // Perform the update
    const { data: category, error } = await supabase
      .from('reddit_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update category' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      category 
    } as CategoryResponse)

  } catch (_error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE - Delete a category
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid category ID format' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    // Check if category exists
    const { data: category, error: fetchError } = await supabase
      .from('reddit_categories')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch category' 
      }, { status: 500 })
    }

    if (!category) {
      return NextResponse.json({ 
        success: false, 
        error: 'Category not found' 
      }, { status: 404 })
    }

    // Check if any subreddits reference this category
    const { data: subredditsUsingCategory, error: subredditError } = await supabase
      .from('reddit_subreddits')
      .select('id')
      .eq('category_id', id)
      .limit(5)

    if (subredditError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check category usage' 
      }, { status: 500 })
    }

    const usingCount = subredditsUsingCategory?.length || 0

    // Check if any child categories exist
    const { data: childCategories, error: childError } = await supabase
      .from('reddit_categories')
      .select('id')
      .eq('parent_id', id)
      .limit(1)

    if (childError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check for child categories' 
      }, { status: 500 })
    }

    const hasChildren = childCategories && childCategories.length > 0

    if (usingCount > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete category. ${usingCount} subreddit(s) are still using this category. Please reassign them first.`,
        subredditsCount: usingCount
      }, { status: 409 })
    }

    if (hasChildren) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete category that has child categories. Please reassign or delete child categories first.'
      }, { status: 409 })
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('reddit_categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete category' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Category deleted successfully' 
    })

  } catch (_error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET /api/categories/[id] - Get a specific category
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid category ID format' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    const { data: category, error } = await supabase
      .from('reddit_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch category' 
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
    } as CategoryResponse)

  } catch (_error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
