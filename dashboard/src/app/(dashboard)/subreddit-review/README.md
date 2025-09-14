# Subreddit Review

> Primary workflow for categorizing discovered subreddits to filter marketing-ready targets

## 🎯 Business Purpose

This page is the **core workflow** of the Reddit marketing system. It filters 5,800+ discovered subreddits down to high-value marketing targets. Users manually review each subreddit and categorize them as:

- **"Ok"** - Approved for marketing campaigns
- **"No Seller"** - Subreddits that ban OnlyFans promotion  
- **"Non Related"** - Off-topic communities
- **"User Feed"** - Individual user profiles (auto-excluded)

## 📊 Key Features

- [x] Bulk categorization with keyboard shortcuts (1-4 keys)
- [x] Real-time subscriber counts and engagement metrics
- [x] Infinite scroll with search filtering
- [x] Automatic exclusion of user profile feeds
- [x] Live statistics showing progress
- [x] Undo for single and bulk review updates
- [ ] AI-assisted categorization suggestions
- [x] Bulk selection and operations
- [x] Preview of subreddit rules

## 🔄 Data Flow

```
Supabase subreddits table → Real-time subscriptions → Review interface
User selections → Database updates → Live metric refresh
Python scraper → New discoveries → Review queue
```

## 🏗️ Component Structure

```
subreddit-review/
├── page.tsx                    # Main review interface
├── README.md                   # This documentation
└── components/                 # Page-specific components
    └── (shared components used from /src/components/)
```

## 🔌 API Endpoints Used

- `GET /api/subreddits` - Fetch subreddits for review with filters
- `PATCH /api/subreddits/{id}` - Update review status
- **Real-time**: Supabase subscriptions for live updates

## 💾 Database Tables

- `subreddits` - Main table with `review` field for categorization
  - Filters: `WHERE review IS NULL` for pending review
  - Real-time updates on status changes

## 🎨 UI/UX Specifications

- **Keyboard Navigation**: 1=Ok, 2=No Seller, 3=Non Related, 4=User Feed
- **Infinite Scroll**: Loads 50 records per batch for performance
- **Real-time Stats**: Live progress counter and completion percentage
- **Responsive Design**: Works on desktop and tablet (mobile limited)
- **Loading States**: Skeleton loaders for smooth UX

## 🐛 Known Issues

- Mobile view needs further optimization for small screens
- Search filters could be more advanced (date ranges, subscriber counts)

## 🚀 Future Enhancements

- **AI Categorization**: Show AI suggestions with confidence scores
- **Bulk Operations**: Select multiple subreddits for batch updates
- **Content Preview**: Show recent posts and rules without leaving page
- **Progress Tracking**: Visual progress bar and estimated completion time
- **Export Options**: CSV export of categorized results
- **Collaboration**: Multi-user review with assignment system

## 📈 Business Impact

- **Primary KPI**: Conversion rate from discovered → approved subreddits
- **Current Performance**: ~425 "Ok" subreddits from 5,800+ discovered (~7% approval rate)
- **Time Savings**: Manual review takes ~10 seconds per subreddit
- **Quality Control**: Human review ensures marketing compliance and relevance

## 🔗 Related Pages

- [Categorization](../categorization/README.md) - Next step for "Ok" subreddits
- [Posting](../posting/README.md) - Final marketing execution
- [Analytics](../analytics/README.md) - Performance tracking