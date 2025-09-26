import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/index'

interface MergeCategoriesRequest {
  source_category_names: string[]  // Categories to merge (will be deleted)
  target_category_name: string     // Category to merge into (will be preserved)
  new_name?: string               // Optional: rename target category during merge
  delete_empty_sources?: boolean  // Whether to delete source categories after merge (default: true)
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

// Helper to validate UUID format
// Removed unused isValidUUID helper

// Minimal shape for categories used in this route
interface CategoryRow {
  id: string
  name: string
  normalized_name: string
  parent_id?: string | null
  usage_count?: number | null
}

// POST /api/categories/merge - Merge multiple categories into one
export async function POST(request: Request) {
  try {
    const body = await request.json() as MergeCategoriesRequest
    const { 
      source_category_names, 
      target_category_name, 
      new_name,
      delete_empty_sources = true 
    } = body
    
    // Validation
    if (!Array.isArray(source_category_names) || source_category_names.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Source categories must be a non-empty array' 
      }, { status: 400 })
    }

    if (source_category_names.length > 20) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot merge more than 20 categories at once' 
      }, { status: 400 })
    }

    // Validate target category name
    const targetValidation = validateCategoryName(target_category_name)
    if (!targetValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid target category name: ${targetValidation.errors.join(', ')}` 
      }, { status: 400 })
    }

    // Validate source category names
    for (const sourceName of source_category_names) {
      const validation = validateCategoryName(sourceName)
      if (!validation.isValid) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid source category name "${sourceName}": ${validation.errors.join(', ')}` 
        }, { status: 400 })
      }
    }

    // Validate new name if provided
    if (new_name) {
      const newNameValidation = validateCategoryName(new_name)
      if (!newNameValidation.isValid) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid new category name: ${newNameValidation.errors.join(', ')}` 
        }, { status: 400 })
      }
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Normalize names
    const normalizedTarget = normalizeCategoryName(target_category_name)
    const targetKey = normalizationKey(normalizedTarget)
    const normalizedSources = source_category_names.map(name => normalizeCategoryName(name))
    const sourceKeys = normalizedSources.map(name => normalizationKey(name))
    
    // Check that target is not in source list
    if (sourceKeys.includes(targetKey)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Target category cannot be included in source categories list' 
      }, { status: 400 })
    }

    // Find all categories by normalized names
    const allKeys = [targetKey, ...sourceKeys]
    const { data: foundCategories, error: findError } = await supabase
      .from('reddit_categories')
      .select('*')
      .in('normalized_name', allKeys)

    if (findError) {
      console.error('Error finding categories:', findError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to find categories' 
      }, { status: 500 })
    }

    // Organize found categories
    const categoryMap = new Map<string, CategoryRow>((foundCategories as CategoryRow[]).map((cat: CategoryRow) => [cat.normalized_name, cat]))
    const targetCategory = categoryMap.get(targetKey)
    
    if (!targetCategory) {
      return NextResponse.json({ 
        success: false, 
        error: `Target category "${normalizedTarget}" not found` 
      }, { status: 404 })
    }

    const sourceCategories: CategoryRow[] = sourceKeys
      .map(key => categoryMap.get(key))
      .filter((c): c is CategoryRow => Boolean(c))

    if (sourceCategories.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No source categories found' 
      }, { status: 404 })
    }

    const missingSourceNames = sourceKeys
      .filter(key => !categoryMap.has(key))
      .map(key => normalizedSources[sourceKeys.indexOf(key)])

    if (missingSourceNames.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Source categories not found: ${missingSourceNames.join(', ')}` 
      }, { status: 404 })
    }

    // Check if any source categories have child categories
    const sourceIds = sourceCategories.map((cat) => cat.id)
    const { data: childCategories, error: childError } = await supabase
      .from('reddit_categories')
      .select('id, name, parent_id')
      .in('parent_id', sourceIds)
      .limit(5)

    if (childError) {
      console.error('Error checking child categories:', childError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check for child categories' 
      }, { status: 500 })
    }

    if (childCategories && childCategories.length > 0) {
      const parentsWithChildren = Array.from(new Set(
        childCategories.map((child: { parent_id: string | null }) => {
          const parent = sourceCategories.find((cat) => cat.id === child.parent_id)
          return parent?.name
        })
      )).filter(Boolean) as string[]

      return NextResponse.json({ 
        success: false, 
        error: `Cannot merge categories that have child categories: ${parentsWithChildren.join(', ')}. Please reassign child categories first.` 
      }, { status: 409 })
    }

    // Perform the merge operation
    let totalSubredditsUpdated = 0
    let totalUsageCount = (targetCategory?.usage_count ?? 0)
    const mergeResults = []

    try {
      // 1. Update subreddits for each source category
      for (const sourceCategory of sourceCategories) {
        let subredditsUpdated = 0

        // Update subreddits by category_id
        const { data: subredditsByIdUpdate, error: subredditsByIdError } = await supabase
          .from('reddit_subreddits')
          .update({
            category_id: (targetCategory as CategoryRow).id,
            primary_category: new_name ? normalizeCategoryName(new_name) : (targetCategory as CategoryRow).name
          })
          .eq('category_id', sourceCategory.id)
          .select('id')

        if (subredditsByIdError) {
          console.warn(`Error updating subreddits for category ${sourceCategory.name}:`, subredditsByIdError)
        } else {
          subredditsUpdated += subredditsByIdUpdate?.length || 0
        }

        // Update subreddits by primary_category
        const { data: subredditsByPrimaryUpdate, error: subredditsByPrimaryError } = await supabase
          .from('reddit_subreddits')
          .update({
            category_id: (targetCategory as CategoryRow).id,
            primary_category: new_name ? normalizeCategoryName(new_name) : (targetCategory as CategoryRow).name
          })
          .ilike('primary_category', sourceCategory.name)
          .is('category_id', null)
          .select('id')

        if (subredditsByPrimaryError) {
          console.warn(
            `Error updating subreddits by primary_category for ${sourceCategory.name}:`,
            subredditsByPrimaryError
          )
        } else {
          subredditsUpdated += Array.isArray(subredditsByPrimaryUpdate) ? subredditsByPrimaryUpdate.length : 0
        }

        totalSubredditsUpdated += subredditsUpdated
        totalUsageCount += (sourceCategory.usage_count ?? 0)

        mergeResults.push({
          source_category: sourceCategory.name,
          subreddits_moved: subredditsUpdated
        })
      }

      // 2. Update target category with new usage count and optionally new name
      type TargetUpdates = { usage_count: number; updated_at: string; name?: string; normalized_name?: string }
      const targetUpdates: TargetUpdates = {
        usage_count: totalUsageCount,
        updated_at: new Date().toISOString()
      }

      if (new_name) {
        const normalizedNewName = normalizeCategoryName(new_name)
        const newNameKey = normalizationKey(normalizedNewName)

        // Check if new name conflicts with existing categories (excluding target and sources)
        const excludeIds = [(targetCategory as CategoryRow).id, ...sourceIds]
        const { data: conflictCategory, error: conflictError } = await supabase
          .from('reddit_categories')
          .select('id, name')
          .eq('normalized_name', newNameKey)
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .maybeSingle()

        if (conflictError && conflictError.code !== 'PGRST116') {
          console.warn('Error checking new name conflict:', conflictError)
        } else if (conflictCategory) {
          return NextResponse.json({
            success: false,
            error: `Cannot rename to "${normalizedNewName}" - a category with this name already exists`,
            existing_category: conflictCategory
          }, { status: 409 })
        }

        targetUpdates.name = normalizedNewName
        targetUpdates.normalized_name = newNameKey
      }

      const { data: updatedTargetCategory, error: updateTargetError } = await supabase
        .from('reddit_categories')
        .update(targetUpdates)
        .eq('id', (targetCategory as CategoryRow).id)
        .select()
        .single()

      if (updateTargetError) {
        console.error('Error updating target category:', updateTargetError)
        return NextResponse.json({
          success: false,
          error: 'Failed to update target category'
        }, { status: 500 })
      }

      // 3. Delete source categories if requested
      let deletedCategories: string[] = []
      if (delete_empty_sources) {
        const { error: deleteError } = await supabase
          .from('reddit_categories')
          .delete()
          .in('id', sourceIds)

        if (deleteError) {
          console.warn('Error deleting source categories:', deleteError)
        } else {
          deletedCategories = (sourceCategories as Array<{ name: string }>).map(cat => cat.name)
        }
      }

      return NextResponse.json({
        success: true,
        target_category: updatedTargetCategory,
        merge_results: mergeResults,
        total_subreddits_updated: totalSubredditsUpdated,
        deleted_categories: deletedCategories,
        message: `Successfully merged ${sourceCategories.length} categories into "${updatedTargetCategory.name}", updating ${totalSubredditsUpdated} subreddits`
      })

    } catch (transactionError) {
      console.error('Error during merge transaction:', transactionError)
      return NextResponse.json({
        success: false,
        error: 'Failed to complete category merge operation'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error merging categories:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}