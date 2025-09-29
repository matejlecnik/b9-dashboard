# Data Scrapers

┌─ SCRAPER STATUS ────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% ACTIVE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "scrapers/README.md",
  "subdirectories": [
    {"path": "reddit/", "desc": "Reddit scraping system", "status": "LOCKED"},
    {"path": "instagram/", "desc": "Instagram automation", "status": "ACTIVE"}
  ]
}
```

## Scraper Registry

```json
{
  "reddit": {
    "status": "LOCKED",
    "purpose": "Subreddit & user data collection",
    "controller": "reddit/continuous.py",
    "cycle_time": "30 minutes",
    "performance": {
      "subreddits_per_cycle": 100,
      "users_per_minute": 200,
      "success_rate": "98.5%",
      "daily_volume": 10000
    }
  },
  "instagram": {
    "status": "ACTIVE",
    "purpose": "Creator content tracking",
    "controller": "instagram/continuous.py",
    "cycle_time": "60 minutes",
    "performance": {
      "creators_tracked": 1247,
      "posts_per_hour": 500,
      "engagement_tracked": true,
      "viral_detection": true
    }
  }
}
```

## Directory Structure

```
scrapers/
├── /reddit/                # Reddit automation
│   ├── main.py            # RedditScraperV2 orchestrator
│   ├── continuous.py      # 24/7 controller
│   ├── /scrapers/         # Data collectors
│   │   ├── base.py       # Base class
│   │   ├── subreddit.py  # Subreddit scraper
│   │   └── user.py       # User scraper
│   ├── /processors/       # Data processing
│   │   └── calculator.py # Metrics engine
│   └── /tests/           # Test suite
│
└── /instagram/           # Instagram automation
    ├── continuous.py     # 24/7 controller
    └── /services/        # Business logic
```

## Scraper Architecture

```
┌─────────────────┐
│  Control Table  │◄── Supabase
└────────┬────────┘
         │ Checks every 30s
         ▼
┌─────────────────┐
│  Continuous.py  │◄── Main Controller
├─────────────────┤
│ • Health checks │
│ • Rate limiting │
│ • Error recovery│
└────────┬────────┘
         │ Orchestrates
         ▼
┌─────────────────┐
│  Main Scraper   │◄── Platform-specific
├─────────────────┤
│ • Data fetching │
│ • Processing    │
│ • Validation    │
└────────┬────────┘
         │ Writes
         ▼
┌─────────────────┐
│    Database     │◄── Supabase
└─────────────────┘
```

## Performance Metrics

```json
{
  "reddit_scraper": {
    "uptime": "99.8%",
    "avg_cycle_time": "28 minutes",
    "error_rate": "1.5%",
    "data_quality": "98%",
    "rate_limit_hits": "< 1%",
    "monthly_cost": "$0"
  },
  "instagram_scraper": {
    "uptime": "95%",
    "avg_cycle_time": "55 minutes",
    "error_rate": "5%",
    "data_freshness": "< 1 hour",
    "api_efficiency": "85%",
    "monthly_cost": "$0"
  }
}
```

## Control System

```json
{
  "control_mechanism": {
    "table": "scraper_control",
    "check_interval": "30 seconds",
    "states": {
      "enabled": "Run scraping cycle",
      "disabled": "Sleep and check",
      "maintenance": "Pause all operations"
    }
  },
  "health_monitoring": {
    "heartbeat": "Every 60 seconds",
    "metrics_logged": true,
    "alerts": "On failure",
    "auto_recovery": true
  }
}
```

## Rate Limiting

```json
{
  "reddit": {
    "requests_per_minute": 60,
    "burst_size": 100,
    "cooldown": "Progressive backoff",
    "429_handling": "Automatic retry"
  },
  "instagram": {
    "requests_per_hour": 200,
    "concurrent_workers": 5,
    "proxy_rotation": false,
    "session_management": true
  }
}
```

## Error Handling

```json
{
  "retry_strategy": {
    "max_attempts": 3,
    "backoff": "exponential",
    "initial_delay": "1s",
    "max_delay": "60s"
  },
  "error_types": {
    "RateLimitError": "Wait and retry",
    "NetworkError": "Immediate retry",
    "ValidationError": "Skip and log",
    "AuthError": "Alert and pause"
  },
  "recovery": {
    "automatic": true,
    "max_consecutive_failures": 5,
    "pause_on_critical": true
  }
}
```

## Usage Examples

```python
# Reddit scraper initialization
from app.scrapers.reddit import RedditScraperV2

scraper = RedditScraperV2()
await scraper.initialize()
await scraper.run_scraping_cycle()

# Instagram continuous operation
from app.scrapers.instagram import continuous

# Runs indefinitely, checking control table
await continuous.run_continuous_scraper()

# Manual control
from app.core.database import supabase_client

client = supabase_client.get_client()
client.table('scraper_control').update(
    {"is_running": True}
).eq("scraper_name", "reddit").execute()
```

## Recent Improvements

```json
{
  "completed": [
    {"date": "2025-01-27", "fix": "Fixed FK constraint violations", "impact": "CRITICAL"},
    {"date": "2025-01-27", "fix": "Weekly posts now included", "impact": "HIGH"},
    {"date": "2025-01-27", "fix": "Memory leak prevention", "impact": "HIGH"},
    {"date": "2025-01-26", "fix": "Rate limiter improvements", "impact": "MEDIUM"},
    {"date": "2025-01-26", "fix": "Error recovery enhanced", "impact": "MEDIUM"}
  ]
}
```

## Testing

```bash
# Test Reddit scraper
pytest app/scrapers/reddit/tests/

# Test Instagram scraper
pytest app/scrapers/instagram/tests/

# Integration tests
pytest app/scrapers/ --integration

# Performance benchmarks
pytest app/scrapers/ --benchmark
```

## Future Roadmap

```json
{
  "planned": [
    {"feature": "TikTok scraper", "priority": "HIGH", "eta": "2024-02-15"},
    {"feature": "Twitter/X integration", "priority": "MEDIUM", "eta": "2024-03-01"},
    {"feature": "Unified scraper base", "priority": "HIGH", "eta": "2024-02-01"},
    {"feature": "ML-based scheduling", "priority": "LOW", "eta": "2024-04-01"}
  ],
  "in_progress": [
    {"feature": "Proxy rotation", "completion": 20, "blocker": "Cost analysis"},
    {"feature": "Data validation layer", "completion": 60, "eta": "2024-01-30"}
  ]
}
```

---

_Scrapers Version: 2.0.0 | Platforms: Reddit, Instagram | Status: Operational | Updated: 2024-01-28_
_Navigate: [← app/](../README.md) | [→ reddit/](reddit/README.md)_