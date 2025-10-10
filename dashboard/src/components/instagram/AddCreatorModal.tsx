'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface AddCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatorAdded?: () => void
}

export function AddCreatorModal({ isOpen, onClose, onCreatorAdded }: AddCreatorModalProps) {
  const { addToast } = useToast()
  const [username, setUsername] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateUsername = (name: string): string | null => {
    // Remove @ prefix if present
    const cleanName = name.replace(/^@/, '').trim()

    if (!cleanName) {
      return 'Username is required'
    }

    // Check for valid Instagram username characters (alphanumeric, underscore, period)
    if (!/^[a-zA-Z0-9_.]+$/.test(cleanName)) {
      return 'Username can only contain letters, numbers, underscores, and periods'
    }

    // Check length
    if (cleanName.length < 1) {
      return 'Username must be at least 1 character long'
    }

    if (cleanName.length > 30) {
      return 'Username cannot be longer than 30 characters'
    }

    return null
  }

  const handleSubmit = useCallback(async () => {
    setError(null)

    // Validate input
    const validationError = validateUsername(username)
    if (validationError) {
      setError(validationError)
      return
    }

    // Clean the username (remove @ prefix if present)
    const cleanUsername = username.replace(/^@/, '').trim()

    setLoading(true)

    try {
      // Call API endpoint to add creator
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://91.98.91.129:10000'
      const response = await fetch(`${apiUrl}/api/instagram/creator/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          niche: niche.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add creator')
      }

      // Success
      logger.info('Creator added successfully:', {
        username: cleanUsername,
        creator: data.creator,
        stats: data.stats
      })

      // Reset form
      setUsername('')
      setNiche('')

      // Callback to refresh data
      if (onCreatorAdded) {
        onCreatorAdded()
      }

      // Close modal
      onClose()

      // Show success toast
      addToast({
        type: 'success',
        title: 'Creator added successfully!',
        description: `Fetched ${data.stats.reels_fetched} reels and ${data.stats.posts_fetched} posts in ${data.stats.processing_time_seconds}s`,
        duration: 5000
      })

    } catch (err) {
      logger.error('Failed to add creator:', err)
      setError(err instanceof Error ? err.message : 'Failed to add creator')
      addToast({
        type: 'error',
        title: 'Failed to add creator',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }, [username, niche, onCreatorAdded, onClose, addToast])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit()
    }
  }

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Instagram Creator"
      subtitle="Fetches data from Instagram automatically"
      icon={<UserPlus className="h-4 w-4 text-primary" />}
      loading={loading}
      maxWidth="md"
      maxHeight="70vh"
      footer={
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
            disabled={loading || !username.trim()}
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
              if (!loading && username.trim()) {
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
                <UserPlus className="h-3 w-3" />
                Add Creator
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Username Input */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
          <Label htmlFor="creator-username" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>
            Instagram Username
          </Label>
          <Input
            id="creator-username"
            type="text"
            placeholder="e.g., @username or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            Enter the username with or without the @ symbol
          </p>
        </div>

        {/* Niche Input */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
          <Label htmlFor="creator-niche" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>
            Niche <span className={cn("text-xs", designSystem.typography.color.disabled)}>(optional)</span>
          </Label>
          <Input
            id="creator-niche"
            type="text"
            placeholder="e.g., Fitness, Beauty, Fashion..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
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
          />
          <p className={cn("text-[10px] font-mac-text", designSystem.typography.color.subtle)}>
            Assign a niche category for this creator
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
                Fetching creator data from Instagram...
              </p>
            </div>
          </div>
        )}
      </div>
    </StandardModal>
  )
}
