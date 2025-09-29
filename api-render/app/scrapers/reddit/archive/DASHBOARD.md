# 🚀 Reddit Scraper Dashboard

## 🚨 CRITICAL ISSUES (Last Updated: 2025-09-28)

### ✅ Issue #1: ZERO Subreddits Being Saved [FIXED]
**Status**: RESOLVED
**Symptom**: Every batch showed "0 subreddits" in logs despite processing 10
**Root Cause**: Key mismatch - looking for 'about' instead of 'subreddit_data'
**Impact**: No subreddit metadata was being collected or updated
**Fix Applied**: Changed to use correct key `result.get('subreddit_data')` - now saves real Reddit data

### ✅ Issue #2: Foreign Key Violations - Posts Lost [FIXED]
**Status**: RESOLVED
**Symptom**: Posts were failing with "Key (subreddit_name)=(X) is not present in table"
**Examples**: tributeme, slutzys, newkarmansfw18, realgirls, ebonyadmirer, etc.
**Root Cause**:
1. Discovered subreddits only got quick scrape, not full data
2. Subreddits saved AFTER posts that reference them
3. Write order not guaranteed for discovered data
**Fix Applied**:
1. ✅ Full scrape discovered subreddits with all posts
2. ✅ Proper write order: Subreddits → Users → Posts
3. ✅ Skip checks for Non Related/User Feed/Banned
4. ✅ Post deduplication before saving

### ✅ Issue #3: Double Processing/Logging [FIXED]
**Status**: RESOLVED
**Symptom**: Each subreddit logged twice - first with 0 weekly, then with actual count
**Root Cause**: Duplicate logging in SubredditScraper scrape method
**Impact**: Confusing logs
**Fix Applied**: Removed duplicate logging from subreddit.py line 182

### ✅ Issue #4: Inefficient Cache Loading [FIXED]
**Status**: RESOLVED
**Symptom**: Re-discovering already-known subreddits
**Root Cause**: Only loading reviewed subreddits at startup, not ALL existing
**Impact**: Wasting API calls on known subreddits
**Fix Applied**: Now loads ALL existing subreddit names into cache at startup

## 📊 Live Status Monitor

### 🟢 System Status
```
Last Updated: 2025-09-28
Status: Check system_control.enabled
Current Mode: PARALLEL BATCH PROCESSING (v3.1)
Known Issues: ALL 4 ISSUES RESOLVED ✅
```

### ⚡ Performance Metrics

#### Current Architecture
- **Proxies**: 3 active (RapidProxy, BeyondProxy, NyronProxy)
- **Threads**: 9 total (3 per proxy)
- **Processing Mode**: Parallel batches of 10 subreddits

#### Batch Processing Strategy
```
┌─────────────────────────────────────┐
│      BATCH OF 10 SUBREDDITS        │
├─────────────────────────────────────┤
│  Thread 0: 2 subreddits (primary)   │
│  Thread 1: 1 subreddit              │
│  Thread 2: 1 subreddit              │
│  Thread 3: 1 subreddit              │
│  Thread 4: 1 subreddit              │
│  Thread 5: 1 subreddit              │
│  Thread 6: 1 subreddit              │
│  Thread 7: 1 subreddit              │
│  Thread 8: 1 subreddit              │
└─────────────────────────────────────┘
```

### 📈 Real-Time Progress Queries

#### Check Current Scraping Status
```sql
-- Overall scraper status
SELECT
  enabled,
  status,
  updated_at,
  metadata
FROM system_control
WHERE script_name = 'reddit_scraper';
```

#### Monitor Active Processing
```sql
-- Last 20 processing logs
SELECT
  timestamp,
  message,
  context->>'thread_id' as thread,
  context->>'subreddit' as subreddit
FROM system_logs
WHERE source = 'reddit_scraper'
  AND timestamp >= NOW() - INTERVAL '10 minutes'
  AND message LIKE '%Processing%'
ORDER BY timestamp DESC
LIMIT 20;
```

