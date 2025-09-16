'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, Search, UserPlus, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/components/ui/toast'

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
}

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: (user: User) => void
}

export function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [notFoundUsername, setNotFoundUsername] = useState<string | null>(null)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const { showSuccess, showError } = useToast()

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setNotFoundUsername(null)
      return
    }

    setIsSearching(true)
    setNotFoundUsername(null)

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      // Check for success field in response
      if (!data.success && response.status !== 200) {
        console.error('Search error:', data.error)
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
      console.error('Search error:', error)
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
      // Mark as our creator
      try {
        const response = await fetch('/api/users/toggle-creator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, our_creator: true })
        })

        if (!response.ok) throw new Error('Failed to mark as creator')

        const updatedUser = { ...user, our_creator: true }
        onUserAdded(updatedUser)
        showSuccess(`Marked ${user.username} as our creator`)
        onClose()
      } catch (error) {
        console.error('Error marking as creator:', error)
        showError('Failed to add user as creator')
      }
    } else {
      // User is already a creator - show message but don't close modal
      showSuccess(`${user.username} is already an active account`)
      // Don't close the modal so user can search for other users
    }
  }

  const handleFetchFromReddit = async (username: string) => {
    setIsFetching(true)

    try {
      const response = await fetch('https://b9-dashboard.onrender.com/api/users/discover', {
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
        onUserAdded(data.user)
        showSuccess(`Successfully added ${username} from Reddit`)
        onClose()
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (error) {
      console.error('Fetch error:', error)
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
          className="relative w-full max-w-md max-h-[70vh] overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.98), rgba(229, 231, 235, 0.95), rgba(209, 213, 219, 0.92))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.08), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 py-3 border-b border-pink-200/30 bg-gradient-to-r from-pink-50/30 to-purple-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 shadow-sm">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Add User
                  </h2>
                  <p className="text-[10px] text-gray-500">Search and add Reddit users</p>
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
          <div className="px-5 py-3 overflow-y-auto max-h-[calc(70vh-140px)]">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for a Reddit username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 text-sm border-pink-200 focus:border-pink-400 focus:ring-pink-400 bg-white/50"
                autoFocus
              />
            </div>

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
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    user.our_creator
                      ? 'border-green-300 bg-green-50/50 hover:bg-green-100/50'
                      : 'border-pink-200/50 bg-white/40 hover:bg-pink-50/50'
                  }`}
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
          ) : notFoundUsername ? (
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
                disabled={isFetching}
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