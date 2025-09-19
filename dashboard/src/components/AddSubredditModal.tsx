'use client'

import React, { useState, useCallback } from 'react'
import { StandardModal } from '@/components/standard/StandardModal'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface AddSubredditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddSubredditModal({ isOpen, onClose, onSuccess }: AddSubredditModalProps) {
  const { addToast } = useToast()
  const [subredditName, setSubredditName] = useState('')
  const [fetchFromReddit, setFetchFromReddit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateSubredditName = (name: string): string | null => {
    // Remove r/ or u/ prefix if present
    const cleanName = name.replace(/^[ru]\//, '').trim()

    if (!cleanName) {
      return 'Subreddit name is required'
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
      return 'Subreddit name can only contain letters, numbers, underscores, and hyphens'
    }

    // Check length
    if (cleanName.length < 3) {
      return 'Subreddit name must be at least 3 characters long'
    }

    if (cleanName.length > 21) {
      return 'Subreddit name cannot be longer than 21 characters'
    }

    return null
  }

  const handleSubmit = useCallback(async () => {
    setError(null)

    // Validate input
    const validationError = validateSubredditName(subredditName)
    if (validationError) {
      setError(validationError)
      return
    }

    // Clean the name (remove r/ prefix if present)
    const cleanName = subredditName.replace(/^[ru]\//, '').trim()

    setLoading(true)

    try {
      const response = await fetch('/api/subreddits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          fetchFromReddit,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add subreddit')
      }

      // Success
      onSuccess()
    } catch (err) {
      console.error('Failed to add subreddit:', err)
      setError(err instanceof Error ? err.message : 'Failed to add subreddit')
      addToast({
        type: 'error',
        title: 'Failed to add subreddit',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }, [subredditName, fetchFromReddit, onSuccess, addToast])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit()
    }
  }

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Subreddit"
      subtitle="Add a subreddit to track and review"
      size="md"
      primaryAction={{
        label: loading ? 'Adding...' : 'Add Subreddit',
        onClick: handleSubmit,
        disabled: loading || !subredditName.trim(),
        loading,
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: onClose,
        variant: 'outline',
      }}
      closeOnEscape={!loading}
      closeOnBackdrop={!loading}
    >
      <div className="space-y-4">
        {/* Subreddit Name Input */}
        <div>
          <label htmlFor="subreddit-name" className="block text-sm font-medium text-gray-700 mb-2">
            Subreddit Name
          </label>
          <Input
            id="subreddit-name"
            type="text"
            placeholder="e.g., r/technology or technology"
            value={subredditName}
            onChange={(e) => setSubredditName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="w-full"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the subreddit name with or without the r/ prefix
          </p>
        </div>

        {/* Fetch from Reddit Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="fetch-from-reddit"
            checked={fetchFromReddit}
            onCheckedChange={(checked) => setFetchFromReddit(checked as boolean)}
            disabled={loading}
          />
          <label
            htmlFor="fetch-from-reddit"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Fetch details from Reddit
          </label>
        </div>
        {fetchFromReddit && (
          <p className="text-xs text-gray-500 ml-6">
            Will fetch subscriber count, description, and other metadata from Reddit
          </p>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            <p className="text-sm text-gray-600">Adding subreddit...</p>
          </div>
        )}
      </div>
    </StandardModal>
  )
}