#### Track Batch Completions
```sql
-- Batch write operations
SELECT
  timestamp,
  message,
  context->>'thread_id' as thread,
  context->>'posts_count' as posts,
  context->>'users_count' as users
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Batch write completed%'
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

#### Monitor Data Collection
```sql
-- Posts collected in last hour
SELECT
  COUNT(*) as posts_collected,
  COUNT(DISTINCT subreddit_name) as unique_subreddits,
  COUNT(DISTINCT author) as unique_users,
  MAX(created_at) as latest_post
FROM reddit_posts
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

#### Track User Discovery
```sql
-- New users discovered today
SELECT
  COUNT(*) as new_users,
  AVG(comment_karma) as avg_comment_karma,
  AVG(link_karma) as avg_link_karma,
  MAX(created_at) as latest_user
FROM reddit_users
WHERE created_at >= CURRENT_DATE;
```

#### Monitor New Subreddit Discoveries
```sql
-- Subreddits discovered today
SELECT
  name,
  subscribers,
  category,
  subreddit_score,
  created_at
FROM reddit_subreddits
WHERE created_at >= CURRENT_DATE
  AND review IS NULL
ORDER BY subreddit_score DESC
LIMIT 20;
```

### 🔍 Diagnostic Queries for Current Issues

#### Check for Missing Subreddit Saves
```sql
-- Identify subreddits in posts but not in subreddits table
SELECT DISTINCT p.subreddit_name, COUNT(*) as orphaned_posts
FROM reddit_posts p
LEFT JOIN reddit_subreddits s ON p.subreddit_name = s.name
WHERE s.name IS NULL
GROUP BY p.subreddit_name
ORDER BY orphaned_posts DESC
LIMIT 20;
```

#### Check for Double Processing
```sql
-- Look for duplicate log entries within same minute
SELECT
  DATE_TRUNC('minute', timestamp) as minute,
  context->>'subreddit' as subreddit,
  COUNT(*) as log_count
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Successfully scraped%'
  AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY 1, 2
HAVING COUNT(*) > 1
ORDER BY minute DESC;
```

#### Verify Subreddit Metadata Collection
```sql
-- Check subreddits with missing metadata
SELECT
  name,
  CASE
    WHEN subscribers = 0 OR subscribers IS NULL THEN 'Missing subscribers'
    WHEN description IS NULL OR description = '' THEN 'Missing description'
    WHEN created_utc IS NULL THEN 'Missing created date'
    ELSE 'Has metadata'
  END as status
FROM reddit_subreddits
WHERE review = 'Ok'
  AND (subscribers = 0 OR description IS NULL OR description = '')
LIMIT 20;
```

#### Monitor Foreign Key Violations
```sql
-- Check recent foreign key errors in logs
SELECT
  timestamp,
  message,
  context->>'error' as error_details
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%foreign key constraint%'
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 10;
```

### 🚨 Error Monitoring

#### Check Recent Errors
```sql
-- Last 10 errors
SELECT
  timestamp,
  level,
  message,
  context
FROM system_logs
WHERE source = 'reddit_scraper'
  AND level IN ('error', 'warning')
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 10;
```

#### Monitor Rate Limiting
```sql
-- Reddit API rate limit status
SELECT
  timestamp,
  message,
  context->>'remaining' as requests_remaining,
  context->>'reset_time' as reset_at
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%rate limit%'
  AND timestamp >= NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC
LIMIT 5;
```

### 📊 Performance Benchmarks

#### Expected Processing Times
- **10 subreddits (1 batch)**: ~1-2 minutes
- **100 subreddits**: ~10-20 minutes
- **1000 subreddits**: ~2-3 hours
- **Full run (2255 OK)**: ~5-6 hours

