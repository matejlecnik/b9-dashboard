'use client'

import { useState } from 'react'
import { UserPlus, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface AddCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatorAdded?: () => void
}

export function AddCreatorModal({ isOpen, onClose, onCreatorAdded }: AddCreatorModalProps) {
  const [username, setUsername] = useState('')
  const [niche, setNiche] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    // Validation
    if (!username.trim()) {
      toast.error('Username is required')
      return
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.trim().replace(/^@/, '')

    setIsSubmitting(true)

    try {
      // Call backend endpoint to add creator
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

      // Success! Show detailed toast
      toast.success('Creator added successfully!', {
        description: `Fetched ${data.stats.reels_fetched} reels and ${data.stats.posts_fetched} posts in ${data.stats.processing_time_seconds}s`
      })

      logger.info('Creator added successfully:', {
        username: cleanUsername,
        creator: data.creator,
        stats: data.stats
      })

      // Reset form
      setUsername('')
      setNiche('')

      // Callback to refresh data (this will reload the Creator Review table)
      if (onCreatorAdded) {
        onCreatorAdded()
      }

      // Close modal
      onClose()

    } catch (error) {
      logger.error('Error adding creator:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add creator'
      toast.error(errorMessage, {
        description: 'Please check the username and try again'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Instagram Creator"
      subtitle="Manually add a creator to track"
      icon={<Sparkles className="h-4 w-4" />}
      loading={isSubmitting}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className={`text-xs h-8 px-3 border-strong hover:${designSystem.background.hover.subtle} hover:border-strong`}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !username.trim()}
            className="text-xs h-8 px-3 bg-gradient-to-r from-primary via-primary-hover to-platform-accent text-white shadow-primary-lg hover:shadow-primary-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className={`animate-spin ${designSystem.borders.radius.full} h-3 w-3 border-b-2 border-white mr-1.5`} />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-1.5" />
                Add Creator
              </>
            )}
          </Button>
        </div>
      }
    >
      {/* Content */}
      <div className="space-y-4">
        {/* Username Input */}
        <div className="space-y-2">
          <label className={cn("block text-sm font-medium", designSystem.typography.color.secondary)}>
            Instagram Username <span className="text-primary">*</span>
          </label>
          <Input
            type="text"
            placeholder="e.g., @username or username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-9 border-strong focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={isSubmitting}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && username.trim()) {
                handleSubmit()
              }
            }}
            autoFocus
          />
        </div>

        {/* Niche Input */}
        <div className="space-y-2">
          <label className={cn("block text-sm font-medium", designSystem.typography.color.secondary)}>
            Niche <span className={cn("text-xs", designSystem.typography.color.disabled)}>(optional)</span>
          </label>
          <Input
            type="text"
            placeholder="e.g., Fitness, Beauty, Fashion..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="h-9 border-strong focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={isSubmitting}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && username.trim()) {
                handleSubmit()
              }
            }}
          />
        </div>

        {/* Info Message */}
        <div className={`p-3 bg-primary/10 border border-primary/30 ${designSystem.borders.radius.sm}`}>
          <p className={cn("text-xs", designSystem.typography.color.secondary)}>
            💡 The creator will be added to your tracking list. You can assign a niche now or update it later from the Niching page.
          </p>
        </div>
      </div>
    </StandardModal>
  )
}
