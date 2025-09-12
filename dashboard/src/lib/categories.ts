/**
 * Centralized Category System for B9 Dashboard
 * Single source of truth for all marketing categories
 */

// ============================================================================
// CATEGORY CONSTANTS
// ============================================================================

export const B9_CATEGORIES = [
  'Age Demographics',
  'Ass & Booty', 
  'Body Types & Features',
  'Boobs & Chest',
  'Clothed & Dressed',
  'Cosplay & Fantasy',
  'Ethnic & Cultural',
  'Feet & Foot Fetish',
  'Full Body & Nude',
  'Goth & Alternative',
  'Gym & Fitness',
  'Interactive & Personalized',
  'Lifestyle & Themes',
  'Lingerie & Underwear',
  'OnlyFans Promotion',
  'Selfie & Amateur',
  'Specific Body Parts'
] as const

// For components that need "All Categories" option
export const B9_CATEGORIES_WITH_ALL = [
  'All Categories',
  ...B9_CATEGORIES
] as const

// Fallback categories for when API is unavailable
export const FALLBACK_CATEGORIES = [...B9_CATEGORIES] as const

// ============================================================================
// CATEGORY UTILITIES
// ============================================================================

/**
 * Normalize category name to match API logic
 */
export function normalizeCategoryName(name: string): string {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ')
  return trimmed
    .split(' ')
    .map(w => w.length === 0 ? '' : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Validate if category name is in the approved list
 */
export function isValidCategory(category: string): boolean {
  const normalized = normalizeCategoryName(category)
  return (B9_CATEGORIES as readonly string[]).includes(normalized)
}

/**
 * Get category color based on category type
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'OnlyFans Promotion': 'bg-pink-500',
    'Selfie & Amateur': 'bg-blue-500',
    'Ass & Booty': 'bg-purple-500',
    'Boobs & Chest': 'bg-red-500',
    'Gym & Fitness': 'bg-green-500',
    'Goth & Alternative': 'bg-gray-800',
    'Age Demographics': 'bg-yellow-500',
    'Ethnic & Cultural': 'bg-orange-500'
  }
  
  return colorMap[category] || 'bg-gray-500'
}

/**
 * Get category display order for UI
 */
export function getCategoryDisplayOrder(): string[] {
  // Most important categories first for B9 business
  return [
    'OnlyFans Promotion',
    'Selfie & Amateur',
    'Ass & Booty',
    'Boobs & Chest',
    'Gym & Fitness',
    'Goth & Alternative',
    'Age Demographics',
    'Ethnic & Cultural',
    'Body Types & Features',
    'Clothed & Dressed',
    'Cosplay & Fantasy',
    'Feet & Foot Fetish',
    'Full Body & Nude',
    'Interactive & Personalized',
    'Lifestyle & Themes',
    'Lingerie & Underwear',
    'Specific Body Parts'
  ]
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export type CategoryName = typeof B9_CATEGORIES[number]
export type CategoryWithAll = typeof B9_CATEGORIES_WITH_ALL[number]

export interface CategoryInfo {
  name: CategoryName
  color: string
  displayOrder: number
  description?: string
}

/**
 * Get complete category information
 */
export function getCategoryInfo(category: string): CategoryInfo | null {
  if (!isValidCategory(category)) return null
  
  const displayOrder = getCategoryDisplayOrder()
  const order = displayOrder.indexOf(category)
  
  return {
    name: category as CategoryName,
    color: getCategoryColor(category),
    displayOrder: order >= 0 ? order : 999,
    description: getCategoryDescription(category)
  }
}

/**
 * Get category description for tooltips/help text
 */
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'OnlyFans Promotion': 'Communities focused on OnlyFans creator promotion and marketing',
    'Selfie & Amateur': 'Self-posted content and amateur photography communities',
    'Ass & Booty': 'Communities focused on posterior content and appreciation',
    'Boobs & Chest': 'Communities focused on chest and breast content',
    'Gym & Fitness': 'Fitness, workout, and athletic body communities',
    'Goth & Alternative': 'Alternative lifestyle and goth aesthetic communities',
    'Age Demographics': 'Communities organized by age groups or demographics',
    'Ethnic & Cultural': 'Communities focused on specific ethnicities or cultures'
  }
  
  return descriptions[category] || `${category} related content and communities`
}
