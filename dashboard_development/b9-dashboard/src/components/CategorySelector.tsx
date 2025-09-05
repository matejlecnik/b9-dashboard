'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Tag, AlertCircle } from 'lucide-react'
import { type Category } from '@/app/api/categories/route'

interface CategorySelectorProps {
  subredditId: number
  currentCategory: Category | null
  onUpdateCategory: (id: number, categoryId: number) => void
  compact?: boolean
}

interface NewCategoryForm {
  name: string
  description: string
  color: string
}

export function CategorySelector({ 
  subredditId, 
  currentCategory, 
  onUpdateCategory,
  compact = false
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCategory, setNewCategory] = useState<NewCategoryForm>({
    name: '',
    description: '',
    color: '#EC4899'
  })
  const [creatingCategory, setCreatingCategory] = useState(false)

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/categories')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.categories)
      } else {
        console.error('Failed to fetch categories:', data.error)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handleCategorySelect = async (categoryId: string) => {
    if (!categoryId || categoryId === 'create-new') return

    setIsUpdating(true)
    try {
      await onUpdateCategory(subredditId, parseInt(categoryId, 10))
    } catch (error) {
      console.error('Error updating category:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return

    setCreatingCategory(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory)
      })

      const data = await response.json()
      
      if (data.success) {
        // Add the new category to our list
        setCategories(prev => [...prev, data.category])
        
        // Reset the form
        setNewCategory({ name: '', description: '', color: '#EC4899' })
        setShowCreateForm(false)
        
        // Automatically assign the new category to the current subreddit
        await onUpdateCategory(subredditId, data.category.id)
      } else {
        console.error('Failed to create category:', data.error)
        alert(`Failed to create category: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Error creating category. Please try again.')
    } finally {
      setCreatingCategory(false)
    }
  }

  const getCategoryBadgeStyle = (category: Category) => {
    // Use category color with appropriate opacity and text color
    const bgColor = `${category.color}20` // 20% opacity
    const borderColor = `${category.color}40` // 40% opacity
    
    return {
      backgroundColor: bgColor,
      borderColor: borderColor,
      color: category.color
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

  if (compact && !showCreateForm) {
    return (
      <div className="flex items-center space-x-2">
        {currentCategory && (
          <Badge 
            className="border text-xs px-2 py-0.5"
            variant="outline"
            style={getCategoryBadgeStyle(currentCategory)}
          >
            <Tag className="w-3 h-3 mr-1" />
            {currentCategory.name}
          </Badge>
        )}
        
        <Select
          value={currentCategory?.id.toString() || ''}
          onValueChange={handleCategorySelect}
          disabled={loadingCategories}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full border" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="create-new" onSelect={() => setShowCreateForm(true)}>
              <div className="flex items-center space-x-2 text-b9-pink">
                <Plus className="w-3 h-3" />
                <span>Create new category</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Current category display */}
      {currentCategory && !showCreateForm && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Current:</span>
          <Badge 
            className="border text-sm px-2 py-1"
            variant="outline"
            style={getCategoryBadgeStyle(currentCategory)}
          >
            <Tag className="w-3 h-3 mr-1" />
            {currentCategory.name}
          </Badge>
          {currentCategory.description && (
            <span className="text-xs text-muted-foreground">- {currentCategory.description}</span>
          )}
        </div>
      )}

      {/* Category selection or creation form */}
      {showCreateForm ? (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Create New Category</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent"
                placeholder="e.g. High Quality Content"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent"
                placeholder="Brief description of this category"
                maxLength={255}
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-b9-pink focus:border-transparent font-mono"
                  placeholder="#EC4899"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategory.name.trim() || creatingCategory}
              className="bg-b9-pink hover:bg-b9-pink/90 text-white"
              size="sm"
            >
              {creatingCategory ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1" />
                  Create & Assign
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Select
            value={currentCategory?.id.toString() || ''}
            onValueChange={(value) => {
              if (value === 'create-new') {
                setShowCreateForm(true)
              } else {
                handleCategorySelect(value)
              }
            }}
            disabled={loadingCategories}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select a category"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full border" 
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex flex-col">
                      <span>{category.name}</span>
                      {category.description && (
                        <span className="text-xs text-muted-foreground">{category.description}</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="create-new">
                <div className="flex items-center space-x-2 text-b9-pink">
                  <Plus className="w-3 h-3" />
                  <span>Create new category</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {!currentCategory && (
            <div className="flex items-center space-x-1 text-yellow-600 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>This subreddit needs to be categorized</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
