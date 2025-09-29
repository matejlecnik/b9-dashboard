# Reddit Scraper Module

┌─ SCRAPER STATUS ────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% ACTIVE      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../README.md",
  "current": "scrapers/reddit/README.md",
  "version": "3.1.1",
  "status": "PRODUCTION",
  "components": [
    {"file": "simple_main.py", "desc": "Main v3 scraper", "status": "RUNNING"},
    {"file": "continuous_v3.py", "desc": "Continuous runner", "status": "ACTIVE"},
    {"file": "ARCHITECTURE_V3.md", "desc": "v3 documentation", "status": "UPDATED"},
    {"file": "scrapers/base.py", "desc": "Base class", "status": "PRESERVED"},
    {"file": "scrapers/user.py", "desc": "User scraper", "status": "PRESERVED"}
  ]
}
```

## System Health

```
SCRAPER   [OK]   Running v3.1.1   | Heartbeat: 10s ago
DATABASE  [OK]   Connected        | Cache: 10,850/10,850 (100%)
RATE_LIMIT[OK]   Available: 580   | Reset: 5min
MEMORY    [OK]   Usage: 480MB     | Limit: 2GB (-20% usage)
ERRORS    [LOW]  3 in last hour   | Threshold: 50
```

## New Fields & Calculations (v3.0)

```json
{
  "subreddit_fields": {
    "engagement": "sum(comments) / sum(upvotes) for top 10 weekly",
    "subreddit_score": "sqrt(avg_upvotes) * engagement * 1000",
    "allow_polls": "from /about.json API",
    "spoilers_enabled": "from /about.json API",
    "rules_data": "from /about/rules.json API",
    "verification_required": "detected from rules/description keywords"
  },
  "post_fields": {
    "sub_primary_category": "denormalized from subreddit",
    "sub_tags": "denormalized from subreddit",
    "sub_over18": "denormalized from subreddit"
  },
  "user_fields": {
    "account_age_days": "calculated from created_utc"
  }
}
```

## Quick Status Check

```sql
-- Is it running?
SELECT enabled, status, last_heartbeat,
       EXTRACT(EPOCH FROM (NOW() - last_heartbeat))::INT as seconds_since_heartbeat
FROM system_control
WHERE script_name = 'reddit_scraper';

-- Last activity?
SELECT MAX(timestamp) as last_activity,
       COUNT(*) as logs_last_hour,
       COUNT(*) FILTER (WHERE level = 'error') as errors_last_hour
FROM system_logs
WHERE source = 'reddit_scraper'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Current errors?
SELECT COUNT(*) as error_count, message
FROM system_logs
WHERE source = 'reddit_scraper'
  AND level = 'error'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY message
ORDER BY error_count DESC
LIMIT 10;
```

---

## 📈 REAL-TIME PERFORMANCE METRICS

### Last Hour Statistics
```sql
-- Data collection rate
SELECT
  COUNT(DISTINCT subreddit_name) as subreddits_processed,
  COUNT(*) as posts_collected,
  COUNT(DISTINCT author) as unique_users,
  ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT subreddit_name), 0), 1) as avg_posts_per_sub
FROM reddit_posts
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Processing speed by minute
WITH batch_times AS (
  SELECT
    DATE_TRUNC('minute', timestamp) as minute,
    COUNT(DISTINCT context->>'subreddit') as subreddits_per_minute
  FROM system_logs
  WHERE message LIKE '%Successfully scraped%'
    AND timestamp > NOW() - INTERVAL '10 minutes'
  GROUP BY 1
)
SELECT
  ROUND(AVG(subreddits_per_minute), 2) as avg_speed_per_minute,
  MAX(subreddits_per_minute) as peak_speed,
  COUNT(*) as active_minutes
FROM batch_times;

-- Weekly posts success rate (should be 100% after fix)
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_scrapes,
  COUNT(*) FILTER (WHERE message NOT LIKE '%0 weekly%') as successful_weekly,
  ROUND(100.0 * COUNT(*) FILTER (WHERE message NOT LIKE '%0 weekly%') / COUNT(*), 1) as success_rate
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Successfully scraped%'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

## Scraper Control

