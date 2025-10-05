# Component Catalog

┌─ COMPONENT LIBRARY ─────────────────────────────────────┐
│ ● CATALOG     │ ████████████████████ 100% DOCUMENTED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "DASHBOARD_TEMPLATE.md",
  "current": "COMPONENT_CATALOG.md",
  "siblings": [
    {"path": "SIDEBAR_CONFIGURATION.md", "desc": "Sidebar setup guide"},
    {"path": "PAGE_PATTERNS.md", "desc": "Standard page structures"},
    {"path": "DATA_FLOW_PATTERNS.md", "desc": "React Query patterns"}
  ]
}
```

## Component Categories

### 1. Layout Components

#### DashboardLayout
Main layout wrapper for all dashboard pages.

```typescript
import { DashboardLayout } from '@/components/shared/layouts/DashboardLayout'

<DashboardLayout
  title="Page Title"           // Required: Page heading
  subtitle="Page description"  // Optional: Subheading
  showSearch={true}            // Optional: Show search in header
>
  {children}
</DashboardLayout>
```

**Features:**
- Integrated UnifiedSidebar
- Gradient background
- Responsive design
- Header with title/subtitle

#### UnifiedSidebar
Automatic sidebar based on current route.

```typescript
import { UnifiedSidebar } from '@/components/shared/layouts/UnifiedSidebar'

// Automatically rendered in DashboardLayout
// Configuration in sidebar-configs.tsx
```

**Features:**
- Route-based configuration
- Dynamic badges
- Active state detection
- Team section
- Logout button

### 2. Data Display Components

#### MetricsCards
Display key statistics at the top of pages.

```typescript
import { MetricsCards } from '@/components/shared/cards/MetricsCards'

<MetricsCards
  platform="instagram"       // Platform type: 'instagram' | 'reddit' | 'models'
  totalCreators={220}        // Total count
  pendingCount={136}         // Pending items
  approvedCount={84}         // Approved items
  nonRelatedCount={0}        // Rejected/non-related
  loading={false}            // Loading state
/>
```

**Variants:**
- Instagram: Pink/purple theme
- Reddit: Orange/red theme
- Models: Purple theme

#### UniversalTable
Flexible data table with infinite scroll.

```typescript
import { UniversalTable } from '@/components/shared/tables/UniversalTable'

<UniversalTable
  data={items}                        // Data array
  columns={columns}                   // Column definitions
  loading={isLoading}                 // Loading state
  selectedItems={selectedSet}         // Set of selected IDs
  setSelectedItems={setSelectedSet}   // Selection handler
  onUpdateItem={handleUpdate}         // Update callback
  hasMore={hasNextPage}              // More data available
  onReachEnd={fetchNextPage}         // Load more callback
  loadingMore={isFetchingNextPage}  // Loading more state
  emptyMessage="No items found"     // Empty state message
/>
```

**Column Definition:**
```typescript
const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    width: '200px',
    render: (value, row) => <CustomCell value={value} />
  }
]
```

#### UniversalCreatorTable
Specialized table for Instagram creators.

```typescript
import { UniversalCreatorTable } from '@/components/shared/tables/UniversalCreatorTable'

<UniversalCreatorTable
  creators={creators}                 // Creator data
  loading={isLoading}                // Loading state
  selectedCreators={selectedSet}     // Selection set
  setSelectedCreators={setSelected}  // Selection handler
  onUpdateReview={handleReview}      // Review update
  postsMetrics={metricsMap}         // Post metrics map
  hasMore={hasNextPage}             // More data
  onReachEnd={fetchNextPage}        // Load more
  loadingMore={isFetchingMore}      // Loading more state
/>
```

### 3. Input & Control Components

#### StandardToolbar
Complete toolbar with search, filters, and actions.

```typescript
import { StandardToolbar } from '@/components/shared/toolbars/StandardToolbar'

<StandardToolbar
  // Search
  searchValue={searchQuery}
  onSearchChange={handleSearchChange}
  searchPlaceholder="Search creators..."

  // Filters
  filters={[
    { id: 'all', label: 'All', count: 220 },
    { id: 'pending', label: 'Pending', count: 136 },
    { id: 'approved', label: 'Approved', count: 84 }
  ]}
  currentFilter={currentFilter}
  onFilterChange={handleFilterChange}

  // Sort
  sortOptions={[
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'engagement', label: 'Engagement', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock }
  ]}
  currentSort={currentSort}
  onSortChange={handleSortChange}

  // Actions
  actionButtons={[
    {
      id: 'add',
      label: 'Add New',
      icon: Plus,
      onClick: handleAdd,
      variant: 'primary'
    }
  ]}

  // Bulk actions
  selectedCount={selectedItems.size}
  bulkActions={[
    {
      id: 'approve',
      label: 'Approve',
      icon: Check,
      onClick: handleBulkApprove,
      variant: 'secondary'
    }
  ]}
  onClearSelection={handleClearSelection}

  loading={isLoading}
  accentColor="linear-gradient(135deg, #E1306C, #F77737)"
/>
```

#### StandardActionButton
Consistent action buttons with loading states.

```typescript
import { StandardActionButton } from '@/components/shared/buttons/StandardActionButton'

<StandardActionButton
  onClick={handleClick}
  loading={isLoading}
  disabled={isDisabled}
  variant="primary"        // 'primary' | 'secondary' | 'danger' | 'ghost'
  size="md"               // 'sm' | 'md' | 'lg'
  icon={IconComponent}
  fullWidth={false}
>
  Button Text
