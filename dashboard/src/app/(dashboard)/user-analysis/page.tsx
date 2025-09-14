'use client'

import React, { useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import type { User } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Clock, 
  MessageCircle,
  Star,
  ExternalLink,
  Plus,
  X,
  Loader2,
  Crown,
  MailCheck,
  Shield
} from 'lucide-react'
import NextImage from 'next/image'
// Removed VirtualizedUserList to eliminate @tanstack dependency
import { UserSearchAndFilters } from '@/components/UserSearchAndFilters'
import { UserBulkActionsToolbar } from '@/components/UserBulkActionsToolbar'
import { UserListSkeleton, UserStatsCardSkeleton, UserSearchSkeleton } from '@/components/UserListSkeleton'
import { useToast } from '@/components/ui/toast'
import { 
  useUserStats,
  useInfiniteUsers,
  useAddUser,
  useUserProfile,
  type UserProfile
} from '@/hooks/useUserAnalytics'
import { useDebounce } from '@/hooks/useDebounce'

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
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  
  // Multi-selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1)
  
  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast()
  
  // Loading states
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  
  React.useEffect(() => {
    const updateHeight = () => {
      // Calculate available height: viewport height minus header, stats, search bar, and margins
      const viewportHeight = window.innerHeight
      const headerHeight = 120 // Approximate header height
      const statsHeight = 120 // Stats cards height
      const searchHeight = 80 // Search bar height
      const margins = 160 // Various margins and padding
      const calculatedHeight = Math.max(400, viewportHeight - headerHeight - statsHeight - searchHeight - margins)
      // Height calculated but not used
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

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

  // Add user mutation
  const addUserMutation = useAddUser()

  // Flatten all pages of users into a single array
  const allUsers = React.useMemo(() => {
    if (!infiniteUsersData?.pages) return []
    return infiniteUsersData.pages.flatMap((page: { users?: User[] }) => page.users || [])
  }, [infiniteUsersData])

  // User profile loading
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const { 
    data: userProfile, 
    isLoading: _profileLoading 
  } = useUserProfile(selectedUserId || 0)

  // Utility functions
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString('en-US')
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

  const handleAddUser = async () => {
    if (!newUsername.trim()) return
    
    try {
      await addUserMutation.mutateAsync(newUsername.trim())
      setNewUsername('')
      setShowAddUser(false)
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  }


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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Analytics</h1>
            <p className="text-muted-foreground">
              Analyze Reddit user behavior and quality metrics for marketing optimization
            </p>
          </div>
          <Button onClick={() => setShowAddUser(true)} className="bg-b9-pink hover:bg-b9-pink/90">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats Overview - Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <UserStatsCardSkeleton />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(stats?.total_users)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active in last 30 days: {formatNumber(stats?.users_active_last_30_days)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Quality Users</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <UserStatsCardSkeleton />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(stats?.high_quality_users)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score ≥ 7.0
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Our Creators</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <UserStatsCardSkeleton />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(stats?.our_creators)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manually marked
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Search and Filter Toolbar */}
        {isLoading && allUsers.length === 0 ? (
          <UserSearchSkeleton />
        ) : (
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
        )}

        {/* User List with Infinite Virtual Scrolling */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({formatNumber(allUsers.length)}{hasNextPage ? '+' : ''})</CardTitle>
            <CardDescription>
              {usersLoading && allUsers.length === 0 ? 'Loading users...' : 
               debouncedSearchTerm.trim() ? `Showing search results for "${debouncedSearchTerm}"` :
               `Showing ${allUsers.length} users${hasNextPage ? ' (scroll for more)' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersError ? (
              <div className="text-center py-8">
                <p className="text-gray-800">Error loading users. Please try again.</p>
                <Button onClick={() => window.location.reload()} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : usersLoading && allUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : isLoading && allUsers.length === 0 ? (
              <UserListSkeleton count={8} />
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allUsers.map((user) => (
                    <div key={user.id} className="p-3 border rounded cursor-pointer hover:bg-gray-50" onClick={() => handleUserClick(user)}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{user.username}</span>
                        <Badge variant={user.our_creator ? "default" : "secondary"}>
                          {user.our_creator ? "Creator" : "User"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4 mt-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">Loading more users...</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Enhanced User Profile Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Header with banner */}
                <div className="relative">
                  {selectedUser.user.subreddit_banner_img && (
                    <div className="w-full h-32 rounded-lg overflow-hidden mb-4">
                      <SafeImage 
                        src={selectedUser.user.subreddit_banner_img} 
                        alt={`${selectedUser.user.username} banner`} 
                        width={800} 
                        height={128} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">User Profile</h2>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Main Profile Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
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
                            <Badge className="bg-b9-pink text-white">
                              <Crown className="h-3 w-3 mr-1" />
                              Our Creator
                            </Badge>
                          )}
                          {selectedUser.user.verified && (
                            <Badge className="bg-gray-100 text-gray-800">
                              <MailCheck className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {selectedUser.user.is_gold && (
                            <Badge className="bg-gray-100 text-gray-800">
                              <Crown className="h-3 w-3 mr-1" />
                              Gold
                            </Badge>
                          )}
                          {selectedUser.user.is_mod && (
                            <Badge className="bg-pink-100 text-pink-800">
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
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm">{selectedUser.user.bio}</p>
                            {selectedUser.user.bio_url && (
                              <a 
                                href={selectedUser.user.bio_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-700 hover:underline text-sm mt-1 inline-block"
                              >
                                {selectedUser.user.bio_url}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Detailed Stats */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Statistics</h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Quality Score</p>
                        <p className="text-lg font-bold text-b9-pink">{formatScore(selectedUser.user.overall_user_score)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Total Karma</p>
                        <p className="text-lg font-bold">{formatNumber(selectedUser.user.total_karma)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Link Karma</p>
                        <p className="text-lg font-bold">{formatNumber(selectedUser.user.link_karma)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Comment Karma</p>
                        <p className="text-lg font-bold">{formatNumber(selectedUser.user.comment_karma)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Account Age</p>
                        <p className="text-lg font-bold">{selectedUser.user.account_age_days ? Math.round((selectedUser.user.account_age_days / 365) * 10) / 10 : 0}y</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Karma/Day</p>
                        <p className="text-lg font-bold">{formatScore(selectedUser.user.karma_per_day)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Posts Analyzed</p>
                        <p className="text-lg font-bold">{selectedUser.user.total_posts_analyzed || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-600">Avg Post Score</p>
                        <p className="text-lg font-bold">{formatNumber(selectedUser.user.avg_post_score)}</p>
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
                      <div className="space-y-2">
                        <h5 className="font-medium">User Subreddit</h5>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">{selectedUser.user.subreddit_title}</p>
                          {selectedUser.user.subreddit_subscribers && (
                            <p className="text-sm text-gray-600">{formatNumber(selectedUser.user.subreddit_subscribers)} subscribers</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Recent Posts */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Recent Posts</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedUser.recent_posts.length > 0 ? (
                        selectedUser.recent_posts.map((post) => (
                          <div key={post.id} className="p-3 border rounded-lg hover:bg-gray-50">
                            <p className="font-medium text-sm mb-2 line-clamp-2">{post.title}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                              <span className="bg-gray-100 px-2 py-1 rounded">r/{post.subreddit_name}</span>
                              <span>{post.score} points</span>
                              <span>{post.num_comments} comments</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <Badge variant="outline" className="text-xs">
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
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Add New User</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAddUser(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <Input
                  placeholder="Enter Reddit username (without u/)"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleAddUser}
                    disabled={addUserMutation.isPending || !newUsername.trim()}
                    className="flex-1"
                  >
                    {addUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add User
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Bulk Actions Toolbar */}
        <UserBulkActionsToolbar
          selectedCount={selectedUserIds.size}
          totalCount={allUsers.length}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onBulkToggleCreator={bulkActionLoading ? undefined : handleBulkToggleCreator}
          onBulkExport={handleBulkExport}
        />
        
        {/* Toast Notifications */}
      </div>
    </DashboardLayout>
  )
}