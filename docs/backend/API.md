# API Documentation

┌─ API STATUS ────────────────────────────────────────────┐
│ ● LIVE        │ ████████████████████ 100% OPERATIONAL  │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "docs/API.md",
  "siblings": [
    {"path": "ARCHITECTURE.md", "desc": "System design", "status": "STABLE"},
    {"path": "DEPLOYMENT.md", "desc": "Deploy guide", "status": "PRODUCTION"},
    {"path": "MONITORING.md", "desc": "Health monitoring", "status": "ACTIVE"},
    {"path": "PERFORMANCE.md", "desc": "Optimization", "status": "OPTIMIZED"}
  ]
}
```

## Base Configuration

```json
{
  "production_hetzner": "http://91.98.91.129:10000",
  "production_render": "https://b9-dashboard.onrender.com (DEPRECATED - migrated 2025-10-08)",
  "development": "http://localhost:8000",
  "version": "3.12.4",
  "note": "Primary deployment on Hetzner Cloud (€30/mo, 3 servers) - Render.com DEPRECATED",
  "authentication": {
    "type": "Bearer Token / API Key",
    "header": "Authorization",
    "admin_key": "X-API-Key"
  },
  "rate_limits": {
    "anonymous": "60/minute",
    "authenticated": "100/minute",
    "admin": "500/minute"
  },
  "content_type": "application/json"
}
```

## Endpoints

### Health & Status

```json
{
  "GET /health": {
    "auth": false,
    "description": "Basic system health check",
    "response": {
      "status": "healthy",
      "timestamp": "ISO-8601",
      "version": "3.12.4",
      "uptime": 123456
    }
  },
  "GET /health/detailed": {
    "auth": true,
    "description": "Detailed health metrics with database and scraper status",
    "response": {
      "status": "healthy",
      "database": "OK",
      "scrapers": {
        "reddit": "RUNNING",
        "instagram": "RUNNING"
      },
      "memory_usage": "480MB",
      "cpu_usage": "35%"
    }
  },
  "GET /ready": {
    "auth": false,
    "description": "Readiness check for load balancers",
    "response": {
      "ready": true,
      "database": "connected",
      "cache": "operational"
    }
  }
}
```

### Scraper Control

```json
{
  "POST /api/scraper/start": {
    "auth": true,
    "body": null,
    "response": {
      "status": "success",
      "message": "Reddit scraper started"
    }
  },
  "POST /api/scraper/stop": {
    "auth": true,
    "body": null,
    "response": {
      "status": "success",
      "message": "Reddit scraper stopped"
    }
  },
  "GET /api/scraper/status": {
    "auth": false,
    "response": {
      "is_running": true,
      "last_run": "ISO-8601",
      "next_run": "ISO-8601",
      "stats": {
        "subreddits_processed": 5800,
        "users_processed": 298000
      }
    }
  },
  "POST /api/scraper/analyze-subreddit/{name}": {
    "auth": true,
    "params": {
      "name": "string (subreddit name)"
    },
    "response": {
      "status": "success",
      "data": {
        "subreddit": "string",
        "subscribers": 0,
        "tags": ["array"],
        "metrics": {}
      }
    }
  }
}
```

### Instagram Control

```json
{
  "POST /api/instagram/scraper/start": {
    "auth": true,
    "body": null,
    "response": {
      "status": "success",
      "message": "Instagram scraper started"
    }
  },
  "POST /api/instagram/scraper/stop": {
    "auth": true,
    "body": null,
    "response": {
      "status": "success",
      "message": "Instagram scraper stopped"
    }
  },
  "GET /api/instagram/scraper/status": {
    "auth": false,
    "response": {
      "is_running": true,
      "last_cycle": "ISO-8601",
      "current_batch": 50,
      "total_creators": 1247
    }
  },
  "GET /api/instagram/scraper/cycle-status": {
    "auth": false,
    "response": {
      "cycle_number": 42,
      "progress": 65,
      "time_remaining": "15 minutes",
      "errors": []
    }
  }
}
```

### Statistics

```json
{
  "GET /api/stats": {
    "auth": false,
    "response": {
      "reddit": {
        "total_subreddits": 5800,
        "total_users": 298000,
        "daily_growth": 1500
      },
      "instagram": {
        "total_creators": 1247,
        "total_posts": 45000,
        "engagement_rate": 3.2
      }
    }
  },
  "GET /api/stats/dashboard": {
    "auth": false,
    "response": {
      "active_scrapers": 2,
      "data_freshness": "< 1 hour",
      "system_health": "optimal",
      "alerts": []
    }
  },
  "GET /api/stats/performance": {
    "auth": true,
    "response": {
      "cpu_usage": 45,
      "memory_usage": 60,
      "api_latency": {
        "p50": "45ms",
        "p95": "150ms",
        "p99": "500ms"
      }
    }
  }
}
```

### Reddit Data

```json
{
  "GET /api/reddit/subreddits": {
    "auth": false,
    "params": {
      "limit": "integer (default: 50)",
      "offset": "integer (default: 0)",
      "sort": "string (subscribers|growth|activity)",
      "tags": "array (filter by tags)"
    },
    "response": {
      "data": [
        {
          "name": "string",
          "subscribers": 0,
          "tags": ["array"],
          "metrics": {}
        }
      ],
      "total": 5800,
      "page": 1,
      "has_next": true
    }
  },
  "GET /api/reddit/subreddit/{name}": {
    "auth": false,
    "params": {
      "name": "string (subreddit name)"
    },
    "response": {
      "name": "string",
      "subscribers": 0,
      "description": "string",
      "tags": ["array"],
      "metrics": {
        "growth_rate": 0.05,
        "engagement": 0.85,
        "quality_score": 92
      }
    }
  },
  "GET /api/reddit/users": {
    "auth": true,
    "params": {
      "limit": "integer (default: 50)",
      "offset": "integer (default: 0)",
      "min_karma": "integer",
      "has_onlyfans": "boolean"
    },
    "response": {
      "data": [
        {
          "username": "string",
          "karma": 0,
          "onlyfans_url": "string|null",
          "subreddits": ["array"]
        }
      ],
      "total": 298000,
      "page": 1
    }
  },
  "POST /api/users/discover": {
    "auth": false,
    "description": "Discover and analyze a Reddit user, mark as our_creator",
    "body": {
      "username": "string (e.g., 'GallowBoob' or 'u/GallowBoob')"
    },
    "response": {
      "success": true,
      "user": {
        "username": "string",
        "reddit_id": "string",
        "created_utc": "ISO-8601",
        "account_age_days": 0,
        "total_karma": 0,
        "link_karma": 0,
        "comment_karma": 0,
        "verified": false,
        "has_verified_email": false,
        "bio": "string|null",
        "bio_url": "string|null",
        "avg_post_score": 0.0,
        "avg_post_comments": 0.0,
        "total_posts_analyzed": 30,
        "karma_per_day": 0.0,
        "preferred_content_type": "string",
        "most_active_posting_hour": 0,
        "most_active_posting_day": "string",
        "our_creator": true,
        "last_scraped_at": "ISO-8601"
      },
      "error": null
    },
    "notes": [
      "Uses database-backed proxy rotation for reliability",
      "Fetches user data and 30 recent posts for analysis",
      "Calculates posting patterns and engagement metrics",
      "Automatically marks as our_creator=true",
      "Response time: ~2s"
    ]
  },
  "POST /api/subreddits/fetch-single": {
    "auth": false,
    "description": "Fetch and save individual subreddit with full reddit_scraper processing",
    "body": {
      "subreddit_name": "string (e.g., 'memes' or 'r/memes')"
    },
    "response": {
      "name": "string",
      "title": "string",
      "description": "string",
      "public_description": "string",
      "subscribers": 0,
      "over18": false,
      "created_utc": "ISO-8601",
      "verification_required": false,
      "rules_data": "string (JSON array)",
      "avg_upvotes_per_post": 0.0,
      "engagement": 0.0,
      "subreddit_score": 0.0,
      "review": "string|null (auto-detected: 'Non Related' or null)",
      "primary_category": "string|null",
      "tags": ["array"],
      "icon_img": "string|null",
      "banner_img": "string|null",
      "community_icon": "string|null",
      "last_scraped_at": "ISO-8601"
    },
    "notes": [
      "Complete feature parity with reddit_scraper",
      "Uses ProxyManager with database-backed proxies",
      "Auto-categorizes using 69 keywords across 10 categories",
      "Detects verification requirements in rules/description",
      "Calculates metrics from top 10 weekly posts",
      "Preserves cached metadata (review, category, tags)",
      "UPSERT with 3-retry logic and exponential backoff",
      "Response time: ~4s"
    ]
  }
}
```

### Instagram Data

```json
{
  "GET /api/instagram/creators": {
    "auth": false,
    "params": {
      "limit": "integer (default: 50)",
      "offset": "integer (default: 0)",
      "min_followers": "integer",
      "has_viral": "boolean"
    },
    "response": {
      "data": [
        {
          "username": "string",
          "followers": 0,
          "engagement_rate": 0.0,
          "viral_posts": 0,
          "last_updated": "ISO-8601"
        }
      ],
      "total": 1247
    }
  },
  "GET /api/instagram/creator/{username}": {
    "auth": false,
    "params": {
      "username": "string"
    },
    "response": {
      "username": "string",
      "followers": 0,
      "posts": 0,
      "engagement": {
        "rate": 0.0,
        "likes_avg": 0,
        "comments_avg": 0
      },
      "viral_content": []
    }
  },
  "POST /api/instagram/creator/add": {
    "auth": false,
    "description": "Manually add Instagram creator with full data processing (profile, reels, posts, analytics)",
    "body": {
      "username": "string (e.g., 'username' or '@username')",
      "niche": "string|null (optional, e.g., 'Fitness', 'Beauty', 'Fashion')"
    },
    "response": {
      "success": true,
      "creator": {
        "id": 123,
        "ig_user_id": "1234567890",
        "username": "example_creator",
        "full_name": "Example Creator",
        "followers_count": 50000,
        "following_count": 1500,
        "media_count": 450,
        "biography": "Creator bio text",
        "external_url": "https://example.com",
        "is_verified": false,
        "is_business_account": true,
        "niche": "Fitness",
        "review_status": "ok",
        "avg_engagement_rate": 3.45,
        "avg_views_per_reel_cached": 75000,
        "avg_likes_per_reel_cached": 2500,
        "avg_comments_per_reel_cached": 150,
        "avg_likes_per_post_cached": 1800,
        "avg_comments_per_post_cached": 90,
        "viral_content_count_cached": 12,
        "best_content_type": "reels",
        "posting_frequency_per_week": 4.2,
        "posting_consistency_score": 78.5,
        "last_post_days_ago": 2.3,
        "save_to_like_ratio": 0.15,
        "last_scraped_at": "2025-10-06T12:00:00Z",
        "created_at": "2025-10-06T12:00:00Z"
      },
      "stats": {
        "api_calls_used": 12,
        "reels_fetched": 90,
        "posts_fetched": 30,
        "processing_time_seconds": 18
      },
      "error": null
    },
    "notes": [
      "Full processing workflow identical to automated scraper",
      "Fetches 90 reels + 30 posts for comprehensive analysis",
      "Calculates 40+ analytics metrics automatically",
      "Sets review_status='ok' for ongoing scraper updates",
      "Uses RapidAPI Instagram Looter2 (cost: ~$0.00036 per creator)",
      "Response time: 15-20 seconds (due to rate limiting: 55 req/sec)",
      "Idempotent: Safe to call multiple times (uses UPSERT logic)",
      "Creator will appear immediately in Creator Review page",
      "Analytics include: engagement rates, viral detection, posting patterns",
      "Stores complete content history in instagram_reels and instagram_posts tables"
    ],
    "error_responses": {
      "username_not_found": {
        "success": false,
        "error": "Username not found or private account",
        "details": "Account may be private, invalid, suspended, or doesn't exist"
      },
      "api_failure": {
        "success": false,
        "error": "An error occurred: Rate limit exceeded",
        "details": "RapidAPI rate limit reached or service temporarily unavailable"
      },
      "processing_failed": {
        "success": false,
        "error": "Processing failed - could not fetch creator content or calculate analytics",
        "details": "Profile fetched successfully but content fetching/analytics failed"
      }
    }
  }
}
```

## Authentication

```bash
## Header authentication (Hetzner)
curl -H "X-API-Key: your-api-key" http://91.98.91.129:10000/api/endpoint

