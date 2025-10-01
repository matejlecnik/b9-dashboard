# Instagram Creator Review

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PLANNED   │ █████░░░░░░░░░░░░░░░ 25% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/app/instagram/creator-review/README.md",
  "parent": "dashboard/src/app/instagram/creator-review/README.md"
}
```

## Overview

Creator discovery and review interface for evaluating Instagram accounts for B9 Agency's marketing campaigns. This module enables the team to efficiently review, categorize, and approve Instagram creators for OnlyFans promotion campaigns.

**Purpose**: Streamline the creator vetting process with a systematic review workflow similar to the Reddit subreddit review system.

## Features

### Current Implementation ✅
- **Creator Table**: Display discovered Instagram creators
- **Basic Filtering**: Search and filter capabilities
- **Bulk Selection**: Multi-select for batch operations
- **Related Creators**: Find similar accounts

### Review Workflow 🟡
Creators go through a review process with these statuses:
1. **Pending**: Newly discovered, awaiting review
2. **Approved**: Suitable for campaigns
3. **Rejected**: Not suitable for campaigns
4. **Needs Review**: Requires additional evaluation
5. **Blacklisted**: Permanently excluded

## TODO List

### Priority 1: Review Interface
- [ ] Implement review status dropdown (like Reddit's Ok/No Seller/etc)
- [ ] Add quick review keyboard shortcuts
- [ ] Create batch review actions
- [ ] Build review history tracking

### Priority 2: Creator Details
- [ ] Create detailed creator profile modal
- [ ] Add engagement metrics display
- [ ] Implement content preview grid
- [ ] Show follower demographics

### Priority 3: Discovery Features
- [ ] Add "Find Similar" functionality
- [ ] Implement competitor discovery
- [ ] Create hashtag-based discovery
- [ ] Build location-based search

### Priority 4: Workflow Automation
- [ ] Auto-categorize based on bio keywords
- [ ] Set up review assignment system
- [ ] Create approval notifications
- [ ] Implement review quotas/targets

## Current Errors

### Known Issues 🐛
1. **Data Sync**: Creator data not updating in real-time
   - **Status**: Implementing WebSocket connection
   - **Fix**: Adding real-time data sync

2. **Filter Performance**: Slow filtering with large datasets
   - **Status**: Optimizing filter logic
   - **Fix**: Server-side filtering implementation

3. **Image Loading**: Profile images loading slowly
   - **Status**: Adding lazy loading
   - **Fix**: Implementing image optimization

## Potential Improvements

### Review Enhancements
1. **AI-Assisted Review**: Pre-screen creators with ML models
2. **Duplicate Detection**: Identify creators with multiple accounts
3. **Quality Scoring**: Automated creator quality assessment
4. **Campaign Matching**: Suggest creators for specific campaigns
5. **Review Analytics**: Track reviewer performance and accuracy

### Technical Improvements
1. **Infinite Scroll**: Replace pagination with infinite scroll
2. **Offline Mode**: Enable offline review capability
3. **Keyboard Navigation**: Full keyboard control for power users
4. **Custom Views**: Saveable filter combinations

## Data Model

```typescript
interface InstagramCreator {
  id: string
  username: string
  full_name: string
  bio: string
  followers: number
  following: number
  posts: number
  engagement_rate: number
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_review' | 'blacklisted'
  categories: string[]
  discovered_at: Date
  reviewed_at?: Date
  reviewed_by?: string
  notes?: string
}
```

## Review Criteria

### Approval Factors
- Minimum follower count (configurable)
- Engagement rate above threshold
- Content quality and consistency
- Audience demographics match
- No competitor affiliations

### Rejection Reasons
- Low engagement rate
- Fake followers detected
- Inappropriate content
- Already working with competitors
- Geographic mismatch

## API Endpoints

- `GET /api/instagram/creators` - List creators with filters
- `GET /api/instagram/creators/:id` - Get creator details
- `PATCH /api/instagram/creators/:id/review` - Update review status
- `POST /api/instagram/creators/bulk-review` - Batch review update
- `GET /api/instagram/creators/:id/similar` - Find similar creators

## UI Components

### Review Components
- `CreatorReviewTable` - Main review interface
- `ReviewStatusDropdown` - Status selector
- `CreatorDetailsModal` - Detailed view modal
- `QuickReviewBar` - Keyboard-driven review

### Filter Components
- `CreatorFilters` - Advanced filter panel
- `StatusFilter` - Review status filter
- `MetricsFilter` - Follower/engagement filters
- `CategoryFilter` - Niche category filter

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Approve selected |
| `R` | Reject selected |
| `N` | Mark needs review |
| `Space` | Toggle selection |
| `↑/↓` | Navigate rows |
| `/` | Focus search |
| `Esc` | Clear selection |

## Related Documentation

- **Instagram Dashboard**: `/src/app/instagram/README.md`
- **Review Components**: `/src/components/instagram/review/README.md`
- **API Documentation**: `/src/app/api/instagram/README.md`

---

*Instagram Creator Review - Efficiently discovering and vetting creators for B9 Agency campaigns*

---

_Version: 1.0.0 | Updated: 2025-10-01_