# 🤖 Reddit Scraper v2.0 - System Dashboard & Documentation

## 📊 DASHBOARD - Current Status

### 🚦 System Status
```yaml
Status: 🟢 OPERATIONAL
Version: 2.0.0
Environment: Production (Render)
Database: Supabase PostgreSQL
Log Source: reddit_scraper
```

### 📈 Key Metrics (Live)
```yaml
Total Subreddits: 5,819
OK Subreddits: 500+
No Seller Subreddits: ~1,000
Pending Review: 3,000+
Posts Collected: 500,000+
Users Analyzed: 50,000+
```

### 🔄 Last Run Information
```yaml
Last Started: Check system_logs table
Last Completed: Check system_logs table
Subreddits Processed: Check latest stats
Posts Collected: Check latest stats
Discoveries Made: Check latest stats
Errors: Check error logs
```

### ⚙️ Configuration Status
```yaml
Proxy Accounts: 10 Reddit accounts
Threads: Based on proxy count
Rate Limit: 100 req/min per account
Cache TTL: 1 hour
Batch Size: 50 records
Memory Warning: 75%
Memory Critical: 90%
```

---

## 📋 TODO & Issues Tracker

### ✅ Recently Completed (Phase 2)
- [x] Fixed duplicate imports in main.py
- [x] Removed duplicate method definitions
- [x] Fixed Supabase query syntax (desc=True → .desc)
- [x] Standardized logging source to 'reddit_scraper'
- [x] Integrated all calculator classes properly
- [x] Fixed cache unbounded growth with LRU eviction
- [x] Added environment variable overrides for all configs
- [x] Increased discovery limit to 100k subreddits
- [x] Removed user activity criteria - now discovers ALL subreddits from users
- [x] Changed scoring: SFW subreddits now get 20% boost (was No Seller penalty)
- [x] Preserved manual categorization fields: review, primary_category, tags
- [x] Posts now inherit categorization from their subreddit

### 🔧 Current TODOs
- [ ] Monitor proxy health - some may be failing
- [ ] Optimize memory usage for large batches (especially with 100k discovery limit)
- [ ] Add retry logic for failed Supabase writes
- [ ] Implement checkpoint/resume functionality
- [ ] Add metrics dashboard in Supabase
- [ ] Create alerting for critical errors
- [ ] Add pagination for discovery mode to handle 100k limit efficiently

### 🐛 Known Issues
1. **Proxy Validation**: All proxies must pass validation or scraper won't start
2. **Memory Usage**: Can grow large with 100k discovery limit - needs batch processing
3. **Rate Limiting**: Hitting Reddit limits occasionally
4. **Discovery Scale**: Now processing up to 100k pending subreddits (was 500)

### 💡 Potential Improvements (DO NOT IMPLEMENT WITHOUT ASKING)
- Parallel discovery mode processing
- Smarter subreddit prioritization
- Auto-categorization using ML
- Real-time progress dashboard
- Webhook notifications for discoveries
- Historical trend analysis

---

## 🏗️ System Architecture

### 🎯 Entry Points & Orchestration Path

```
1. continuous.py (ENTRY POINT - Runs Forever)
   ↓
2. main.py/RedditScraperV2 (Orchestrator)
   ↓
3. Individual Scrapers (Workers)
   ↓
4. Core Infrastructure (Support)
```

### 📊 Complete Dependency Tree

```yaml
continuous.py (Continuous Runner with Remote Control)
│
├── Checks system_control table every 30 seconds
├── Runs RedditScraperV2 in cycles
└── Logs everything to system_logs (source: 'reddit_scraper')
    │
    └── main.py/RedditScraperV2 (Main Orchestrator)
        │
        ├── PHASES:
        │   ├── Phase 1: Process OK (up to 10k) & No Seller (up to 500) Subreddits
        │   ├── Phase 2: Analyze Users from OK Subreddits
        │   └── Phase 3: Discovery Mode (up to 100k pending subreddits)
        │
        ├── SCRAPERS:
        │   ├── SubredditScraper (scrapers/subreddit.py)
        │   │   ├── Fetches hot/top/yearly posts
        │   │   ├── Extracts subreddit metadata
        │   │   └── Calculates engagement metrics
        │   │
        │   ├── UserScraper (scrapers/user.py)
        │   │   ├── Analyzes user quality (0-100 score)
        │   │   ├── Discovers ALL subreddits where user posts
        │   │   └── No activity filtering - processes everything
        │   │
        │   └── BaseScraper (scrapers/base.py)
        │       └── Abstract base with shared functionality
        │
        └── INFRASTRUCTURE:
            ├── API Management:
            │   ├── ThreadSafeAPIPool (10 Reddit accounts)
            │   └── ProxyManager (Proxy rotation & health)
            │
            ├── Data Processing:
            │   ├── BatchWriter (50 records/batch)
            │   ├── AsyncCacheManager (1hr TTL, 100K limit)
            │   └── TTLCache (LRU eviction)
            │
            ├── Configuration:
            │   ├── ScraperConfig (60+ settings)
            │   └── Environment variable overrides
            │
            ├── Monitoring:
            │   ├── MemoryMonitor (75% warning, 90% critical)
            │   ├── DatabaseRateLimiter (10 SELECT/s, 5 INSERT/s)
            │   └── SupabaseLogHandler (system_logs table)
            │
            └── Calculators:
                ├── MetricsCalculator (Subreddit scores)
                ├── UserQualityCalculator (User scoring)
                └── RequirementsCalculator (Min requirements)
```