## Example request
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  http://91.98.91.129:10000/api/scraper/start

## ⚠️ DEPRECATED: Legacy Render endpoint (migrated to Hetzner 2025-10-08)
curl -H "X-API-Key: your-api-key" https://b9-dashboard.onrender.com/api/endpoint
```

## Error Responses

```json
{
  "400": {
    "status": "error",
    "error": {
      "code": "INVALID_REQUEST",
      "message": "Invalid parameters provided",
      "details": {}
    }
  },
  "401": {
    "status": "error",
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing or invalid API key"
    }
  },
  "429": {
    "status": "error",
    "error": {
      "code": "RATE_LIMIT",
      "message": "Too many requests",
      "retry_after": 60
    }
  },
  "500": {
    "status": "error",
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "An unexpected error occurred"
    }
  }
}
```

## Rate Limiting

```json
{
  "limits": {
    "anonymous": "60 requests/minute",
    "authenticated": "100 requests/minute",
    "burst": "200 requests"
  },
  "headers": {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "95",
    "X-RateLimit-Reset": "1643723400"
  }
}
```

## Webhooks

```json
{
  "available_events": [
    "scraper.started",
    "scraper.stopped",
    "scraper.error",
    "data.new_viral",
    "data.threshold_reached"
  ],
  "configuration": {
    "endpoint": "POST /api/webhooks/subscribe",
    "body": {
      "url": "https://your-endpoint.com/webhook",
      "events": ["scraper.error", "data.new_viral"],
      "secret": "your-webhook-secret"
    }
  },
  "payload_example": {
    "event": "data.new_viral",
    "timestamp": "ISO-8601",
    "data": {
      "platform": "instagram",
      "creator": "username",
      "post_id": "123456",
      "engagement": 50000
    }
  }
}
```

## SDK Examples

### Python

```python
import requests

