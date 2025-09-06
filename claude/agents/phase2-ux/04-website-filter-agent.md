# ⚙️ Website Filter Agent

## Role Definition
**Primary Mission**: Enhance dashboard filtering capabilities with advanced search, saved filter presets, bulk operations, and export functionality to handle 10,000+ subreddits efficiently.

**Status**: READY FOR ACTIVATION after Apple UI Agent completion
**Priority**: Phase 2 - User Experience Enhancement  
**Timeline**: Week 3-4 (Activate after Apple UI design system is implemented)

## 🎯 Project Context

You are enhancing the filtering system for a Reddit analytics dashboard used by OnlyFans marketing agencies. The current basic filtering is insufficient for managing 4,865+ subreddits effectively.

### Current Filtering Limitations
- **Basic Search Only**: Simple text search without advanced criteria
- **No Saved Presets**: Users must reconfigure filters repeatedly
- **No Bulk Operations**: Can't select and act on multiple subreddits
- **Poor Performance**: Slow with large datasets (4,865+ subreddits)
- **No Export Options**: Can't export filtered results for external analysis

### Target Enhancement Goals
- **Advanced Multi-Criteria Search**: Combine text, status, subscribers, category filters
- **Saved Filter Presets**: Named filter configurations for common workflows
- **Bulk Selection & Actions**: Multi-select with batch review, categorization, export
- **Performance Optimization**: Fast filtering even with 10,000+ records
- **Export Functionality**: CSV/Excel export of filtered results

### Database Schema Context
```sql
-- Main subreddits table structure
CREATE TABLE subreddits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  subscribers INTEGER,
  description TEXT,
  over_18 BOOLEAN,
  review VARCHAR(50) CHECK (review IN ('Ok', 'No Seller', 'Non Related', 'User Feed')),
  category_text VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for filtering
CREATE INDEX idx_subreddits_review ON subreddits(review);
CREATE INDEX idx_subreddits_category ON subreddits(category_text);
CREATE INDEX idx_subreddits_subscribers ON subreddits(subscribers);
CREATE INDEX idx_subreddits_over_18 ON subreddits(over_18);
CREATE INDEX idx_subreddits_name_gin ON subreddits USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));
```

## 🛠️ Technical Requirements

### Core Technologies
- **React**: Advanced state management with useReducer for complex filter state
- **Next.js**: API routes for optimized server-side filtering
- **Supabase**: PostgreSQL full-text search and indexed queries
- **Zustand**: Global state management for filter presets
- **React Virtual**: Efficient rendering of large filtered lists
- **Papa Parse**: CSV export functionality

### Performance Requirements
- **Search Response**: <200ms for any filter combination
- **Large Dataset**: Handle 10,000+ subreddits smoothly
- **Bulk Operations**: Process 100+ selected items without blocking UI
- **Export Speed**: Generate CSV of 1000+ records in <5 seconds

## 📋 Detailed Implementation Steps

### Step 1: Advanced Filter State Management

#### 1.1 Create `/src/lib/filters/types.ts`
```typescript
export interface SubredditFilters {
  // Text search
  query?: string
  searchFields?: ('name' | 'display_name' | 'description')[]
  
  // Review status
  review?: ('Ok' | 'No Seller' | 'Non Related' | 'User Feed')[]
  
  // Category filtering
  category?: string[]
  hasCategory?: boolean // Has any category vs no category
  
  // Subscriber filtering
  minSubscribers?: number
  maxSubscribers?: number
  
  // Content rating
  over18?: boolean
  
  // Date filtering
  createdAfter?: Date
  createdBefore?: Date
  updatedAfter?: Date
  updatedBefore?: Date
  
  // Sorting
  sortBy?: 'name' | 'subscribers' | 'created_at' | 'updated_at'
  sortDirection?: 'asc' | 'desc'
  
  // Pagination
  limit?: number
  offset?: number
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: SubredditFilters
  isDefault?: boolean
  created_at: Date
  updated_at: Date
}

export interface FilterState {
  activeFilters: SubredditFilters
  presets: FilterPreset[]
  selectedPreset?: string
  selectedSubreddits: number[]
  totalResults: number
  isLoading: boolean
}

export type FilterAction =
  | { type: 'SET_FILTER'; payload: Partial<SubredditFilters> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'LOAD_PRESET'; payload: string }
  | { type: 'SAVE_PRESET'; payload: Omit<FilterPreset, 'id' | 'created_at' | 'updated_at'> }
  | { type: 'DELETE_PRESET'; payload: string }
  | { type: 'SELECT_SUBREDDITS'; payload: number[] }
  | { type: 'TOGGLE_SUBREDDIT'; payload: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TOTAL_RESULTS'; payload: number }
```

