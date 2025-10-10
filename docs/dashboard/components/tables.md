# Shared Tables Documentation

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PRODUCTION │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/components/shared/tables/README.md",
  "parent": "dashboard/src/components/shared/tables/README.md"
}
```

## Overview

This directory contains standardized table components used across the B9 Dashboard for displaying creator and subreddit data. These components provide consistent, performant, and accessible table interfaces.

## Components

### UniversalTable
**File**: `UniversalTable.tsx`
**Purpose**: Generic table component that can be configured for different data types (subreddits, posts, etc.)

**Features**:
- Configurable columns and data mapping
- Built-in sorting and filtering
- Selection support for bulk operations
- Responsive design
- Infinite scroll support

**Usage**:
```tsx
import { UniversalTable } from '@/components/shared'

<UniversalTable
  data={subreddits}
  columns={columns}
  onSort={handleSort}
  loading={isLoading}
/>
```

### UniversalCreatorTable
**File**: `UniversalCreatorTable.tsx`
**Purpose**: Specialized table for Instagram creator data with built-in creator-specific features

**Features**:
- Creator profile display with avatars
- Engagement metrics columns
- Review status management
- Bulk selection for batch operations
- Integrated with React Query for real-time updates
- Performance optimized with React.memo

**Props**:
- `creators`: Array of Instagram creator objects
- `loading`: Loading state indicator
- `selectedCreators`: Set of selected creator IDs
- `setSelectedCreators`: Selection handler
- `onUpdateReview`: Review status update callback
- `postsMetrics`: Optional metrics map for post performance
- `hasMore`: Indicates if more data is available
- `onReachEnd`: Callback for loading more data
- `loadingMore`: Loading state for pagination

**Usage**:
```tsx
import { UniversalCreatorTable } from '@/components/shared'

<UniversalCreatorTable
  creators={transformedCreators}
  loading={isLoading}
  selectedCreators={selectedCreators}
  setSelectedCreators={setSelectedCreators}
  onUpdateReview={(id, review) => updateCreatorStatus(id, review)}
  hasMore={hasNextPage}
  onReachEnd={fetchNextPage}
/>
```

### VirtualizedCreatorTable
**File**: `VirtualizedCreatorTable.tsx`
**Purpose**: High-performance table for large datasets (100+ items) using viewport-based rendering

**Features**:
- Virtual scrolling for optimal performance
- Only renders visible rows (viewport + buffer)
- Automatic fallback to regular table for small datasets
- Smooth scrolling with configurable overscan
- Memory efficient for thousands of rows

**Performance Settings**:
- `ITEM_HEIGHT`: 80px per row
- `BUFFER`: 5 items outside viewport
- `OVERSCAN`: 3 additional items for smooth scrolling
- Threshold: Activates for datasets > 100 items

**Usage**:
```tsx
import { VirtualizedCreatorTable } from '@/components/shared'

// Automatically uses virtualization for large datasets
<VirtualizedCreatorTable
  creators={largeCreatorArray} // 1000+ items
  loading={isLoading}
  selectedCreators={selectedCreators}
  setSelectedCreators={setSelectedCreators}
  onUpdateReview={handleReview}
  hasMore={hasNextPage}
  onReachEnd={loadMore}
/>
```

## Type Definitions

### InstagramCreator
```typescript
interface InstagramCreator {
  id: number
  ig_user_id: string
  username: string
  full_name: string | null
  biography: string | null
  profile_pic_url: string | null
  followers: number
  following: number
  posts_count: number
  review_status: 'pending' | 'ok' | 'non_related' | null
  reviewed_at: string | null
  reviewed_by: string | null
  is_verified: boolean
  engagement_rate_cached: number | null
  // ... additional fields
}
```

## Performance Considerations

### When to Use Each Component

1. **UniversalTable**:
   - Generic data display (subreddits, posts)
   - Small to medium datasets (< 100 rows)
   - Need maximum flexibility

2. **UniversalCreatorTable**:
   - Instagram creator data specifically
   - Datasets < 100 creators
   - Need creator-specific features (review, metrics)

3. **VirtualizedCreatorTable**:
   - Large creator datasets (100+ items)
   - Performance is critical
   - Smooth scrolling required

### Optimization Tips

- Use `React.memo` wrapper when parent re-renders frequently
- Provide stable references for callbacks using `useCallback`
- Memoize transformed data with `useMemo`
- Use Set for selectedCreators for O(1) lookups

## Migration Guide

### From InstagramTable to UniversalCreatorTable

```tsx
// Before (InstagramTable)
<InstagramTable
  data={creators}
  onReview={handleReview}
/>

// After (UniversalCreatorTable)
<UniversalCreatorTable
  creators={creators}
  onUpdateReview={(id, review) => handleReview(id, review)}
  selectedCreators={selectedCreators}
  setSelectedCreators={setSelectedCreators}
/>
```

### Adding Virtual Scrolling

```tsx
// Simply replace UniversalCreatorTable with VirtualizedCreatorTable
// Same props, automatic optimization for large datasets

// Before
import { UniversalCreatorTable } from '@/components/shared'

// After
import { VirtualizedCreatorTable } from '@/components/shared'
```

## Best Practices

1. **Always provide loading states** - Better UX during data fetching
2. **Use proper TypeScript types** - Import Creator type from shared/tables
3. **Handle empty states** - Show meaningful messages when no data
4. **Implement error boundaries** - Wrap tables in ErrorBoundary components
5. **Test with real data** - Ensure performance with production datasets

## TODO

- [ ] Add column resize functionality
- [ ] Implement column reordering
- [ ] Add export to CSV feature
- [ ] Create tests for all table components

## Known Issues

None currently reported.

## Contributing

When modifying table components:
1. Ensure backward compatibility
2. Update this documentation
3. Add tests for new features
4. Performance test with large datasets (1000+ rows)

---

_Version: 1.0.0 | Updated: 2025-10-01_