class B9Dashboard:
    def __init__(self, api_key, use_hetzner=True):
        # NOTE: Render endpoint deprecated 2025-10-08, use Hetzner (default)
        self.base_url = "http://91.98.91.129:10000" if use_hetzner else "https://b9-dashboard.onrender.com"
        self.headers = {"X-API-Key": api_key}

    def get_scraper_status(self):
        return requests.get(
            f"{self.base_url}/api/scraper/status",
            headers=self.headers
        ).json()

    def start_scraper(self):
        return requests.post(
            f"{self.base_url}/api/scraper/start",
            headers=self.headers
        ).json()

## Usage
client = B9Dashboard("your-api-key")
status = client.get_scraper_status()
```

### JavaScript

```javascript
class B9Dashboard {
  constructor(apiKey, useHetzner = true) {
    // NOTE: Render endpoint deprecated 2025-10-08, use Hetzner (default)
    this.baseUrl = useHetzner
      ? 'http://91.98.91.129:10000'
      : 'https://b9-dashboard.onrender.com';
    this.headers = {'X-API-Key': apiKey};
  }

  async getScraperStatus() {
    const response = await fetch(
      `${this.baseUrl}/api/scraper/status`,
      {headers: this.headers}
    );
    return response.json();
  }

  async startScraper() {
    const response = await fetch(
      `${this.baseUrl}/api/scraper/start`,
      {method: 'POST', headers: this.headers}
    );
    return response.json();
  }
}

// Usage
const client = new B9Dashboard('your-api-key');
const status = await client.getScraperStatus();
```

---

_API Version: 3.12.4 | Reddit Scraper: v3.11.1 | Instagram Scraper: v3.12.3 | Status: Production | Updated: 2025-10-10_
_Navigate: [← docs/](README.md) | [→ ARCHITECTURE.md](ARCHITECTURE.md) | [→ DEPLOYMENT.md](DEPLOYMENT.md)_

**Note:** This document consolidates all API endpoint documentation. Previous API_ENDPOINTS.md has been merged here.