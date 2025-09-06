# Components Directory

This directory contains reusable React components built with Next.js, TypeScript, and shadcn/ui. Components follow a performance-first approach with React.memo, proper prop types, and optimized rendering patterns.

## 🗂️ Directory Structure

```
components/
├── ui/                     # shadcn/ui base components
│   ├── badge.tsx          # Status indicators and labels
│   ├── button.tsx         # Primary action elements
│   ├── card.tsx           # Content containers
│   ├── checkbox.tsx       # Multi-select inputs
│   ├── select.tsx         # Dropdown selections
│   └── toast.tsx          # Notification system
├── AdvancedFilters.tsx    # Complex filtering interface
├── CategorySelector.tsx   # Marketing category management
├── DashboardLayout.tsx    # Main app layout wrapper
├── ErrorBoundary.tsx      # Error handling and recovery
├── Header.tsx             # Top navigation bar
├── KeyboardShortcutsHelp.tsx # User assistance modal
├── MetricsCards.tsx       # KPI display components
├── Sidebar.tsx            # Left navigation menu
├── SkeletonLoaders.tsx    # Loading state placeholders
├── SubredditTable.tsx     # Core data display table
├── TablePagination.tsx    # Data navigation controls
└── UnifiedFilters.tsx     # Search and filter controls
```

## 🎯 Core Components

### SubredditTable (`SubredditTable.tsx`)
**Purpose**: Primary data display component for subreddit listings
**Business Value**: Enables efficient review and categorization of 4,865+ subreddits

**Features**:
- **Dual Mode Operation**: Review mode (`Ok/No Seller/Non Related`) and Category mode (marketing tags)
- **Bulk Actions**: Select multiple subreddits for batch updates
- **Keyboard Shortcuts**: 1-4 keys for rapid categorization
- **Infinite Scroll**: Loads 50 records per batch
- **Real-time Updates**: Instant data refresh via Supabase subscriptions

**Props Interface**:
```typescript
interface SubredditTableProps {
  subreddits: Subreddit[]
  selectedSubreddits: Set<number>
  setSelectedSubreddits: (selected: Set<number>) => void
  onUpdateCategory?: (id: number, categoryText: string) => void
  onBulkUpdateCategory?: (categoryText: string) => void
  onUpdateReview?: (id: number, reviewText: string) => void
  onBulkUpdateReview?: (reviewText: string) => void
  loading: boolean
  mode?: 'review' | 'category'
  onReachEnd?: () => void
  hasMore?: boolean
  loadingMore?: boolean
}
```

**Usage Example**:
```tsx
<SubredditTable
  subreddits={filteredSubreddits}
  selectedSubreddits={selectedSubreddits}
  setSelectedSubreddits={setSelectedSubreddits}
  onUpdateReview={handleReviewUpdate}
  onBulkUpdateReview={handleBulkReview}
  mode="review"
  loading={loading}
  onReachEnd={loadMoreSubreddits}
  hasMore={hasMore}
  loadingMore={loadingMore}
/>
```

### CategorySelector (`CategorySelector.tsx`)
**Purpose**: Consistent category assignment across dashboard
**Business Value**: Standardizes marketing category taxonomy

**Features**:
- Single-select dropdown with existing categories
- Clear selection option
- Add new category capability
- API-driven category list from `/api/categories`

**Props Interface**:
```typescript
interface CategorySelectorProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}
```

### MetricsCards (`MetricsCards.tsx`)
**Purpose**: Display key performance indicators
**Business Value**: Real-time business metrics visibility

**Features**:
- Real-time data updates
- Percentage change indicators
- Color-coded performance status
- Responsive grid layout

**Metrics Displayed**:
- Total subreddits discovered
- "Ok" subreddits ready for marketing
- New discoveries today
- Overall system health

### DashboardLayout (`DashboardLayout.tsx`)
**Purpose**: Consistent app structure and navigation
**Business Value**: Unified user experience across all pages

**Features**:
- Responsive sidebar navigation
- Header with user context
- Main content area with proper spacing
- Mobile-first responsive design

**Layout Structure**:
```tsx
<div className="flex h-screen">
  <Sidebar />
  <div className="flex-1 flex flex-col">
    <Header />
    <main className="flex-1 overflow-hidden">
      {children}
    </main>
  </div>
</div>
```

### ErrorBoundary (`ErrorBoundary.tsx`)
**Purpose**: Graceful error handling and recovery
**Business Value**: Prevents full app crashes, maintains user productivity