### 🔄 Execution Flow

```
START → continuous.py
         │
         ├── Initialize components
         ├── Load proxies & validate
         ├── Check control signal
         │
         └── LOOP: While enabled
             │
             ├── PHASE 1: Subreddits
             │   ├── Load OK & No Seller lists
             │   ├── Distribute across threads
             │   ├── Scrape posts & metadata
             │   └── Calculate scores (+20% for SFW content)
             │
             ├── PHASE 2: Users
             │   ├── Process users from OK subreddits
             │   ├── Calculate quality scores
             │   └── Discover ALL subreddits (no filtering)
             │
             ├── PHASE 3: Discovery
             │   ├── Process pending subreddits
             │   ├── Auto-categorize obvious ones
             │   └── Save for manual review
             │
             └── CLEANUP
                 ├── Flush batch writers
                 ├── Log statistics
                 └── Check memory usage
```

### 📦 Data Flow Pipeline

```
Reddit API → Proxy Layer → API Pool → Scraper → Cache → Batch Writer → Supabase
                ↑                         ↓
           Rate Limiter            Memory Monitor
```

---

## 🚀 Quick Start Guide

### Starting the Scraper
```bash
# The scraper runs on Render automatically
# To start manually (if needed):
cd /app/api/scrapers/reddit
python3 continuous.py

# Or via API endpoint:
curl -X POST https://b9-dashboard.onrender.com/api/scraper/control \
  -d '{"action": "start"}'
```

### Stopping the Scraper
```sql
-- Via Supabase Dashboard:
UPDATE system_control
SET should_continue = false
WHERE process = 'reddit_scraper';

-- Or via API:
curl -X POST https://b9-dashboard.onrender.com/api/scraper/control \
  -d '{"action": "stop"}'
```

### Monitoring Progress
```sql
-- Check latest logs:
SELECT * FROM system_logs
WHERE source = 'reddit_scraper'
ORDER BY timestamp DESC
LIMIT 10;

-- Check scraping stats:
SELECT * FROM system_logs
WHERE source = 'reddit_scraper'
  AND level = 'success'
  AND message LIKE '%Scraping cycle completed%'
ORDER BY timestamp DESC
LIMIT 1;
```

---

## ⚙️ Configuration

### Key Environment Variables
```bash
# Supabase (Required)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx

# Reddit API (10 accounts required)
REDDIT_CLIENT_ID_1=xxx
REDDIT_CLIENT_SECRET_1=xxx
REDDIT_USERNAME_1=xxx
REDDIT_PASSWORD_1=xxx
# ... repeat for accounts 2-10

# Proxies (Must all be working)
PROXY_URL_1=http://proxy1.com:port
PROXY_USERNAME_1=xxx
PROXY_PASSWORD_1=xxx
# ... repeat for all proxies

# Optional Overrides
REDDIT_SCRAPER_MIN_DELAY=2.0
REDDIT_SCRAPER_MAX_DELAY=5.0
REDDIT_SCRAPER_BATCH_SIZE=1000
REDDIT_SCRAPER_MAX_SUBREDDITS=10000
REDDIT_SCRAPER_NO_SELLER_LIMIT=500
REDDIT_SCRAPER_DISCOVERY_LIMIT=100000
REDDIT_SCRAPER_MEMORY_WARNING_THRESHOLD=0.75
```

