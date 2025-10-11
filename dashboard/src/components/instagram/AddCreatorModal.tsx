'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserPlus, AlertCircle, ChevronDown, X } from 'lucide-react'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { useNichingStats } from '@/hooks/queries/useInstagramReview'

interface AddCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatorAdded?: () => void
}

export function AddCreatorModal({ isOpen, onClose, onCreatorAdded }: AddCreatorModalProps) {
  const { addToast } = useToast()
  const [username, setUsername] = useState('')
  const [niche, setNiche] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showNicheDropdown, setShowNicheDropdown] = useState(false)
  const [nicheSearchTerm, setNicheSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch available niches
  const { data: nichingStats } = useNichingStats()
  const availableNiches = nichingStats?.availableNiches || []

  // Filter niches based on search term
  const filteredNiches = availableNiches.filter(n =>
    n.toLowerCase().includes(nicheSearchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowNicheDropdown(false)
        setNicheSearchTerm('')
      }
    }

    if (showNicheDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNicheDropdown])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showNicheDropdown && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showNicheDropdown])

  const handleSelectNiche = (selectedNiche: string) => {
    setNiche(selectedNiche)
    setShowNicheDropdown(false)
    setNicheSearchTerm('')
  }

  const handleCreateNiche = () => {
    const trimmedTerm = nicheSearchTerm.trim()
    if (trimmedTerm) {
      setNiche(trimmedTerm)
      setShowNicheDropdown(false)
      setNicheSearchTerm('')
    }
  }

  const handleRemoveNiche = () => {
    setNiche('')
  }

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

  const handleSubmit = useCallback(() => {
    setError(null)

    // Validate input
    const validationError = validateUsername(username)
    if (validationError) {
      setError(validationError)
      return
    }

    // Clean the username (remove @ prefix if present)
    const cleanUsername = username.replace(/^@/, '').trim()

    // Show immediate feedback - processing in background
    addToast({
      type: 'info',
      title: 'Processing in background',
      description: `Adding @${cleanUsername} - this may take 1-2 minutes`,
      duration: 5000
    })

    // Reset form and close modal immediately - don't block user
    setUsername('')
    setNiche('')
    onClose()

    // Fire request in background (no await - fire-and-forget pattern)
    fetch('/api/proxy/instagram/creator/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: cleanUsername,
        niche: niche.trim() || null
      })
    })
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to add creator')
        }

        // Success - background job completed
        logger.info('Creator added successfully:', {
          username: cleanUsername,
          creator: data.creator,
          stats: data.stats
        })

        // Refresh data
        onCreatorAdded?.()

        // Show success toast
        addToast({
          type: 'success',
          title: 'Creator added successfully!',
          description: `@${cleanUsername}: ${data.stats.reels_fetched} reels, ${data.stats.posts_fetched} posts (${data.stats.processing_time_seconds}s)`,
          duration: 5000
        })
      })
      .catch((err) => {
        // Background job failed
        logger.error('Failed to add creator:', err)
        addToast({
          type: 'error',
          title: 'Failed to add creator',
          description: `@${cleanUsername}: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`,
          duration: 5000
        })
      })
  }, [username, niche, onCreatorAdded, onClose, addToast])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
      maxWidth="md"
      maxHeight="70vh"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
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
            disabled={!username.trim()}
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
              if (username.trim()) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 131, 149, 0.7) 0%, var(--pink-alpha-50) 100%)'
                e.currentTarget.style.boxShadow = '0 12px 40px var(--pink-alpha-50)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--pink-alpha-50) 0%, var(--pink-alpha-40) 100%)'
              e.currentTarget.style.boxShadow = '0 8px 32px var(--pink-alpha-40)'
            }}
          >
            <UserPlus className="h-3 w-3" />
            Add Creator
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

        {/* Niche Dropdown */}
        <div className="space-y-1.5 p-3 rounded-lg bg-white/20 border border-gray-200/30">
          <Label htmlFor="creator-niche" className={cn("text-xs font-mac-text font-medium", designSystem.typography.color.secondary)}>
            Niche <span className={cn("text-xs", designSystem.typography.color.disabled)}>(optional)</span>
          </Label>

          {/* Selected niche or "Select/Create" button */}
          {!niche ? (
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setShowNicheDropdown(!showNicheDropdown)}
              className={cn(
                "w-full h-9 px-3 text-sm font-mac-text flex items-center justify-between",
                "border border-gray-200/60 bg-white/40 backdrop-blur-sm rounded-lg",
                "hover:border-gray-300/60 transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                designSystem.typography.color.tertiary
              )}
            >
              <span>Select or create niche...</span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                showNicheDropdown && "transform rotate-180"
              )} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-1 h-9 px-3 flex items-center",
                "border border-gray-200/60 bg-white/40 backdrop-blur-sm rounded-lg",
                "text-sm font-mac-text font-medium",
                designSystem.typography.color.primary
              )}>
                {niche}
              </div>
              <button
                type="button"
                onClick={handleRemoveNiche}
                className={cn(
                  "h-9 w-9 flex items-center justify-center",
                  "border border-gray-200/60 bg-white/40 backdrop-blur-sm rounded-lg",
                  "hover:border-red-300 hover:bg-red-50/50 transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          )}

          <p className={cn("text-[10px] font-mac-text", designSystem.typography.color.subtle)}>
            Select an existing niche or type to create a new one
          </p>

          {/* Dropdown portal */}
          {showNicheDropdown && typeof window !== 'undefined' && createPortal(
            <div
              ref={dropdownRef}
              className={cn(
                "fixed z-[9999] bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden",
                "w-[var(--button-width)]"
              )}
              style={{
                top: `${buttonRef.current?.getBoundingClientRect().bottom ?? 0 + 4}px`,
                left: `${buttonRef.current?.getBoundingClientRect().left ?? 0}px`,
                width: `${buttonRef.current?.getBoundingClientRect().width ?? 0}px`,
              }}
            >
              {/* Search input */}
              <div className="p-2 border-b border-gray-200">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search or type new niche..."
                  value={nicheSearchTerm}
                  onChange={(e) => setNicheSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateNiche()
                    } else if (e.key === 'Escape') {
                      setShowNicheDropdown(false)
                      setNicheSearchTerm('')
                    }
                  }}
                  className={cn(
                    "w-full h-8 text-xs font-mac-text",
                    "border border-gray-200 bg-white",
                    "focus:border-gray-400 focus:ring-2 focus:ring-gray-400/20",
                    "outline-none"
                  )}
                />
                {nicheSearchTerm.trim() && !filteredNiches.includes(nicheSearchTerm.trim()) && (
                  <p className={cn("text-[10px] mt-1", designSystem.typography.color.subtle)}>
                    Press <kbd className="px-1 py-0.5 text-[9px] font-semibold border border-gray-300 rounded">Enter</kbd> to create &quot;{nicheSearchTerm.trim()}&quot;
                  </p>
                )}
              </div>

              {/* Niche list */}
              <div className="max-h-[200px] overflow-y-auto">
                {filteredNiches.length > 0 ? (
                  filteredNiches.map((nicheOption) => (
                    <button
                      key={nicheOption}
                      type="button"
                      onClick={() => handleSelectNiche(nicheOption)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs font-mac-text",
                        "hover:bg-gray-50 transition-colors",
                        designSystem.typography.color.secondary
                      )}
                    >
                      {nicheOption}
                    </button>
                  ))
                ) : nicheSearchTerm.trim() ? (
                  <div className={cn("px-3 py-6 text-center text-xs", designSystem.typography.color.subtle)}>
                    Press Enter to create &quot;{nicheSearchTerm.trim()}&quot;
                  </div>
                ) : (
                  <div className={cn("px-3 py-6 text-center text-xs", designSystem.typography.color.subtle)}>
                    No niches available yet
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
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
      </div>
    </StandardModal>
  )
}
