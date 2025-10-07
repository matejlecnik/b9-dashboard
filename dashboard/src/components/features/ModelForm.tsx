'use client'


import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X, ChevronDown, ChevronUp, Info, Loader2, AlertCircle } from 'lucide-react'
import { TAG_CATEGORIES } from '@/lib/tagCategories'
import { logger } from '@/lib/logger'
import { createClient } from '@supabase/supabase-js'
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
  const [matchingSubreddits, setMatchingSubreddits] = useState<number>(0)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)

  // Auto-expand categories that have selected tags
  useEffect(() => {
    const categoriesWithTags = new Set<string>()
    formData.assigned_tags.forEach(tag => {
      const category = tag.split(':')[0]
      if (category) categoriesWithTags.add(category)
    })
    setExpandedCategories(categoriesWithTags)
  }, [formData.assigned_tags])

  // Fetch matching subreddits count when tags change
  useEffect(() => {
    async function fetchMatchingSubreddits() {
      if (formData.assigned_tags.length === 0) {
        setMatchingSubreddits(0)
        return
      }

      setIsLoadingMatches(true)
      try {
        // Create a client-side Supabase instance
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Query subreddits that have at least one matching tag and are marked as "Ok"
        const { count, error } = await supabase
          .from('reddit_subreddits')
          .select('*', { count: 'exact', head: true })
          .overlaps('tags', formData.assigned_tags)
          .eq('review', 'Ok')

        if (!error && count !== null) {
          setMatchingSubreddits(count)
        }
      } catch (error) {
        logger.error('Error fetching matching subreddits:', error)
      } finally {
        setIsLoadingMatches(false)
      }
    }

    fetchMatchingSubreddits()
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
              <label className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>
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
              <label className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'onboarding' })}
                className="w-full px-3 py-2 border border-default {designSystem.borders.radius.sm} focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="inactive">Inactive</option>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>Commission Rate (%)</label>
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
              <label className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>Payment Type</label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as 'bank' | 'crypto' })}
                className="w-full px-3 py-2 border border-default {designSystem.borders.radius.sm} focus:outline-none focus:ring-2 focus:ring-secondary"
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
            <label className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>Connected Reddit Accounts</label>
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
            <p className={cn("text-xs mt-1", designSystem.typography.color.subtle)}>
              Adding a username will connect it to an existing Reddit account or create a new one
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Content Tags</CardTitle>
            <div className="flex items-center gap-2">
              {/* Tag count indicator */}
              <div className={cn("flex items-center gap-1.5 px-2 py-1 {designSystem.borders.radius.sm} text-xs font-medium",
                formData.assigned_tags.length === 0 ? `${designSystem.background.surface.light} ${designSystem.typography.color.subtle}` :
                formData.assigned_tags.length <= 3 ? 'bg-green-100 text-green-700' :
                formData.assigned_tags.length <= 5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}>
                <span>{formData.assigned_tags.length}</span>
                <span className="text-[10px]">tag{formData.assigned_tags.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Info tooltip */}
              <div className="group relative">
                <Info className={cn("w-4 h-4 cursor-help", `hover:${designSystem.typography.color.tertiary}`, designSystem.typography.color.disabled)} />
                <div className="absolute right-0 top-6 w-64 p-3 bg-white {designSystem.borders.radius.sm} shadow-lg border border-default opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <h4 className={cn("text-xs font-semibold mb-1", designSystem.typography.color.secondary)}>Tag Guidelines</h4>
                  <ul className={cn("text-[10px] space-y-1", designSystem.typography.color.tertiary)}>
                    <li className="flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span><strong>Optimal: 1-3 tags</strong> - Better matching with precise tags</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-yellow-500 mt-0.5">⚠</span>
                      <span><strong>Ok: 4-5 tags</strong> - May dilute matching effectiveness</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-red-500 mt-0.5">✗</span>
                      <span><strong>Too many: 6+ tags</strong> - Reduces precision significantly</span>
                    </li>
                    <li className="mt-2 pt-2 border-t border-light">
                      <strong>Strategy:</strong> Choose 1-2 primary characteristics that best define the model&apos;s content
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {TAG_CATEGORIES.map(category => (
              <div key={category.name} className="border {designSystem.borders.radius.sm} p-4">
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

          {formData.assigned_tags.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-secondary/10 {designSystem.borders.radius.sm}">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-secondary-pressed">
                    Selected Tags ({formData.assigned_tags.length})
                  </p>
                  {formData.assigned_tags.length > 5 && (
                    <div className="flex items-center gap-1 text-[10px] text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Too many tags - consider removing some</span>
                    </div>
                  )}
                </div>
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
                        className="bg-secondary"
                      >
                        {tagLabel}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {/* Matching subreddits preview */}
              <div className="p-3 bg-blue-50 {designSystem.borders.radius.sm} border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700">Matching Subreddits</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">
                      Approved subreddits that share at least one tag
                    </p>
                  </div>
                  <div className="text-right">
                    {isLoadingMatches ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        <span className="text-xs text-blue-600">Loading...</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-blue-700">{matchingSubreddits}</p>
                        <p className="text-[10px] text-blue-600">
                          {matchingSubreddits === 1 ? 'subreddit' : 'subreddits'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {matchingSubreddits === 0 && !isLoadingMatches && formData.assigned_tags.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-[10px] text-blue-600">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      No matching subreddits found. Consider using different tags.
                    </p>
                  </div>
                )}
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