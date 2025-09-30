# API Documentation

┌─ API STATUS ────────────────────────────────────────────┐
│ ● LIVE        │ ████████████████████ 100% UPTIME       │
└─────────────────────────────────────────────────────────┘

## Base Configuration

```json
{
  "base_url": "https://b9-dashboard.onrender.com",
  "version": "2.0.0",
  "authentication": "API Key (Header: X-API-Key)",
  "content_type": "application/json",
  "rate_limit": "100 requests/minute"
}
```

## Endpoints

### Health & Status

```json
{
  "GET /health": {
    "auth": false,
    "response": {
      "status": "healthy",
      "timestamp": "ISO-8601",
      "version": "2.0.0"
    }
  },
  "GET /ready": {
    "auth": false,
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
  }
}
```

## Authentication

```bash
# Header authentication
curl -H "X-API-Key: your-api-key" https://b9-dashboard.onrender.com/api/endpoint

# Example request
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  https://b9-dashboard.onrender.com/api/scraper/start
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
    def __init__(self, api_key):
        self.base_url = "https://b9-dashboard.onrender.com"
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

# Usage
client = B9Dashboard("your-api-key")
status = client.get_scraper_status()
```

### JavaScript

```javascript
class B9Dashboard {
  constructor(apiKey) {
    this.baseUrl = 'https://b9-dashboard.onrender.com';
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

_API Version: 2.0.0 | Status: Production | Updated: 2024-01-28_