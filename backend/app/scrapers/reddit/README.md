# Reddit Scraper v3.5.0

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PRODUCTION │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "backend/app/scrapers/reddit/README.md",
  "parent": "backend/app/scrapers/reddit/README.md"
}
```

## Overview

┌─ SCRAPER STATUS ────────────────────────────────────────┐
│ ✅ PRODUCTION │ ████████████████████ 100% OPERATIONAL  │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../../README.md",
  "current": "app/scrapers/reddit/README.md",
  "files": [
    {"path": "reddit_controller.py", "desc": "Process supervisor", "status": "ACTIVE"},
    {"path": "reddit_scraper.py", "desc": "Main scraper v3.5.0", "status": "PRODUCTION"},
    {"path": "public_reddit_api.py", "desc": "HTTP client", "status": "PRODUCTION"},
    {"path": "proxy_manager.py", "desc": "Proxy rotation", "status": "ACTIVE"},
    {"path": "ARCHITECTURE.md", "desc": "System architecture", "status": "REFERENCE"},
    {"path": "archive/PLAN_v3.1.0.md", "desc": "Historical plan", "status": "ARCHIVED"}
  ]
}
```

## Current State

```json
{
  "status": "PRODUCTION",
  "version": "v3.5.0",
  "deployed": "2025-10-01",
  "stability": "STABLE",
  "deployment": "Hetzner Cloud (runs on API server, not distributed)",
  "architecture": "Public Reddit JSON API with proxy rotation",
  "features": {
    "immediate_discovery": "Processes discovered subreddits after each Ok subreddit",
    "public_reddit_api": "No authentication, uses proxy rotation",
    "async_processing": "AsyncIO with concurrent API requests",
    "user_discovery": "Fetches 30 posts per user to discover crossposting patterns",
    "metrics_tracking": "Scores, engagement, subscriber counts",
    "null_review_discovery": "Auto-discovers new subreddits with NULL review status",
    "null_review_cache": "Prevents re-processing of NULL review subreddits during discovery"
  },
  "performance": {
    "avg_subreddit_time": "8-10 seconds",
    "error_rate": "<2%",
    "proxies": "3 working (BeyondProxy, RapidProxy, NyronProxy)",
    "api_latency": "1-3 seconds per request"
  }
}
```

## Architecture Components

```json
{
  "reddit_controller.py": {
    "version": "v2.0.0",
    "role": "Process supervisor",
    "responsibilities": [
      "Check database enabled flag every 30s",
      "Start/stop scraper process",
      "Update heartbeat for monitoring"
    ],
    "lines": 164
  },
  "reddit_scraper.py": {
    "version": "v3.5.0",
    "role": "Main scraper logic",
    "responsibilities": [
      "Process Ok subreddits sequentially",
      "Fetch subreddit metadata, posts, rules",
      "Discover new subreddits from user post history",
      "Calculate engagement metrics and scores",
      "Immediate discovery processing (not batch)"
    ],
    "lines": 450
  },
  "public_reddit_api.py": {
    "role": "HTTP client with retry logic",
    "features": [
      "Async HTTP requests via aiohttp",
      "3-retry logic with exponential backoff",
      "Proxy rotation support",
      "User agent randomization",
      "Error handling (404, 403, 429)"
    ],
    "lines": 283
  },
  "proxy_manager.py": {
    "role": "Proxy rotation and health checks",
    "features": [
      "Load proxies from Supabase",
      "Test proxy connectivity",
      "Round-robin rotation",
      "Generate random user agents"
    ]
  }
}
```

## Version History

### v3.6.2 (2025-10-02) - Critical Bugfix ✅
- **Bug**: Auto-categorization could overwrite manual review classifications
- **Issue**: Line 1132 used ternary operator that prioritized auto_review over cached value
- **Fix**: Preserve existing review status, only apply auto-review to NEW subreddits (review=NULL)
- **Code**: reddit_scraper.py lines 1131-1139 (explicit NULL check with if/else)
- **Impact**: Prevents "Ok" subreddits from being downgraded to "Non Related" on re-processing
- **Protected**: All review statuses (Ok, Non Related, No Seller, User Feed, Banned)
- **Behavior**: Manual classifications are ALWAYS preserved, auto-categorization only applies to discoveries

### v3.4.5 (2025-10-01) - Performance + Auto-categorization ✅
- **Performance**: Removed yearly posts fetch (100 fewer API calls per subreddit)
- **API Optimization**: Changed from 5 to 4 endpoints (hot, top weekly, about, rules)
- **Speed**: ~30s faster per subreddit processing time
- **Auto-categorization**: Added 69 keywords across 10 categories
- **Categories**: hentai/anime, extreme fetishes, SFW-nudity, professional, hobby
- **Benefit**: 20-30% reduction in manual review workload
- **Implementation**: analyze_rules_for_review() method (78 lines)
- **Testing**: Verified with 10 subreddits, auto-filtered 40 Non-Related