### Rate Limits
- **Reddit**: 100 requests/minute per account (1000/min total)
- **Database**: 10 SELECT/s, 5 INSERT/s, 5 UPDATE/s
- **Batch Writing**: 50 records per batch, flush every 30s
- **Cache**: 100,000 items max, 1 hour TTL

---

## 🔧 Troubleshooting

### Common Issues & Fixes

#### "Proxy validation failed"
```bash
# All proxies must be working
# Check proxy credentials and connectivity
# Verify proxy URLs are correct
```

#### "Memory usage critical"
```bash
# Reduce batch sizes
# Lower max_subreddits limit
# Restart scraper to clear memory
```

#### "Rate limit exceeded"
```bash
# Check if accounts are suspended
# Verify proxy rotation is working
# Increase delays between requests
```

#### "Database write failed"
```bash
# Check Supabase connection
# Verify service key is valid
# Check if tables exist
```

### Log Locations
- **System Logs**: Supabase `system_logs` table
- **Error Details**: Check `context` field in logs
- **Render Logs**: https://dashboard.render.com/

### Debug Commands
```python
# Check scraper status
from scrapers.reddit.main import RedditScraperV2
scraper = RedditScraperV2()
print(scraper.stats)

# Test proxy connection
from core.config.proxy_manager import ProxyManager
pm = ProxyManager(supabase_client)
await pm.validate_proxy(proxy_config)

# Check cache status
from core.cache.cache_manager import AsyncCacheManager
cache = AsyncCacheManager()
print(cache.get_stats())
```

---

## 📚 Component Documentation

### Core Scrapers
- **continuous.py**: Runs forever, checks control signals
- **main.py**: Orchestrates all scraping phases
- **subreddit.py**: Scrapes subreddit data and posts
- **user.py**: Analyzes users and discovers subreddits
- **base.py**: Abstract base class with shared logic

### Infrastructure
- **api_pool.py**: Manages 10 Reddit API clients
- **proxy_manager.py**: Rotates proxies and tracks health
- **batch_writer.py**: Batches database writes
- **cache_manager.py**: TTL-based caching with LRU
- **rate_limiter.py**: Database operation throttling
- **memory_monitor.py**: Tracks and manages memory

### Processors
- **calculator.py**: Contains all scoring algorithms
  - MetricsCalculator: Subreddit engagement scores
  - UserQualityCalculator: User quality (0-100)
  - RequirementsCalculator: Min karma/age requirements

---

## 📊 Database Tables Used

```sql
-- Main tables
reddit_subreddits  -- Subreddit data and scores
reddit_posts       -- Post data from subreddits
reddit_users       -- User profiles and scores
reddit_discoveries -- Newly discovered subreddits

-- Control tables
system_control     -- Start/stop signals
system_logs        -- All logging (source='reddit_scraper')

-- Analysis tables
reddit_subreddit_requirements  -- Min requirements per subreddit
reddit_user_activity           -- User posting patterns
```

---

## 🔒 Important: Field Preservation

### Protected Subreddit Fields (Never Overwritten)
These manual categorization fields are **PRESERVED** during updates:
- **`review`** - Manual review status (Ok, No Seller, Non Related, etc.)
- **`primary_category`** - Manual category assignment
- **`tags`** - Manual tags for filtering/grouping

### Post Field Inheritance
Posts automatically inherit these fields from their subreddit:
- **`sub_primary_category`** ← from subreddit's `primary_category`
- **`sub_tags`** ← from subreddit's `tags`
- **`sub_over18`** ← from subreddit's `over18`

This ensures manual categorizations are never lost and posts always reflect their subreddit's current categorization.

## 🔒 Security & Best Practices

1. **Never commit credentials** - Use environment variables
2. **All proxies must work** - Scraper won't start otherwise
3. **Respect rate limits** - Avoid account suspensions
4. **Monitor memory usage** - Can grow large with many subreddits
5. **Check logs regularly** - Early detection of issues
6. **Don't modify without testing** - System is fragile
7. **Manual categorizations are sacred** - Never overwrite review, primary_category, or tags

---

## 📝 Version History

- **v2.0.0** (Current) - Modular architecture with remote control
- **v1.0.0** - Original monolithic scraper (deprecated)

---

## 🤝 Support

- **Logs**: Check `system_logs` table for 'reddit_scraper' source
- **Monitoring**: Render dashboard for deployment status
- **Database**: Supabase dashboard for data inspection

---

*Last Updated: Phase 2 Complete - Configuration, Exceptions, Validation*
*System Status: 🟢 Operational*