
import { z } from 'zod'

// ============================================
// Common Validation Schemas
// ============================================

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).optional()
})

// ID validation
export const idSchema = z.object({
  id: z.string().min(1, 'ID is required')
})

// Search query validation
export const searchSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  searchTerm: z.string().min(1).max(100).optional()
})

// ============================================
// Reddit-specific Validation Schemas
// ============================================

// Subreddit review status
export const subredditReviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed', 'Banned'])
})

// Bulk subreddit review
export const bulkSubredditReviewSchema = z.object({
  subredditIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed', 'Banned'])
})

// Subreddit filters
export const subredditFiltersSchema = z.object({
  review: z.enum(['Ok', 'No Seller', 'Non Related', 'User Feed', 'Banned', 'null']).optional(),
  category_id: z.string().optional(),
  search: z.string().max(100).optional(),
  minSubscribers: z.coerce.number().min(0).optional(),
  maxSubscribers: z.coerce.number().min(0).optional(),
  nsfw: z.enum(['true', 'false', 'all']).optional(),
  sortBy: z.enum(['subscribers', 'engagement', 'avg_upvotes_per_post', 'created_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).merge(paginationSchema)

// ============================================
// User-specific Validation Schemas
// ============================================

// User search
export const userSearchSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  minKarma: z.coerce.number().min(0).optional(),
  maxKarma: z.coerce.number().min(0).optional(),
  is_creator: z.boolean().optional(),
  sortBy: z.enum(['total_karma', 'account_age_days', 'overall_user_score']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).merge(paginationSchema)

// Toggle creator status
export const toggleCreatorSchema = z.object({
  userId: z.coerce.number().int().positive(),
  isCreator: z.boolean()
})

// Bulk user update
export const bulkUserUpdateSchema = z.object({
  userIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  updates: z.object({
    our_creator: z.boolean().optional()
  })
})

// ============================================
// Category Validation Schemas
// ============================================

// Create/Update category
export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  icon: z.string().max(50).optional(),
  parent_id: z.string().optional()
})

// Category bulk operations
export const categoryBulkSchema = z.object({
  subredditIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  categoryId: z.string().min(1)
})

// Category merge
export const categoryMergeSchema = z.object({
  sourceIds: z.array(z.string().min(1)).min(1).max(10),
  targetId: z.string().min(1),
  deleteSource: z.boolean().default(false)
})

// Category rename
export const categoryRenameSchema = z.object({
  categoryId: z.string().min(1),
  newName: z.string().min(1).max(50)
})

// ============================================
// Instagram Validation Schemas
// ============================================

// Instagram creator filters
export const instagramFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  minFollowers: z.coerce.number().min(0).optional(),
  maxFollowers: z.coerce.number().min(0).optional(),
  niche: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  sortBy: z.enum(['follower_count', 'engagement_rate', 'created_at']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).merge(paginationSchema)

// Instagram creator review
export const instagramReviewSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'approved', 'rejected']),
  niche: z.string().optional(),
  notes: z.string().max(500).optional()
})

// ============================================
// Categorization Validation Schemas
// ============================================

// Start categorization
export const startCategorizationSchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(100).default(30),
  skipReviewed: z.boolean().default(true),
  model: z.enum(['gpt-3.5-turbo', 'gpt-4']).default('gpt-3.5-turbo')
})

// Tag categorization
export const tagCategorizationSchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(100).default(50),
  overwriteExisting: z.boolean().default(false)
})

// ============================================
// Scraper Validation Schemas
// ============================================

// Scraper start
export const scraperStartSchema = z.object({
  subreddit: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  timeframe: z.enum(['day', 'week', 'month', 'year', 'all']).default('week')
})

// Scraper account
export const scraperAccountSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  user_agent: z.string().min(1).max(200)
})

// ============================================
// Model Management Validation Schemas
// ============================================

// Create model
export const createModelSchema = z.object({
  name: z.string().min(1).max(100),
  reddit_username: z.string().min(1).max(50).optional(),
  instagram_username: z.string().min(1).max(50).optional(),
  twitter_username: z.string().min(1).max(50).optional(),
  tiktok_username: z.string().min(1).max(50).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional()
})

// Update model
export const updateModelSchema = createModelSchema.partial().extend({
  id: z.string().min(1)
})

// Delete model
export const deleteModelSchema = z.object({
  id: z.string().min(1)
})

// ============================================
// Filter Validation Schemas
// ============================================

// Filter stats
export const filterStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
})

// Whitelist filter
export const whitelistFilterSchema = z.object({
  subredditIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  reason: z.string().max(200).optional()
})

// Learning filter
export const learningFilterSchema = z.object({
  enabled: z.boolean(),
  threshold: z.coerce.number().min(0).max(1).default(0.7),
  minSamples: z.coerce.number().int().min(1).default(10)
})

// ============================================
// Helper Functions
// ============================================

/**
 * Validates request body against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data or throws error
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError<unknown>
      const errors = zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }
    throw error
  }
}

/**
 * Validates request body safely (returns result object)
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with data or error
 */
export function safeValidateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { data?: z.infer<T>; error?: string } {
  try {
    const validated = schema.parse(data)
    return { data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      return { error: `Validation failed: ${errors.join(', ')}` }
    }
    return { error: 'Unknown validation error' }
  }
}

/**
 * Creates a validated API route handler
 * @param schema - Zod schema for request validation
 * @param handler - Route handler function
 */
export function createValidatedRoute<T extends z.ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>, req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      // Parse request body
      const body = await req.json().catch(() => ({}))

      // Validate against schema
      const validated = schema.parse(body)

      // Call handler with validated data
      return await handler(validated, req)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        return Response.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        )
      }

      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}