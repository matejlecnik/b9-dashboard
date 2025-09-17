'use client'

import React, { useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import type { User } from '@/lib/supabase/index'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNumber as formatNumberUtil } from '@/lib/utils'
import {
  Users,
  Clock,
  MessageCircle,
  Star,
  ExternalLink,
  X,
  Loader2,
  Crown,
  MailCheck,
  Shield,
  Download,
  CheckSquare
} from 'lucide-react'
import NextImage from 'next/image'
import { UserSearchAndFilters } from '@/components/UserSearchAndFilters'
import { UserListSkeleton, UserSearchSkeleton } from '@/components/UniversalLoading'
import { useToast } from '@/components/ui/toast'
import {
  useUserStats,
  useInfiniteUsers,
  useUserProfile,
  type UserProfile
} from '@/hooks/useUserAnalytics'
import { useDebounce } from '@/hooks/useDebounce'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'

// Enhanced Avatar component with better fallback handling
const Avatar = ({ src, alt, size = 48, username }: { src?: string, alt: string, size?: number, username: string }) => {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Clean up and validate the Reddit avatar URL if it's available
  const cleanAvatarUrl = React.useMemo(() => {
    if (!src) return null
    
    try {
      // Clean up common Reddit URL issues
      let cleanUrl = src
        .replace(/&amp;/g, '&')
        .replace(/\?s=\d+/g, '') // Remove size parameters
        .trim()
      
      // Handle different Reddit avatar URL formats
      if (cleanUrl.includes('styles.redditmedia.com') || 
          cleanUrl.includes('www.redditstatic.com') ||
          cleanUrl.includes('preview.redd.it') ||
          cleanUrl.includes('i.redd.it')) {
        
        // For Reddit media URLs, ensure HTTPS and add size parameter for optimization
        cleanUrl = cleanUrl.replace(/^http:/, 'https:')
        if (!cleanUrl.includes('?')) {
          cleanUrl += '?width=96&height=96&auto=webp&s='
        }
      }
      
      // Validate URL format
      new URL(cleanUrl)
      return cleanUrl
    } catch (error) {
      console.warn('Invalid avatar URL:', src, error)
      return null
    }
  }, [src])
  
  // Generate a consistent color for each user based on their username
  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-gray-900', 'bg-gray-600', 'bg-pink-500', 'bg-pink-500', 
      'bg-pink-500', 'bg-gray-600', 'bg-gray-600', 'bg-gray-700',
      'bg-gray-600', 'bg-gray-500', 'bg-pink-400', 'bg-pink-300'
    ]
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }
  
  if (!cleanAvatarUrl || imageError) {
    return (
      <div 
        className={`rounded-full flex items-center justify-center text-white font-bold border-2 border-gray-200 ${getAvatarColor(username)} shadow-sm`}
        style={{ width: size, height: size, fontSize: Math.max(size / 3, 12) }}
        title={`${username}'s avatar`}
      >
        {username.charAt(0).toUpperCase()}
      </div>
    )
  }
  
  return (
    <div className="relative">
      <NextImage
        src={cleanAvatarUrl}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full object-cover border-2 border-gray-200 shadow-sm transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          console.warn('Avatar failed to load:', cleanAvatarUrl, e)
          setImageError(true)
          setIsLoading(false)
        }}
        onLoad={() => setIsLoading(false)}
        quality={75}
        unoptimized={true} // Disable Next.js optimization for external Reddit URLs
        referrerPolicy="no-referrer" // Prevent referrer issues with Reddit
      />
      {isLoading && (
        <div 
          className={`absolute inset-0 rounded-full flex items-center justify-center bg-gray-100 border-2 border-gray-200`}
          style={{ width: size, height: size }}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-b9-pink" />
        </div>
      )}
    </div>
  )
}

// Safe image component for general use
const SafeImage = ({ src, alt, width, height, className }: { src: string, alt: string, width: number, height: number, className?: string }) => {
  const [imageError, setImageError] = useState(false)
  
  if (imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        style={{ width, height }}
      >
        <span className="text-sm">Image unavailable</span>
      </div>
    )
  }
  
  return (
    <NextImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setImageError(true)}
    />
  )
}