#### 1.2 Create `/src/lib/filters/reducer.ts`
```typescript
import { FilterState, FilterAction, SubredditFilters } from './types'

const defaultFilters: SubredditFilters = {
  limit: 50,
  offset: 0,
  sortBy: 'updated_at',
  sortDirection: 'desc'
}

export const initialFilterState: FilterState = {
  activeFilters: defaultFilters,
  presets: [],
  selectedSubreddits: [],
  totalResults: 0,
  isLoading: false
}

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        activeFilters: {
          ...state.activeFilters,
          ...action.payload,
          offset: 0 // Reset pagination when filters change
        },
        selectedPreset: undefined // Clear preset when manually changing filters
      }

    case 'CLEAR_FILTERS':
      return {
        ...state,
        activeFilters: defaultFilters,
        selectedPreset: undefined,
        selectedSubreddits: []
      }

    case 'LOAD_PRESET':
      const preset = state.presets.find(p => p.id === action.payload)
      if (!preset) return state
      
      return {
        ...state,
        activeFilters: { ...preset.filters },
        selectedPreset: action.payload,
        selectedSubreddits: []
      }

    case 'SAVE_PRESET':
      const newPreset = {
        ...action.payload,
        id: `preset_${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date()
      }
      
      return {
        ...state,
        presets: [...state.presets, newPreset]
      }

    case 'DELETE_PRESET':
      return {
        ...state,
        presets: state.presets.filter(p => p.id !== action.payload),
        selectedPreset: state.selectedPreset === action.payload ? undefined : state.selectedPreset
      }

    case 'SELECT_SUBREDDITS':
      return {
        ...state,
        selectedSubreddits: action.payload
      }

    case 'TOGGLE_SUBREDDIT':
      const isSelected = state.selectedSubreddits.includes(action.payload)
      return {
        ...state,
        selectedSubreddits: isSelected
          ? state.selectedSubreddits.filter(id => id !== action.payload)
          : [...state.selectedSubreddits, action.payload]
      }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedSubreddits: []
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'SET_TOTAL_RESULTS':
      return {
        ...state,
        totalResults: action.payload
      }

    default:
      return state
  }
}
```

### Step 2: Advanced Filter API

#### 2.1 Create `/src/app/api/subreddits/filtered/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SubredditFilters } from '@/lib/filters/types'
import { withErrorHandling } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(request.url)
  
  // Parse filters from query parameters
  const filters: SubredditFilters = {
    query: searchParams.get('query') || undefined,
    searchFields: searchParams.get('searchFields')?.split(',') as any[] || ['name', 'display_name'],
    review: searchParams.get('review')?.split(',') as any[] || undefined,
    category: searchParams.get('category')?.split(',') || undefined,
    hasCategory: searchParams.get('hasCategory') === 'true' ? true : 
                 searchParams.get('hasCategory') === 'false' ? false : undefined,
    minSubscribers: searchParams.get('minSubscribers') ? parseInt(searchParams.get('minSubscribers')!) : undefined,
    maxSubscribers: searchParams.get('maxSubscribers') ? parseInt(searchParams.get('maxSubscribers')!) : undefined,
    over18: searchParams.get('over18') === 'true' ? true : 
            searchParams.get('over18') === 'false' ? false : undefined,
    sortBy: (searchParams.get('sortBy') as any) || 'updated_at',
    sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0')
  }

  // Build Supabase query
  let query = supabase.from('subreddits').select('*', { count: 'exact' })

  // Text search with full-text search
  if (filters.query) {
    if (filters.searchFields?.includes('name')) {
      query = query.ilike('name', `%${filters.query}%`)
    }
    if (filters.searchFields?.includes('display_name')) {
      query = query.or(`display_name.ilike.%${filters.query}%`)
    }
    if (filters.searchFields?.includes('description')) {
      query = query.or(`description.ilike.%${filters.query}%`)
    }
  }

  // Review status filtering
  if (filters.review && filters.review.length > 0) {
    query = query.in('review', filters.review)
  }

  // Category filtering
  if (filters.category && filters.category.length > 0) {
    query = query.in('category_text', filters.category)
  }

  if (filters.hasCategory === true) {
    query = query.not('category_text', 'is', null)
  } else if (filters.hasCategory === false) {
    query = query.is('category_text', null)
  }

  // Subscriber count filtering
  if (filters.minSubscribers !== undefined) {
    query = query.gte('subscribers', filters.minSubscribers)
  }
  if (filters.maxSubscribers !== undefined) {
    query = query.lte('subscribers', filters.maxSubscribers)
  }

  // Content rating
  if (filters.over18 !== undefined) {
    query = query.eq('over_18', filters.over18)
  }

  // Date filtering
  if (filters.createdAfter) {
    query = query.gte('created_at', filters.createdAfter.toISOString())
  }
  if (filters.createdBefore) {
    query = query.lte('created_at', filters.createdBefore.toISOString())
  }

  // Sorting
  query = query.order(filters.sortBy!, { 
    ascending: filters.sortDirection === 'asc' 
  })

  // Pagination
  query = query.range(filters.offset!, filters.offset! + filters.limit! - 1)

  const { data, error, count } = await query

  if (error) throw error

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    limit: filters.limit,
    offset: filters.offset,
    timestamp: new Date().toISOString()
  })
})
```

### Step 3: Advanced Filter UI Components

#### 3.1 Create `/src/components/filters/AdvancedFilterPanel.tsx`
```typescript
'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Search, Filter, X, Save, RotateCcw } from 'lucide-react'
import { SubredditFilters } from '@/lib/filters/types'
import { MultiSelect } from '@/components/ui/multi-select'
import { NumberInput } from '@/components/ui/number-input'

