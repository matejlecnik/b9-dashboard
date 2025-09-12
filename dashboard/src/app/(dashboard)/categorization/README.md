# Categorization

## Overview
Assigns marketing categories to approved ("Ok") subreddits for targeted OnlyFans campaigns. This page organizes 425+ approved subreddits into strategic marketing segments like "Ass & Booty", "Boobs & Chest", "Lingerie & Underwear", enabling targeted content planning and campaign optimization.

**Core Functionality**: Single-select dropdown, new category creation, filter tabs (All/Uncategorized/Categorized), bulk operations.

## TODO List
- [ ] Add AI-powered categorization suggestions based on subreddit content analysis
- [ ] Implement category performance analytics to track campaign success by category
- [ ] Add custom category colors and descriptions for better visual organization
- [ ] Create category templates for different marketing strategies
- [ ] Build category hierarchy with parent-child relationships
- [ ] Add category merging and renaming functionality
- [ ] Implement bulk category assignment validation

## Current Errors
- No validation for duplicate category names with different casing
- Category dropdown can become slow with 50+ categories (partially mitigated with caching)
- No category merging or renaming functionality available yet

## Potential Improvements
- Category performance tracking to identify which categories drive best engagement
- Advanced category management with drag-and-drop organization
- Category-based campaign templates and recommendations
- Integration with posting scheduler for category-specific content planning
- Export functionality for category-based subreddit lists
- Advanced analytics showing category trends and performance metrics

## Technical Notes
- **API Endpoints**: `GET/POST /api/categories`, `PATCH /api/subreddits/{id}`
- **Data Source**: `subreddits` table where `review = 'Ok'`
- **Components**: Uses `CategorySelector` component for consistent UX
- **Standard Categories**: Body-focused, Clothing, Style, Demographics, Content Type, Promotional

**Related Pages**: [Subreddit Review](../subreddit-review/README.md) → Categorization → [Posting](../posting/README.md)