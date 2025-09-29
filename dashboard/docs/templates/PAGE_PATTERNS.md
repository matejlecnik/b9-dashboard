# Standard Page Patterns

┌─ PAGE TEMPLATES ────────────────────────────────────────┐
│ ● PATTERNS    │ ████████████████████ 100% DEFINED      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "DASHBOARD_TEMPLATE.md",
  "current": "PAGE_PATTERNS.md",
  "siblings": [
    {"path": "SIDEBAR_CONFIGURATION.md", "desc": "Sidebar setup guide"},
    {"path": "COMPONENT_CATALOG.md", "desc": "Reusable components"},
    {"path": "DATA_FLOW_PATTERNS.md", "desc": "React Query patterns"}
  ]
}
```

## Page Types

### 1. Review/Approval Page Pattern

Used for: Creator review, subreddit review, content moderation

```typescript
// review/page.tsx
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/useDebounce'

// Hooks
import {
  useItemsForReview,
  useReviewStats,
  useUpdateReviewStatus,
  useBulkUpdateReview
} from '@/hooks/queries/useReview'

// Components
import {
  DashboardLayout,
  MetricsCards,
  StandardToolbar,
  TableSkeleton,
  MetricsCardsSkeleton,
  ErrorBoundary as ComponentErrorBoundary
} from '@/components/shared'

// Dynamic table import
const UniversalTable = dynamic(
  () => import('@/components/shared/tables/UniversalTable'),
  { ssr: false, loading: () => <TableSkeleton /> }
)

export default function ReviewPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState<FilterType>('pending')
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Data fetching
  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useItemsForReview({
    search: debouncedSearchQuery,
    status: currentFilter,
    orderBy: 'created_at',
    order: 'desc'
  })

  // Stats
  const { data: stats } = useReviewStats()

  // Mutations
  const updateReviewMutation = useUpdateReviewStatus()
  const bulkUpdateMutation = useBulkUpdateReview()

  // Flatten pages
  const items = useMemo(
    () => infiniteData?.pages.flat() || [],
    [infiniteData]
  )

  // Handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleFilterChange = useCallback((filter: string) => {
    setCurrentFilter(filter as FilterType)
    setSelectedItems(new Set())
  }, [])

  const handleBulkAction = useCallback((action: string) => {
    const selectedIds = Array.from(selectedItems)
    if (selectedIds.length === 0) return

    bulkUpdateMutation.mutate(
      { ids: selectedIds, status: action },
      {
        onSuccess: () => {
          setSelectedItems(new Set())
        }
      }
    )
  }, [selectedItems, bulkUpdateMutation])

  return (
    <DashboardLayout
      title="Review Items"
      subtitle="Review and approve pending items"
    >
      <div className="space-y-6">
        {/* Metrics */}
        <ComponentErrorBoundary>
          {!stats ? (
            <MetricsCardsSkeleton />
          ) : (
            <MetricsCards
              platform="instagram"
              totalCreators={stats.total}
              pendingCount={stats.pending}
              approvedCount={stats.approved}
              nonRelatedCount={stats.rejected}
              loading={false}
            />
          )}
        </ComponentErrorBoundary>

        {/* Toolbar */}
        <ComponentErrorBoundary>
          <StandardToolbar
            searchValue={searchQuery}
            onSearchChange={handleSearchChange}
            filters={[
              { id: 'pending', label: 'Pending', count: stats?.pending || 0 },
              { id: 'approved', label: 'Approved', count: stats?.approved || 0 },
              { id: 'rejected', label: 'Rejected', count: stats?.rejected || 0 }
            ]}
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
            selectedCount={selectedItems.size}
            bulkActions={selectedItems.size > 0 ? [
              { id: 'approve', label: 'Approve', onClick: () => handleBulkAction('approved') },
              { id: 'reject', label: 'Reject', onClick: () => handleBulkAction('rejected') }
            ] : []}
            onClearSelection={() => setSelectedItems(new Set())}
            loading={isLoading || bulkUpdateMutation.isPending}
          />
        </ComponentErrorBoundary>

        {/* Table */}
        <ComponentErrorBoundary>
          <UniversalTable
            data={items}
            loading={isLoading}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            onUpdateItem={(id, status) => updateReviewMutation.mutate({ id, status })}
            hasMore={hasNextPage}
            onReachEnd={fetchNextPage}
            loadingMore={isFetchingNextPage}
          />
        </ComponentErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
```

### 2. Analytics Page Pattern

Used for: Dashboard analytics, performance metrics, insights

```typescript
// analytics/page.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  TrendingUp,
  Activity,
  Target
} from 'lucide-react'
import { DashboardLayout, MetricsCards, ErrorBoundary } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAnalyticsData } from '@/hooks/queries/useAnalytics'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d')

  // Fetch analytics data
  const { data: analytics, isLoading } = useAnalyticsData(dateRange)

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!analytics) return null

    return {
      totalUsers: analytics.users.total,
      activeUsers: analytics.users.active,
      growthRate: analytics.growth.percentage,
      engagement: analytics.engagement.average
    }
  }, [analytics])

  return (
    <DashboardLayout
      title="Analytics Dashboard"
      subtitle="Performance metrics and insights"
    >
      <div className="space-y-6">
        {/* Top Metrics */}
        <ErrorBoundary>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="text-green-600">↑ {metrics?.growthRate || 0}%</span> from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
                <p className="text-xs text-gray-600 mt-1">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.engagement || 0}%</div>
                <p className="text-xs text-gray-600 mt-1">Average rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion</CardTitle>
                <Target className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15%</div>
                <p className="text-xs text-gray-600 mt-1">Success rate</p>
              </CardContent>
            </Card>
          </div>
        </ErrorBoundary>

        {/* Charts Section */}
        <ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Growth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {/* Add chart component here */}
                  Chart placeholder
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  {/* Add chart component here */}
                  Chart placeholder
                </div>
              </CardContent>
            </Card>
          </div>
        </ErrorBoundary>

        {/* Activity Feed */}
        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['New user registered', 'Content went viral', 'Milestone reached'].map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-700">{activity}</p>
                    <span className="ml-auto text-xs text-gray-500">{i + 1}h ago</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
