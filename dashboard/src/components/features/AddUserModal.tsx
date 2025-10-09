'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, AlertCircle, Loader2, UserPlus, Sparkles, Search, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import { useDebounce } from '@/hooks/useDebounce'
import { StandardModal } from '@/components/shared/modals/StandardModal'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

// Custom toast implementation
interface ToastFunctions {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
}

const useToast = (): ToastFunctions => {
  return {
    showSuccess: (message: string) => {
      // You can implement actual toast here or use console for now
      console.log('Success:', message)
    },
    showError: (message: string) => {
      console.error('Error:', message)
    },
    showInfo: (message: string) => {
      console.info('Info:', message)
    }
  }
}


interface User {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  account_age_days: number | null
  comment_karma: number | null
  link_karma: number | null
  is_verified: boolean
  has_verified_email: boolean
  is_gold: boolean
  our_creator: boolean
  overall_user_score: number | null
  model_id?: number | null
}

interface Model {
  id: number
  stage_name: string
  status: 'active' | 'inactive' | 'onboarding'
}

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: (user: User) => void
}

export function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  // API URL configuration - memoized to satisfy ESLint exhaustive-deps
  const API_URL = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com',
    []
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [notFoundUsername, setNotFoundUsername] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [showCreateModel, setShowCreateModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [creatingModel, setCreatingModel] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const { showSuccess, showError } = useToast()

  // Fetch models when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchModels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_URL}/api/models/list`)
      const data = await response.json()
      if (data.success) {
        const activeModels = data.models.filter((m: Model) => m.status === 'active')
        setModels(activeModels)
        // Select first model by default
        if (activeModels.length > 0 && !selectedModelId) {
          setSelectedModelId(activeModels[0].id)
        }
      }
    } catch (error) {
      logger.error('Error fetching models:', error)
    }
  }

  const createNewModel = async () => {
    if (!newModelName.trim()) {
      showError('Model name is required')
      return
    }

    setCreatingModel(true)
    try {
      const response = await fetch(`${API_URL}/api/models/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newModelName.trim(),
          assigned_tags: []
        })
      })

      const data = await response.json()
      if (data.success && data.model) {
        showSuccess(`Model ${newModelName} created successfully`)
        await fetchModels()
        setSelectedModelId(data.model.id)
        setShowCreateModel(false)
        setNewModelName('')
      } else {
        throw new Error(data.error || 'Failed to create model')
      }
    } catch (error) {
      logger.error('Error creating model:', error)
      showError(error instanceof Error ? error.message : 'Failed to create model')
    } finally {
      setCreatingModel(false)
    }
  }

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setNotFoundUsername(null)
      return
    }

    setIsSearching(true)
    setNotFoundUsername(null)

    try {
      const response = await fetch(`${API_URL}/api/reddit/users/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      // Check for success field in response
      if (!data.success && response.status !== 200) {
        logger.error('Search error:', data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.users || [])
      }

      // Always set notFoundUsername for valid usernames to show fetch option
      if (/^[a-zA-Z0-9_-]+$/.test(query)) {
        // Check if exact match exists
        const exactMatch = (data.users || []).find((u: User) =>
          u.username.toLowerCase() === query.toLowerCase()
        )
        if (!exactMatch) {
          setNotFoundUsername(query)
        }
      }
    } catch (error) {
      logger.error('Search error:', error)
      // Still set notFoundUsername on error for valid usernames
      if (/^[a-zA-Z0-9_-]+$/.test(query)) {
        setNotFoundUsername(query)
      }
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [API_URL])

  useEffect(() => {
    searchUsers(debouncedSearchQuery)
  }, [debouncedSearchQuery, searchUsers])

  const handleSelectUser = async (user: User) => {
    if (!user.our_creator) {
      // Check if model is selected
      if (!selectedModelId) {
        showError('Please select a model for this user')
        return
      }

      // Mark as our creator with model
      try {
        const response = await fetch(`${API_URL}/api/reddit/users/toggle-creator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            our_creator: true,
            model_id: selectedModelId
          })
        })

        if (!response.ok) throw new Error('Failed to mark as creator')

        const updatedUser = { ...user, our_creator: true, model_id: selectedModelId }
        onUserAdded(updatedUser)
        showSuccess(`Added ${user.username} to model ${models.find(m => m.id === selectedModelId)?.stage_name}`)
        onClose()
      } catch (error) {
        logger.error('Error marking as creator:', error)
        showError('Failed to add user as creator')
      }
    } else {
      // User is already a creator - show message but don't close modal
      showSuccess(`${user.username} is already an active account`)
      // Don't close the modal so user can search for other users
    }
  }

  const handleFetchFromReddit = async (username: string) => {
    // Check if model is selected
    if (!selectedModelId) {
      showError('Please select a model for this user')
      return
    }

    setIsFetching(true)

    try {
      const response = await fetch(`${API_URL}/api/reddit/users/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch user')
      }

      const data = await response.json()
      if (data.success && data.user) {
        // Now update the user with our_creator and model_id
        const updateResponse = await fetch(`${API_URL}/api/reddit/users/toggle-creator`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            our_creator: true,
            model_id: selectedModelId
          })
        })

        if (!updateResponse.ok) throw new Error('Failed to assign model to user')

        const updatedUser = { ...data.user, our_creator: true, model_id: selectedModelId }
        onUserAdded(updatedUser)
        showSuccess(`Successfully added ${username} from Reddit to model ${models.find(m => m.id === selectedModelId)?.stage_name}`)
        onClose()
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (error) {
      logger.error('Fetch error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user from Reddit'
      showError(errorMessage)
    } finally {
      setIsFetching(false)
    }
  }

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User"
      subtitle="Search and add Reddit users to a model"
      icon={<Sparkles className="h-4 w-4" />}
      maxWidth="md"
      maxHeight="80vh"
    >
      <div className="space-y-4">
            {/* Model Selection */}
            <div className="mb-4">
              <label className={cn("block text-sm font-medium mb-2", designSystem.typography.color.secondary)}>
                Select Model *
              </label>
              {showCreateModel ? (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter model name..."
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={createNewModel}
                    disabled={creatingModel}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    {creatingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModel(false)
                      setNewModelName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedModelId || ''}
                      onChange={(e) => setSelectedModelId(Number(e.target.value))}
                      className="w-full appearance-none bg-white border border-default {designSystem.borders.radius.sm} px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select a model...</option>
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.stage_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={cn("absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", designSystem.typography.color.disabled)} />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateModel(true)}
                    className="px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", designSystem.typography.color.disabled)} />
              <Input
                type="text"
                placeholder="Search for a Reddit username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 text-sm border-primary/30 focus:border-primary focus:ring-primary bg-white/50"
                disabled={!selectedModelId}
              />
            </div>

            {!selectedModelId && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 {designSystem.borders.radius.sm}">
                <p className="text-sm text-amber-800">Please select a model first before searching for users.</p>
              </div>
            )}

            {/* Results */}
            <div className="space-y-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={cn("h-6 w-6 animate-spin", designSystem.typography.color.disabled)} />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={!selectedModelId}
                  className={`w-full {designSystem.borders.radius.sm} border p-3 text-left transition-colors ${
                    user.our_creator
                      ? 'border-green-300 bg-green-50/50 hover:bg-green-100/50'
                      : 'border-primary/30 bg-white/40 hover:bg-primary/10'
                  } ${!selectedModelId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        width={40}
                        height={40}
                        className="{designSystem.borders.radius.full}"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center {designSystem.borders.radius.full} bg-gradient-to-br from-primary/20 to-secondary/20 text-sm font-semibold text-primary-pressed">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", designSystem.typography.color.primary)}>{user.username}</span>
                        {user.our_creator && (
                          <span className="{designSystem.borders.radius.full} bg-green-500/20 px-2 py-0.5 text-xs text-green-600 font-medium">
                            ✓ Active Account
                          </span>
                        )}
                      </div>
                      <div className={cn("text-xs", designSystem.typography.color.tertiary)}>
                        {user.link_karma?.toLocaleString() || 0} post karma •
                        {user.comment_karma?.toLocaleString() || 0} comment karma
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : notFoundUsername && selectedModelId ? (
            <div className="{designSystem.borders.radius.sm} bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/30 p-4">
              <div className="mb-3 flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">User not found in database</span>
              </div>
              <p className={cn("mb-3 text-sm", designSystem.typography.color.tertiary)}>
                Would you like to fetch <span className={cn("font-medium", designSystem.typography.color.primary)}>{notFoundUsername}</span> from Reddit?
              </p>
              <Button
                onClick={() => handleFetchFromReddit(notFoundUsername)}
                disabled={isFetching || !selectedModelId}
                className="w-full bg-primary hover:bg-primary-hover"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching from Reddit...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Fetch from Reddit
                  </>
                )}
              </Button>
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className={cn("py-8 text-center", designSystem.typography.color.subtle)}>
              No users found
            </div>
          ) : (
            <div className={cn("py-8 text-center", designSystem.typography.color.subtle)}>
              Enter at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </StandardModal>
  )
}