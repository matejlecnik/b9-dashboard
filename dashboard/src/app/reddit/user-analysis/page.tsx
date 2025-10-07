'use client'

import React, { useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'
import type { User } from '@/lib/supabase/index'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNumber as formatNumberUtil } from '@/lib/formatters'
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
  CheckSquare,
  Activity
} from 'lucide-react'
import NextImage from 'next/image'
import { UserFilters } from '@/components/shared/UserFilters'
import { UserListSkeleton } from '@/components/shared/UniversalLoading'
import { useToast } from '@/components/ui/toast'
import {
  useUserStats,
  useInfiniteUsers,
  useUserProfile,
  type UserProfile
} from '@/hooks/useUserAnalytics'
import { useDebounce } from '@/hooks/useDebounce'
import { ComponentErrorBoundary } from '@/components/shared/ErrorBoundary'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

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
    } catch (_error) {
      return null
    }
  }, [src])
  
  // Generate a consistent color for each user based on their username - using design tokens
  const getAvatarColor = (username: string) => {
    const colors = [
      designSystem.background.surface.inverse, designSystem.background.surface.darker, 'bg-primary', 'bg-primary',
      'bg-primary', designSystem.background.surface.darker, designSystem.background.surface.darker, designSystem.background.surface.darkest,
      designSystem.background.surface.darker, designSystem.background.surface.dark, 'bg-primary/80', 'bg-primary/60'
    ]
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }
  
  if (!cleanAvatarUrl || imageError) {
    return (
      <div
        className={`${designSystem.borders.radius.full} flex items-center justify-center text-white font-bold border-2 border-default ${getAvatarColor(username)} shadow-sm`}
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
        className={`${designSystem.borders.radius.full} object-cover border-2 border-default shadow-sm transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ width: size, height: size }}
        onError={(_e) => {
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
          className={cn(`absolute inset-0 ${designSystem.borders.radius.full} flex items-center justify-center border-2 border-default`, designSystem.background.surface.light)}
          style={{ width: size, height: size }}
        >
          <div className={`animate-spin ${designSystem.borders.radius.full} h-4 w-4 border-2 border-gray-300 border-t-b9-pink`} />
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
        className={cn("flex items-center justify-center", designSystem.background.surface.light, designSystem.typography.color.disabled, className)}
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
      const response = await fetch('/api/reddit/users/bulk-update', {
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
      
    } catch (_error) {
      showError(
        'Bulk Update Failed',
        _error instanceof Error ? _error.message : 'An unexpected error occurred'
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
      
    } catch (_error) {
      showError('Export Failed', 'Unable to generate CSV file')
    }
  }, [selectedUserIds, allUsers, showWarning, showSuccess, showError])


  // Loading states  
  const isLoading = statsLoading || (usersLoading && allUsers.length === 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Stats Overview with Standardized MetricsCards Style */}
        <ComponentErrorBoundary>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={cn(`h-28 ${designSystem.borders.radius.lg} animate-pulse`, designSystem.background.surface.light)} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-1.5">
              {/* Total Users Card */}
              <div className={`${designSystem.borders.radius.lg} p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(`p-2 ${designSystem.borders.radius.md} bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20`, designSystem.typography.color.secondary)}>
                    <Users className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className={cn("text-lg font-bold font-mac-display text-shadow-subtle", designSystem.typography.color.primary)}>
                    {formatNumber(stats?.total_users)}
                  </div>
                  <div className={cn("text-xs font-semibold font-mac-text", designSystem.typography.color.secondary)}>
                    Total Users
                  </div>
                  <div className={cn("text-xs font-mac-text", designSystem.typography.color.tertiary)}>
                    In Database
                  </div>
                </div>
              </div>

              {/* Active Users Card */}
              <div className={`${designSystem.borders.radius.lg} p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(`p-2 ${designSystem.borders.radius.md} bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20`, designSystem.typography.color.secondary)}>
                    <Activity className="h-4 w-4" />
                  </div>
                  {stats?.users_active_last_30_days && stats.users_active_last_30_days > 0 && (
                    <div className={`w-1 h-1 ${designSystem.borders.radius.full}`}
                      style={{
                        background: 'linear-gradient(135deg, #FFB3C1, #FF99A9)',
                        boxShadow: '0 1px 2px rgba(255, 179, 193, 0.2)',
                      }}></div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className={cn("text-lg font-bold font-mac-display text-shadow-subtle", designSystem.typography.color.primary)}>
                    {formatNumber(stats?.users_active_last_30_days)}
                  </div>
                  <div className={cn("text-xs font-semibold font-mac-text", designSystem.typography.color.secondary)}>
                    Active Users
                  </div>
                  <div className={cn("text-xs font-mac-text", designSystem.typography.color.tertiary)}>
                    Last 30 days
                  </div>
                </div>
              </div>

              {/* High Quality Users Card */}
              <div className={`${designSystem.borders.radius.lg} p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(`p-2 ${designSystem.borders.radius.md} bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20`, designSystem.typography.color.secondary)}>
                    <Star className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className={cn("text-lg font-bold font-mac-display text-shadow-subtle", designSystem.typography.color.primary)}>
                    {formatNumber(stats?.high_quality_users)}
                  </div>
                  <div className={cn("text-xs font-semibold font-mac-text", designSystem.typography.color.secondary)}>
                    High Quality
                  </div>
                  <div className={cn("text-xs font-mac-text", designSystem.typography.color.tertiary)}>
                    Score ≥ 7.0
                  </div>
                </div>
              </div>

              {/* Our Creators Card with Pink Accent */}
              <div className={`${designSystem.borders.radius.lg} p-4 transition-all duration-300 ease-out h-full min-h-[100px] bg-[rgba(248,250,252,0.7)] backdrop-blur-[15px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:bg-[rgba(248,250,252,0.8)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:-translate-y-1 ring-2 ring-primary/20`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 ${designSystem.borders.radius.md} text-primary bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/20`}>
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className={`w-1.5 h-1.5 ${designSystem.borders.radius.full}`}
                    style={{
                      background: 'linear-gradient(135deg, #FF8395, #FF7A85)',
                      boxShadow: '0 1px 2px rgba(255, 131, 149, 0.25)',
                    }}></div>
                </div>

                <div className="space-y-1.5">
                  <div className={cn("text-lg font-bold font-mac-display text-shadow-subtle", designSystem.typography.color.primary)}>
                    {formatNumber(stats?.our_creators)}
                  </div>
                  <div className={cn("text-xs font-semibold font-mac-text", designSystem.typography.color.secondary)}>
                    Our Creators
                  </div>
                  <div className={cn("text-xs font-mac-text", designSystem.typography.color.tertiary)}>
                    {stats?.our_creators && stats?.our_creators > 0 ? 'Manually marked' : 'None yet'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ComponentErrorBoundary>


        {/* Combined Toolbar: Search on left, Filters on right - Slim Design matching subreddit review */}
        <div className={`flex items-stretch justify-between gap-3 mb-3 p-2 bg-white/90 backdrop-blur-sm ${designSystem.borders.radius.sm} border border-default shadow-sm`}>
          {/* Search Section - Left Side - Compact */}
          <div className="flex items-center flex-1 min-w-0 max-w-xs">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
                <svg className={cn("h-4 w-4", designSystem.typography.color.subtle)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder=""
                title="Search users by username"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={usersLoading || isFetchingNextPage}
                className={`w-full pl-8 pr-8 py-1.5 text-sm border border-default ${designSystem.borders.radius.sm} bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all duration-200 h-8 relative`}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className={cn("absolute inset-y-0 right-0 pr-2 flex items-center", designSystem.typography.color.disabled, "hover:text-gray-600")}
                  aria-label="Clear search"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters Section - Right Side */}
          <div className="flex items-center">
            <UserFilters
              currentFilter={qualityFilter}
              onFilterChange={(value) => {
                React.startTransition(() => {
                  setQualityFilter(value)
                })
              }}
              userCounts={stats ? {
                total_users: stats.total_users,
                high_quality_users: stats.high_quality_users,
                our_creators: stats.our_creators,
                low_quality_users: stats.low_quality_users
              } : null}
              loading={usersLoading}
            />
          </div>
        </div>

        {/* Bulk Actions Toolbar (only when items selected) */}
        {selectedUserIds.size > 0 && (
          <div className={`p-3 bg-white/70 backdrop-blur-md border border-primary/20 ${designSystem.borders.radius.md} flex items-center gap-3 animate-in slide-in-from-top-2 duration-200 mb-3`}>
            <div className={cn("text-sm font-medium", designSystem.typography.color.secondary)}>
              {formatNumber(selectedUserIds.size)} selected
            </div>
            <div className="flex gap-2 flex-1">
              <Button
                onClick={handleBulkToggleCreator}
                disabled={bulkActionLoading}
                size="sm"
                className="bg-gradient-to-r from-primary via-primary-hover to-secondary text-white hover:from-primary-hover hover:to-secondary-hover"
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

        {/* Main User List - Flex grow to fill remaining space (matching subreddit review) */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className={`bg-white/95 backdrop-blur-sm ${designSystem.borders.radius.md} shadow-sm border border-gray-200/50 flex-1 flex flex-col overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-white/60 to-gray-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={cn("text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent", "from-gray-900 to-gray-700")}>
                    Users ({formatNumber(allUsers.length)}{hasNextPage ? '+' : ''})
                  </h3>
                  <p className={cn("text-sm mt-0.5", designSystem.typography.color.subtle)}>
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
                    className="border-strong hover:border-primary/40 hover:bg-primary/10"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    {selectedUserIds.size === allUsers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto px-4 py-3", `${designSystem.background.surface.subtle}/30`)}>
            {usersError ? (
              <div className="text-center py-8">
                <p className={cn(designSystem.typography.color.secondary)}>Error loading users. Please try again.</p>
                <Button onClick={() => window.location.reload()} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : usersLoading && allUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className={cn("ml-2", designSystem.typography.color.tertiary)}>Loading users...</span>
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
                        group relative p-4 ${designSystem.borders.radius.md} border transition-all duration-200 cursor-pointer
                        ${isSelected
                          ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/40 shadow-md ring-1 ring-primary/20'
                          : 'bg-white/80 backdrop-blur-sm border-gray-200/70 hover:bg-white/95 hover:border-strong hover:shadow-lg hover:scale-[1.01]'
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
                            className="h-4 w-4 text-primary border-strong rounded focus:ring-primary"
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
                              <span className={cn("font-medium", designSystem.typography.color.primary)}>u/{user.username}</span>
                              {user.our_creator && (
                                <Badge className="bg-gradient-to-r from-primary to-secondary text-white text-xs">
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
                            <div className={cn("flex items-center gap-4 mt-1 text-xs", designSystem.typography.color.subtle)}>
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
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className={cn("text-sm", designSystem.typography.color.tertiary)}>Loading more users...</span>
                  </div>
                )}

                {/* Empty State */}
                {!usersLoading && allUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className={cn("h-12 w-12 mx-auto mb-3", designSystem.typography.color.disabled)} />
                    <p className={cn("font-medium", designSystem.typography.color.tertiary)}>No users found</p>
                    <p className={cn("text-sm mt-1", designSystem.typography.color.subtle)}>
                      {debouncedSearchTerm ? 'Try adjusting your search' : 'Add users to get started'}
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
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
              className={`bg-white/95 backdrop-blur-xl ${designSystem.borders.radius.lg} max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl ring-1 ring-black/5`}
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
                    className={`${designSystem.borders.radius.full} p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors`}
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
                    <div className={`bg-white/60 backdrop-blur-sm ${designSystem.borders.radius.md} p-4 border border-gray-200/50`}>
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
                              <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                                <Crown className="h-3 w-3 mr-1" />
                                Our Creator
                              </Badge>
                            )}
                            {selectedUser.user.verified && (
                              <Badge variant="outline" className="border-success text-success-pressed">
                                <MailCheck className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {selectedUser.user.is_gold && (
                              <Badge variant="outline" className="border-warning text-warning-pressed">
                                <Crown className="h-3 w-3 mr-1" />
                                Gold
                              </Badge>
                            )}
                            {selectedUser.user.is_mod && (
                              <Badge variant="outline" className="border-primary text-primary-pressed">
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
                            <div className={cn(`backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} mt-3`, `${designSystem.background.surface.subtle}/50`)}>
                              <p className={cn("text-sm", designSystem.typography.color.secondary)}>{selectedUser.user.bio}</p>
                              {selectedUser.user.bio_url && (
                                <a
                                  href={selectedUser.user.bio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-hover hover:underline text-sm mt-1 inline-block"
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
                    <div className={`bg-white/60 backdrop-blur-sm ${designSystem.borders.radius.md} p-4 border border-gray-200/50`}>
                      <h4 className="font-semibold text-lg mb-4">Statistics</h4>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className={`bg-gradient-to-br from-primary/10 to-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-primary/20`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Quality Score</p>
                          <p className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {formatScore(selectedUser.user.overall_user_score)}
                          </p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Total Karma</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>{formatNumber(selectedUser.user.total_karma)}</p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Link Karma</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>{formatNumber(selectedUser.user.link_karma)}</p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Comment Karma</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>{formatNumber(selectedUser.user.comment_karma)}</p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Account Age</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>
                            {selectedUser.user.account_age_days ? Math.round((selectedUser.user.account_age_days / 365) * 10) / 10 : 0}y
                          </p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Karma/Day</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>{formatScore(selectedUser.user.karma_per_day)}</p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Posts Analyzed</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>{selectedUser.user.total_posts_analyzed || 0}</p>
                        </div>
                        <div className={`bg-white/50 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-gray-200/30`}>
                          <p className={cn("font-medium text-xs", designSystem.typography.color.tertiary)}>Avg Post Score</p>
                          <p className={cn("text-lg font-bold", designSystem.typography.color.primary)}>{formatNumber(selectedUser.user.avg_post_score)}</p>
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
                      <div className={`bg-white/60 backdrop-blur-sm ${designSystem.borders.radius.md} p-4 border border-gray-200/50`}>
                        <h5 className="font-medium mb-2">User Subreddit</h5>
                        <div className={`bg-gradient-to-br from-secondary/10 to-primary/10 backdrop-blur-sm p-3 ${designSystem.borders.radius.sm} border border-secondary/20`}>
                          <p className={cn("font-medium", designSystem.typography.color.primary)}>{selectedUser.user.subreddit_title}</p>
                          {selectedUser.user.subreddit_subscribers && (
                            <p className={cn("text-sm mt-1", designSystem.typography.color.tertiary)}>
                              {formatNumber(selectedUser.user.subreddit_subscribers)} subscribers
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Recent Posts with Glass Cards */}
                  <div className="space-y-4">
                    <div className={`bg-white/60 backdrop-blur-sm ${designSystem.borders.radius.md} p-4 border border-gray-200/50`}>
                      <h4 className="font-semibold text-lg mb-4">Recent Posts</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {selectedUser.recent_posts.length > 0 ? (
                          selectedUser.recent_posts.map((post) => (
                            <div
                              key={post.id}
                              className={`p-3 bg-white/50 backdrop-blur-sm border border-gray-200/50 ${designSystem.borders.radius.sm} hover:bg-white/70 hover:shadow-sm transition-all duration-200`}
                            >
                              <p className={cn("font-medium text-sm mb-2 line-clamp-2", designSystem.typography.color.primary)}>{post.title}</p>
                              <div className={cn("flex items-center space-x-2 text-xs mb-2", designSystem.typography.color.subtle)}>
                                <span className={cn("bg-gradient-to-r from-primary/20 to-secondary/20 px-2 py-1 rounded", designSystem.typography.color.secondary)}>
                                  r/{post.subreddit_name}
                                </span>
                                <span>{post.score} points</span>
                                <span>{post.num_comments} comments</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <Badge variant="outline" className="text-xs border-strong">
                                  {getContentTypeIcon(post.content_type)} {post.content_type}
                                </Badge>
                                <span className={cn(designSystem.typography.color.disabled)}>
                                  {new Date(post.created_utc).toISOString().split('T')[0]}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={cn("text-center py-8", designSystem.typography.color.subtle)}>
                            <MessageCircle className={cn("h-8 w-8 mx-auto mb-2", designSystem.typography.color.disabled)} />
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