```

### 3. Content Management Page Pattern

Used for: Viral content, posts, media management

```typescript
// content/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { DashboardLayout, StandardToolbar, ErrorBoundary } from '@/components/shared'
import { ContentGrid } from '@/components/ContentGrid'
import { ContentFilters } from '@/components/ContentFilters'
import { useContentData } from '@/hooks/queries/useContent'

export default function ContentPage() {
  const [filters, setFilters] = useState({
    minViews: 10000,
    sortBy: 'views',
    dateRange: '7d'
  })

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Fetch content
  const {
    data: content,
    isLoading,
    hasNextPage,
    fetchNextPage
  } = useContentData(filters)

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  return (
    <DashboardLayout
      title="Content Management"
      subtitle="Manage and analyze content performance"
    >
      <div className="space-y-6">
        {/* Filters */}
        <ErrorBoundary>
          <ContentFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </ErrorBoundary>

        {/* Toolbar */}
        <ErrorBoundary>
          <StandardToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortOptions={[
              { id: 'views', label: 'Views' },
              { id: 'likes', label: 'Likes' },
              { id: 'recent', label: 'Recent' }
            ]}
            currentSort={filters.sortBy}
            onSortChange={(sort) => setFilters(prev => ({ ...prev, sortBy: sort }))}
          />
        </ErrorBoundary>

        {/* Content Grid/List */}
        <ErrorBoundary>
          {viewMode === 'grid' ? (
            <ContentGrid
              content={content}
              loading={isLoading}
              hasMore={hasNextPage}
              onLoadMore={fetchNextPage}
            />
          ) : (
            <ContentList
              content={content}
              loading={isLoading}
              hasMore={hasNextPage}
              onLoadMore={fetchNextPage}
            />
          )}
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
```

### 4. System Monitor Page Pattern

Used for: System monitoring, scraper status, logs

```typescript
// monitor/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Square, Activity } from 'lucide-react'
import {
  DashboardLayout,
  StandardActionButton,
  ErrorBoundary
} from '@/components/shared'
import { LogViewerSupabase } from '@/components/LogViewerSupabase'
import { ApiActivityLog } from '@/components/ApiActivityLog'
import { useSystemStatus } from '@/hooks/queries/useSystemStatus'

export default function MonitorPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [metrics, setMetrics] = useState(null)

  // Fetch system status
  const { data: status, refetch } = useSystemStatus()

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 5000)

    return () => clearInterval(interval)
  }, [refetch])

  const handleToggle = useCallback(async () => {
    if (isRunning) {
      // Stop system
      await fetch('/api/system/stop', { method: 'POST' })
      setIsRunning(false)
    } else {
      // Start system
      await fetch('/api/system/start', { method: 'POST' })
      setIsRunning(true)
    }
  }, [isRunning])

  return (
    <DashboardLayout
      title="System Monitor"
      subtitle="Real-time system monitoring and control"
    >
      <div className="space-y-6">
        {/* Status Cards */}
        <ErrorBoundary>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">{isRunning ? 'Running' : 'Stopped'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status?.successRate || 0}%</div>
                <Progress value={status?.successRate || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status?.uptime || '0h 0m'}</div>
              </CardContent>
            </Card>
          </div>
        </ErrorBoundary>

        {/* Control Panel */}
        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>Control Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <StandardActionButton
                  onClick={handleToggle}
                  icon={isRunning ? Square : Play}
                  variant={isRunning ? 'danger' : 'primary'}
                >
                  {isRunning ? 'Stop System' : 'Start System'}
                </StandardActionButton>
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* Logs */}
        <ErrorBoundary>
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <LogViewerSupabase
                tableName="system_logs"
                autoRefresh={true}
                refreshInterval={5000}
              />
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* API Activity */}
        <ErrorBoundary>
          <ApiActivityLog
            endpoint="/api/system"
            showErrors={true}
            limit={50}
          />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
