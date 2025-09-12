# Dashboard Pages Directory

## Overview
This directory contains the core application pages for B9 Agency's Reddit analytics dashboard. It manages the primary workflow for discovering, reviewing, categorizing, and optimizing subreddits for OnlyFans marketing campaigns. Built with Next.js App Router, it handles 5,800+ discovered subreddits and filters them to 425+ marketing-ready targets.

**Key Pages:**
- **subreddit-review/**: Primary workflow for categorizing discovered subreddits (Ok/No Seller/Non Related/User Feed)
- **categorization/**: Assigns marketing categories to approved subreddits for campaign targeting
- **scraper/**: Monitors system health and data collection performance
- **posting/**: Provides optimal subreddit recommendations for content marketing
- **user-analysis/**: User quality scoring and creator identification

## TODO List
- [ ] Add analytics page for performance tracking and ROI metrics
- [ ] Implement settings page for user preferences and configuration
- [ ] Create post-analysis page for content performance insights
- [ ] Add keyboard shortcuts documentation to each page
- [ ] Optimize infinite scroll performance for large datasets
- [ ] Implement bulk operations across all review interfaces
- [ ] Add export functionality for categorized subreddit lists

## Current Errors
- Mobile responsiveness needs improvement on tablet/phone screens
- ~~Some pages still reference removed AI review functionality~~ - CLEANED UP
- Real-time subscriptions occasionally disconnect and don't auto-reconnect
- Search filters could be more performant with debouncing
- Page transitions can be slow with large datasets

## Potential Improvements
- Cross-page navigation shortcuts for faster workflow
- Unified toolbar component across all pages to reduce duplication
- Advanced filtering system with date ranges and engagement thresholds
- Progress tracking dashboard showing review completion status
- Multi-user collaboration features with user assignments
- Automated categorization suggestions based on subreddit analysis
- Performance analytics showing which categories perform best for campaigns

## Technical Notes
- **Architecture**: Next.js App Router with route groups `(dashboard)/`
- **State**: Real-time Supabase subscriptions for live data updates
- **Performance**: Infinite scroll (50 records/batch), skeleton loaders, error boundaries
- **Integration**: Supabase (data) → Python scraper (collection) → Vercel (deployment)

**Current Workflow**: Discovery → Review → Categorization → Optimization → Monitoring