interface AdvancedFilterPanelProps {
  filters: SubredditFilters
  onFiltersChange: (filters: Partial<SubredditFilters>) => void
  onClearFilters: () => void
  onSavePreset: () => void
  className?: string
}

const REVIEW_OPTIONS = [
  { value: 'Ok', label: 'Ok', color: 'bg-green-500' },
  { value: 'No Seller', label: 'No Seller', color: 'bg-red-500' },
  { value: 'Non Related', label: 'Non Related', color: 'bg-gray-500' },
  { value: 'User Feed', label: 'User Feed', color: 'bg-blue-500' },
]

const CATEGORY_OPTIONS = [
  { value: 'NSFW', label: 'NSFW' },
  { value: 'SFW', label: 'SFW' },
  { value: 'Fetish', label: 'Fetish' },
  { value: 'Amateur', label: 'Amateur' },
  { value: 'Professional', label: 'Professional' },
] // This would be populated from API

export function AdvancedFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  onSavePreset,
  className
}: AdvancedFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && 
    (!Array.isArray(value) || value.length > 0)
  ).length

  return (
    <GlassCard className={className}>
      <div className="p-6">
        {/* Quick Search Bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search subreddits..."
              value={filters.query || ''}
              onChange={(e) => onFiltersChange({ query: e.target.value })}
              className="pl-10 h-12 text-lg bg-white/50 border-white/20 focus:bg-white/70"
            />
          </div>
          <AppleButton
            variant="secondary"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-12"
          >
            <Filter className="mr-2 h-5 w-5" />
            Advanced
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-brand-pink text-white">
                {activeFilterCount}
              </Badge>
            )}
          </AppleButton>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-6 animate-slide-up">
            <Separator />

            {/* Review Status Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Review Status
              </Label>
              <MultiSelect
                options={REVIEW_OPTIONS}
                selected={filters.review || []}
                onChange={(selected) => onFiltersChange({ review: selected as any })}
                placeholder="Select review statuses..."
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Categories
              </Label>
              <MultiSelect
                options={CATEGORY_OPTIONS}
                selected={filters.category || []}
                onChange={(selected) => onFiltersChange({ category: selected })}
                placeholder="Select categories..."
              />
              <div className="flex items-center space-x-2">
                <Switch
                  checked={filters.hasCategory === true}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ hasCategory: checked ? true : undefined })
                  }
                />
                <Label className="text-sm text-gray-600 dark:text-gray-400">
                  Only subreddits with categories
                </Label>
              </div>
            </div>

            {/* Subscriber Count Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subscriber Count
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Minimum</Label>
                  <NumberInput
                    value={filters.minSubscribers}
                    onChange={(value) => onFiltersChange({ minSubscribers: value })}
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Maximum</Label>
                  <NumberInput
                    value={filters.maxSubscribers}
                    onChange={(value) => onFiltersChange({ maxSubscribers: value })}
                    placeholder="No limit"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Content Rating */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Content Rating
              </Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={filters.over18 === true}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ over18: checked ? true : undefined })
                    }
                  />
                  <Label className="text-sm">NSFW Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={filters.over18 === false}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ over18: checked ? false : undefined })
                    }
                  />
                  <Label className="text-sm">SFW Only</Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                <AppleButton
                  variant="secondary"
                  size="sm"
                  onClick={onClearFilters}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear All
                </AppleButton>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={onSavePreset}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Preset
                </AppleButton>
              </div>
              <AppleButton
                variant="secondary"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </AppleButton>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
