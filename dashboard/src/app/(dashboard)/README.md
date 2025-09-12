# Dashboard Pages Directory

## Overview
Core application pages for B9 Agency's Reddit analytics dashboard. These pages implement the complete workflow for discovering, reviewing, and categorizing subreddits for OnlyFans marketing campaigns.

## Page Structure

### Primary Pages
- **`subreddit-review/`** - Review and classify new subreddit discoveries
  - Classifications: Ok, No Seller, Non Related, User Feed
  - Bulk operations support
  - Rules modal for viewing subreddit guidelines
  
- **`categorization/`** - Assign marketing categories to approved subreddits
  - **Status: FINAL VERSION (Perfect as of 2025-01-12)**
  - Only shows "Ok" reviewed subreddits
  - Progress tracking with visual bar
  - AI Review button (needs backend implementation)
  
- **`posting/`** - Content scheduling and subreddit recommendations
  - Smart recommendations based on categories
  - Posting history tracking
  
- **`user-analysis/`** - Analyze Reddit users for creator identification
  - Quality scoring system
  - Creator detection algorithms

### Supporting Pages  
- **`scraper/`** - Monitor data collection status
  - Scraper health checks
  - Collection statistics
  
- **`post-analysis/`** - Analyze post performance
  - Engagement metrics
  - Content optimization insights

## TODO List
- [ ] Connect AI Review button to backend service in categorization page
- [ ] Add data export functionality
- [ ] Implement batch operations for all pages
- [ ] Add page-specific documentation
- [ ] Create unified settings page

## Current Errors
- AI Review button in categorization needs backend endpoint
- Scraper status page may show stale data

## Potential Improvements (DO NOT IMPLEMENT WITHOUT DISCUSSION)
- Analytics dashboard for ROI tracking
- Advanced filtering with date ranges
- Multi-user collaboration features
- Automated workflow suggestions
- Performance analytics by category
- Keyboard shortcuts (Note: Table navigation disabled per user preference)

## Shared Patterns

### Data Loading
```typescript
// Standard pagination pattern
const PAGE_SIZE = 50
const [loading, setLoading] = useState(true)
const [hasMore, setHasMore] = useState(true)
const [currentPage, setCurrentPage] = useState(0)
```

### Performance Optimization
```typescript
// Required for all state updates
React.startTransition(() => {
  setState(newValue)
})

// Debouncing for search
const debouncedSearch = useDebounce(searchQuery, 500)
```

### Error Handling
```typescript
// Wrap components in error boundaries
<ComponentErrorBoundary componentName="Component Name">
  {/* Component content */}
</ComponentErrorBoundary>
```

## Navigation Flow
1. **Discovery** → Scraper collects new subreddits
2. **Review** → Team classifies subreddits (subreddit-review)
3. **Categorization** → Assign marketing categories (categorization)
4. **Planning** → Get recommendations (posting)
5. **Analysis** → Track performance (post-analysis)

## API Integration

### Common Endpoints
- `GET /api/subreddits` - Fetch subreddit data with filters
- `GET /api/categories` - Get available categories
- `POST /api/ai/categorize-batch` - AI categorization (needs implementation)

### Database Operations
- Direct Supabase updates for real-time changes
- Optimistic UI updates for better UX
- Proper error recovery patterns

## Component Dependencies
All pages use these core components:
- `DashboardLayout` - Page wrapper
- `UniversalTable` - Data display
- `ComponentErrorBoundary` - Error isolation
- `useToast` - User notifications
- `useErrorHandler` - Centralized error handling

## Performance Considerations
- Infinite scroll with 50 items per page
- Debounced search inputs (500ms)
- React.startTransition for all state updates
- Lazy loading for better initial load
- Proper cleanup of subscriptions

---

*Last Updated: 2025-01-12*
*Note: Follow CLAUDE.md patterns exactly. Do not implement improvements without discussion.*