**Features**:
- Component-level error catching
- User-friendly error messages
- Retry mechanisms
- Error reporting to logging service

**Usage Pattern**:
```tsx
<ComponentErrorBoundary>
  <SubredditTable {...props} />
</ComponentErrorBoundary>
```

## 🎨 UI Component Library (shadcn/ui)

### Button (`ui/button.tsx`)
**Variants**: default, destructive, outline, secondary, ghost, link
**Sizes**: default, sm, lg, icon

**Usage**:
```tsx
<Button variant="outline" size="sm" onClick={handleClick}>
  Review Subreddit
</Button>
```

### Badge (`ui/badge.tsx`)
**Variants**: default, secondary, destructive, outline
**Use Cases**: Status indicators, category labels, metrics

### Card (`ui/card.tsx`)
**Components**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
**Use Cases**: Content containers, metrics display, form sections

### Toast (`ui/toast.tsx`)
**Purpose**: Non-blocking user notifications
**Integration**: Automatic success/error feedback for all API operations

## ⚡ Performance Optimizations

### Memoization Strategy
```typescript
// Component memoization for expensive renders
const SubredditTable = memo(function SubredditTable({ ... }) {
  // Component logic
})

// Callback memoization for stable references
const handleUpdate = useCallback((id: number, value: string) => {
  // Update logic
}, [dependencies])

// Value memoization for expensive computations
const filteredSubreddits = useMemo(() => {
  return subreddits.filter(subreddit => {
    // Filter logic
  })
}, [subreddits, searchQuery, filters])
```

### Loading States
- **SkeletonLoaders**: Smooth transitions during data loading
- **Incremental Loading**: Infinite scroll with 50-record batches
- **Optimistic Updates**: Instant UI feedback before API confirmation

### Event Handling
- **Debounced Search**: 300ms delay for search input
- **Keyboard Shortcuts**: Direct key handling for rapid workflows
- **Batch Operations**: Bulk updates to reduce API calls

## 🔧 Component Patterns

### Props Interface Design
```typescript
// Flexible props for different use cases
interface FlexibleComponentProps {
  // Required props
  data: DataType[]
  
  // Optional callbacks for different modes
  onUpdate?: (id: number, value: string) => void
  onBulkUpdate?: (value: string) => void
  
  // State management
  loading?: boolean
  error?: Error | null
  
  // Configuration
  mode?: 'view' | 'edit'
  variant?: 'compact' | 'detailed'
}
```

### Error Handling Pattern
```typescript
const ComponentWithErrorHandling = () => {
  const { handleAsyncOperation } = useErrorHandler()
  
  const handleAction = async () => {
    await handleAsyncOperation(async () => {
      await apiCall()
    }, 'Action failed')
  }
  
  return <Component onAction={handleAction} />
}
```

### Real-time Data Pattern
```typescript
useEffect(() => {
  const channel = supabase.channel('table-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'target_table'
    }, (payload) => {
      // Handle real-time updates
      updateLocalState(payload)
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [])
```

## 🎯 Design System

### Color Palette
- **Primary**: Pink (#FF8395) for main actions
- **Secondary**: Grey tones for supporting elements
- **Success**: Green for positive actions
- **Destructive**: Red for dangerous actions

### Typography Scale
- **Headings**: font-semibold with proper hierarchy
- **Body**: font-normal with readable line-height
- **Captions**: font-medium for labels and metadata

### Spacing System
- **Padding**: p-4 (16px) standard, p-2 (8px) compact
- **Margins**: m-4 (16px) between sections, m-2 (8px) between elements
- **Gaps**: gap-4 (16px) for grids, gap-2 (8px) for inline elements

## 📊 Component Usage Metrics

| Component | Pages Used | Update Frequency | Performance Impact |
|-----------|------------|------------------|-------------------|
| SubredditTable | 3 pages | Real-time | High - Core functionality |
| MetricsCards | 4 pages | 30s refresh | Medium - Data display |
| CategorySelector | 2 pages | On-demand | Low - Simple interaction |
| DashboardLayout | All pages | Static | Low - Layout only |

## 🔗 Integration Points

- **Supabase**: Real-time subscriptions for data updates
- **shadcn/ui**: Base component library for consistency
- **Lucide Icons**: Consistent iconography
- **Next.js Image**: Optimized image loading for subreddit icons
- **Tailwind CSS**: Utility-first styling system

This component architecture ensures maintainable, performant, and user-friendly interfaces for the Reddit analytics dashboard.