```

#### 3.2 Create `/src/components/filters/FilterPresets.tsx`
```typescript
'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FilterPreset } from '@/lib/filters/types'
import { Save, Trash2, Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface FilterPresetsProps {
  presets: FilterPreset[]
  selectedPreset?: string
  onLoadPreset: (presetId: string) => void
  onSavePreset: (preset: Omit<FilterPreset, 'id' | 'created_at' | 'updated_at'>) => void
  onDeletePreset: (presetId: string) => void
  className?: string
}

export function FilterPresets({
  presets,
  selectedPreset,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  className
}: FilterPresetsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')

  const handleSavePreset = () => {
    if (!presetName.trim()) return

    onSavePreset({
      name: presetName,
      description: presetDescription || undefined,
      filters: {}, // This would be the current filters from parent component
      isDefault: false
    })

    setPresetName('')
    setPresetDescription('')
    setShowSaveDialog(false)
  }

  return (
    <GlassCard className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">
            Filter Presets
          </h3>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <AppleButton variant="secondary" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Current
              </AppleButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Filter Preset</DialogTitle>
                <DialogDescription>
                  Save your current filter configuration for future use.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name..."
                  />
                </div>
                <div>
                  <Label htmlFor="preset-description">Description (optional)</Label>
                  <Input
                    id="preset-description"
                    value={presetDescription}
                    onChange={(e) => setPresetDescription(e.target.value)}
                    placeholder="Describe this filter configuration..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <AppleButton
                    variant="secondary"
                    onClick={() => setShowSaveDialog(false)}
                  >
                    Cancel
                  </AppleButton>
                  <AppleButton onClick={handleSavePreset}>
                    Save Preset
                  </AppleButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`p-3 rounded-lg border transition-smooth cursor-pointer hover:bg-white/20 ${
                selectedPreset === preset.id
                  ? 'border-brand-pink bg-brand-pink/10'
                  : 'border-white/20 bg-white/5'
              }`}
              onClick={() => onLoadPreset(preset.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {preset.name}
                    </span>
                    {preset.isDefault && (
                      <Star className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                  {preset.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {preset.description}
                    </p>
                  )}
                  <div className="flex gap-1 mt-2">
                    {/* Show filter summary badges */}
                    {preset.filters.review && (
                      <Badge variant="secondary" className="text-xs">
                        {preset.filters.review.length} status
                      </Badge>
                    )}
                    {preset.filters.category && (
                      <Badge variant="secondary" className="text-xs">
                        {preset.filters.category.length} categories
                      </Badge>
                    )}
                    {(preset.filters.minSubscribers || preset.filters.maxSubscribers) && (
                      <Badge variant="secondary" className="text-xs">
                        Subscribers
                      </Badge>
                    )}
                  </div>
                </div>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeletePreset(preset.id)
                  }}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </AppleButton>
              </div>
            </div>
          ))}

          {presets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No saved presets</p>
              <p className="text-xs mt-1">Save your current filters to get started</p>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
```

### Step 4: Bulk Operations System

#### 4.1 Create `/src/components/bulk/BulkActionBar.tsx`
```typescript
'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { AppleButton } from '@/components/ui/apple-button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckSquare, Download, Tag, X, Loader } from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/animated-counter'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkReview: (review: string) => void
  onBulkCategory: (category: string) => void
  onBulkExport: () => void
  isProcessing?: boolean
  className?: string
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkReview,
  onBulkCategory,
  onBulkExport,
  isProcessing = false,
  className
}: BulkActionBarProps) {
  const [selectedReview, setSelectedReview] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  if (selectedCount === 0) return null

  const handleBulkReview = () => {
    if (selectedReview) {
      onBulkReview(selectedReview)
      setSelectedReview('')
    }
  }

  const handleBulkCategory = () => {
    if (selectedCategory) {
      onBulkCategory(selectedCategory)
      setSelectedCategory('')
    }
  }

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <GlassCard className="p-4 min-w-[600px] shadow-xl animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-brand-pink" />
              <span className="font-semibold">
                <AnimatedCounter end={selectedCount} /> selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedReview} onValueChange={setSelectedReview}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Review" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ok">Ok</SelectItem>
                  <SelectItem value="No Seller">No Seller</SelectItem>
                  <SelectItem value="Non Related">Non Related</SelectItem>
                  <SelectItem value="User Feed">User Feed</SelectItem>
                </SelectContent>
              </Select>
              <AppleButton
                variant="secondary"
                size="sm"
                onClick={handleBulkReview}
                disabled={!selectedReview || isProcessing}
              >
                {isProcessing ? <Loader className="h-4 w-4 animate-spin" /> : 'Apply Review'}
              </AppleButton>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NSFW">NSFW</SelectItem>
                  <SelectItem value="SFW">SFW</SelectItem>
                  <SelectItem value="Fetish">Fetish</SelectItem>
                  <SelectItem value="Amateur">Amateur</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
              <AppleButton
                variant="secondary"
                size="sm"
                onClick={handleBulkCategory}
                disabled={!selectedCategory || isProcessing}
              >
                <Tag className="mr-2 h-4 w-4" />
                Categorize
              </AppleButton>
            </div>

            <AppleButton
              variant="secondary"
              size="sm"
              onClick={onBulkExport}
              disabled={isProcessing}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </AppleButton>
          </div>

          <AppleButton
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </AppleButton>
        </div>
      </GlassCard>
    </div>
  )
}
```

### Step 5: Export System

#### 5.1 Create `/src/lib/export/csv-export.ts`
```typescript
import Papa from 'papaparse'

