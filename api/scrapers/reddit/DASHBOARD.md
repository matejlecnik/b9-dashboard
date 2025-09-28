# 🚀 Reddit Scraper Dashboard

## 📊 Live Status Monitor

### 🟢 System Status
```
Last Updated: Check system_logs table
Status: Check system_control.enabled
Current Mode: PARALLEL BATCH PROCESSING (v3.1)
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

### 🔄 Troubleshooting

#### Scraper Not Collecting Posts?
1. Check if scraper is running: `system_control.enabled = true`
2. Look for errors in last 10 minutes
3. Verify batch writes are happening
4. Check thread progress - are all 9 threads active?

#### Slow Performance?
1. Check stealth delays in logs
2. Monitor rate limit status
3. Verify all proxies are working
4. Look for thread bottlenecks

#### Missing Data?
1. Check for foreign key violations
2. Verify users exist before posts
3. Look for batch write failures
4. Monitor database connection errors

### 📅 Maintenance Schedule

- **Hourly**: Check error rate
- **Daily**: Review discovered subreddits
- **Weekly**: Analyze performance trends
- **Monthly**: Clean old logs, optimize queries

### 🎯 Current Focus

**Optimization Goal**: Process 2255 OK subreddits in <5 hours
**Quality Target**: <1% error rate, 100% data integrity
**Discovery Target**: 100+ new quality subreddits/day