```json
{
  "endpoints": {
    "start": {"method": "POST", "url": "/api/scraper/start"},
    "stop": {"method": "POST", "url": "/api/scraper/stop"},
    "status": {"method": "GET", "url": "/api/scraper/status"},
    "force_kill": {"method": "POST", "url": "/api/scraper/force-kill"}
  },
  "base_url": "https://b9-dashboard.onrender.com"
}
```

### Control Commands
```bash
# Start scraper
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/start" \
  -H "Content-Type: application/json"

# Stop scraper gracefully
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/stop" \
  -H "Content-Type: application/json"

# Force kill (emergency)
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/force-kill" \
  -H "Content-Type: application/json"

# Check detailed status
curl "https://b9-dashboard.onrender.com/api/scraper/status"
```

### Configuration Management
```sql
-- View current configuration
SELECT config, enabled, status, last_heartbeat
FROM system_control
WHERE script_name = 'reddit_scraper';

-- Update batch size (default: 10)
UPDATE system_control
SET config = jsonb_set(config, '{batch_size}', '20')
WHERE script_name = 'reddit_scraper';

-- Update delay between batches (seconds, default: 30)
UPDATE system_control
SET config = jsonb_set(config, '{delay_between_batches}', '60')
WHERE script_name = 'reddit_scraper';

-- Update max daily requests (default: 10000)
UPDATE system_control
SET config = jsonb_set(config, '{max_daily_requests}', '5000')
WHERE script_name = 'reddit_scraper';
```

---

## 🏗️ CURRENT ARCHITECTURE (v2.2.0)

### System Flow
```
[Render Deployment]
        ↓
[start.py] → [continuous.py] ← Checks every 30s → [Supabase Control]
        ↓                                                ↓
[RedditScraperV2 (main.py)]                      enabled/disabled
        ↓
[Load Target Subreddits] ← Review = 'Ok' or 'No Seller'
        ↓
[Batch of 10 Subreddits]
        ↓
[9 Parallel Threads]
    ├─ Thread 0 (Primary): 2 subreddits
    └─ Threads 1-8: 1 subreddit each
        ↓
[SubredditScraper] → Scrapes: About, Hot(30), Weekly(30), Yearly(100)
        ↓
[Extract Users & Calculate Metrics]
        ↓
[UserScraper] → Enrichment (Hot post users only)
        ↓
[Discovery] → New subreddits from user activity
        ↓
[BatchWriter] → Write Order: Subreddits → Users → Posts
        ↓
[Supabase Database]
```

### Key Components

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| **continuous.py** | scrapers/reddit/ | Main loop, checks control table | ✅ Active |
| **main.py** | scrapers/reddit/ | Orchestrator (RedditScraperV2) | ✅ Active |
| **SubredditScraper** | scrapers/subreddit.py | Scrapes subreddit data | ✅ Active |
| **UserScraper** | scrapers/user.py | Enriches user profiles | ⚠️ Basic only |
| **BatchWriter** | core/database/ | Manages DB writes | ✅ Fixed order |
| **ProxyManager** | core/config/ | 3 proxy rotation | ✅ Active |
| **APIPool** | core/clients/ | 9 Reddit API clients | ✅ Active |

---

## 🔍 MONITORING QUERIES

### Data Quality Checks
```sql
-- Foreign key violations (should be 0)
SELECT p.subreddit_name, COUNT(*) as orphaned_posts
FROM reddit_posts p
LEFT JOIN reddit_subreddits s ON p.subreddit_name = s.name
WHERE s.name IS NULL
GROUP BY p.subreddit_name
ORDER BY orphaned_posts DESC;

-- Mixed-case subreddit names (need normalization)
SELECT name, COUNT(*) as post_count
FROM reddit_subreddits
WHERE name != LOWER(name)
ORDER BY post_count DESC
LIMIT 20;

-- Duplicate posts
SELECT reddit_id, COUNT(*) as duplicate_count
FROM reddit_posts
GROUP BY reddit_id
HAVING COUNT(*) > 1;
```

