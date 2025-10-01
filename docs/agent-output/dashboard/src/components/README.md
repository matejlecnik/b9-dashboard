# Components Directory

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PRODUCTION │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/components/README.md",
  "parent": "dashboard/src/components/README.md"
}
```

## Overview

Shared React components for the B9 Dashboard, built with Next.js 15, TypeScript, and shadcn/ui. All components follow standardized patterns from CLAUDE.md and are optimized for the internal team's workflow.

## Core Components for Categorization

### Primary Components
- **`UniversalTable.tsx`** - Main table component used across all dashboard pages
  - Handles virtualization for large datasets
  - Supports multiple table configurations (review, categorization, posting, etc.)
  - Fixed column widths: w-72 subreddit, w-16 upvotes, w-48 category/review
  - Right-aligned results counter
  - NO keyboard navigation (disabled per user preference)

- **`CategorySelector.tsx`** - Compact dropdown for category selection
  - Small, easy-to-select rows (py-1.5 padding)
  - NO inline editing functionality
  - NO "create new category" option
  - Uses centralized category normalization
  - 10-minute cache for performance

- **`CategoryFilterDropdown.tsx`** - Filter for showing categorized/uncategorized
  - Portal-based dropdown for proper z-index
  - Shows counts for each state
  - "Show Uncategorized" toggle option
  - Multi-select with checkboxes

- **`UnifiedFilters.tsx`** - Search and filter controls
  - Debounced search input (500ms)
  - Clear button for search
  - Integrated with category filtering

### Layout Components
- **`DashboardLayout.tsx`** - Main wrapper for all dashboard pages
- **`Header.tsx`** - Top navigation with user menu
- **`Sidebar.tsx`** - Left navigation menu

### UI Components
- **`ui/` folder** - shadcn/ui components
  - `button.tsx`, `select.tsx`, `badge.tsx`, `progress.tsx`
  - `toast.tsx` - Notification system
  - All follow Tailwind CSS patterns

### Error Handling
- **`ComponentErrorBoundary`** from `UniversalErrorBoundary.tsx`
  - Wraps major UI sections
  - Prevents cascade failures
  - Shows user-friendly error messages

### Loading States
- **`TableSkeleton`** from `UniversalLoading.tsx`
  - Shows during data fetching
  - Maintains layout consistency

## TODO List
- [ ] Complete TypeScript strict mode migration
- [ ] Add unit tests for critical components
- [ ] Optimize bundle size with dynamic imports
- [ ] Add Storybook for component documentation

## Current Errors
- None - all components working as expected

## Recent Changes (2025-01-13)
- ✅ Added `AddUserModal.tsx` - Modal for searching and adding Reddit users
- ✅ Removed deprecated/unused components:
  - `SimplifiedPostingToolbar.tsx` (unused)
  - `UserBulkActionsToolbar.tsx` (unused, replaced by UniversalToolbar)
  - `UnifiedToolbar.tsx` (deprecated, replaced by UniversalToolbar)

## Potential Improvements (DO NOT IMPLEMENT WITHOUT DISCUSSION)
- Component library documentation with Storybook
- Advanced virtualization for even larger datasets
- Component performance profiling
- Automated visual regression testing
- Accessibility audit and improvements

## Performance Patterns

### Required for All Components
```typescript
// Use React.startTransition for state updates
React.startTransition(() => {
  setState(newValue)
})

// Use useMemo for expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// Use useCallback for event handlers
const handleChange = useCallback((value) => {
  // handle change
}, [dependencies])
```

### Component Best Practices
- Always use `'use client'` directive for client components
- Implement error boundaries for major sections
- Use proper TypeScript types (no `any`)
- Follow CLAUDE.md patterns exactly
- Test with real Supabase data

## Architecture Notes

### Universal Table System
The `UniversalTable` component is the backbone of all data display:
- Factory functions create table configurations
- `createCategorizationTable()` for categorization page
- `createSubredditReviewTable()` for review page
- Shared column layouts and behaviors

### Category System
Centralized category management:
- Categories stored in Supabase
- Normalized with `normalizeCategoryName()`
- Cached for 10 minutes globally
- No duplicate checking (handled by normalization)

### State Management
- Local component state with useState
- No Redux or Context API needed
- Supabase for persistent data
- React.startTransition for performance

---

*Last Updated: 2025-01-13*
*Status: Production Ready*

---

_Version: 1.0.0 | Updated: 2025-10-01_