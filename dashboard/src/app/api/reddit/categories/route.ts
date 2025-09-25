import { logger } from '@/lib/logger'
import { protectedApi } from '@/lib/api-wrapper'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Prevent static generation of API routes
export const dynamic = 'force-dynamic'

interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  icon?: string
  parent_id?: string | null
  sort_order?: number
}

// Helper: normalize category names to a canonical display form (Title Case, trimmed, single spaces)
function normalizeCategoryName(name: string): string {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ')
  // Title Case words, preserve symbols like &
  return trimmed
    .split(' ')
    .map((word) => word.length === 0 ? '' : word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper: key for deduplication (case/whitespace-insensitive)
function normalizationKey(name: string): string {
  return (name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// Helper: validate category name
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

// GET /api/categories - Get all categories
export const GET = protectedApi(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }
    
    // Parse query params
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') || '').trim()
    const limitParam = url.searchParams.get('limit')
    let limit = typeof limitParam === 'string' ? parseInt(limitParam, 10) : undefined
    if (isNaN(limit as number) || (limit as number) <= 0) limit = undefined
    // Safety cap
    if ((limit as number) && (limit as number) > 2000) limit = 2000
    
    // Manually extract tags from JSONB arrays (RPC not needed for now)
    {
      // Manually extract tags from JSONB arrays
      const { data: subreddits, error } = await supabase
        .from('reddit_subreddits')
        .select('tags')
        .eq('review', 'Ok')
        .not('tags', 'is', null)
        .gt('tags', '[]')
        .limit(5000)

      if (error) {
        logger.error('Database error:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch tags'
        }, { status: 500 })
      }

      // Extract and count unique tags
      const tagCounts = new Map<string, number>()

      for (const item of subreddits || []) {
        if (Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            if (typeof tag === 'string') {
              const count = tagCounts.get(tag) || 0
              tagCounts.set(tag, count + 1)
            }
          }
        }
      }

      // Convert to category list format
      let categoryList = Array.from(tagCounts.entries()).map(([tag, count]) => ({
        id: tag.replace(/[^a-z0-9:_-]/gi, '-'),
        name: tag,
        description: null,
        color: '#FF8395',
        usage_count: count,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Filter by search if provided
      if (search) {
        const s = search.toLowerCase()
        categoryList = categoryList.filter(c => c.name.toLowerCase().includes(s))
      }

      // Sort by usage count and name
      categoryList.sort((a, b) => {
        if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count
        return a.name.localeCompare(b.name)
      })

      if (limit) categoryList = categoryList.slice(0, limit)

      return NextResponse.json({
        success: true,
        categories: categoryList,
        total_count: categoryList.length
      })
    }
    // If we reach here, something went wrong
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch categories'
    }, { status: 500 })

  } catch (error) {
    logger.error('Error fetching categories:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})

// POST /api/categories - Create a new category
export const POST = protectedApi(async (request: NextRequest) => {
  try {
    const body = await request.json() as CreateCategoryRequest
    const { name, description, color, icon, parent_id, sort_order } = body
    
    // Validate category name
    const validation = validateCategoryName(name)
    if (!validation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: validation.errors.join(', ')
      }, { status: 400 })
    }

    // Validate color format (hex color)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (color && !colorRegex.test(color)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Color must be a valid hex color (e.g., #FF8395)' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available' 
      }, { status: 503 })
    }

    // Normalize and prevent case-insensitive duplicates
    const normalizedName = normalizeCategoryName(name)
    const normalizedKey = normalizationKey(normalizedName)

    // Check for duplicates using normalized_name
    const { data: existing, error: existingError } = await supabase
      .from('reddit_categories')
      .select('id, name')
      .eq('normalized_name', normalizedKey)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      logger.error('Error checking for duplicates:', existingError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to validate category' 
      }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `A category with this name already exists: "${existing.name}"`,
        existing: existing
      }, { status: 409 })
    }

    // If parent_id is provided, validate it exists
    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('reddit_categories')
        .select('id')
        .eq('id', parent_id)
        .maybeSingle()

      if (parentError || !parent) {
        return NextResponse.json({ 
          success: false, 
          error: 'Parent category not found' 
        }, { status: 400 })
      }
    }

    const categoryData = {
      name: normalizedName,
      normalized_name: normalizedKey,
      description: description?.trim() || null,
      color: color || '#FF8395',
      icon: icon?.trim() || null,
      parent_id: parent_id || null,
      sort_order: sort_order || 0,
      usage_count: 0
    }

    const { data: category, error } = await supabase
      .from('reddit_categories')
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
      
      logger.error('Database error:', error)
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
    logger.error('Error creating category:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})