### Discovery Pipeline
```sql
-- New subreddits discovered today
SELECT
  name,
  subscribers,
  CASE
    WHEN review IS NULL THEN 'Pending Review'
    ELSE review
  END as status,
  created_at
FROM reddit_subreddits
WHERE created_at > CURRENT_DATE
ORDER BY subscribers DESC
LIMIT 50;

-- Discovery rate by hour
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as new_subreddits,
  AVG(subscribers) as avg_subscribers
FROM reddit_subreddits
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND review IS NULL
GROUP BY 1
ORDER BY 1 DESC;

-- User enrichment status
SELECT
  COUNT(*) FILTER (WHERE link_karma IS NOT NULL) as enriched_users,
  COUNT(*) FILTER (WHERE link_karma IS NULL) as basic_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE link_karma IS NOT NULL) / COUNT(*), 1) as enrichment_rate
FROM reddit_users
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Scraper Health
```sql
-- Memory usage over time
SELECT
  timestamp,
  (context->>'memory_mb')::INT as memory_mb,
  message
FROM system_logs
WHERE source = 'reddit_scraper'
  AND context->>'memory_mb' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- API rate limit status
SELECT
  timestamp,
  context->>'remaining' as requests_remaining,
  context->>'reset_time' as reset_at
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%rate limit%'
  AND timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC
LIMIT 5;

-- Thread performance
SELECT
  context->>'thread_id' as thread,
  COUNT(*) as subreddits_processed,
  AVG((context->>'processing_time')::NUMERIC) as avg_time_seconds
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Successfully scraped%'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY 1
ORDER BY 2 DESC;
```

---

## 🚨 TROUBLESHOOTING GUIDE

### Common Issues & Solutions

#### Issue: 0 Weekly Posts
**Status**: ✅ FIXED in v2.2.0
```sql
-- Check if still occurring
SELECT COUNT(*) as affected_scrapes
FROM system_logs
WHERE message LIKE '%0 weekly%'
  AND timestamp > NOW() - INTERVAL '1 hour';
```
**Root Cause**: Was looking for 'weekly_posts' instead of 'top_posts'
**Fix Applied**: Changed key in main.py lines 1199 and 1164

#### Issue: Foreign Key Violations
**Status**: ⚠️ PARTIALLY FIXED
```sql
-- Check current violations
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as fk_errors,
  context->>'error' as error_sample
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%foreign key%'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY 1, 3
ORDER BY 1 DESC;
```
**Fix**: Normalize existing data
```sql
-- One-time fix for existing mixed-case names
UPDATE reddit_subreddits
SET name = LOWER(name)
WHERE name != LOWER(name);
```

#### Issue: Scraper Not Starting
```sql
-- Debug checklist
SELECT
  enabled,
  status,
  pid,
  last_heartbeat,
  CASE
    WHEN last_heartbeat < NOW() - INTERVAL '5 minutes' THEN 'Stale/Dead'
    WHEN enabled = false THEN 'Disabled'
    WHEN pid IS NULL THEN 'Not running'
    ELSE 'Should be running'
  END as diagnosis
FROM system_control
WHERE script_name = 'reddit_scraper';
```
**Solutions**:
1. Check Render logs: `https://dashboard.render.com/`
2. Clear stale PID: `UPDATE system_control SET pid = NULL WHERE script_name = 'reddit_scraper';`
3. Restart: Use start command above

#### Issue: High Memory Usage
```sql
-- Check memory trend
SELECT
  DATE_TRUNC('minute', timestamp) as minute,
  MAX((context->>'memory_mb')::INT) as peak_memory_mb
FROM system_logs
WHERE source = 'reddit_scraper'
  AND context->>'memory_mb' IS NOT NULL
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY 1
ORDER BY 1 DESC;
```
**Solutions**:
1. Reduce batch_size in config
2. Restart scraper to clear memory
3. Check for memory leaks in logs

---

## 📊 PERFORMANCE BENCHMARKS

### Current vs Target Performance
| Metric | Target | Current | Status | Action |
|--------|--------|---------|--------|--------|
| **Subreddits/hour** | 300 | ~250 | 🟡 | Optimize batch size |
| **Posts/hour** | 45,000 | ~37,500 | 🟡 | Within acceptable range |
| **Weekly posts** | 100% | 100% | ✅ | Fixed |
| **FK violations/hour** | 0 | 2-3 | 🟡 | Run normalization |
| **Discovery rate** | 100/hr | ~50/hr | 🟡 | Enhance user enrichment |
| **Memory usage** | <500MB | ~300MB | ✅ | Good |
| **Uptime** | 99% | ~95% | 🟡 | Monitor crashes |

