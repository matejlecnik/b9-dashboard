# Dashboard Template System

┌─ TEMPLATE GUIDE ────────────────────────────────────────┐
│ ● STANDARDIZED │ ████████████████████ 100% DEFINED     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "DASHBOARD_TEMPLATE.md",
  "siblings": [
    {"path": "SIDEBAR_CONFIGURATION.md", "desc": "Sidebar setup guide"},
    {"path": "PAGE_PATTERNS.md", "desc": "Standard page structures"},
    {"path": "COMPONENT_CATALOG.md", "desc": "Reusable components"},
    {"path": "DATA_FLOW_PATTERNS.md", "desc": "React Query patterns"}
  ]
}
```

## Quick Start

To create a new dashboard, follow this template structure:

```typescript
// 1. Define sidebar configuration
export const yourDashboardConfig: SidebarConfig = {
  title: 'Your Dashboard',
  icon: YourIcon,
  backHref: '/dashboards',
  dashboardColor: 'bg-gradient-to-br from-color-600 via-color-500 to-color-700',
  navigationItems: [...]
}

// 2. Create main page component
export default function YourDashboardPage() {
  // Data hooks
  const { data, stats, isLoading } = useYourData()

  // Return template structure
  return (
    <DashboardLayout title="Page Title" subtitle="Description">
      <MetricsCards {...stats} />
      <StandardToolbar {...toolbarProps} />
      <UniversalTable {...tableProps} />
    </DashboardLayout>
  )
}
```

## Complete Dashboard Structure

### 1. File Organization

```
/src/app/your-dashboard/
├── layout.tsx                 # Dashboard layout with error boundary
├── page.tsx                   # Main dashboard page (redirect)
├── review/
│   └── page.tsx              # Review/approval workflow
├── analytics/
│   └── page.tsx              # Analytics and charts
├── content/
│   └── page.tsx              # Content management
└── monitor/
    └── page.tsx              # Real-time monitoring
```

### 2. Required Components

Every dashboard MUST include these components:

#### A. Sidebar Configuration
```typescript
// In sidebar-configs.tsx
export const yourSidebarConfig: SidebarConfig = {
  title: 'Dashboard Name',
  icon: IconComponent,
  backHref: '/dashboards',
  showTeamSection: true,
  showLogout: true,
  dashboardColor: 'gradient-class',
  navigationItems: [
    {
      id: 'page-id',
      title: 'Page Title',
      href: '/dashboard/page',
      icon: PageIcon,
      badge: {
        type: 'count',
        value: dynamicCount,
        variant: 'warning'
      }
    }
  ]
}
```

#### B. Layout Structure
```typescript
// layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function YourDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Dashboard Error
            </h2>
            <p className="text-gray-600">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
```

#### C. Page Template
```typescript
// page.tsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/useDebounce'

// Import React Query hooks
import {
  useYourData,
  useYourStats,
  useUpdateItem,
  useBulkUpdate
} from '@/hooks/queries/useYourDashboard'

// Import components
import {
  DashboardLayout,
  MetricsCards,
  StandardToolbar,
  TableSkeleton,
  MetricsCardsSkeleton
} from '@/components/shared'

// Dynamic imports for heavy components
const UniversalTable = dynamic(
  () => import('@/components/shared/tables/UniversalTable'),
  { ssr: false, loading: () => <TableSkeleton /> }
)

export default function YourPage() {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // React Query hooks
  const { data, isLoading, hasNextPage, fetchNextPage } = useYourData({
    search: debouncedSearchQuery,
    filter: currentFilter
  })

  const { data: stats } = useYourStats()
  const updateMutation = useUpdateItem()
  const bulkUpdateMutation = useBulkUpdate()

  // Handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleFilterChange = useCallback((filter: string) => {
    setCurrentFilter(filter)
    setSelectedItems(new Set())
  }, [])

  // Render
  return (
    <DashboardLayout
      title="Your Page Title"
      subtitle="Page description"
    >
      <div className="space-y-6">
        {/* Metrics */}
        <ErrorBoundary>
          {!stats ? (
            <MetricsCardsSkeleton />
          ) : (
            <MetricsCards {...stats} />
          )}
        </ErrorBoundary>

        {/* Toolbar */}
        <ErrorBoundary>
          <StandardToolbar
            searchValue={searchQuery}
            onSearchChange={handleSearchChange}
            filters={filters}
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
            selectedCount={selectedItems.size}
            bulkActions={bulkActions}
            loading={isLoading}
          />
        </ErrorBoundary>

        {/* Table */}
        <ErrorBoundary>
          <UniversalTable
            data={data}
            loading={isLoading}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            hasMore={hasNextPage}
            onReachEnd={fetchNextPage}
          />
        </ErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
```

### 3. Data Management Pattern

#### React Query Hooks Structure
```typescript
// hooks/queries/useYourDashboard.ts
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch paginated data
export function useYourData(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['your-data', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      if (error) throw error
      return data
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return pages.length * PAGE_SIZE
    }
  })
}