</StandardActionButton>
```

### 4. Feedback Components

#### ErrorBoundary
Catch and display errors gracefully.

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

<ErrorBoundary
  fallback={
    <div className="error-container">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

#### Toast Notifications
Show success/error messages.

```typescript
import { useToast } from '@/components/ui/toast'

const { addToast } = useToast()

// Success toast
addToast({
  type: 'success',
  title: 'Success',
  message: 'Operation completed successfully'
})

// Error toast
addToast({
  type: 'error',
  title: 'Error',
  message: 'Something went wrong'
})

// Warning toast
addToast({
  type: 'warning',
  title: 'Warning',
  message: 'Please review before continuing'
})
```

### 5. Loading States

#### TableSkeleton
Skeleton loader for tables.

```typescript
import { TableSkeleton } from '@/components/SkeletonLoaders'

if (isLoading) {
  return <TableSkeleton rows={10} columns={5} />
}
```

#### MetricsCardsSkeleton
Skeleton loader for metric cards.

```typescript
import { MetricsCardsSkeleton } from '@/components/SkeletonLoaders'

if (!stats) {
  return <MetricsCardsSkeleton count={4} />
}
```

#### CardGridSkeleton
Skeleton loader for card grids.

```typescript
import { CardGridSkeleton } from '@/components/SkeletonLoaders'

if (isLoading) {
  return <CardGridSkeleton cards={12} columns={3} />
}
```

### 6. Modal Components

#### StandardModal
Base modal component.

```typescript
import { StandardModal } from '@/components/shared/modals/StandardModal'

<StandardModal
  isOpen={isModalOpen}
  onClose={handleClose}
  title="Modal Title"
  size="md"              // 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton={true}
>
  <div className="modal-content">
    {/* Modal content */}
  </div>
  <div className="modal-footer">
    <Button onClick={handleSave}>Save</Button>
    <Button onClick={handleClose} variant="ghost">Cancel</Button>
  </div>
</StandardModal>
```

#### RelatedCreatorsModal
Find related Instagram creators.

```typescript
import { RelatedCreatorsModal } from '@/components/instagram/RelatedCreatorsModal'

<RelatedCreatorsModal
  isOpen={isOpen}
  onClose={handleClose}
  currentCreator={creator}
  onSelectCreators={handleSelectCreators}
/>
```

### 7. Instagram-Specific Components

#### NicheSelector
Select creator niches.

```typescript
import { NicheSelector } from '@/components/instagram/NicheSelector'

<NicheSelector
  selectedNiches={selectedNiches}
  onNicheChange={handleNicheChange}
  availableNiches={['Fashion', 'Fitness', 'Food']}
  allowCustom={true}
/>
```

#### ViralReelCard
Display viral reel information.

```typescript
import { ViralReelCard } from '@/components/instagram/ViralReelCard'

<ViralReelCard
  reel={reelData}
  onPlay={handlePlay}
  onAnalyze={handleAnalyze}
  showMetrics={true}
/>
```

#### ViralFilters
Filter viral content.

```typescript
import { ViralFilters } from '@/components/instagram/ViralFilters'

<ViralFilters
  filters={currentFilters}
  onFiltersChange={handleFiltersChange}
  minViews={50000}
  sortOptions={['views', 'likes', 'comments']}
/>
```

### 8. Reddit-Specific Components

#### SubredditCard
Display subreddit information.

```typescript
import { SubredditCard } from '@/components/reddit/SubredditCard'

<SubredditCard
  subreddit={subredditData}
  onReview={handleReview}
  onViewRules={handleViewRules}
  showMetrics={true}
/>
```

### 9. Monitor Components

#### LogViewerSupabase
View system logs.

```typescript
import { LogViewerSupabase } from '@/components/LogViewerSupabase'

<LogViewerSupabase
  tableName="system_logs"
  filters={logFilters}
  autoRefresh={true}
  refreshInterval={5000}
/>
```

#### ApiActivityLog
Display API activity.

```typescript
import { ApiActivityLog } from '@/components/ApiActivityLog'

<ApiActivityLog
  endpoint="/api/scrapers/reddit"
  showErrors={true}
  limit={100}
/>
```

### 10. Utility Components

#### Badge
Display status badges.

```typescript
import { Badge } from '@/components/ui/badge'

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="default">Default</Badge>
```

#### Progress
Show progress bars.

```typescript
import { Progress } from '@/components/ui/progress'

<Progress value={75} max={100} className="w-full" />
```

#### Spinner
Loading spinner.

```typescript
import { Spinner } from '@/components/ui/spinner'

<Spinner size="sm" />  // 'sm' | 'md' | 'lg'
<Spinner className="text-pink-500" />
```

## Component Best Practices

### 1. Always Use Error Boundaries
```typescript
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. Implement Loading States
```typescript
if (isLoading) return <TableSkeleton />
if (error) return <ErrorMessage error={error} />
return <YourComponent data={data} />
```

### 3. Memoize Expensive Components
```typescript
const MemoizedComponent = React.memo(YourComponent)
```

### 4. Use Dynamic Imports for Heavy Components
```typescript
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

### 5. Debounce User Input
```typescript
const debouncedValue = useDebounce(inputValue, 500)
```

### 6. Provide Accessibility
```typescript
<button
  aria-label="Approve creator"
  aria-pressed={isApproved}
  role="button"
  tabIndex={0}
>
```

### 7. Use Consistent Styling
```typescript
// Use Tailwind classes
className="px-4 py-2 bg-b9-pink text-white rounded-lg"

// Use CSS variables for themes
style={{ '--accent-color': 'var(--b9-pink)' }}
```

---

_Catalog Version: 1.0.0 | Last Updated: 2025-01-29_