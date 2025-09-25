'use client'


interface CategoryFilterPillsProps {
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
  onClearCategories: () => void
  subredditCounts?: Record<string, number>
  loading?: boolean
}

const CATEGORIES = [
  'Age Demographics',
  'Ass & Booty', 
  'Body Types & Features',
  'Boobs & Chest',
  'Clothed & Dressed',
  'Cosplay & Fantasy',
  'Ethnic & Cultural',
  'Feet & Foot Fetish',
  'Goth & Alternative',
  'Gym & Fitness',
  'Interactive & Personalized',
  'Lifestyle & Themes',
  'OnlyFans Promotion',
  'Selfie & Amateur',
  'Specific Body Parts'
]

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, string> = {
    'Age Demographics': '👥',
    'Ass & Booty': '🍑',
    'Body Types & Features': '💪',
    'Boobs & Chest': '👙',
    'Clothed & Dressed': '👗',
    'Cosplay & Fantasy': '🎭',
    'Ethnic & Cultural': '🌍',
    'Feet & Foot Fetish': '🦶',
    'Goth & Alternative': '🖤',
    'Gym & Fitness': '🏋️',
    'Interactive & Personalized': '💬',
    'Lifestyle & Themes': '✨',
    'OnlyFans Promotion': '📸',
    'Selfie & Amateur': '🤳',
    'Specific Body Parts': '👁️'
  }
  return iconMap[category] || '🏷️'
}

export function CategoryFilterPills({ 
  selectedCategories, 
  onCategoryToggle, 
  onClearCategories,
  subredditCounts = {},
  loading = false 
}: CategoryFilterPillsProps) {
  const hasSelectedCategories = selectedCategories.length > 0

  return (
    <div className="space-y-3">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Categories</h4>
        {hasSelectedCategories && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCategories}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            disabled={loading}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Category pills grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategories.includes(category)
          const count = subredditCounts[category] || 0
          const hasCount = count > 0
          
          return (
            <Button
              key={category}
              variant="ghost"
              onClick={() => onCategoryToggle(category)}
              disabled={loading || (!hasCount && !isSelected)}
              className="h-auto p-2 flex flex-col items-center justify-center text-center border transition-all duration-200 hover:scale-105"
              style={{
                background: isSelected 
                  ? 'linear-gradient(135deg, #FF8395, #FF6B80)'
                  : 'rgba(255, 255, 255, 0.8)',
                color: isSelected ? '#ffffff' : '#374151',
                border: isSelected ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: isSelected 
                  ? '0 2px 8px rgba(255, 131, 149, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 1px 4px rgba(0, 0, 0, 0.02)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                opacity: (!hasCount && !isSelected) ? 0.5 : 1,
                cursor: (!hasCount && !isSelected) ? 'not-allowed' : 'pointer',
              }}
              title={`${category} (${count} subreddits)`}
            >
              {/* Category icon */}
              <span className="text-lg mb-1" role="img" aria-label={category}>
                {getCategoryIcon(category)}
              </span>
              
              {/* Category name */}
              <span className="text-xs font-medium leading-tight">
                {category}
              </span>
              
              {/* Count badge */}
              <Badge 
                variant="secondary" 
                className="mt-1 text-xs font-medium border-0"
                style={{
                  background: isSelected 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.06)',
                  color: isSelected ? 'white' : 'rgba(0, 0, 0, 0.75)',
                }}
              >
                {loading ? '...' : count}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Selected categories summary */}
      {hasSelectedCategories && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/50">
          <span className="text-xs text-gray-600 font-medium">Selected:</span>
          {selectedCategories.map((category) => (
            <Badge
              key={category}
              variant="outline"
              className="text-xs bg-b9-pink/10 text-b9-pink border-b9-pink/20 hover:bg-b9-pink/20 cursor-pointer"
              onClick={() => onCategoryToggle(category)}
              title={`Remove ${category} filter`}
            >
              {getCategoryIcon(category)} {category}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}