#### Data Collection Targets
- **Posts per subreddit**: 160 avg (30 hot, 30 weekly, 100 yearly)
- **Users per batch**: 200-300 unique
- **New discoveries per batch**: 5-10 subreddits

### 🎯 Key Success Metrics

| Metric | Target | Query |
|--------|--------|-------|
| Scraping Speed | 10 subs/2 min | Check timestamp gaps in logs |
| Error Rate | <1% | errors/total requests |
| User Discovery | 500/hour | New reddit_users rows |
| Post Collection | 1500/batch | New reddit_posts rows |
| Memory Usage | <100MB | Check system metrics |

### 🔧 Control Commands

#### Start Scraper
```bash
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/start" \
  -H "Content-Type: application/json"
```

#### Stop Scraper
```bash
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/stop" \
  -H "Content-Type: application/json"
```

#### Check Status
```bash
curl "https://b9-dashboard.onrender.com/api/scraper/status"
```

### 📝 Log Message Patterns

#### Success Patterns
- `✅ Batch write completed` - Data successfully saved
- `[SubredditScraper] Successfully scraped r/X - Y hot, Z weekly, W yearly posts`
- `[UserEnrichment] Successfully enriched X users - Y new subreddits discovered`
- `📦 Parallel batch completed: 10 subreddits in X seconds`

#### Warning Patterns
- `⚠️ Rate limit approaching` - Slow down imminent
- `⚠️ Memory usage high` - Consider reducing batch size
- `⚠️ Proxy error` - Connection issues

#### Error Patterns
- `❌ Failed to` - Operation failure
- `Exception type:` - Python exception
- `rate limit exceeded` - Need to wait

### 🔄 Troubleshooting & Fixes

#### Issue: Zero Subreddits Being Saved
**Quick Check**:
```sql
SELECT COUNT(*) as batches_without_subreddits
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Collected: 0 subreddits%'
  AND timestamp >= NOW() - INTERVAL '1 hour';
```
**Fix Location**: main.py, line 1013
**Fix**: Remove `if about_data:` condition, always create subreddit_data

#### Issue: Foreign Key Violations
**Quick Check**: Run the foreign key violations diagnostic query above
**Fix Location**: main.py, batch_write_parallel_data()
**Fix**:
1. Save discovered subreddits immediately when found
2. Ensure subreddits exist in DB before saving posts
3. Add discovered subreddits to batch_subreddits_data

#### Issue: Double Processing
**Quick Check**: Look for duplicate "Successfully scraped" messages
**Fix Location**: subreddit.py, line 183
**Fix**: Remove one of the duplicate logging statements

#### Issue: Inefficient Cache
**Quick Check**:
```sql
-- Count re-discoveries of existing subreddits
SELECT COUNT(DISTINCT name) as existing_subreddits
FROM reddit_subreddits;
```
**Fix Location**: main.py, _load_reviewed_subreddits()
**Fix**: Load ALL subreddit names into discovered_subreddits cache

#### Scraper Not Collecting Posts?
1. Check if scraper is running: `system_control.enabled = true`
2. Look for foreign key violations in logs
3. Verify subreddits are being saved first
4. Check thread progress - are all 9 threads active?

#### Slow Performance?
1. Check for double processing in logs
2. Monitor cache efficiency
3. Verify all proxies are working
4. Look for unnecessary re-discoveries

#### Missing Data?
1. Run foreign key diagnostic query
2. Check for zero subreddit saves
3. Verify discovery pipeline is working
4. Monitor batch write sequences

### 📅 Maintenance Schedule

- **Hourly**: Check error rate
- **Daily**: Review discovered subreddits
- **Weekly**: Analyze performance trends
- **Monthly**: Clean old logs, optimize queries

### 🎯 Current Focus

**Optimization Goal**: Process 2255 OK subreddits in <5 hours
**Quality Target**: <1% error rate, 100% data integrity
**Discovery Target**: 100+ new quality subreddits/day

