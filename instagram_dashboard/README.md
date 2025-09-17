# Instagram Dashboard & Scraper System

## 📋 Overview
Comprehensive Instagram creator discovery and analysis platform for B9 Agency. Built to discover, review, categorize, and analyze Instagram creators for marketing campaigns.

## 🎯 Core Objectives
1. **Discover** new creators through following lists of existing creators
2. **Review** creators (Ok/Non Related) - only keeping those with 10k+ followers
3. **Categorize** approved creators into niche groups
4. **Track** viral content (posts, stories, reels) from approved creators
5. **Analyze** creator performance and engagement metrics

## 📊 Dashboard Pages Architecture

### 1. Creator Review Page
- **Purpose**: Review newly discovered creators
- **Actions**: Mark as "Ok" or "Non Related"
- **Filter**: Only show creators with 10k+ followers
- **Fields to Display**:
  - Profile picture
  - Username & Full name
  - Follower count
  - Bio
  - Recent content preview
  - Review status dropdown

### 2. Niching/Categorization Page
- **Purpose**: Assign niche categories to approved creators
- **Prerequisites**: Creator must be marked as "Ok"
- **Features**:
  - Bulk niche assignment
  - Create new niche groups
  - View creators by niche
  - Niche performance analytics

### 3. Viral Reels Page
- **Purpose**: Display high-performing content from approved creators
- **Content Types**: Posts, Stories, Reels
- **Sort By**: Views, Engagement rate, Recency
- **Features**:
  - Filter by creator niche
  - Content performance metrics
  - Download/save functionality
  - Trend analysis

### 4. Creator Analysis Page
- **Purpose**: Deep dive into individual creator performance
- **Metrics**:
  - Engagement trends
  - Content frequency
  - Best performing content types
  - Audience growth rate
  - Optimal posting times

## 🔄 Scraper Logic Flow

### Primary Scraper (Content Tracker)
1. Get all creators marked as "Ok" from `instagram_creators` table
2. For each creator, fetch:
   - Recent posts
   - Stories (if available)
   - Reels
3. Store content with:
   - Creator reference
   - Creator's niche
   - Engagement metrics
   - Timestamps

### Discovery Scraper (Following Fetcher)
1. Input: Instagram username
2. Fetch list of accounts they follow
3. For each followed account:
   - Get profile data
   - Check follower count (skip if < 10k)
   - Save to database with empty review status
4. Queue for manual review

## 📐 Database Schema Updates Needed

### instagram_creators table
```sql
ALTER TABLE instagram_creators ADD COLUMN review_status TEXT;
-- Values: 'pending', 'ok', 'non_related'
ALTER TABLE instagram_creators ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE instagram_creators ADD COLUMN reviewed_by TEXT;
```

### New Tables Needed
1. **instagram_posts** (for regular posts)
2. **instagram_stories** (for stories - 24hr content)
3. **instagram_discovery_queue** (for tracking discovery sources)

## 💰 API Cost Analysis

### Current API (instagram-looter2.p.rapidapi.com)
- **Capabilities**: Basic profile info, reels, posts
- **Limitations**: No following list endpoint
- **Cost**: ~$30/month for 10,000 requests
- **Rate limits**: 10 requests/second

### Recommended API for Following Lists (HikerAPI)
- **Capabilities**: Following/followers lists, full profile data, stories, posts, reels
- **Pricing**: Pay-per-request model
  - Starter: $0.0005 per request
  - Scale: $0.0003 per request (100k+ requests)
  - Enterprise: Custom pricing
- **Performance**: 4-5M requests/day capacity, 99.9% uptime
- **No Instagram login required**: Uses proxy rotation automatically

### Alternative: instagram-scraper-api2.p.rapidapi.com
- **Capabilities**: Following lists, profile info
- **Cost**: ~$49/month for 25,000 requests
- **Currently implemented** in following-discovery.py

### Estimated Monthly Costs
- **Content Tracking** (85 creators × 4 updates/day): ~2,500 requests = $15
- **Discovery Runs** (10 accounts × 500 following each/week): ~5,000 requests = $30
- **Profile Updates** (85 creators daily): ~2,500 requests = $15
- **Total Estimate**: $60-100/month for moderate usage

## ❓ Questions & Clarifications Needed

### 1. Content Tracking
- **How far back** should we fetch content? (Last 30 days? All time?)
- **Update frequency**: How often to check for new content from Ok creators?
- **Stories**: Do we need to capture stories? (They disappear after 24hrs)
- **Metrics priority**: Views, likes, comments, shares - which matter most?

### 2. Discovery Process
- **Source accounts**: Which accounts should we use to discover new creators?
- **Discovery frequency**: How often to run discovery scraper?
- **Duplicate handling**: What if a creator is discovered from multiple sources?
- **Geographic filtering**: Any location-based requirements?

### 3. Niche Categories
- **Predefined niches**: Should we start with specific categories?
- **Multi-niche**: Can a creator belong to multiple niches?
- **Niche hierarchy**: Do we need sub-categories?
- **Auto-categorization**: Should we implement AI-based categorization later?

### 4. Performance Thresholds
- **"Viral" definition**: What metrics define viral content?
  - Minimum views?
  - Engagement rate threshold?
  - Growth velocity?
