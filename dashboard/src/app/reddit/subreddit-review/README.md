# Subreddit Review

## Overview
The **core workflow** of B9's Reddit marketing system. This page filters 5,800+ discovered subreddits down to 425+ high-value marketing targets through manual review. Users categorize each subreddit as "Ok" (approved), "No Seller" (bans OF promotion), "Non Related" (off-topic), or "User Feed" (individual profiles).

**Core Features**: Bulk categorization, keyboard shortcuts (1-4 keys), real-time metrics, infinite scroll, search filtering, undo functionality, rules modal display, smart number formatting.

## 🚨 CRITICAL - DO NOT MODIFY
**USER PREFERENCE**: This page's style, layout, and displayed columns are FINAL and should NOT be changed whatsoever. The current implementation is perfect for the workflow and any modifications to styling, column layout, or visual appearance are explicitly forbidden.

### Current Perfect Implementation:
- **Slim toolbar** with search icon on left, filters on right
- **Table columns** (in exact order): Checkbox, Icon, Subreddit, Rules, Members, Engagement, Avg Upvotes, Review
- **Number formatting**: Large numbers abbreviated (1.2K, 1.5M, 2.1B)
- **Engagement colors**: Pink (>10%), Grey (≤10%) - B9 branding colors only
- **Rules functionality**: 
  - Dark grey icon = rules data available → shows modal
  - Light grey icon = no rules data → prompts to open Reddit rules page
- **Column alignment**: All headers perfectly aligned with row content
- **Search behavior**: Filters table only, does NOT affect stats bar totals

## ✅ STATUS: COMPLETED & OPTIMIZED
This page is **feature-complete** and **fully optimized** for the B9 Agency workflow. No further development is planned or needed.

**Final Implementation**: All requested features have been implemented perfectly:
- Rules button with modal/Reddit fallback functionality ✅
- Large number abbreviations for Members and Avg. Upvotes ✅  
- B9 branding colors (pink/grey) for engagement metrics ✅
- Smart Rules icon styling based on data availability ✅
- Perfect column alignment and slim toolbar design ✅
- Search functionality that doesn't affect statistics totals ✅

## Technical Implementation Details
- **Data Source**: `subreddits` table with `rules_data` JSONB field for rules modal
- **API Endpoints**: `GET/PATCH /api/subreddits`, Supabase real-time subscriptions  
- **Performance**: Infinite scroll (50 records/batch), keyboard shortcuts (1-4 keys), memoized components
- **Number Formatting**: Custom `abbreviateNumber()` utility (K/M/B suffixes)
- **Rules Modal**: Existing modal component displaying parsed `rules_data.rules[]` array
- **State Management**: Separate search state from statistics to maintain accurate totals
- **Color Scheme**: B9 branding colors (pink/grey) instead of red/green/yellow
- **Business KPIs**: ~7% approval rate (425 "Ok" from 5,800+ discovered), ~10 seconds per review

### Component Architecture:
- **Page**: `subreddit-review/page.tsx` - Main container with state management
- **Table**: `UniversalTable.tsx` - Reusable table component with rules functionality  
- **Toolbar**: Unified search + filters with custom layout
- **Modal**: Existing rules modal with Reddit fallback logic

**Related Pages**: Subreddit Review → [Categorization](../categorization/README.md) → [Posting](../posting/README.md)