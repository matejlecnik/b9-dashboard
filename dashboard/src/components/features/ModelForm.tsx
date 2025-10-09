'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TAG_CATEGORIES } from '@/lib/tagCategories'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface ModelFormProps {
  model?: {
    id?: number
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    commission_rate?: number | null
    payment_type?: 'bank' | 'crypto'
  }
  onSave: (data: {
    stage_name: string
    status: 'active' | 'inactive' | 'onboarding'
    description?: string
    assigned_tags: string[]
    platform_accounts?: Record<string, string[]>
    commission_rate?: number | null
    payment_type?: 'bank' | 'crypto'
  }) => Promise<void>
  saving: boolean
  onCancel: () => void
}

export function ModelForm({ model, onSave, saving: _saving, onCancel: _onCancel }: ModelFormProps) {
  const [formData, setFormData] = useState({
    stage_name: model?.stage_name || '',
    status: model?.status || 'inactive' as 'active' | 'inactive' | 'onboarding',
    commission_rate: model?.commission_rate || '',
    payment_type: model?.payment_type || 'bank' as 'bank' | 'crypto',
    assigned_tags: model?.assigned_tags || [],
    reddit_accounts: (model?.platform_accounts?.reddit || []) as string[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [newRedditAccount, setNewRedditAccount] = useState('')

  // Auto-expand categories that have selected tags
  useEffect(() => {
    const categoriesWithTags = new Set<string>()
    formData.assigned_tags.forEach(tag => {
      const category = tag.split(':')[0]
      if (category) categoriesWithTags.add(category)
    })
    setExpandedCategories(categoriesWithTags)
  }, [formData.assigned_tags])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.stage_name.trim()) {
      newErrors.stage_name = 'Stage name is required'
    }

    if (formData.commission_rate !== '' && formData.commission_rate !== null) {
      const rate = Number(formData.commission_rate)
      if (isNaN(rate) || rate < 0 || rate > 100) {
        newErrors.commission_rate = 'Commission rate must be between 0 and 100'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSave({
      ...formData,
      commission_rate: formData.commission_rate ? Number(formData.commission_rate) : null,
      platform_accounts: {
        reddit: formData.reddit_accounts
      }
    })
  }

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_tags: prev.assigned_tags.includes(tag)
        ? prev.assigned_tags.filter(t => t !== tag)
        : [...prev.assigned_tags, tag]
    }))
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const selectAllInCategory = (categoryName: string) => {
    const category = TAG_CATEGORIES.find(c => c.name === categoryName)
    if (!category) return

    const categoryTags = category.tags.map(tag => tag.value)

    const allSelected = categoryTags.every(tag => formData.assigned_tags.includes(tag))

    setFormData(prev => ({
      ...prev,
      assigned_tags: allSelected
        ? prev.assigned_tags.filter(tag => !categoryTags.includes(tag))
        : [...new Set([...prev.assigned_tags, ...categoryTags])]
    }))
  }

  const addRedditAccount = () => {
    const account = newRedditAccount.trim()
    if (account && !formData.reddit_accounts.includes(account)) {
      setFormData(prev => ({
        ...prev,
        reddit_accounts: [...prev.reddit_accounts, account]
      }))
      setNewRedditAccount('')
    }
  }

  const removeRedditAccount = (account: string) => {
    setFormData(prev => ({
      ...prev,
      reddit_accounts: prev.reddit_accounts.filter(a => a !== account)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Basic Information */}
      <div className="space-y-3">
        <h3 className={cn("text-sm font-semibold font-mac-display", designSystem.typography.color.primary)}>Model Information</h3>

        {/* Stage Name - Full Width */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
          <label htmlFor="stage-name" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>
            Stage Name <span className="text-primary">*</span>
          </label>
          <Input
            id="stage-name"
            value={formData.stage_name}
            onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
            placeholder="e.g., Luna_Star"
            className={cn(
              "w-full h-9 text-sm font-mac-text",
              "border border-gray-200/60 bg-white/40 backdrop-blur-sm",
              "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
              "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
              "hover:border-gray-300/60",
              "transition-all duration-200",
              "outline-none focus:outline-none focus-visible:outline-none active:outline-none",
              errors.stage_name && 'border-red-500'
            )}
            autoFocus
          />
          {errors.stage_name && (
            <p className="text-red-500 text-[10px] font-mac-text mt-1">{errors.stage_name}</p>
          )}
        </div>

        {/* Status + Commission - 2 Column Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
            <label htmlFor="status" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'onboarding' })}
            >
              <SelectTrigger
                id="status"
                className={cn(
                  "w-full h-9 text-sm font-mac-text",
                  "border border-gray-200/60 bg-gray-50/30 backdrop-blur-sm",
                  "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                  "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                  "hover:border-gray-300/60 hover:bg-gray-50/40",
                  "transition-all duration-200",
                  "outline-none focus:outline-none focus-visible:outline-none active:outline-none"
                )}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent
                className={cn(
                  "bg-gradient-to-br from-gray-100/70 to-gray-200/60",
                  "backdrop-blur-xl backdrop-saturate-150",
                  "border border-gray-300/30",
                  "shadow-lg"
                )}
              >
                <SelectItem value="onboarding" className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text">
                  Onboarding
                </SelectItem>
                <SelectItem value="active" className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text">
                  Active
                </SelectItem>
                <SelectItem value="inactive" className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Commission Rate */}
          <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
            <label htmlFor="commission-rate" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>Commission Rate (%)</label>
            <Input
              id="commission-rate"
              type="number"
              min="0"
              max="100"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
              placeholder="20"
              className={cn(
                "w-full h-9 text-sm font-mac-text",
                "border border-gray-200/60 bg-white/40 backdrop-blur-sm",
                "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                "hover:border-gray-300/60",
                "transition-all duration-200",
                "outline-none focus:outline-none focus-visible:outline-none active:outline-none",
                errors.commission_rate && 'border-red-500'
              )}
            />
            {errors.commission_rate && (
              <p className="text-red-500 text-[10px] font-mac-text mt-1">{errors.commission_rate}</p>
            )}
          </div>
        </div>

        {/* Payment Type - Full Width */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
          <label htmlFor="payment-type" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>Payment Type</label>
          <Select
            value={formData.payment_type}
            onValueChange={(value) => setFormData({ ...formData, payment_type: value as 'bank' | 'crypto' })}
          >
            <SelectTrigger
              id="payment-type"
              className={cn(
                "w-full h-9 text-sm font-mac-text",
                "border border-gray-200/60 bg-gray-50/30 backdrop-blur-sm",
                "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                "hover:border-gray-300/60 hover:bg-gray-50/40",
                "transition-all duration-200",
                "outline-none focus:outline-none focus-visible:outline-none active:outline-none"
              )}
            >
              <SelectValue placeholder="Select payment type" />
            </SelectTrigger>
            <SelectContent
              className={cn(
                "bg-gradient-to-br from-gray-100/70 to-gray-200/60",
                "backdrop-blur-xl backdrop-saturate-150",
                "border border-gray-300/30",
                "shadow-lg"
              )}
            >
              <SelectItem value="bank" className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text">
                Bank Transfer
              </SelectItem>
              <SelectItem value="crypto" className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text">
                Cryptocurrency
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reddit Accounts */}
      <div className="space-y-3">
        <h3 className={cn("text-sm font-semibold font-mac-display", designSystem.typography.color.primary)}>Reddit Accounts</h3>
        <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
          <label htmlFor="reddit-account" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>Connected Reddit Accounts</label>
          <div className="flex gap-2">
            <Input
              id="reddit-account"
              value={newRedditAccount}
              onChange={(e) => setNewRedditAccount(e.target.value)}
              placeholder="e.g., username_here"
              className={cn(
                "w-full h-9 text-sm font-mac-text",
                "border border-gray-200/60 bg-white/40 backdrop-blur-sm",
                "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                "hover:border-gray-300/60",
                "transition-all duration-200",
                "outline-none focus:outline-none focus-visible:outline-none active:outline-none"
              )}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addRedditAccount()
                }
              }}
            />
            <button
              type="button"
              onClick={addRedditAccount}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-lg",
                "border border-gray-200/60 bg-white/40 backdrop-blur-sm",
                "hover:border-gray-300/60 hover:bg-white/60",
                "transition-all duration-200",
                "shadow-sm hover:shadow"
              )}
            >
              <Plus className="h-4 w-4 text-gray-700" />
            </button>
          </div>
          {formData.reddit_accounts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.reddit_accounts.map(account => (
                <Badge
                  key={account}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary-hover font-mac-text"
                  onClick={() => removeRedditAccount(account)}
                >
                  u/{account}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
          <p className={cn("text-[10px] font-mac-text mt-1", designSystem.typography.color.subtle)}>
            Adding a username will connect it to an existing Reddit account or create a new one
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className={cn("text-sm font-semibold font-mac-display", designSystem.typography.color.primary)}>Content Tags</h3>
          {/* Tag count indicator */}
          <div className={cn("flex items-center gap-1.5 px-2 py-1 text-xs font-medium", designSystem.borders.radius.sm,
            formData.assigned_tags.length === 0 ? `${designSystem.background.surface.light} ${designSystem.typography.color.subtle}` :
            formData.assigned_tags.length <= 3 ? 'bg-green-100 text-green-700' :
            formData.assigned_tags.length <= 5 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            <span>{formData.assigned_tags.length}</span>
            <span className="text-[10px]">tag{formData.assigned_tags.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="space-y-4">
          {TAG_CATEGORIES.map(category => (
            <div key={category.name} className={cn("border p-4", designSystem.borders.radius.sm)}>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.name)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-secondary-hover"
                >
                  {expandedCategories.has(category.name) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {category.label}
                </button>
                <button
                  type="button"
                  onClick={() => selectAllInCategory(category.name)}
                  className="text-xs text-secondary-hover hover:text-secondary-pressed"
                >
                  Toggle All
                </button>
              </div>

              {expandedCategories.has(category.name) && (
                <div className="mt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {category.tags.map(tag => {
                      const isSelected = formData.assigned_tags.includes(tag.value)
                      return (
                        <Badge
                          key={tag.value}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer justify-start ${isSelected ? 'bg-secondary hover:bg-secondary-hover' : ''}`}
                          onClick={() => toggleTag(tag.value)}
                        >
                          {tag.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </form>
  )
}