// Fetch statistics
export function useYourStats() {
  return useQuery({
    queryKey: ['your-stats'],
    queryFn: async () => {
      // Fetch aggregated statistics
    }
  })
}

// Update single item
export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      // Update logic
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['your-data'])
      queryClient.invalidateQueries(['your-stats'])
    }
  })
}

// Bulk update
export function useBulkUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, updates }) => {
      // Bulk update logic
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['your-data'])
      queryClient.invalidateQueries(['your-stats'])
    }
  })
}
```

### 4. Component Guidelines

#### MetricsCards
Display top-level statistics with proper loading states:
```typescript
<MetricsCards
  platform="instagram" // or "reddit", "models"
  totalCount={stats.total}
  pendingCount={stats.pending}
  approvedCount={stats.approved}
  rejectedCount={stats.rejected}
  loading={isLoading}
/>
```

#### StandardToolbar
Provide search, filters, and bulk actions:
```typescript
<StandardToolbar
  // Search
  searchValue={searchQuery}
  onSearchChange={handleSearchChange}
  searchPlaceholder="Search..."

  // Filters
  filters={[
    { id: 'all', label: 'All', count: stats.total },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'approved', label: 'Approved', count: stats.approved }
  ]}
  currentFilter={currentFilter}
  onFilterChange={handleFilterChange}

  // Sort options
  sortOptions={[
    { id: 'date', label: 'Date', icon: Calendar },
    { id: 'name', label: 'Name', icon: SortAsc }
  ]}
  currentSort={currentSort}
  onSortChange={handleSortChange}

  // Actions
  actionButtons={[
    { id: 'add', label: 'Add New', icon: Plus, onClick: handleAdd }
  ]}

  // Bulk actions
  selectedCount={selectedItems.size}
  bulkActions={[
    { id: 'approve', label: 'Approve', onClick: handleBulkApprove },
    { id: 'reject', label: 'Reject', onClick: handleBulkReject }
  ]}
  onClearSelection={() => setSelectedItems(new Set())}

  loading={isLoading}
  accentColor="gradient-string" // Dashboard-specific gradient
/>
```

#### UniversalTable
Display data with infinite scroll:
```typescript
<UniversalTable
  data={data}
  columns={columns}
  loading={isLoading}
  selectedItems={selectedItems}
  setSelectedItems={setSelectedItems}
  onUpdateItem={handleUpdateItem}
  hasMore={hasNextPage}
  onReachEnd={fetchNextPage}
  loadingMore={isFetchingNextPage}
  emptyMessage="No items found"
/>
```

### 5. Color Schemes

Standard dashboard gradients:
- **Reddit**: `from-orange-600 via-orange-500 to-red-600`
- **Instagram**: `from-pink-600 via-pink-500 to-purple-700`
- **Models**: `from-purple-600 via-purple-500 to-pink-600`
- **Monitor**: `from-blue-600 via-blue-500 to-indigo-600`
- **Custom**: Define your own gradient

### 6. Error Handling

Always wrap components in ErrorBoundary:
```typescript
import { ErrorBoundary as ComponentErrorBoundary } from '@/components/ErrorBoundary'

<ComponentErrorBoundary>
  <YourComponent />
</ComponentErrorBoundary>
```

### 7. Loading States

Use skeleton loaders for better UX:
```typescript
if (isLoading) {
  return (
    <>
      <MetricsCardsSkeleton />
      <TableSkeleton />
    </>
  )
}
```

### 8. Performance Optimizations

1. **Dynamic Imports**: Heavy components should be dynamically imported
2. **Memoization**: Use React.memo for expensive components
3. **Debouncing**: Debounce search inputs (500ms recommended)
4. **Virtual Scrolling**: For large lists, consider virtualization
5. **Image Optimization**: Use next/image for all images

### 9. Accessibility Requirements

1. Proper ARIA labels on interactive elements
2. Keyboard navigation support
3. Focus management for modals
4. Screen reader announcements for actions
5. Proper heading hierarchy

### 10. Testing Checklist

Before deploying a new dashboard:
- [ ] All data loads correctly
- [ ] Search functionality works
- [ ] Filters update data properly
- [ ] Bulk actions execute successfully
- [ ] Error states display correctly
- [ ] Loading states show appropriately
- [ ] Mobile responsive design works
- [ ] Keyboard navigation functions
- [ ] No console errors in production build

---

_Template Version: 1.0.0 | Last Updated: 2025-01-29_