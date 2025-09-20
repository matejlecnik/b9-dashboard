'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { TAG_CATEGORIES } from '@/lib/tagCategories'

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
  onSave: (data: any) => Promise<void>
  saving: boolean
  onCancel: () => void
}

export function ModelForm({ model, onSave, saving, onCancel }: ModelFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Model Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Stage Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.stage_name}
                onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                placeholder="Enter stage name"
                className={errors.stage_name ? 'border-red-500' : ''}
              />
              {errors.stage_name && (
                <p className="text-red-500 text-xs mt-1">{errors.stage_name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="inactive">Inactive</option>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Commission Rate (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                placeholder="e.g., 20"
                className={errors.commission_rate ? 'border-red-500' : ''}
              />
              {errors.commission_rate && (
                <p className="text-red-500 text-xs mt-1">{errors.commission_rate}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Payment Type</label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as 'bank' | 'crypto' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="bank">Bank Transfer</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reddit Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Reddit Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Connected Reddit Accounts</label>
            <div className="flex gap-2">
              <Input
                value={newRedditAccount}
                onChange={(e) => setNewRedditAccount(e.target.value)}
                placeholder="Add Reddit username (without u/)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addRedditAccount()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addRedditAccount}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.reddit_accounts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.reddit_accounts.map(account => (
                  <Badge
                    key={account}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeRedditAccount(account)}
                  >
                    u/{account}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Adding a username will connect it to an existing Reddit account or create a new one
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Content Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {TAG_CATEGORIES.map(category => (
              <div key={category.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.name)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-purple-600"
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
                    className="text-xs text-purple-600 hover:text-purple-700"
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
                            className={`cursor-pointer justify-start ${isSelected ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
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

          {formData.assigned_tags.length > 0 && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-700 mb-2">
                Selected Tags ({formData.assigned_tags.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.assigned_tags.map(tag => {
                  // Find the tag label
                  let tagLabel = tag
                  for (const category of TAG_CATEGORIES) {
                    const found = category.tags.find(t => t.value === tag)
                    if (found) {
                      tagLabel = found.label
                      break
                    }
                  }
                  return (
                    <Badge
                      key={tag}
                      variant="default"
                      className="bg-purple-500"
                    >
                      {tagLabel}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {model ? 'Update Model' : 'Create Model'}
        </Button>
      </div>
    </form>
  )
}