# Hooks Directory

## Overview
Custom React hooks for state management, UI interactions, and data fetching across the B9 Dashboard application.

## Current Hooks

### Data & State Management
- **`useCategories.ts`** - Manages subreddit category filtering and selection state
- **`useUserAnalytics.ts`** - Handles user activity tracking and analytics data

### UI & Interactions  
- **`useColors.tsx`** - Dynamic color theming and style utilities
- **`useDebounce.ts`** - Debounced input handling for search and filters

## TODO List
- [x] Remove deprecated keyboard navigation hooks (per CLAUDE.md) - COMPLETED
- [ ] Add hook for API error boundary state management
- [ ] Create useSubredditFilters hook to consolidate filter logic
- [ ] Add usePagination hook for table components

## Current Errors
- None currently identified

## Potential Improvements
- Consolidate similar hooks (useCategories + filter hooks)
- Add React Query hooks for better API state management
- Create useLocalStorage hook for persisting user preferences