export default function UserAnalysisPage() {
  // Separate input state from query state to prevent focus loss
  const [searchInput, setSearchInput] = useState('')
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'our_creators' | 'low'>('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  
  // Multi-selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())
  
  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast()
  
  // Loading states
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Debounce search input to prevent excessive API calls
  const debouncedSearchTerm = useDebounce(searchInput, 500)

  // React Query hooks for data fetching
  const { data: stats, isLoading: statsLoading } = useUserStats()
  
  // Use infinite scrolling with debounced search term
  const { 
    data: infiniteUsersData,
    isLoading: usersLoading,
    error: usersError,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteUsers(debouncedSearchTerm, qualityFilter)


  // Flatten all pages of users into a single array
  const allUsers = React.useMemo(() => {
    if (!infiniteUsersData?.pages) return []
    return infiniteUsersData.pages.flatMap((page: { users?: User[] }) => page.users || [])
  }, [infiniteUsersData])

  // User profile loading
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const { 
    data: userProfile
  } = useUserProfile(selectedUserId || 0)

  // Utility functions
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A'
    return formatNumberUtil(num)
  }

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'N/A'
    return score.toFixed(1)
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'text': return '📝'
      case 'link': return '🔗'
      default: return '📄'
    }
  }

  // Event handlers
  const handleUserClick = useCallback((user: User) => {
    setSelectedUserId(user.id)
    setSelectedUser(null) // Clear previous selection while loading
  }, [])

  // Update selected user when profile loads
  React.useEffect(() => {
    if (userProfile && selectedUserId) {
      setSelectedUser(userProfile)
    }
  }, [userProfile, selectedUserId])


  const handleSelectAll = useCallback(() => {
    setSelectedUserIds(new Set(allUsers.map(user => user.id)))
  }, [allUsers])

  const handleSelectNone = useCallback(() => {
    setSelectedUserIds(new Set())
  }, [])

  // Bulk operation handlers
  const handleBulkToggleCreator = useCallback(async () => {
    const selectedUsers = allUsers.filter(user => selectedUserIds.has(user.id))
    const creatorCount = selectedUsers.filter(user => user.our_creator).length
    const shouldMarkAsCreator = creatorCount < selectedUsers.length / 2
    
    setBulkActionLoading(true)
    
    try {
      const response = await fetch('/api/users/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          updates: {
            our_creator: shouldMarkAsCreator
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Bulk update failed')
      }
      
      showSuccess(
        'Bulk Update Successful',
        `Updated ${result.updatedUsers.length} users ${shouldMarkAsCreator ? 'as creators' : 'as non-creators'}`
      )
      
      setSelectedUserIds(new Set()) // Clear selection after bulk operation
      
      // Optionally refresh the data
      // You might want to invalidate the query here to refresh the user list
      
    } catch (error) {
      console.error('Bulk creator toggle failed:', error)
      showError(
        'Bulk Update Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedUserIds, allUsers, showSuccess, showError])

  const handleBulkExport = useCallback(() => {
    const selectedUsers = allUsers.filter(user => selectedUserIds.has(user.id))
    
    if (selectedUsers.length === 0) {
      showWarning('No Users Selected', 'Please select users to export')
      return
    }
    
    try {
      const csvData = selectedUsers.map(user => ({
        username: user.username,
        quality_score: user.overall_user_score || 0,
        total_karma: user.total_karma || 0,
        account_age_years: user.account_age_days ? Math.round((user.account_age_days / 365) * 10) / 10 : 0,
        our_creator: user.our_creator ? 'Yes' : 'No',
        verified: user.has_verified_email ? 'Yes' : 'No',
        avg_post_score: user.avg_post_score || 0,
        posts_analyzed: user.total_posts_analyzed || 0
      }))
      
      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `selected-users-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showSuccess(
        'Export Complete',
        `Exported ${selectedUsers.length} users to CSV file`
      )
      
    } catch (error) {
      console.error('Export failed:', error)
      showError('Export Failed', 'Unable to generate CSV file')
    }
  }, [selectedUserIds, allUsers, showWarning, showSuccess, showError])


  // Loading states  
  const isLoading = statsLoading || (usersLoading && allUsers.length === 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Stats Overview with Glass Morphism Cards and Add User Button */}
        <ComponentErrorBoundary>
          {statsLoading ? (
            <div className="flex gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              </div>
              <div className="w-32 h-28 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="flex gap-3">
              {/* Stats Cards Container - 80% width */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                {/* Total Users Card - Glass Morphism */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Total Users</h3>
                    <Users className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.total_users)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Active (30d): {formatNumber(stats?.users_active_last_30_days)}
                    </p>
                  </div>
                </div>

                {/* High Quality Users Card - Glass Morphism */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">High Quality</h3>
                    <Star className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.high_quality_users)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Score ≥ 7.0
                    </p>
                  </div>
                </div>

                {/* Our Creators Card - Glass Morphism with Pink Accent */}
                <div className="bg-gradient-to-br from-pink-50/80 to-white/80 backdrop-blur-sm border border-pink-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Our Creators</h3>
                    <Crown className="h-4 w-4 text-pink-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      {formatNumber(stats?.our_creators)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Manually marked
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </ComponentErrorBoundary>


        {/* Combined Toolbar: Search, Filters, and Bulk Actions */}
        <div className="space-y-3">
          {isLoading && allUsers.length === 0 ? (
            <UserSearchSkeleton />
          ) : (
            <>
              <UserSearchAndFilters
                currentFilter={qualityFilter}
                onFilterChange={setQualityFilter}
                userCounts={stats ? {
                  total_users: stats.total_users,
                  high_quality_users: stats.high_quality_users,
                  our_creators: stats.our_creators,
                  low_quality_users: stats.low_quality_users
                } : null}
                searchQuery={searchInput}
                onSearchChange={setSearchInput}
                loading={isLoading || isFetchingNextPage}
              />

              {/* Bulk Actions Toolbar (only when items selected) */}
              {selectedUserIds.size > 0 && (
                <div className="p-3 bg-white/70 backdrop-blur-md border border-pink-100 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="text-sm font-medium text-gray-700">
                    {formatNumber(selectedUserIds.size)} selected
                  </div>
                  <div className="flex gap-2 flex-1">
                    <Button
                      onClick={handleBulkToggleCreator}
                      disabled={bulkActionLoading}
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
                    >
                      {bulkActionLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Crown className="h-3 w-3 mr-1" />
                      )}
                      Toggle Creator
                    </Button>
                    <Button
                      onClick={handleBulkExport}
                      disabled={bulkActionLoading}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={handleSelectNone}
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User List with Improved Table Structure */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Users ({formatNumber(allUsers.length)}{hasNextPage ? '+' : ''})
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {usersLoading && allUsers.length === 0 ? 'Loading users...' :
                   debouncedSearchTerm.trim() ? `Showing search results for "${debouncedSearchTerm}"` :
                   `Showing ${allUsers.length} users${hasNextPage ? ' (scroll for more)' : ''}`}
                </p>
              </div>
              {allUsers.length > 0 && (
                <Button
                  onClick={selectedUserIds.size === allUsers.length ? handleSelectNone : handleSelectAll}
                  size="sm"
                  variant="outline"
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  {selectedUserIds.size === allUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {usersError ? (
              <div className="text-center py-8">
                <p className="text-gray-800">Error loading users. Please try again.</p>
                <Button onClick={() => window.location.reload()} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : usersLoading && allUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                <span className="ml-2 text-gray-600">Loading users...</span>
              </div>
            ) : isLoading && allUsers.length === 0 ? (
              <UserListSkeleton />
            ) : (
              <div className="space-y-2">
                {allUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id)
                  return (
                    <div
                      key={user.id}
                      className={`
                        group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer
                        ${isSelected
                          ? 'bg-pink-50 border-pink-300 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              setSelectedUserIds(prev => {
                                const next = new Set(prev)
                                if (isSelected) {
                                  next.delete(user.id)
                                } else {
                                  next.add(user.id)
                                }
                                return next
                              })
                            }}
                            className="h-4 w-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                          />

                          {/* Avatar */}
                          <Avatar
                            src={user.icon_img || undefined}
                            alt={user.username}
                            size={40}
                            username={user.username}
                          />

                          {/* User Info */}
                          <div onClick={() => handleUserClick(user)} className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">u/{user.username}</span>
                              {user.our_creator && (
                                <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs">
                                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                                  Creator
                                </Badge>
                              )}
                              {user.has_verified_email && (
                                <Badge variant="outline" className="text-xs">
                                  <MailCheck className="h-2.5 w-2.5" />
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span>Score: {formatScore(user.overall_user_score)}</span>
                              <span>Karma: {formatNumber(user.total_karma)}</span>
                              <span>Posts: {user.total_posts_analyzed || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUserClick(user)
                            }}
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Load More Indicator */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-pink-500 mr-2" />
                    <span className="text-sm text-gray-600">Loading more users...</span>
                  </div>
                )}

                {/* Empty State */}
                {!usersLoading && allUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No users found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {debouncedSearchTerm ? 'Try adjusting your search' : 'Add users to get started'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced User Profile Modal with Glass Morphism */}
        {selectedUser && (
          <div
            className="fixed inset-0 z-50 p-4 flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px) saturate(140%)',
              WebkitBackdropFilter: 'blur(8px) saturate(140%)'
            }}
            onClick={() => setSelectedUser(null)}
          >
            <div
              className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {/* Banner Section */}
                {selectedUser.user.subreddit_banner_img && (
                  <div className="w-full h-40 relative overflow-hidden">
                    <SafeImage
                      src={selectedUser.user.subreddit_banner_img}
                      alt={`${selectedUser.user.username} banner`}
                      width={1200}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                )}

                {/* Header */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="rounded-full p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-10rem)]">

                {/* Main Profile Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Basic Info with Glass Cards */}
                  <div className="space-y-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                      <div className="flex items-start space-x-4">
                        <Avatar
                          src={selectedUser.user.icon_img || undefined}
                          alt={`${selectedUser.user.username} profile`}
                          size={80}
                          username={selectedUser.user.username}
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">u/{selectedUser.user.username}</h3>
                            {selectedUser.user.our_creator && (
                              <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                                <Crown className="h-3 w-3 mr-1" />
                                Our Creator
                              </Badge>
                            )}
                            {selectedUser.user.verified && (
                              <Badge variant="outline" className="border-green-500 text-green-700">
                                <MailCheck className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {selectedUser.user.is_gold && (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                <Crown className="h-3 w-3 mr-1" />
                                Gold
                              </Badge>
                            )}
                            {selectedUser.user.is_mod && (
                              <Badge variant="outline" className="border-pink-500 text-pink-700">
                                <Shield className="h-3 w-3 mr-1" />
                                Mod
                              </Badge>
                            )}
                          </div>
                        
                        <div className="flex gap-2 mb-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`https://www.reddit.com/user/${selectedUser.user.username}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Reddit Profile
                          </Button>
                          {selectedUser.user.subreddit_display_name && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(`https://www.reddit.com/r/${selectedUser.user.subreddit_display_name}`, '_blank')}
                            >
                              r/{selectedUser.user.subreddit_display_name}
                            </Button>
                          )}
                        </div>

                          {selectedUser.user.bio && (
                            <div className="bg-gray-50/50 backdrop-blur-sm p-3 rounded-lg mt-3">
                              <p className="text-sm text-gray-700">{selectedUser.user.bio}</p>
                              {selectedUser.user.bio_url && (
                                <a
                                  href={selectedUser.user.bio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 hover:text-pink-700 hover:underline text-sm mt-1 inline-block"
                                >
                                  {selectedUser.user.bio_url}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Detailed Stats with Glass Cards */}
                  <div className="space-y-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                      <h4 className="font-semibold text-lg mb-4">Statistics</h4>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gradient-to-br from-pink-50/50 to-white/50 backdrop-blur-sm p-3 rounded-lg border border-pink-200/30">
                          <p className="font-medium text-gray-600 text-xs">Quality Score</p>
                          <p className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            {formatScore(selectedUser.user.overall_user_score)}
                          </p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Total Karma</p>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(selectedUser.user.total_karma)}</p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Link Karma</p>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(selectedUser.user.link_karma)}</p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Comment Karma</p>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(selectedUser.user.comment_karma)}</p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Account Age</p>
                          <p className="text-lg font-bold text-gray-900">
                            {selectedUser.user.account_age_days ? Math.round((selectedUser.user.account_age_days / 365) * 10) / 10 : 0}y
                          </p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Karma/Day</p>
                          <p className="text-lg font-bold text-gray-900">{formatScore(selectedUser.user.karma_per_day)}</p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Posts Analyzed</p>
                          <p className="text-lg font-bold text-gray-900">{selectedUser.user.total_posts_analyzed || 0}</p>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-gray-200/30">
                          <p className="font-medium text-gray-600 text-xs">Avg Post Score</p>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(selectedUser.user.avg_post_score)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Patterns */}
                    <div className="space-y-2">
                      <h5 className="font-medium">Activity Patterns</h5>
                      {selectedUser.user.preferred_content_type && (
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-medium">Preferred Content:</span>
                          <Badge variant="outline">{getContentTypeIcon(selectedUser.user.preferred_content_type)} {selectedUser.user.preferred_content_type}</Badge>
                        </div>
                      )}
                      {selectedUser.user.most_active_posting_hour !== null && selectedUser.user.most_active_posting_hour !== undefined && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-3 w-3" />
                          <span>Most active: {selectedUser.user.most_active_posting_hour}:00</span>
                        </div>
                      )}
                      {selectedUser.user.cross_subreddit_activity && (
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="font-medium">Active in {selectedUser.user.cross_subreddit_activity} subreddits</span>
                        </div>
                      )}
                    </div>

                    {/* Subreddit Info */}
                    {selectedUser.user.subreddit_title && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                        <h5 className="font-medium mb-2">User Subreddit</h5>
                        <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 backdrop-blur-sm p-3 rounded-lg border border-purple-200/30">
                          <p className="font-medium text-gray-900">{selectedUser.user.subreddit_title}</p>
                          {selectedUser.user.subreddit_subscribers && (
                            <p className="text-sm text-gray-600 mt-1">
                              {formatNumber(selectedUser.user.subreddit_subscribers)} subscribers
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Recent Posts with Glass Cards */}
                  <div className="space-y-4">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                      <h4 className="font-semibold text-lg mb-4">Recent Posts</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {selectedUser.recent_posts.length > 0 ? (
                          selectedUser.recent_posts.map((post) => (
                            <div
                              key={post.id}
                              className="p-3 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-lg hover:bg-white/70 hover:shadow-sm transition-all duration-200"
                            >
                              <p className="font-medium text-sm mb-2 line-clamp-2 text-gray-900">{post.title}</p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                                <span className="bg-gradient-to-r from-pink-100 to-purple-100 px-2 py-1 rounded text-gray-700">
                                  r/{post.subreddit_name}
                                </span>
                                <span>{post.score} points</span>
                                <span>{post.num_comments} comments</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <Badge variant="outline" className="text-xs border-gray-300">
                                  {getContentTypeIcon(post.content_type)} {post.content_type}
                                </Badge>
                                <span className="text-gray-400">
                                  {new Date(post.created_utc).toISOString().split('T')[0]}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No recent posts available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications are handled by the useToast hook */}
      </div>
    </DashboardLayout>
  )
}