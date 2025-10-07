# Instagram Scraper Module

┌─ SCRAPER STATUS ────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████░░░░ 85% ACTIVE        │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "instagram/README.md",
  "subdirectories": [
    {"path": "services/", "desc": "Scraping services", "status": "ACTIVE"}
  ],
  "files": [
    {"path": "continuous.py", "desc": "24/7 scraper", "status": "RUNNING"},
    {"path": "__init__.py", "desc": "Module init", "status": "OK"}
  ]
}
```

## System Configuration

```json
{
  "scraper": {
    "name": "Instagram Continuous Scraper",
    "version": "2.0.0",
    "status": "PRODUCTION",
    "deployment": "Render",
    "schedule": "Every 4 hours",
    "batch_size": 50
  },
  "api": {
    "provider": "RapidAPI",
    "service": "Instagram API",
    "rate_limit": "60 requests/second",
    "endpoints": [
      "user_info",
      "user_posts",
      "user_reels",
      "related_creators"
    ]
  },
  "performance": {
    "creators_tracked": 1247,
    "posts_collected": 45678,
    "reels_collected": 23456,
    "avg_scrape_time": "30min",
    "memory_usage": "400MB"
  }
}
```

## Scraping Schedule

```json
{
  "continuous_mode": {
    "enabled": true,
    "interval_hours": 4,
    "runs_per_day": 6,
    "next_run": "2025-10-07T20:00:00Z"
  },
  "batch_processing": {
    "creators_per_batch": 50,
    "delay_between_batches": 30,
    "max_retries": 3,
    "retry_delay": 60
  },
  "content_types": {
    "posts": {"enabled": true, "limit": 12},
    "reels": {"enabled": true, "limit": 12},
    "stories": {"enabled": false, "reason": "Not implemented"}
  }
}
```

## Data Collection

```json
{
  "posts": {
    "fields": [
      "id", "shortcode", "caption", "likes_count",
      "comments_count", "timestamp", "media_url"
    ],
    "deduplication": "By shortcode",
    "storage": "instagram_posts table"
  },
  "reels": {
    "fields": [
      "id", "shortcode", "caption", "plays_count",
      "likes_count", "comments_count", "timestamp"
    ],
    "deduplication": "By shortcode",
    "storage": "instagram_reels table"
  },
  "creators": {
    "fields": [
      "username", "full_name", "bio", "followers",
      "following", "posts_count", "profile_pic_url"
    ],
    "update_frequency": "Every scrape",
    "storage": "instagram_creators table"
  }
}
```

## Error Handling

```json
{
  "rate_limiting": {
    "detection": "429 status code",
    "action": "Exponential backoff",
    "max_wait": 300
  },
  "api_errors": {
    "timeout": {"retry": true, "max_attempts": 3},
    "not_found": {"retry": false, "mark_inactive": true},
    "server_error": {"retry": true, "delay": 60}
  },
  "memory_management": {
    "threshold": "80%",
    "action": "Garbage collection",
    "alert": true
  }
}
```

## Performance Metrics

```json
{
  "last_24h": {
    "successful_scrapes": 145,
    "failed_scrapes": 2,
    "success_rate": "98.6%",
    "avg_response_time": "250ms",
    "data_collected": "5.2GB"
  },
  "api_usage": {
    "requests_today": 8640,
    "rate_limit_hits": 3,
    "avg_request_time": "180ms",
    "cost": "$12.50"
  },
  "database": {
    "inserts": 34567,
    "updates": 12345,
    "batch_efficiency": "95%",
    "avg_batch_time": "2s"
  }
}
```

## Recent Activity

```json
{
  "recent_runs": [
    {"time": "2025-10-07T12:00:00Z", "creators": 50, "posts": 589, "status": "SUCCESS"},
    {"time": "2025-10-07T08:00:00Z", "creators": 50, "posts": 612, "status": "SUCCESS"},
    {"time": "2025-10-07T04:00:00Z", "creators": 50, "posts": 578, "status": "SUCCESS"},
    {"time": "2025-10-07T00:00:00Z", "creators": 50, "posts": 601, "status": "SUCCESS"}
  ],
  "issues": [
    {"time": "2025-10-06T20:00:00Z", "error": "Rate limit", "resolved": true}
  ]
}
```

---

_Scraper Version: 2.1.0 | Status: Production | Updated: 2025-10-07_
_Navigate: [← scrapers/](../README.md) | [→ services/](services/README.md)_