export interface ExportData {
  id: number
  name: string
  display_name?: string
  subscribers?: number
  description?: string
  over_18?: boolean
  review?: string
  category_text?: string
  created_at: string
  updated_at: string
}

export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
  selectedFields?: (keyof ExportData)[]
}

export function exportToCSV(data: ExportData[], options: ExportOptions = {}) {
  const {
    filename = `subreddits_export_${new Date().toISOString().split('T')[0]}.csv`,
    includeHeaders = true,
    selectedFields
  } = options

  // Filter fields if specified
  const processedData = selectedFields 
    ? data.map(item => {
        const filteredItem: Partial<ExportData> = {}
        selectedFields.forEach(field => {
          filteredItem[field] = item[field]
        })
        return filteredItem
      })
    : data

  // Convert to CSV
  const csv = Papa.unparse(processedData, {
    header: includeHeaders,
    columns: selectedFields || Object.keys(data[0] || {}),
  })

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export function exportToJSON(data: ExportData[], filename?: string) {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename || `subreddits_export_${Date.now()}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}
```

## ✅ Success Criteria & Validation

### Advanced Filtering System Checklist
- [ ] **Multi-Criteria Search**: Combine text, status, category, and numeric filters
- [ ] **Saved Presets**: Create, load, and delete named filter configurations
- [ ] **Bulk Selection**: Select multiple subreddits with checkboxes
- [ ] **Bulk Operations**: Apply review status and categories to multiple items
- [ ] **Performance**: Filter 10,000+ records in under 200ms
- [ ] **Export Functionality**: CSV and JSON export of filtered results
- [ ] **Persistent State**: Filters survive page refreshes
- [ ] **Mobile Responsive**: Works on all device sizes

### Performance Benchmarks
```bash
# API response time test
curl -w "@curl-format.txt" "http://localhost:3000/api/subreddits/filtered?query=test&limit=100"

# Large dataset test
# Should handle 10,000+ records smoothly
```

### User Experience Testing
1. **Filter Combinations**: Test all filter combinations work correctly
2. **Bulk Operations**: Select 100+ items and apply bulk actions
3. **Export Testing**: Export 1000+ records to CSV
4. **Performance**: Measure filter response times with large datasets
5. **Mobile Testing**: Verify mobile responsiveness

## 🔗 Integration Points

### With Other Agents
- **Apple UI Agent**: Uses the established design system and components
- **Protection Agent**: All components wrapped in error boundaries
- **Smart Filter Agent**: Will provide AI-powered filter suggestions

### Database Integration
- Requires optimized database indexes for fast filtering
- Uses Supabase real-time subscriptions for live updates
- Implements proper RLS policies for security

## 📊 Performance Metrics

### Key Performance Indicators
- **Filter Response Time**: <200ms for any filter combination
- **Bulk Operation Speed**: Process 100 items in <5 seconds
- **Export Performance**: Generate 1000+ record CSV in <5 seconds
- **Memory Usage**: Efficient handling of large filtered datasets
- **User Productivity**: 50% reduction in time to find specific subreddits

### Monitoring Dashboard
```typescript
interface FilteringMetrics {
  averageFilterTime: number
  bulkOperationsPerformed: number
  presetsCreated: number
  recordsExported: number
  userProductivityIncrease: number
}
```

## 🎯 Next Agent Handoff

Once website filtering is enhanced:
1. **Smart Filter Agent** will add AI-powered pre-filtering suggestions
2. **AI Categorization Agent** will automate category assignment
3. **Testing Agent** will validate filtering functionality

**Completion Signal**: Advanced filters working, bulk operations functional, export system operational, performance targets met, user workflows significantly improved.