### v3.4.4 (2025-09-30) - Immediate Discovery Processing ✅
- **Feature**: Changed discovery processing from batch to immediate
- **Implementation**: Discoveries processed after each Ok subreddit completes (not at end)
- **Code changes**: Modified reddit_scraper.py lines 127-181
- **Removed**: `all_discovered` accumulator pattern
- **Added**: Immediate filtering and processing loop within main subreddit loop
- **Verification**: 31 subreddits, 4,322 posts, 1,614 users in 20min test
- **Benefit**: Faster feedback, more incremental progress

### v3.4.0-v3.4.3 (2025-09-29) - Public Reddit API
- Public Reddit JSON API implementation (no authentication)
- Proxy rotation with health checks (3 proxies)
- User discovery from hot post authors (30 posts per user)
- NULL review auto-discovery mechanism
- Sequential user fetching with delays (10-50ms)

### v3.3.0 (2025-09-28) - Simplification
- Simplified username-only saving (removed threading)
- Protected field UPSERT fix (review, category, tags)
- Cache pagination improvements
- Error rate reduction: 30.5% → <2%

### v3.2.0 (2025-09-27) - Logging Enhancements
- Dual console + Supabase logging
- Skip aggregation (33+ logs → 1 summary)
- Progress updates every 10 subreddits
- 97% reduction in log spam

## Database Schema

```json
{
  "reddit_subreddits": {
    "key": "name (primary)",
    "fields": ["review", "subscribers", "over18", "created_utc", "description", "primary_category", "tags", "subreddit_score", "engagement", "last_scraped_at"],
    "protected": ["review", "primary_category", "tags"],
    "notes": "Protected fields only updated if NULL"
  },
  "reddit_posts": {
    "key": "reddit_id (primary)",
    "fields": ["subreddit_name", "author_username", "title", "selftext", "url", "ups", "num_comments", "created_utc", "scraped_at"],
    "foreign_keys": ["subreddit_name → reddit_subreddits.name"]
  },
  "reddit_users": {
    "key": "username (primary)",
    "fields": ["account_created_utc", "link_karma", "comment_karma", "has_verified_email", "is_gold", "is_mod", "account_age_days", "last_scraped_at"],
    "notes": "Minimal user metadata (no post tracking)"
  }
}
```

## Discovery Mechanism

```
Ok Subreddit → Fetch hot posts (limit=30)
              ↓
              Extract unique authors
              ↓
              Fetch 30 posts per author (sequential, 10-50ms delay)
              ↓
              Extract subreddits from user post history
              ↓
              Filter existing (Non Related, User Feed, Banned, Ok, No Seller)
              ↓
              NEW subreddits → Process immediately with full analysis
              ↓
              Mark as review=NULL or review='User Feed' (u_ prefix)
              ↓
              Continue to next Ok subreddit
```

**Key Change in v3.4.4**: Discoveries are processed **immediately** after each Ok subreddit completes, not batched at the end. This provides faster feedback and more incremental progress.

## Control & Monitoring

```json
{
  "control_table": "system_control",
  "script_name": "reddit_scraper",
  "enabled_flag": "Set false to stop scraper within 30s",
  "heartbeat": "last_heartbeat updated every cycle",
  "status": "running | stopped",
  "pid": "Process ID for monitoring"
}
```

### Start/Stop Commands

```bash
## Stop scraper (sets enabled=false in database)
python3 << 'EOF'
import os, sys
sys.path.insert(0, 'app')
from core.database.supabase_client import get_supabase_client
supabase = get_supabase_client()
supabase.table('system_control').update({'enabled': False}).eq('script_name', 'reddit_scraper').execute()
print("✅ Stop command sent")
EOF

## Start scraper (sets enabled=true in database)
## Similar script with {'enabled': True}

## View logs
tail -f app/scrapers/reddit/reddit_controller.log

## Check process
ps aux | grep reddit_controller
```

## Quick Reference

```bash
## Test single subreddit
curl -X POST "https://b9-dashboard.onrender.com/api/subreddits/fetch-single" \
  -H "Content-Type: application/json" \
  -d '{"subreddit_name": "test"}'

## View recent logs
tail -100 app/scrapers/reddit/reddit_controller.log

## Check database counts
psql -c "SELECT COUNT(*) FROM reddit_subreddits WHERE review='Ok'"
psql -c "SELECT COUNT(*) FROM reddit_posts WHERE scraped_at > NOW() - INTERVAL '1 hour'"
```

## Statistics

```json
{
  "database": {
    "total_subreddits": 13843,
    "total_posts": 1767640,
    "total_users": 303889
  },
  "scraper_coverage": {
    "Ok_subreddits": 2158,
    "No_Seller": 70,
    "Non_Related": 6780,
    "User_Feed": 2361,
    "Banned": 28
  }
}
```

---

_Reddit Scraper v3.4.5 | Status: Production | Last Updated: 2025-10-01_
_Navigate: [← scrapers/](../README.md) | [→ ARCHITECTURE.md](ARCHITECTURE.md)_

---

_Version: 1.0.0 | Updated: 2025-10-01_