# 🚀 Reddit Scraper Dashboard

## 🚨 CRITICAL ISSUES (Last Updated: 2025-09-28)

### ❌ Issue #1: ZERO Subreddits Being Saved
**Status**: CRITICAL - Data Loss
**Symptom**: Every batch shows "0 subreddits" in logs despite processing 10
**Root Cause**: Line 1013 in main.py - subreddit_data only saved if `about_data` exists
**Impact**: No subreddit metadata being collected or updated
**Fix**: Always create subreddit_data even without about_data, use existing data as fallback

### ❌ Issue #2: Foreign Key Violations - Posts Lost
**Status**: CRITICAL - Data Loss
**Symptom**: Posts failing with "Key (subreddit_name)=(X) is not present in table"
**Examples**: tributeme, slutzys, newkarmansfw18, realgirls, ebonyadmirer, etc.
**Root Cause**: Discovered subreddits from user activity not saved before their posts
**Impact**: Losing ~30% of posts from newly discovered subreddits
**Fix**: Save discovered subreddits to DB before attempting to save their posts

### ⚠️ Issue #3: Double Processing/Logging
**Status**: WARNING - Performance Impact
**Symptom**: Each subreddit logs twice - first with 0 weekly, then with actual count
**Root Cause**: Duplicate logging in SubredditScraper scrape method
**Impact**: Confusing logs, potential duplicate API calls
**Fix**: Remove duplicate logging in subreddit.py

### ⚠️ Issue #4: Inefficient Cache Loading
**Status**: WARNING - Performance Impact
**Symptom**: Re-discovering already-known subreddits
**Root Cause**: Only loading reviewed subreddits at startup, not ALL existing
**Impact**: Wasting API calls on known subreddits
**Fix**: Load ALL subreddit names into cache at startup

## 📊 Live Status Monitor

### 🟢 System Status
```
Last Updated: Check system_logs table
Status: Check system_control.enabled
Current Mode: PARALLEL BATCH PROCESSING (v3.1)
Known Issues: 4 CRITICAL/WARNING (see above)
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

## 🔧 Implementation Priority Queue

### Priority 1: Critical Data Loss Fixes (IMMEDIATE)
1. **Fix Zero Subreddit Saves** (main.py:1013)
   - Always create subreddit_data, even without about_data
   - Use existing DB data as fallback for missing fields

2. **Fix Foreign Key Violations** (main.py:batch_write_parallel_data)
   - Save discovered subreddits before their posts
   - Add pre-check for subreddit existence

### Priority 2: Performance Fixes (NEXT)
3. **Remove Double Processing** (subreddit.py:183)
   - Consolidate duplicate logging statements

4. **Optimize Cache Loading** (main.py:_load_reviewed_subreddits)
   - Load ALL existing subreddit names at startup
   - Pre-populate discovered_subreddits cache

### Priority 3: Enhancement (LATER)
5. **Add Discovery Tracking**
   - Track which user led to each discovery
   - Monitor discovery effectiveness

## 📊 Expected Impact After Fixes

- **Data Recovery**: +30% more posts saved (from discovered subreddits)
- **Performance**: -20% API calls (cache optimization)
- **Clarity**: Clean logs without duplicates
- **Reliability**: No foreign key violations
- **Discovery**: Proper tracking of new subreddit sources