### Processing Capacity
- **Batch Size**: 10 subreddits (configurable)
- **Parallel Threads**: 9
- **Posts per Subreddit**: ~160 (30 hot + 30 weekly + 100 yearly)
- **Delay Between Batches**: 30 seconds (configurable)
- **Daily Capacity**: ~7,200 subreddits @ current speed

---

## 🔄 RECENT CHANGES & STATUS

### ✅ FIXED (Sep 28, 2025)
- **Weekly posts showing 0**: Changed 'weekly_posts' to 'top_posts' key
- **Foreign key violations**: Added lowercase normalization throughout
- **Write order issues**: Enforced Subreddits → Users → Posts
- **Batch writer**: Fixed flush order to prevent FK violations

### ⚠️ KNOWN ISSUES
- **Mixed-case in database**: ~500 subreddits need lowercase normalization
- **User enrichment limited**: Only basic profile data collected
- **Discovery not optimal**: Could discover more with better user analysis
- **Documentation outdated**: v3.0 described but v2.2.0 running

### 🚧 IN PROGRESS
- Implementing full user profile enrichment
- Optimizing discovery pipeline
- Adding checkpoint/resume capability

---

## 🛠️ CONFIGURATION REFERENCE

### Current Settings
```sql
-- View all settings
SELECT
  enabled,
  status,
  config,
  last_heartbeat,
  updated_at
FROM system_control
WHERE script_name = 'reddit_scraper';
```

### Configurable Parameters
| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| **batch_size** | 10 | 5-50 | Subreddits per batch |
| **delay_between_batches** | 30 | 10-300 | Seconds between batches |
| **max_daily_requests** | 10000 | 1000-50000 | API rate limit |
| **user_enrichment_enabled** | true | true/false | Enrich user profiles |
| **discovery_enabled** | true | true/false | Find new subreddits |

---

## 🚨 EMERGENCY PROCEDURES

### Scraper Stuck/Frozen
```bash
# 1. Check if truly frozen
curl "https://b9-dashboard.onrender.com/api/scraper/status"

# 2. Force kill if needed
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/force-kill"

# 3. Clear database state
psql -c "UPDATE system_control SET pid = NULL, status = 'stopped' WHERE script_name = 'reddit_scraper';"

# 4. Restart
curl -X POST "https://b9-dashboard.onrender.com/api/scraper/start"
```

### Database Overload
```sql
-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Emergency: Archive old posts
INSERT INTO reddit_posts_archive
SELECT * FROM reddit_posts
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM reddit_posts
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Proxy Failures
```sql
-- Check proxy errors
SELECT
  timestamp,
  context->>'proxy' as proxy_name,
  message
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%proxy%'
  AND level = 'error'
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

---

## 📋 QUICK REFERENCE

### Key Database Constraints
- **reddit_subreddits.name**: PRIMARY KEY, must be lowercase
- **reddit_posts.subreddit_name**: FOREIGN KEY to subreddits.name
- **reddit_posts.reddit_id**: UNIQUE constraint
- **reddit_users.username**: UNIQUE constraint
- **Write Order**: ALWAYS Subreddits → Users → Posts

### Important Files
| File | Location | Purpose |
|------|----------|---------|
| continuous.py | /api/scrapers/reddit/ | Main loop |
| main.py | /api/scrapers/reddit/ | Core orchestrator |
| subreddit.py | /api/scrapers/reddit/scrapers/ | Subreddit scraper |
| user.py | /api/scrapers/reddit/scrapers/ | User scraper |
| batch_writer.py | /api/core/database/ | Database writer |

### API Rate Limits
- **Reddit**: 100 requests/minute per account
- **Total Pool**: 900 req/min (9 accounts)
- **Safety Margin**: 70% utilization = 630 req/min
- **Proxy Limits**: Varies by provider

---

## 📞 SUPPORT & LOGS

### View Logs
- **Render Dashboard**: https://dashboard.render.com/
- **Database Logs**: Query `system_logs` table
- **API Logs**: `/api/scraper/logs` endpoint

### Key Log Patterns
```sql
-- Success patterns
SELECT COUNT(*) FROM system_logs
WHERE message LIKE '%Successfully scraped%'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Error patterns
SELECT message, COUNT(*)
FROM system_logs
WHERE level = 'error'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY message
ORDER BY COUNT(*) DESC;
```

---

*Last Updated: September 28, 2025*
*Version: 2.2.0 (Production)*
*Status: 🟢 OPERATIONAL*