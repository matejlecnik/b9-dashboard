import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import type { CreateCategoryRequest, CategoriesResponse } from '@/types/category'

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
export async function GET(request: Request) {
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
    
    // Try to fetch from the new categories table first
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })
    
    if (!categoriesError && categories && categories.length > 0) {
      type CategoryRow = {
        id: string
        name: string
        normalized_name: string
        description: string | null
        color: string | null
        icon: string | null
        usage_count: number | null
        parent_id: string | null
        sort_order: number | null
        created_at: string
        updated_at: string
      }
      let categoryList = (categories as CategoryRow[]).map((cat: CategoryRow) => ({
        id: cat.id,
        name: cat.name,
        normalized_name: cat.normalized_name,
        description: cat.description,
        color: cat.color || '#FF8395',
        icon: cat.icon,
        usage_count: cat.usage_count || 0,
        parent_id: cat.parent_id,
        sort_order: cat.sort_order || 0,
        created_at: cat.created_at,
        updated_at: cat.updated_at
      }))

      // Filter by search if provided (case-insensitive)
      if (search) {
        const s = search.toLowerCase()
        categoryList = categoryList.filter((c: { name: string; description: string | null }) => {
          return (c.name || '').toLowerCase().includes(s) ||
                 (c.description || '').toLowerCase().includes(s)
        })
      }

      if (limit) categoryList = categoryList.slice(0, limit)

      return NextResponse.json({ 
        success: true, 
        categories: categoryList,
        total_count: categories.length
      } as CategoriesResponse)
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

    // Extract unique categories and count their usage (normalized)
    const dedupCounts = new Map<string, { name: string; count: number }>()
    for (const item of data) {
      if (!item || !item.category_text) continue
      const key = normalizationKey(item.category_text)
      if (!key) continue
      const canonicalName = normalizeCategoryName(item.category_text)
      const existing = dedupCounts.get(key)
      if (existing) {
        existing.count += 1
        // Prefer the most common casing by count; keep name with higher frequency
        if (canonicalName.length > 0 && existing.name !== canonicalName && existing.count % 5 === 0) {
          existing.name = canonicalName
        }
      } else {
        dedupCounts.set(key, { name: canonicalName, count: 1 })
      }
    }

    let categoryList = Array.from(dedupCounts.entries()).map(([key, { name, count }]) => ({
      id: key.replace(/[^a-z0-9]/g, '-'),
      name,
      description: null,
      color: '#FF8395', // Default B9 pink
      usage_count: count,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Filter by search if provided
    if (search) {
      const s = search.toLowerCase()
      categoryList = categoryList.filter((c) => (c.name || '').toLowerCase().includes(s))
    }

    // Sort and limit
    categoryList.sort((a, b) => {
      if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count
      return a.name.localeCompare(b.name)
    })
    if (limit) categoryList = categoryList.slice(0, limit)

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
      .from('categories')
      .select('id, name')
      .eq('normalized_name', normalizedKey)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking for duplicates:', existingError)
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
        .from('categories')
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