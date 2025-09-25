import { logger } from '@/lib/logger'
import { protectedApi } from '@/lib/api-wrapper'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

interface RenameCategoryRequest {
  old_name: string
  new_name: string
  update_subreddits?: boolean // Whether to update subreddits using this category
}

// Helper functions (consistent with other category routes)
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

// POST /api/categories/rename - Rename a category and optionally update subreddits
export const POST = protectedApi(async (request: NextRequest) => {
  try {
    const body = await request.json() as RenameCategoryRequest
    const { old_name, new_name, update_subreddits = true } = body
    
    // Validate both names
    const oldValidation = validateCategoryName(old_name)
    const newValidation = validateCategoryName(new_name)
    
    if (!oldValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid old category name: ${oldValidation.errors.join(', ')}` 
      }, { status: 400 })
    }
    
    if (!newValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid new category name: ${newValidation.errors.join(', ')}` 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Normalize names
    const normalizedOldName = normalizeCategoryName(old_name)
    const normalizedNewName = normalizeCategoryName(new_name)
    const oldKey = normalizationKey(normalizedOldName)
    const newKey = normalizationKey(normalizedNewName)

    // Check if old and new names are the same
    if (oldKey === newKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Old and new category names are identical' 
      }, { status: 400 })
    }

    // Find the category to rename by normalized_name
    const { data: existingCategory, error: findError } = await supabase
      .from('reddit_categories')
      .select('*')
      .eq('normalized_name', oldKey)
      .maybeSingle()

    if (findError) {
      logger.error('Error finding category:', findError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to find category' 
      }, { status: 500 })
    }

    if (!existingCategory) {
      return NextResponse.json({ 
        success: false, 
        error: `Category "${normalizedOldName}" not found` 
      }, { status: 404 })
    }

    // Check if new name already exists (excluding current category)
    const { data: conflictCategory, error: conflictError } = await supabase
      .from('reddit_categories')
      .select('id, name')
      .eq('normalized_name', newKey)
      .neq('id', existingCategory.id)
      .maybeSingle()

    if (conflictError && conflictError.code !== 'PGRST116') {
      logger.error('Error checking for conflicts:', conflictError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to validate new category name' 
      }, { status: 500 })
    }

    if (conflictCategory) {
      return NextResponse.json({
        success: false,
        error: `A category with the name "${conflictCategory.name}" already exists`,
        existing_category: conflictCategory
      }, { status: 409 })
    }

    // Start transaction-like operations
    let updatedCategory
    let subredditsUpdated = 0

    try {
      // 1. Update the category itself
      const { data: categoryUpdate, error: updateError } = await supabase
        .from('reddit_categories')
        .update({
          name: normalizedNewName,
          normalized_name: newKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCategory.id)
        .select()
        .single()

      if (updateError) {
        logger.error('Error updating category:', updateError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update category' 
        }, { status: 500 })
      }

      updatedCategory = categoryUpdate

      // 2. Update subreddits if requested
      if (update_subreddits) {
        // Update subreddits that reference this category by ID
        const { data: subredditsByIdUpdate, error: subredditsByIdError } = await supabase
          .from('reddit_subreddits')
          .update({
            primary_category: normalizedNewName // Update the primary_category field
          })
          .eq('category_id', existingCategory.id)
          .select('id')

        if (subredditsByIdError) {
          logger.warn('Error updating subreddits by category_id:', subredditsByIdError)
        } else {
          subredditsUpdated += subredditsByIdUpdate?.length || 0
        }

        // Also update subreddits that have the old category name in primary_category
        const { data: subredditsByPrimaryUpdate, error: subredditsByPrimaryError } = await supabase
          .from('reddit_subreddits')
          .update({
            primary_category: normalizedNewName
          })
          .ilike('primary_category', normalizedOldName)
          .is('category_id', null) // Only update those without category_id
          .select('id')

        if (subredditsByPrimaryError) {
          logger.warn('Error updating subreddits by primary_category:', subredditsByPrimaryError)
        } else {
          subredditsUpdated += subredditsByPrimaryUpdate?.length || 0
        }
      }

      return NextResponse.json({
        success: true,
        category: updatedCategory,
        subreddits_updated: subredditsUpdated,
        title: `Successfully renamed category from "${normalizedOldName}" to "${normalizedNewName}"${
          update_subreddits ? ` and updated ${subredditsUpdated} subreddits` : ''
        }`
      })

    } catch (transactionError) {
      logger.error('Error during rename transaction:', transactionError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to complete category rename operation' 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Error renaming category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})
