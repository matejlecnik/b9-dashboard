'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tag, AlertCircle } from 'lucide-react'

// Module-level single-flight cache to dedupe concurrent fetches across many mounts
declare global {
  // Using global vars allows cache to survive HMR/route transitions without `any`
  // eslint-disable-next-line no-var
  var __b9_categories_cache_names: string[] | null | undefined
  // eslint-disable-next-line no-var
  var __b9_categories_cache_promise: Promise<string[]> | null | undefined
}

const __categoriesCacheNames: string[] | null = globalThis.__b9_categories_cache_names ?? null
const __categoriesFetchPromise: Promise<string[]> | null = globalThis.__b9_categories_cache_promise ?? null

globalThis.__b9_categories_cache_names = __categoriesCacheNames
globalThis.__b9_categories_cache_promise = __categoriesFetchPromise

interface CategorySelectorProps {
  subredditId: number
  currentCategory: string | null
  onUpdateCategory: (id: number, categoryText: string) => void
  compact?: boolean
}

// (Optional) Could add fallback categories if API is unavailable

export function CategorySelector({ 
  subredditId, 
  currentCategory, 
  onUpdateCategory,
  compact = false
}: CategorySelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Special token used to represent clearing the selection (cannot use empty string in SelectItem)
  const CLEAR_VALUE = '__UNCATEGORIZED__'
  const selectedValue = currentCategory && currentCategory.length > 0 ? currentCategory : CLEAR_VALUE

  // Using module-level single-flight cache above

  const handleCategorySelect = async (value: string) => {
    if (value === 'create-new') {
      setIsCreating(true)
      return
    }

    const nextCategoryText = value === CLEAR_VALUE ? '' : value
    if (nextCategoryText === (currentCategory || '')) return

    setIsUpdating(true)
    try {
      await onUpdateCategory(subredditId, nextCategoryText)
    } catch (error) {
      console.error('Error updating category:', error)
      // Show error feedback to user
      alert('Failed to update category. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateCategory = () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return

    // Check if category already exists
    if ((options || []).includes(trimmedName)) {
      alert('Category already exists!')
      return
    }

    // Optimistically add to options
    setOptions(prev => Array.from(new Set([...(prev || []), trimmedName])))
    
    // Automatically assign to current subreddit (will persist via subreddits.category_text)
    onUpdateCategory(subredditId, trimmedName)
    
    // Reset form
    setNewCategoryName('')
    setIsCreating(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateCategory()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewCategoryName('')
    }
  }

  if (isUpdating) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-b9-pink"></div>
        <span className="text-sm text-muted-foreground">Updating...</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {currentCategory && (
          <Badge 
            className="border text-xs px-2 py-0.5 bg-b9-pink/10 text-b9-pink border-b9-pink/20"
            variant="outline"
          >
            <Tag className="w-3 h-3 mr-1" />
            {currentCategory}
          </Badge>
        )}
        
        {isCreating ? (
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => {
                if (newCategoryName.trim()) {
                  handleCreateCategory()
                } else {
                  setIsCreating(false)
                }
              }}
              placeholder="New category..."
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-b9-pink focus:border-transparent"
              maxLength={50}
              autoFocus
            />
          </div>
        ) : (
          <Select
            value={selectedValue}
            onValueChange={handleCategorySelect}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {/* Allow clearing category */}
              <SelectItem value={CLEAR_VALUE}>
                Uncategorized
              </SelectItem>
              {options.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
              <SelectItem value="create-new">
                <span className="text-b9-pink">+ Add new</span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2">
      {/* Current category display */}
      {currentCategory && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Current:</span>
          <Badge 
            className="border text-sm px-2 py-1 bg-b9-pink/10 text-b9-pink border-b9-pink/20"
            variant="outline"
          >
            <Tag className="w-3 h-3 mr-1" />
            {currentCategory}
          </Badge>
        </div>
      )}

      {/* Category selection */}
      {isCreating ? (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              New Category Name
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent"
              placeholder="e.g. Booty, Selfies, etc."
              maxLength={50}
              autoFocus
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-1 bg-b9-pink text-white text-xs rounded hover:bg-b9-pink/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewCategoryName('')
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Select
            value={selectedValue}
            onValueChange={handleCategorySelect}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {/* Allow clearing category */}
              <SelectItem value={CLEAR_VALUE}>
                <div className="flex items-center space-x-2">
                  <Tag className="w-3 h-3" />
                  <span>Uncategorized</span>
                </div>
              </SelectItem>
              {options.map((category) => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3 h-3" />
                    <span>{category}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="create-new">
                <span className="text-b9-pink">+ Create new category</span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {!currentCategory && (
            <div className="flex items-center space-x-1 text-amber-600 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>This subreddit needs a category</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
