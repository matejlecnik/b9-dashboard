# Dashboard Pages Directory

This directory contains the core application pages for the Reddit analytics dashboard, organized using Next.js App Router with route groups.

## 🗂️ Directory Structure

```
(dashboard)/
├── layout.tsx              # Shared dashboard layout with sidebar and header
├── analytics/              # Performance metrics and insights
├── categorization/          # Subreddit marketing category management
├── post-analysis/          # Content performance analysis
├── posting/                # Optimal subreddit selection for marketing
├── scraper/                # System health and monitoring
├── settings/               # User preferences and configuration
├── subreddit-review/       # Manual subreddit approval workflow
├── user-analysis/          # User quality scoring and insights
└── users/                  # User profile management
```

## 📄 Page Documentation

### Subreddit Review (`subreddit-review/`)
**Purpose**: Primary workflow for categorizing discovered subreddits
**Business Value**: Filters 4,865+ discovered subreddits to 425+ marketing-ready targets

**Features**:
- Bulk categorization (Ok, No Seller, Non Related, User Feed)
- Keyboard shortcuts for rapid review (1-4 keys)
- Real-time subscriber counts and engagement metrics
- Infinite scroll with search filtering
- Excludes user profile feeds automatically

**Data Flow**:
```
Supabase subreddits table → Real-time subscriptions → Review interface
User selections → Database updates → Live metric refresh
```

**Key Files**:
- `page.tsx` - Main review interface with filtering
- Data source: `subreddits` table where `review` IS NULL or specific status

### Categorization (`categorization/`)
**Purpose**: Assign marketing categories to approved subreddits
**Business Value**: Organizes "Ok" subreddits into strategic marketing segments

**Features**:
- Single-select category dropdown populated from existing categories
- Clear and add-new category options
- Filters: All, Uncategorized, Categorized subreddits
- Only shows subreddits with `review = 'Ok'`

**Data Flow**:
```
Approved subreddits → Category assignment → API endpoint /api/categories
Real-time category updates → Dashboard refresh
```

**Key Files**:
- `page.tsx` - Category assignment interface
- Uses `CategorySelector` component for consistent UX

### Scraper Status (`scraper/`)
**Purpose**: Monitor system health and performance metrics
**Business Value**: Ensures continuous data collection for business intelligence

**Features**:
- Real-time scraping statistics with time-range filters (24h/7d/30d)
- Account status from `config/accounts_config.json`
- Top subreddits list with pagination
- Throughput metrics (posts/minute)
- Loading skeletons and error states

**Data Flow**:
```
Python scraper → Database writes → API aggregation → Dashboard metrics
Time-range filters → Server-side queries → Paginated results
```

**Key Files**:
- `page.tsx` - Monitoring dashboard with metrics cards
- API routes: `/api/scraper/*` for stats and health checks

### Posting Recommendations (`posting/`)
**Purpose**: Find optimal subreddits for content marketing
**Business Value**: Maximizes engagement through data-driven subreddit selection

**Features**:
- Engagement score ranking
- Posting time recommendations
- Content type optimization
- Subscriber-to-engagement ratios

### Analytics (`analytics/`)
**Purpose**: High-level performance insights and business metrics
**Business Value**: Strategic decision making through data visualization

**Features**:
- Trend analysis and growth metrics
- Performance comparisons
- ROI tracking for marketing efforts

## 🔄 Navigation Flow

```
Dashboard Home
├── Subreddit Review (Primary workflow)
│   ├── Categorization (For "Ok" subreddits)
│   └── Posting (Marketing execution)
├── Analytics (Business insights)
├── Scraper (System monitoring)
└── Settings (Configuration)
```

## 🎯 User Workflow

1. **Discovery**: Python scraper finds new subreddits
2. **Review**: User categorizes via subreddit-review page
3. **Categorization**: Approved subreddits get marketing categories
4. **Optimization**: Posting page suggests best targets
5. **Monitoring**: Scraper page ensures system health

## ⚡ Performance Optimizations

- **Infinite Scroll**: Loads 50 records per batch
- **Real-time Subscriptions**: Instant updates without polling
- **Keyboard Shortcuts**: Rapid review workflow (1-4 keys)
- **Loading States**: Skeleton loaders for smooth UX
- **Error Boundaries**: Graceful failure handling

## 🔧 Technical Implementation

### Layout Pattern
- Shared `layout.tsx` provides consistent sidebar and header
- Route groups `(dashboard)` prevent layout nesting issues
- DashboardLayout component manages responsive design

### State Management
```typescript
// Real-time subscriptions pattern
useEffect(() => {
  const channel = supabase.channel('subreddits')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'subreddits' 
    }, handleRealtimeUpdate)
    .subscribe()
}, [])
```

### Error Handling
```typescript
const { handleAsyncOperation } = useErrorHandler()
await handleAsyncOperation(async () => {
  await updateSubredditReview(id, status)
}, 'Failed to update subreddit')
```

## 📊 Key Metrics by Page

| Page | Records | Update Frequency | Business Impact |
|------|---------|------------------|-----------------|
| Subreddit Review | 4,865 subreddits | Real-time | High - Core workflow |
| Categorization | 425 "Ok" subreddits | On-demand | High - Marketing prep |
| Scraper | System metrics | 30s refresh | Medium - Ops monitoring |
| Analytics | Aggregated data | Daily | Medium - Strategy |

## 🔗 Integration Points

- **Supabase**: Real-time subscriptions for live updates
- **Python Scraper**: Data source for all analytics
- **Vercel**: Deployment and edge functions
- **shadcn/ui**: Consistent component library

This architecture ensures scalable, maintainable, and user-friendly data workflows for Reddit marketing optimization.