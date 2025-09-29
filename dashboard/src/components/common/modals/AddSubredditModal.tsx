'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X, AlertCircle, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { logger } from '@/lib/logger'

interface AddSubredditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddSubredditModal({ isOpen, onClose, onSuccess }: AddSubredditModalProps) {
  const { addToast } = useToast()
  const [subredditName, setSubredditName] = useState('')
  const [reviewStatus, setReviewStatus] = useState<string>('unreviewed')
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

    // Convert review status to proper format
    const review = reviewStatus === 'unreviewed' ? null :
                   reviewStatus === 'ok' ? 'Ok' :
                   reviewStatus === 'no_seller' ? 'No Seller' :
                   reviewStatus === 'non_related' ? 'Non Related' : null

    setLoading(true)

    try {
      const response = await fetch('/api/reddit/subreddits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          fetchFromReddit: true,  // Always fetch from Reddit
          review,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add subreddit')
      }

      // Success
      onSuccess()
    } catch (err) {
      logger.error('Failed to add subreddit:', err)
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
  }, [subredditName, reviewStatus, onSuccess, addToast])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-md z-50 transition-opacity duration-300"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md max-h-[70vh] overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(243, 244, 246, 0.92))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.08), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-pink-50/30 to-purple-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-sm">
                  <Plus className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Add New Subreddit
                  </h2>
                  <p className="text-[10px] text-gray-500">Fetches data from Reddit automatically</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-pink-100/50 transition-colors"
                disabled={loading}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-3 overflow-y-auto max-h-[calc(70vh-140px)]">
            <div className="space-y-4">
              {/* Subreddit Name Input */}
              <div className="space-y-1.5">
                <Label htmlFor="subreddit-name" className="text-xs text-gray-700">
                  Subreddit Name
                </Label>
                <Input
                  id="subreddit-name"
                  type="text"
                  placeholder="e.g., technology or r/technology"
                  value={subredditName}
                  onChange={(e) => setSubredditName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="w-full h-8 text-sm border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                  autoFocus
                />
                <p className="text-[10px] text-gray-500">
                  Enter the subreddit name with or without the r/ prefix
                </p>
              </div>

              {/* Review Status Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="review-status" className="text-xs text-gray-700">
                  Review Status
                </Label>
                <Select
                  value={reviewStatus}
                  onValueChange={setReviewStatus}
                  disabled={loading}
                >
                  <SelectTrigger id="review-status" className="w-full h-8 text-sm border-pink-200 focus:border-pink-400 focus:ring-pink-400">
                    <SelectValue placeholder="Select review status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unreviewed">Unreviewed</SelectItem>
                    <SelectItem value="ok">Ok</SelectItem>
                    <SelectItem value="no_seller">No Seller</SelectItem>
                    <SelectItem value="non_related">Non Related</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500">
                  Set the initial review status for this subreddit
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gradient-to-r from-red-50 to-pink-50 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="p-3 rounded-lg bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border border-pink-200/50">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-500" />
                    <p className="text-xs font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      Fetching subreddit data from Reddit...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-200 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="text-xs h-7 px-3 border-pink-200 hover:bg-pink-50 hover:border-pink-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !subredditName.trim()}
                className="text-xs h-7 px-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1.5" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1.5" />
                    Add Subreddit
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}