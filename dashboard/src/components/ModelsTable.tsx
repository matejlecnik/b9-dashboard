'use client'

import { memo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Loader2, Edit, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelsTableSkeleton } from '@/components/SkeletonLoaders'


interface Model {
  id: number
  stage_name: string
  status: 'active' | 'inactive' | 'onboarding'
  description: string | null
  assigned_tags: string[]
  platform_accounts: Record<string, string[]>
  metrics: {
    total_posts?: number
    avg_engagement?: number
    last_active?: string
  }
  onboarding_date: string | null
  commission_rate: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface ModelsTableProps {
  models: Model[]
  loading: boolean
  selectedModels?: Set<number>
  setSelectedModels?: (ids: Set<number>) => void
  onEdit?: (model: Model) => void
  onDelete?: (id: number) => void
  deletingModel?: number | null
  searchQuery?: string
  className?: string
}

const ModelsTable = memo(function ModelsTable({
  models,
  loading,
  selectedModels = new Set(),
  setSelectedModels,
  onEdit,
  onDelete,
  deletingModel,
  searchQuery = '',
  className
}: ModelsTableProps) {
  const handleSelectAll = useCallback(() => {
    if (!setSelectedModels) return
    if (selectedModels.size === models.length) {
      setSelectedModels(new Set())
    } else {
      setSelectedModels(new Set(models.map(m => m.id)))
    }
  }, [models, selectedModels, setSelectedModels])

  const handleSelectModel = useCallback((id: number) => {
    if (!setSelectedModels) return
    const newSelected = new Set(selectedModels)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedModels(newSelected)
  }, [selectedModels, setSelectedModels])

  const getTagCategories = (tags: string[]) => {
    if (!tags || tags.length === 0) return []
    const categories = new Set<string>()
    tags.forEach(tag => {
      const category = tag.split(':')[0]
      if (category) categories.add(category)
    })
    return Array.from(categories)
  }

  const highlightMatch = (text: string) => {
    if (!searchQuery || !text) return text
    const regex = new RegExp(`(${searchQuery})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  if (loading) {
    return <ModelsTableSkeleton />
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <UserCircle2 className="h-12 w-12 text-gray-300 mb-4" />
        <div className="text-gray-500 mb-4">
          {searchQuery ? 'No models found matching your search' : 'No models created yet'}
        </div>
        {!searchQuery && onEdit && (
          <Button variant="outline" onClick={() => onEdit({} as Model)}>
            <UserCircle2 className="h-4 w-4 mr-2" />
            Create Your First Model
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-full rounded-2xl border border-black/5 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-gray-50/80 border-b border-gray-200/50 font-medium text-gray-700 text-sm sticky top-0 z-10">
        {setSelectedModels && (
          <div className="w-10 flex-shrink-0 flex justify-center">
            <Checkbox
              checked={selectedModels.size === models.length && models.length > 0}
              onCheckedChange={handleSelectAll}
              aria-label="Select all models"
            />
          </div>
        )}
        <div className="w-48 flex-shrink-0 px-3">Model</div>
        <div className="w-48 flex-shrink-0 px-3">Description</div>
        <div className="w-24 flex-shrink-0 flex justify-center">Status</div>
        <div className="w-20 flex-shrink-0 flex justify-center">Accounts</div>
        <div className="w-48 flex-shrink-0 px-3">Tags</div>
        <div className="w-32 flex-shrink-0 flex justify-end pr-4">Actions</div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto min-h-[320px]">
        {models.map((model) => {
          const tagCategories = getTagCategories(model.assigned_tags)
          const isSelected = selectedModels.has(model.id)

          return (
            <div
              key={model.id}
              className={cn(
                "flex items-center px-4 py-2 border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-300 cursor-pointer",
                isSelected && "bg-purple-50/50"
              )}
              onClick={() => onEdit?.(model)}
            >
              {setSelectedModels && (
                <div className="w-10 flex-shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectModel(model.id)}
                    aria-label={`Select ${model.stage_name}`}
                  />
                </div>
              )}

              {/* Stage Name */}
              <div className="w-48 flex-shrink-0 px-3">
                <div
                  className="font-semibold text-gray-900 text-sm truncate"
                  dangerouslySetInnerHTML={{ __html: highlightMatch(model.stage_name) }}
                />
              </div>

              {/* Description */}
              <div className="w-48 flex-shrink-0 px-3">
                <div
                  className="text-sm text-gray-600 truncate"
                  dangerouslySetInnerHTML={{ __html: highlightMatch(model.description || '—') }}
                />
              </div>

              {/* Status */}
              <div className="w-24 flex-shrink-0 flex justify-center">
                {model.status === 'active' ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Active
                  </Badge>
                ) : model.status === 'onboarding' ? (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    Onboarding
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100">
                    Inactive
                  </Badge>
                )}
              </div>

              {/* Accounts */}
              <div className="w-20 flex-shrink-0 flex justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {Object.values(model.platform_accounts || {}).flat().length}
                </span>
              </div>

              {/* Tags */}
              <div className="w-48 flex-shrink-0 px-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm text-gray-600 flex-shrink-0">
                    {model.assigned_tags.length} tags
                  </span>
                  {tagCategories.length > 0 && (
                    <div className="flex gap-1 overflow-hidden">
                      {tagCategories.slice(0, 2).map(category => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0"
                        >
                          {category}
                        </Badge>
                      ))}
                      {tagCategories.length > 2 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-100 text-gray-600 flex-shrink-0"
                        >
                          +{tagCategories.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="w-32 flex-shrink-0 flex items-center justify-end gap-2 pr-4" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(model)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(model.id)
                    }}
                    disabled={deletingModel === model.id}
                  >
                    {deletingModel === model.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default ModelsTable