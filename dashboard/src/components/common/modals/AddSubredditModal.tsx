'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X, AlertCircle, Loader2 } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
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
          className={`relative w-full max-w-md max-h-[70vh] overflow-hidden ${designSystem.borders.radius.xl}`}
          style={{
            background: 'linear-gradient(180deg, var(--gray-200-alpha-85) 0%, var(--gray-300-alpha-80) 100%)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid var(--slate-400-alpha-60)',
            boxShadow: '0 20px 50px var(--black-alpha-12), 0 1px 0 var(--white-alpha-60) inset, 0 -1px 0 var(--black-alpha-02) inset'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid var(--pink-600)',
                    boxShadow: '0 8px 32px var(--pink-alpha-40)'
                  }}
                >
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className={cn(
                    "text-sm font-semibold font-mac-display",
                    designSystem.typography.color.primary
                  )}>
                    Add New Subreddit
                  </h2>
                  <p className={cn("text-[10px] font-mac-text", designSystem.typography.color.subtle)}>
                    Fetches data from Reddit automatically
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  `p-1 ${designSystem.borders.radius.sm}`,
                  "hover:bg-gray-200/50 transition-colors"
                )}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 overflow-y-auto max-h-[calc(70vh-140px)]">
            <div className="space-y-5">
              {/* Subreddit Name Input */}
              <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
                <Label htmlFor="subreddit-name" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>
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
                  className={cn(
                    "w-full h-9 text-sm font-mac-text",
                    "border border-gray-200/60 bg-white/40 backdrop-blur-sm",
                    "focus:border-gray-400/50 focus:ring-4 focus:ring-gray-400/20",
                    "shadow-[inset_0_1px_2px_var(--black-alpha-05)]",
                    "hover:border-gray-300/60",
                    "transition-all duration-200",
                    "outline-none focus:outline-none focus-visible:outline-none active:outline-none"
                  )}
                  autoFocus
                />
                <p className={cn("text-[10px] font-mac-text", designSystem.typography.color.subtle)}>
                  Enter the subreddit name with or without the r/ prefix
                </p>
              </div>

              {/* Review Status Selection */}
              <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
                <Label htmlFor="review-status" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>
                  Review Status
                </Label>
                <Select
                  value={reviewStatus}
                  onValueChange={setReviewStatus}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="review-status"
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
                    <SelectValue placeholder="Select review status" />
                  </SelectTrigger>
                  <SelectContent
                    className={cn(
                      "bg-gradient-to-br from-gray-100/70 to-gray-200/60",
                      "backdrop-blur-xl backdrop-saturate-150",
                      "border border-gray-300/30",
                      "shadow-lg"
                    )}
                  >
                    <SelectItem
                      value="unreviewed"
                      className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text"
                    >
                      Unreviewed
                    </SelectItem>
                    <SelectItem
                      value="ok"
                      className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text"
                    >
                      Ok
                    </SelectItem>
                    <SelectItem
                      value="no_seller"
                      className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text"
                    >
                      No Seller
                    </SelectItem>
                    <SelectItem
                      value="non_related"
                      className="focus:bg-gray-200/40 hover:bg-gray-200/30 text-gray-900 font-mac-text"
                    >
                      Non Related
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className={cn("text-[10px] font-mac-text", designSystem.typography.color.subtle)}>
                  Set the initial review status for this subreddit
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className={cn(
                  `flex items-start gap-2 p-2.5 ${designSystem.borders.radius.sm}`,
                  "bg-red-50/80 border border-red-200"
                )}>
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className={cn("text-xs font-mac-text text-red-600")}>{error}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className={cn(
                  `p-3 ${designSystem.borders.radius.sm}`,
                  "bg-primary/5 border border-primary/20"
                )}>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <p className={cn("text-xs font-medium font-mac-text", designSystem.typography.color.primary)}>
                      Fetching subreddit data from Reddit...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-default">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className={cn(
                  "text-xs h-8 px-4 font-mac-text",
                  "bg-white/60 backdrop-blur-sm",
                  "border border-gray-200/60",
                  "hover:bg-white/80 hover:border-gray-300/60",
                  "shadow-sm hover:shadow",
                  "transition-all duration-200"
                )}
              >
                Cancel
              </Button>
              <button
                onClick={handleSubmit}
                disabled={loading || !subredditName.trim()}
                className={cn(
                  "text-xs h-8 px-4 font-mac-text font-medium",
                  "rounded-lg transition-all duration-200",
                  "flex items-center justify-center gap-1.5",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
                style={{
                  background: 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid var(--pink-600)',
                  boxShadow: '0 8px 32px var(--pink-alpha-40)',
                  color: 'var(--pink-600)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && subredditName.trim()) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 131, 149, 0.7) 0%, var(--pink-alpha-50) 100%)'
                    e.currentTarget.style.boxShadow = '0 12px 40px var(--pink-alpha-50)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)'
                  e.currentTarget.style.boxShadow = '0 8px 32px var(--pink-alpha-40)'
                }}
              >
                {loading ? (
                  <>
                    <div className={`animate-spin ${designSystem.borders.radius.full} h-2.5 w-2.5 border-b-2 border-current mr-1.5`} />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    Add Subreddit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}