## 🎯 COMPREHENSIVE FIX PLAN - Critical Issues & Solutions

### 📋 Processing Rules (Business Requirements)

#### ❌ NEVER Process Again:
- **Non Related** - Already categorized as irrelevant
- **User Feed** - User profile pages (u_username)
- **Banned** - Reddit has banned these subreddits

#### ✅ Periodic Updates Required:
- **OK** - Get new posts regularly
- **No Seller** - Get new posts regularly

#### 🆕 Full Scraping Required:
- **New Discoveries** - Need complete data (about + hot/weekly/yearly posts)
- **Uncategorized** - Any subreddit without review status

### 🔍 Root Cause Analysis

1. **Foreign Key Violations**
   - Posts reference subreddits not in DB
   - Discovered subreddits saved AFTER posts that reference them

2. **Incomplete Discovery Processing**
   - Discovered subreddits only get `get_subreddit_info()`
   - Missing hot/weekly/yearly posts

3. **Write Order Issues**
   - Discovered subreddits processed at end of batch
   - Not flushed before posts written

### 🔧 Required Code Changes

#### Fix 1: Full Scraping for Discoveries
**File**: `main.py` line 938-975 (`process_discovered_subreddits`)
**Current Code**:
```python
# Just get subreddit info, not posts
subreddit_info = await scraper.get_subreddit_info(subreddit_name)
```
**Change To**:
```python
# Full scrape with all posts like OK subreddits
result = await scraper.scrape(subreddit_name=subreddit_name)
```

#### Fix 2: Skip Categorized Subreddits
**File**: `main.py` line 945 (in discovery processing)
**Add Before Processing**:
```python
# Skip if already categorized
if subreddit_name in self.non_related_subreddits:
    logger.info(f"Skipping Non Related: {subreddit_name}")
    continue
if subreddit_name in self.user_feed_subreddits:
    logger.info(f"Skipping User Feed: {subreddit_name}")
    continue
if subreddit_name in self.banned_subreddits:
    logger.info(f"Skipping Banned: {subreddit_name}")
    continue
```

#### Fix 3: Immediate Subreddit Saving
**File**: `main.py` discovery flow
**Strategy**:
1. When subreddit discovered → save immediately
2. Flush batch writer before writing posts
3. Verify subreddit exists before post save

### 📊 Correct Data Flow

```
PARALLEL BATCH (10 Subreddits)
│
├── Phase 1: Main Processing
│   ├── Process OK/No Seller subreddits
│   ├── Full scrape (about + all posts)
│   └── Extract users from posts
│
├── Phase 2: Write Main Batch
│   └── ORDER: Subreddits → Users → Posts
│
├── Phase 3: User Enrichment
│   ├── Enrich users from hot posts
│   └── Discover new subreddits
│
├── Phase 4: Process Discoveries
│   ├── Skip if Non Related/User Feed/Banned
│   ├── FULL SCRAPE if new (about + posts)
│   └── Collect all data
│
└── Phase 5: Write Discovery Data
    └── ORDER: New Subreddits → New Users → New Posts
```

### 🚀 Implementation Steps

1. **Update discovery processing** to do full scrapes
2. **Add categorization checks** to skip processed subreddits
3. **Fix write ordering** - flush discoveries immediately
4. **Add validation** before writing posts
5. **Test with real data** to verify fixes

### 📈 Expected Results After Fix

- ✅ **No foreign key violations** - Proper write order
- ✅ **Complete discovery data** - Full scraping for new subreddits
- ✅ **Respect categorization** - Skip Non Related/User Feed/Banned
- ✅ **Efficient processing** - No duplicate work
- ✅ **+50% more data** - From properly scraped discoveries

### ✅ Current Status: IMPLEMENTED
All fixes have been successfully implemented and deployed:
- Full scraping for discovered subreddits ✅
- Skip checks for categorized subreddits ✅
- Proper write order enforced ✅
- Cache pre-loading at startup ✅