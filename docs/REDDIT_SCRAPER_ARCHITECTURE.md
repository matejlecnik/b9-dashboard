# Reddit Scraper v3.0 Architecture

┌─ SCRAPER STATUS ────────────────────────────────────────┐
│ ● PRODUCTION  │ ████████████████████ 100% DEPLOYED     │
└─────────────────────────────────────────────────────────┘

```
                    REDDIT SCRAPER v3.0 - SIMPLIFIED ARCHITECTURE
                    ================================================

┌──────────────────────────────────────────────────────────────────────────┐
│                             ENTRY POINT                                   │
│                        continuous_v3.py (Loop)                           │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         CONTROL LAYER                                     │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Supabase     │───▶│ System       │───▶│ Heartbeat    │              │
│  │ Control      │    │ Control      │    │ Monitor      │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│        │                    │                    │                       │
│        └────────────────────┴────────────────────┘                       │
│                             │                                            │
│                    Check every 30s                                       │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      MAIN SCRAPER ENGINE                                  │
│                        simple_main.py                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     INITIALIZATION                               │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │ • ProxyManager.load_proxies()                                  │    │
│  │ • ThreadSafeAPIPool.initialize()                               │    │
│  │ • MetricsCalculator()                                          │    │
│  │ • Load skip lists from DB                                      │    │
│  │ • Reset stats for new cycle                                    │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SCRAPING WORKFLOW                            │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  1. GET SUBREDDITS          2. PROCESS BATCH                  │    │
│  │     ↓                           ↓                             │    │
│  │  ┌──────────┐              ┌──────────┐                      │    │
│  │  │ Database │              │ ThreadEx │                      │    │
│  │  │  Query   │──────────────│  ecutor  │                      │    │
│  │  └──────────┘              └──────────┘                      │    │
│  │       │                         │                             │    │
│  │       ▼                         ▼                             │    │
│  │  ┌──────────┐              ┌──────────┐                      │    │
│  │  │ Filter & │              │ API Pool │                      │    │
│  │  │  Sort    │              │ (Reddit) │                      │    │
│  │  └──────────┘              └──────────┘                      │    │
│  │       │                         │                             │    │
│  │       ▼                         ▼                             │    │
│  │  ┌──────────────────────────────┐                           │    │
│  │  │   PARALLEL PROCESSING        │                           │    │
│  │  │  • Scrape subreddit posts    │                           │    │
│  │  │  • Discover new subreddits   │                           │    │
│  │  │  • Scrape user profiles      │                           │    │
│  │  │  • Calculate metrics         │                           │    │
│  │  └──────────────────────────────┘                           │    │
│  │                                                                 │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ERROR RECOVERY                               │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │ • Retry with exponential backoff (3 attempts)                  │    │
│  │ • Consecutive error tracking (threshold: 10)                   │    │
│  │ • Graceful degradation on failures                             │    │
│  │ • Memory cleanup every cycle                                   │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Supabase    │    │  Batch       │    │  System      │              │
│  │  REST API    │◀───│  Writer      │───▶│  Logs        │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│         │                    │                    │                       │
│  ┌──────────────────────────────────────────────────┐                   │
│  │              DATABASE TABLES                      │                   │
│  ├──────────────────────────────────────────────────┤                   │
│  │ • reddit_subreddits (10,619 records)            │                   │
│  │ • reddit_users (298,999 records)                │                   │
│  │ • reddit_posts (1.76M records)                  │                   │
│  │ • reddit_proxies (proxy management)             │                   │
│  │ • system_control (scraper state)                │                   │
│  │ • system_logs (51,218 records)                  │                   │
│  └──────────────────────────────────────────────────┘                   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      SUPPORT MODULES                                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ ProxyManager │    │ APIPool      │    │ Metrics      │              │
│  │              │    │              │    │ Calculator   │              │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤              │
│  │• Load proxies│    │• Thread safe │    │• Growth rate │              │
│  │• Rotate IPs  │    │• Rate limit  │    │• Engagement  │              │
│  │• Track usage │    │• Retry logic │    │• Posting freq│              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Details

```json
{
  "continuous_v3.py": {
    "purpose": "Entry point and orchestrator",
    "responsibilities": [
      "Monitor Supabase control flags",
      "Manage scraping cycles",
      "Update heartbeat every 30s",
      "Handle graceful shutdown"
    ],
    "error_handling": "Logs to system_logs, continues on errors"
  },

  "simple_main.py": {
    "purpose": "Core scraping logic",
    "critical_fixes_applied": {
      "datetime_timezone": "Fixed offset-naive/aware comparison at line 287",
      "stats_reset": "Added reset_stats() to prevent accumulation",
      "memory_cleanup": "Added cleanup_memory() to prevent leaks",
      "error_recovery": "Added api_call_with_retry() with exponential backoff"
    },
    "responsibilities": [
      "Scrape subreddits in batches",
      "Process users and posts",
      "Calculate engagement metrics",
      "Write to Supabase"
    ]
  },

  "proxy_manager.py": {
    "purpose": "Proxy rotation and management",
    "key_methods": {
      "load_proxies()": "Load from database (NOT initialize())",
      "get_proxy()": "Return next available proxy",
      "mark_failed()": "Track failed proxies"
    }
  },

  "api_pool.py": {
    "purpose": "Thread-safe Reddit API management",
    "features": [
      "Connection pooling",
      "Rate limiting",
      "Automatic retry",
      "Load balancing"
    ]
  }
}
```

## Data Flow

```json
{
  "cycle_workflow": [
    {"step": 1, "action": "Check system_control.enabled", "interval": "30s"},
    {"step": 2, "action": "Reset stats for new cycle", "critical": true},
    {"step": 3, "action": "Get subreddits batch (100)", "source": "database"},
    {"step": 4, "action": "Filter by category and last_scraped", "filters": ["Ok", "No Seller"]},
    {"step": 5, "action": "Execute parallel scraping", "threads": 5},
    {"step": 6, "action": "Process discovered subreddits", "dedup": true},
    {"step": 7, "action": "Scrape user profiles", "batch": 50},
    {"step": 8, "action": "Calculate metrics", "async": true},
    {"step": 9, "action": "Write to database", "batch": true},
    {"step": 10, "action": "Clean memory", "critical": true},
    {"step": 11, "action": "Log cycle completion", "destination": "system_logs"}
  ]
}
```

## Performance Metrics

```json
{
  "processing_rates": {
    "subreddits_per_cycle": 100,
    "users_per_batch": 50,
    "posts_per_subreddit": "25-100",
    "cycle_duration": "60-180s",
    "memory_usage": "400-600MB"
  },
  "optimization": {
    "threading": "5 workers",
    "batch_writes": 100,
    "connection_pool": 20,
    "memory_cleanup": "every cycle",
    "proxy_rotation": "automatic"
  }
}
```

## Error Recovery Strategy

```json
{
  "retry_policy": {
    "max_attempts": 3,
    "backoff": "exponential",
    "initial_delay": 5,
    "max_delay": 30
  },
  "failure_modes": {
    "api_timeout": "Retry with different proxy",
    "rate_limit": "Back off and retry",
    "database_error": "Log and continue",
    "memory_pressure": "Trigger cleanup",
    "consecutive_errors": "Stop after 10"
  },
  "recovery_actions": {
    "stats_reset": "Every cycle start",
    "memory_cleanup": "Every cycle end",
    "proxy_rotation": "On failure",
    "error_logging": "To system_logs"
  }
}
```

## Critical Bugs Fixed

| BUG | LOCATION | FIX | IMPACT |
|-----|----------|-----|--------|
| Datetime timezone mismatch | line 287 | Handle both aware/naive timestamps | Prevented cycle failures |
| Stats accumulation | run_scraping_cycle | Added reset_stats() | Accurate metrics |
| Memory leak | processed_subreddits | Added cleanup_memory() | Stable memory usage |
| No error recovery | API calls | Added api_call_with_retry() | Improved reliability |
| Wrong proxy method | line 132 | load_proxies() not initialize() | Fixed initialization |

## Monitoring Points

```json
{
  "health_checks": [
    {"metric": "heartbeat", "table": "system_control", "interval": "30s"},
    {"metric": "cycle_count", "location": "continuous_v3", "type": "counter"},
    {"metric": "errors", "table": "system_logs", "alert_threshold": 10},
    {"metric": "memory_usage", "method": "cleanup_memory", "threshold": "1GB"},
    {"metric": "processing_rate", "calculation": "posts/minute", "minimum": 100}
  ]
}
```

## Deployment Configuration

```json
{
  "environment": "Docker",
  "platform": "Render.com",
  "resources": {
    "cpu": "1 vCPU",
    "memory": "2GB",
    "disk": "10GB"
  },
  "environment_variables": [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "REDDIT_CLIENT_ID",
    "REDDIT_CLIENT_SECRET",
    "REDDIT_USER_AGENT"
  ],
  "startup_command": "python app/scrapers/reddit/continuous_v3.py"
}
```

## Future Improvements

```json
{
  "planned": [
    {"feature": "Smart scheduling", "benefit": "Optimize scraping times"},
    {"feature": "ML categorization", "benefit": "Better subreddit filtering"},
    {"feature": "Distributed scraping", "benefit": "Horizontal scaling"},
    {"feature": "Real-time monitoring", "benefit": "Faster issue detection"}
  ]
}
```

---

_Architecture Version: 3.0 | Status: Production | Updated: 2025-01-29_
_Navigate: [← docs/](README.md) | [→ api-render/](../api-render/README.md)_