- **Creator scoring**: How to rank creators within niches?

### 5. API & Infrastructure
- **Budget**: What's the monthly API budget?
- **Request volume estimate**:
  - How many creators to track?
  - How many discovery runs per day?
- **Storage**: Any concerns about storing media URLs/thumbnails?
- **Render deployment**: Which scripts need to run on schedule?

### 6. User Management
- **Access control**: Who can review/categorize creators?
- **Audit trail**: Do we need to track who reviewed what?
- **Bulk operations**: How many creators reviewed at once?

### 7. Integration
- **Export functionality**: CSV export needed?
- **Webhooks**: Notify when viral content detected?
- **Analytics dashboards**: Real-time or batch updated?

## 🚀 Next Steps

1. **Immediate Actions**:
   - Add review_status field to creators table
   - Research alternative APIs for following lists
   - Create cost projection based on usage

2. **Development Phases**:
   - Phase 1: Database schema updates
   - Phase 2: Discovery scraper development
   - Phase 3: Content tracking scraper
   - Phase 4: Dashboard pages creation
   - Phase 5: Render deployment & scheduling

3. **Testing Requirements**:
   - API rate limit testing
   - Data quality validation
   - Performance benchmarking

## 📈 Success Metrics
- Creators discovered per day
- Review completion rate
- Viral content identified
- API cost per creator tracked
- Dashboard response times

## 🔗 Related Documentation
- [Migration Status](./MIGRATION_STATUS.md) - Completed
- [API Documentation](./docs/API.md) - To be created
- [Deployment Guide](./docs/DEPLOYMENT.md) - To be created

## ✅ Current Implementation Status

### Completed ✓

#### 1. **Database Schema Updates**:
   - ✅ Added `characteristics TEXT[]` field for AI training (tall, petite, curvy, etc.)
   - ✅ Added `avg_views_per_reel_cached` for viral detection
   - ✅ Created `instagram_creator_niches` junction table for multi-niche support
   - ✅ Created `instagram_highlights` table for permanent stories
   - ✅ Created `instagram_scraper_logs` table for comprehensive logging
   - ✅ Added viral tracking fields (`is_viral`, `viral_multiplier`)

#### 2. **Scraper Implementations**:
   - ✅ **reels-scraper.py**: 90 reels for new creators, 30 for updates (4x daily)
   - ✅ **posts-scraper.py**: 90 posts for new creators, 30 for updates
   - ✅ **highlights-scraper.py**: Fetches all highlights (permanent stories)
   - ✅ **following-discovery.py**: Discovers creators from following lists (10k+ only)
   - ✅ **viral-detector.py**: Identifies viral content (50k+ views AND 5x average)

#### 3. **Features Implemented**:
   - ✅ Review system (pending/ok/non_related)
   - ✅ Multi-niche support per creator
   - ✅ Comprehensive logging to Supabase
   - ✅ Viral detection with 50k/5x rule
   - ✅ Always UPSERT to avoid duplicates
   - ✅ API call tracking and cost monitoring

#### 4. **Data Migration**:
   - ✅ Successfully migrated 85 creators, 7,897 reels, 21 niche groups
   - ✅ All historical data preserved

### In Progress 🔄
- Dashboard pages development (Next.js)
- API endpoints setup
- Render deployment configuration

### Next Steps 📋
1. **Run database migration** (use apply_migration.py)
2. **Test scrapers** with sample data
3. **Create dashboard pages** for review/niching/analysis
4. **Deploy to Render** for 4x daily execution
5. **Research following APIs** for better pricing

### Usage Examples

**1. Run Database Migration**:
```bash
python apply_migration.py
# Copy the SQL and run in Supabase SQL Editor
```

**2. Discover New Creators**:
```bash
python following-discovery.py cristiano 500  # Discover from first 500 accounts Cristiano follows
```

**3. Scrape Content (Only from approved creators)**:
```bash
python reels-scraper.py          # Fetches 90 for new, 30 for updates
python posts-scraper.py          # Fetches regular posts
python highlights-scraper.py     # Fetches all highlights
```

**4. Detect Viral Content**:
```bash
python viral-detector.py         # Identifies content with 50k+ views AND 5x average
```

**5. Review Creators** (manual for now, dashboard coming):
```sql
-- Mark creator as approved
UPDATE instagram_creators
SET review_status = 'ok', reviewed_at = NOW(), reviewed_by = 'admin'
WHERE username = 'creator_username';

-- Assign to niche (multi-niche support)
INSERT INTO instagram_creator_niches (creator_id, niche_id, assigned_by)
VALUES ('creator_ig_id', 'niche_uuid', 'admin');

-- Add characteristics for AI training
UPDATE instagram_creators
SET characteristics = ARRAY['tall', 'blonde', 'athletic']
WHERE username = 'creator_username';
```

**6. Monitor Logs**:
```sql
-- Check recent scraper activity
SELECT * FROM instagram_scraper_logs
ORDER BY created_at DESC
LIMIT 20;

-- Check viral content
SELECT creator_username, play_count, viral_multiplier
FROM instagram_reels
WHERE is_viral = true
ORDER BY play_count DESC;
```

---

**Status**: Implementation Phase - Core Backend Complete
**Last Updated**: January 2025
**Owner**: B9 Agency