```

### 5. Niching/Categorization Page Pattern

Used for: Creator niching, content categorization, tagging

```typescript
// niching/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { Tag, Users } from 'lucide-react'
import {
  DashboardLayout,
  StandardToolbar,
  UniversalTable,
  ErrorBoundary
} from '@/components/shared'
import { NicheSelector } from '@/components/NicheSelector'
import { useNichingData } from '@/hooks/queries/useNiching'

export default function NichingPage() {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  // Fetch data
  const { data, isLoading, stats } = useNichingData(selectedNiches)

  const handleAssignNiche = useCallback((niche: string) => {
    const selectedIds = Array.from(selectedItems)
    // Assign niche to selected items
  }, [selectedItems])

  return (
    <DashboardLayout
      title="Niching & Categorization"
      subtitle="Organize content and creators into niches"
    >
      <div className="space-y-6">
        {/* Niche Stats */}
        <ErrorBoundary>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unniched</p>
                    <p className="text-2xl font-bold">{stats?.unniched || 0}</p>
                  </div>
                  <Tag className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </ErrorBoundary>

        {/* Niche Selector */}
        <ErrorBoundary>
          <NicheSelector
            selectedNiches={selectedNiches}
            onNicheChange={setSelectedNiches}
            availableNiches={stats?.availableNiches || []}
            allowCustom={true}
            onAssign={handleAssignNiche}
          />
        </ErrorBoundary>

        {/* Toolbar */}
        <ErrorBoundary>
          <StandardToolbar
            filters={[
              { id: 'all', label: 'All', count: stats?.total },
              { id: 'unniched', label: 'Unniched', count: stats?.unniched },
              ...selectedNiches.map(niche => ({
                id: niche,
                label: niche,
                count: stats?.nicheCounts[niche] || 0
              }))
            ]}
            selectedCount={selectedItems.size}
            bulkActions={[
              {
                id: 'assign',
                label: 'Assign Niche',
                onClick: () => {/* show niche picker */}
              }
            ]}
          />
        </ErrorBoundary>

        {/* Table */}
        <ErrorBoundary>
          <UniversalTable
            data={data}
            loading={isLoading}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
```

## Common Patterns

### 1. State Management Pattern

```typescript
// Always group related state
const [filterState, setFilterState] = useState({
  search: '',
  status: 'all',
  sortBy: 'date',
  sortOrder: 'desc'
})

// Use callbacks for handlers
const handleFilterChange = useCallback((key: string, value: any) => {
  setFilterState(prev => ({ ...prev, [key]: value }))
}, [])

// Debounce search inputs
const debouncedSearch = useDebounce(filterState.search, 500)
```

### 2. Data Fetching Pattern

```typescript
// Use React Query for all data operations
const {
  data,
  isLoading,
  error,
  hasNextPage,
  fetchNextPage,
  refetch
} = useInfiniteQuery({
  queryKey: ['items', filters],
  queryFn: fetchItems,
  getNextPageParam: (lastPage) => lastPage.nextCursor
})

// Handle loading states
if (isLoading) return <Skeleton />
if (error) return <ErrorMessage error={error} />

// Handle empty states
if (!data || data.pages[0].length === 0) {
  return <EmptyState message="No items found" />
}
```

### 3. Selection Pattern

```typescript
// Track selected items
const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

// Toggle selection
const toggleSelection = useCallback((id: number) => {
  setSelectedItems(prev => {
    const next = new Set(prev)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    return next
  })
}, [])

// Select all
const selectAll = useCallback(() => {
  const allIds = new Set(data.map(item => item.id))
  setSelectedItems(allIds)
}, [data])

// Clear selection
const clearSelection = useCallback(() => {
  setSelectedItems(new Set())
}, [])
```

### 4. Mutation Pattern

```typescript
// Define mutations
const updateMutation = useMutation({
  mutationFn: updateItem,
  onSuccess: () => {
    // Invalidate queries
    queryClient.invalidateQueries(['items'])
    // Show success message
    toast.success('Item updated')
    // Clear selection
    setSelectedItems(new Set())
  },
  onError: (error) => {
    toast.error('Update failed')
  }
})

// Use optimistic updates
const handleUpdate = useCallback((id: number, updates: any) => {
  updateMutation.mutate(
    { id, ...updates },
    {
      onOptimisticUpdate: () => {
        // Update UI immediately
      }
    }
  )
}, [updateMutation])
```

### 5. Error Handling Pattern

```typescript
// Wrap each section in error boundary
<ErrorBoundary
  fallback={
    <Alert variant="error">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        Unable to load this section. Please refresh the page.
      </AlertDescription>
    </Alert>
  }
>
  <YourComponent />
</ErrorBoundary>

// Handle async errors
try {
  await performAction()
} catch (error) {
  logger.error('Action failed:', error)
  toast.error('Operation failed. Please try again.')
}
```

## Performance Guidelines

1. **Dynamic Imports**: Always dynamically import heavy components
2. **Memoization**: Use React.memo and useMemo for expensive operations
3. **Virtualization**: Use virtual scrolling for large lists
4. **Debouncing**: Debounce all user inputs (search, filters)
5. **Code Splitting**: Split code by route automatically with Next.js
6. **Image Optimization**: Use next/image for all images
7. **Bundle Analysis**: Regularly check bundle size

---

_Pattern Version: 1.0.0 | Last Updated: 2025-01-29_