'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X, AlertCircle, Loader2, UserPlus, Sparkles, Search, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import { useDebounce } from '@/hooks/useDebounce'


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
  // API URL configuration
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://b9-dashboard.onrender.com'

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
  }, [])

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

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-md z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-3xl"
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
                  <Sparkles className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Add User
                  </h2>
                  <p className="text-[10px] text-gray-500">Search and add Reddit users to a model</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-pink-100/50 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-3 overflow-y-auto max-h-[calc(80vh-140px)]">
            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="bg-pink-600 hover:bg-pink-700"
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
                      className="w-full appearance-none bg-white border border-gray-200 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="">Select a model...</option>
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.stage_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for a Reddit username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 text-sm border-pink-200 focus:border-pink-400 focus:ring-pink-400 bg-white/50"
                disabled={!selectedModelId}
              />
            </div>

            {!selectedModelId && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">Please select a model first before searching for users.</p>
              </div>
            )}

            {/* Results */}
            <div className="space-y-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={!selectedModelId}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    user.our_creator
                      ? 'border-green-300 bg-green-50/50 hover:bg-green-100/50'
                      : 'border-pink-200/50 bg-white/40 hover:bg-pink-50/50'
                  } ${!selectedModelId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 text-sm font-semibold text-pink-600">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.username}</span>
                        {user.our_creator && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-600 font-medium">
                            ✓ Active Account
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {user.link_karma?.toLocaleString() || 0} post karma •
                        {user.comment_karma?.toLocaleString() || 0} comment karma
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : notFoundUsername && selectedModelId ? (
            <div className="rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">User not found in database</span>
              </div>
              <p className="mb-3 text-sm text-gray-600">
                Would you like to fetch <span className="font-medium text-gray-900">{notFoundUsername}</span> from Reddit?
              </p>
              <Button
                onClick={() => handleFetchFromReddit(notFoundUsername)}
                disabled={isFetching || !selectedModelId}
                className="w-full bg-pink-600 hover:bg-pink-700"
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
            <div className="py-8 text-center text-gray-500">
              No users found
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              Enter at least 2 characters to search
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}