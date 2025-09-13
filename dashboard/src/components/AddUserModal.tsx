'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { X, UserPlus, Search, AlertCircle, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import { useDebounce } from '@/hooks/useDebounce'

interface User {
  id: number
  username: string
  link_karma: number
  comment_karma: number
  account_age_days: number | null
  icon_img: string | null
  our_creator: boolean
  verified?: boolean
  is_gold?: boolean
  has_verified_email?: boolean
  created_utc?: string | null
  bio?: string | null
}

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: () => void
  existingCreators: User[]
}

export function AddUserModal({ isOpen, onClose, onUserAdded, existingCreators }: AddUserModalProps) {
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [creatingUsername, setCreatingUsername] = useState<string | null>(null)
  const [notFoundUsername, setNotFoundUsername] = useState<string | null>(null)
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set())

  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Search for users when query changes
  useEffect(() => {
    if (!debouncedSearchQuery.trim() || !isOpen) {
      setSearchResults([])
      setNotFoundUsername(null)
      return
    }

    const searchUsers = async () => {
      setIsSearching(true)
      setNotFoundUsername(null)

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearchQuery)}`)
        const result = await response.json()

        if (result.success) {
          setSearchResults(result.users || [])

          // Check if exact username match exists
          const exactMatch = result.users?.find((u: User) =>
            u.username.toLowerCase() === debouncedSearchQuery.toLowerCase()
          )

          // If no exact match and query looks like a valid username, show create option
          if (!exactMatch && /^[a-zA-Z0-9_-]+$/.test(debouncedSearchQuery)) {
            setNotFoundUsername(debouncedSearchQuery)
          }
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchUsers()
  }, [debouncedSearchQuery, isOpen])

  // Create new user from Reddit
  const handleCreateUser = useCallback(async (username: string) => {
    setIsCreatingUser(true)
    setCreatingUsername(username)

    try {
      // First, fetch user data from Reddit
      const redditResponse = await fetch('/api/reddit/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })

      const redditResult = await redditResponse.json()

      if (!redditResult.success) {
        throw new Error(redditResult.error || 'Failed to fetch user from Reddit')
      }

      // Now add them as a creator
      const toggleResponse = await fetch('/api/users/toggle-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: redditResult.user.username,
          our_creator: true
        })
      })

      const toggleResult = await toggleResponse.json()

      if (!toggleResult.success) {
        throw new Error(toggleResult.error || 'Failed to add user as creator')
      }

      addToast({
        type: 'success',
        title: 'User Added Successfully',
        description: `u/${username} has been fetched from Reddit and added to your active accounts`,
        duration: 5000
      })

      setRecentlyAdded(prev => new Set(prev).add(username))
      setSearchQuery('')
      setNotFoundUsername(null)
      onUserAdded()

      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Error creating user:', error)
      addToast({
        type: 'error',
        title: 'Failed to Add User',
        description: error instanceof Error ? error.message : 'Could not fetch user from Reddit. They may not exist or be suspended.',
        duration: 5000
      })
    } finally {
      setIsCreatingUser(false)
      setCreatingUsername(null)
    }
  }, [addToast, onUserAdded, onClose])

  // Add existing user as creator
  const handleAddExistingUser = useCallback(async (user: User) => {
    setCreatingUsername(user.username)

    try {
      const response = await fetch('/api/users/toggle-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, our_creator: true })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to add user')
      }

      addToast({
        type: 'success',
        title: 'User Added',
        description: `u/${user.username} has been added to active accounts`,
        duration: 3000
      })

      setRecentlyAdded(prev => new Set(prev).add(user.username))
      onUserAdded()

      // Close modal after short delay
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Error adding user:', error)
      addToast({
        type: 'error',
        title: 'Failed to Add User',
        description: error instanceof Error ? error.message : 'Failed to add user',
        duration: 5000
      })
    } finally {
      setCreatingUsername(null)
    }
  }, [addToast, onUserAdded, onClose])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setNotFoundUsername(null)
      setRecentlyAdded(new Set())
    }
  }, [isOpen])

  const formatKarma = (karma: number) => {
    if (karma >= 1000000) return `${(karma / 1000000).toFixed(1)}M`
    if (karma >= 1000) return `${(karma / 1000).toFixed(1)}k`
    return karma.toString()
  }

  const formatAge = (days: number | null) => {
    if (!days) return 'New'
    if (days > 365) return `${Math.floor(days / 365)}y`
    if (days > 30) return `${Math.floor(days / 30)}mo`
    return `${days}d`
  }

  const isUserAlreadyCreator = (username: string) => {
    return existingCreators.some(c => c.username === username) || recentlyAdded.has(username)
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
          className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl"
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
                  <UserPlus className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Add Account
                  </h2>
                  <p className="text-[10px] text-gray-500">Search and add Reddit accounts</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-200/50 transition-colors"
                disabled={isCreatingUser}
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search Reddit username (e.g., spez)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 h-10 bg-white/70 border-gray-200 focus:border-pink-400 focus:ring-pink-400"
                autoFocus
                disabled={isCreatingUser}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Results */}
            <div className="space-y-3">
              {/* Create New User Option */}
              {notFoundUsername && !isCreatingUser && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        User not found in database
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        u/{notFoundUsername} isn&apos;t in your database yet. Would you like to fetch their data from Reddit?
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                        onClick={() => handleCreateUser(notFoundUsername)}
                        disabled={creatingUsername === notFoundUsername}
                      >
                        {creatingUsername === notFoundUsername ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Fetching from Reddit...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1.5" />
                            Fetch from Reddit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">Found {searchResults.length} users</p>
                  <div className="grid grid-cols-1 gap-2">
                    {searchResults.map((user) => {
                      const isAlreadyCreator = isUserAlreadyCreator(user.username)
                      const accountAge = formatAge(user.account_age_days)

                      return (
                        <div
                          key={user.id}
                          className={`bg-white/70 border rounded-xl p-3 transition-all ${
                            isAlreadyCreator ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              {user.icon_img ? (
                                <Image
                                  src={user.icon_img}
                                  alt={user.username}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                  {user.username.substring(0, 2).toUpperCase()}
                                </div>
                              )}

                              {/* User Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://www.reddit.com/user/${user.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-sm text-gray-900 hover:text-pink-600 flex items-center gap-1"
                                  >
                                    u/{user.username}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  {user.verified && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">✓</span>
                                  )}
                                  {isAlreadyCreator && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded flex items-center gap-0.5">
                                      <CheckCircle className="h-3 w-3" />
                                      Active
                                    </span>
                                  )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[11px] text-gray-600">
                                    <span className="text-gray-400">Post:</span> {formatKarma(user.link_karma)}
                                  </span>
                                  <span className="text-[11px] text-gray-600">
                                    <span className="text-gray-400">Comment:</span> {formatKarma(user.comment_karma)}
                                  </span>
                                  <span className="text-[11px] text-gray-600">
                                    <span className="text-gray-400">Age:</span> {accountAge}
                                  </span>
                                </div>

                                {/* Bio if available */}
                                {user.bio && (
                                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            {!isAlreadyCreator && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white hover:bg-pink-50 border-pink-200 text-pink-600 hover:text-pink-700"
                                onClick={() => handleAddExistingUser(user)}
                                disabled={creatingUsername === user.username}
                              >
                                {creatingUsername === user.username ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isSearching && searchQuery && searchResults.length === 0 && !notFoundUsername && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No users found</p>
                  <p className="text-xs text-gray-500 mt-1">Try searching for a different username</p>
                </div>
              )}

              {/* Initial State */}
              {!searchQuery && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Search for Reddit users</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a username to search existing users or fetch new ones from Reddit
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}