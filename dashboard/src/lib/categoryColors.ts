/**
 * Category color system using B9 brand colors
 * Light shades of pink and grey for subtle, professional highlighting
 */

export interface CategoryColor {
  bg: string // Background color class
  text: string // Text color class
  border: string // Border color class
}

// Define the color palette - very light shades of pink and grey
const CATEGORY_COLORS: Record<string, CategoryColor> = {
  // Pink shades - body/physical categories
  'Ass & Booty': {
    bg: 'bg-pink-50/50',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  'Boobs & Chest': {
    bg: 'bg-pink-50/40',
    text: 'text-pink-600',
    border: 'border-pink-100'
  },
  'Full Body & Nude': {
    bg: 'bg-rose-50/50',
    text: 'text-rose-700',
    border: 'border-rose-200'
  },
  'Feet & Foot Fetish': {
    bg: 'bg-pink-50/30',
    text: 'text-pink-600',
    border: 'border-pink-100'
  },
  'Specific Body Parts': {
    bg: 'bg-rose-50/40',
    text: 'text-rose-600',
    border: 'border-rose-100'
  },
  
  // Soft pink shades - appearance/style categories
  'Lingerie & Underwear': {
    bg: 'bg-pink-100/30',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  'Clothed & Dressed': {
    bg: 'bg-pink-50/60',
    text: 'text-pink-600',
    border: 'border-pink-150'
  },
  'Cosplay & Fantasy': {
    bg: 'bg-fuchsia-50/40',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200'
  },
  'Goth & Alternative': {
    bg: 'bg-purple-50/40',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  
  // Grey shades - demographic/lifestyle categories
  'Age Demographics': {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
  'Body Types & Features': {
    bg: 'bg-gray-100/50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  },
  'Ethnic & Cultural': {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200'
  },
  'Lifestyle & Themes': {
    bg: 'bg-gray-50/70',
    text: 'text-gray-600',
    border: 'border-gray-150'
  },
  'Gym & Fitness': {
    bg: 'bg-slate-50/60',
    text: 'text-slate-600',
    border: 'border-slate-150'
  },
  
  // Special categories - slightly stronger pink
  'OnlyFans Promotion': {
    bg: 'bg-pink-100/50',
    text: 'text-pink-800',
    border: 'border-pink-300'
  },
  'Selfie & Amateur': {
    bg: 'bg-pink-50/70',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  'Interactive & Personalized': {
    bg: 'bg-rose-100/40',
    text: 'text-rose-700',
    border: 'border-rose-200'
  },
  
  // Default fallback
  default: {
    bg: 'bg-gray-50/50',
    text: 'text-gray-600',
    border: 'border-gray-200'
  }
}

/**
 * Get color configuration for a category
 */
export function getCategoryColor(category: string): CategoryColor {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default
}

/**
 * Get inline styles for a category (for use in style prop)
 */
export function getCategoryStyles(category: string): {
  backgroundColor: string
  color: string
  borderColor: string
} {
  const colorMap: Record<string, { backgroundColor: string; color: string; borderColor: string }> = {
    // Pink shades - more visible
    'Ass & Booty': {
      backgroundColor: 'rgba(252, 231, 243, 0.8)',
      color: 'rgb(190, 24, 93)',
      borderColor: 'rgba(251, 207, 232, 0.5)'
    },
    'Boobs & Chest': {
      backgroundColor: 'rgba(252, 231, 243, 0.7)',
      color: 'rgb(219, 39, 119)',
      borderColor: 'rgba(252, 231, 243, 0.5)'
    },
    'Full Body & Nude': {
      backgroundColor: 'rgba(255, 241, 242, 0.8)',
      color: 'rgb(190, 18, 60)',
      borderColor: 'rgba(254, 205, 211, 0.5)'
    },
    'Feet & Foot Fetish': {
      backgroundColor: 'rgba(252, 231, 243, 0.6)',
      color: 'rgb(219, 39, 119)',
      borderColor: 'rgba(252, 231, 243, 0.4)'
    },
    'Specific Body Parts': {
      backgroundColor: 'rgba(255, 241, 242, 0.7)',
      color: 'rgb(225, 29, 72)',
      borderColor: 'rgba(255, 241, 242, 0.5)'
    },
    'Lingerie & Underwear': {
      backgroundColor: 'rgba(252, 231, 243, 0.8)',
      color: 'rgb(190, 24, 93)',
      borderColor: 'rgba(251, 207, 232, 0.5)'
    },
    'Clothed & Dressed': {
      backgroundColor: 'rgba(252, 231, 243, 0.9)',
      color: 'rgb(219, 39, 119)',
      borderColor: 'rgba(252, 231, 243, 0.5)'
    },
    'Cosplay & Fantasy': {
      backgroundColor: 'rgba(253, 244, 255, 0.7)',
      color: 'rgb(162, 28, 175)',
      borderColor: 'rgba(243, 232, 255, 0.5)'
    },
    'Goth & Alternative': {
      backgroundColor: 'rgba(250, 245, 255, 0.7)',
      color: 'rgb(126, 34, 206)',
      borderColor: 'rgba(233, 213, 255, 0.5)'
    },
    // Grey shades - more visible
    'Age Demographics': {
      backgroundColor: 'rgba(249, 250, 251, 1)',
      color: 'rgb(55, 65, 81)',
      borderColor: 'rgba(229, 231, 235, 0.8)'
    },
    'Body Types & Features': {
      backgroundColor: 'rgba(243, 244, 246, 0.9)',
      color: 'rgb(55, 65, 81)',
      borderColor: 'rgba(229, 231, 235, 0.6)'
    },
    'Ethnic & Cultural': {
      backgroundColor: 'rgba(248, 250, 252, 1)',
      color: 'rgb(51, 65, 85)',
      borderColor: 'rgba(226, 232, 240, 0.8)'
    },
    'Lifestyle & Themes': {
      backgroundColor: 'rgba(249, 250, 251, 0.95)',
      color: 'rgb(75, 85, 99)',
      borderColor: 'rgba(229, 231, 235, 0.6)'
    },
    'Gym & Fitness': {
      backgroundColor: 'rgba(248, 250, 252, 0.9)',
      color: 'rgb(71, 85, 105)',
      borderColor: 'rgba(226, 232, 240, 0.6)'
    },
    // Special categories - more visible
    'OnlyFans Promotion': {
      backgroundColor: 'rgba(252, 231, 243, 1)',
      color: 'rgb(159, 18, 57)',
      borderColor: 'rgba(251, 207, 232, 0.8)'
    },
    'Selfie & Amateur': {
      backgroundColor: 'rgba(252, 231, 243, 0.95)',
      color: 'rgb(190, 24, 93)',
      borderColor: 'rgba(251, 207, 232, 0.7)'
    },
    'Interactive & Personalized': {
      backgroundColor: 'rgba(254, 205, 211, 0.7)',
      color: 'rgb(190, 18, 60)',
      borderColor: 'rgba(254, 205, 211, 0.5)'
    }
  }
  
  return colorMap[category] || {
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    color: 'rgb(75, 85, 99)',
    borderColor: 'rgb(229, 231, 235)'
  }
}

/**
 * Get all available categories with their colors
 */
export function getAllCategoryColors(): Array<{ name: string; color: CategoryColor }> {
  return Object.entries(CATEGORY_COLORS)
    .filter(([key]) => key !== 'default')
    .map(([name, color]) => ({ name, color }))
}