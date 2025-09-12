export interface Category {
  id: string
  name: string
  normalized_name: string
  description?: string | null
  color: string
  icon?: string | null
  usage_count: number
  parent_id?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[]
}

export interface CategoryUsageStats {
  total_subreddits: number
  avg_engagement: number
  success_rate: number
  growth_rate: number
}

export interface CategoryPerformance extends Category {
  stats: CategoryUsageStats
}

// API Response types
export interface CategoriesResponse {
  success: boolean
  categories: Category[]
  total_count?: number
  error?: string
}

export interface CategoryResponse {
  success: boolean
  category?: Category
  error?: string
}

// Request types for API operations
export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  icon?: string
  parent_id?: string
  sort_order?: number
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string
}

export interface MergeCategoriesRequest {
  source_category_ids: string[]
  target_category_id: string
  new_name?: string
}

// Helper type for category validation
export interface CategoryValidation {
  is_valid: boolean
  errors: string[]
  suggestions?: string[]
}