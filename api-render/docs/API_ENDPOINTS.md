# API Endpoint Reference

┌─ API STATUS ────────────────────────────────────────────┐
│ ● LIVE        │ ████████████████████ 100% OPERATIONAL  │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "docs/API_ENDPOINTS.md",
  "siblings": [
    {"path": "DEPLOYMENT.md", "desc": "Deploy guide", "status": "GUIDE"},
    {"path": "MONITORING.md", "desc": "Health monitoring", "status": "GUIDE"},
    {"path": "PERFORMANCE.md", "desc": "Optimization", "status": "GUIDE"}
  ]
}
```

## Base Configuration

```json
{
  "production": "https://b9-dashboard.onrender.com",
  "development": "http://localhost:8000",
  "authentication": {
    "type": "Bearer Token",
    "header": "Authorization",
    "admin_key": "X-API-Key"
  },
  "rate_limits": {
    "default": "100/minute",
    "authenticated": "500/minute",
    "admin": "unlimited"
  }
}
```

## Core Endpoints

```json
{
  "health": {
    "GET /health": {
      "desc": "System health check",
      "auth": false,
      "response": {"status": "healthy", "uptime": 123456}
    },
    "GET /health/detailed": {
      "desc": "Detailed health metrics",
      "auth": true,
      "response": {"database": "OK", "scrapers": "RUNNING"}
    }
  },
  "stats": {
    "GET /api/stats": {
      "desc": "Dashboard statistics",
      "auth": true,
      "cache": "5min",
      "response": {"users": 298456, "posts": 337803}
    },
    "GET /api/stats/realtime": {
      "desc": "Real-time metrics",
      "auth": true,
      "cache": false
    }
  }
}
```

## Scraper Control

```json
{
  "reddit": {
    "POST /api/scraper/start": {
      "desc": "Start Reddit scraper",
      "auth": "admin",
      "body": {"batch_size": 100}
    },
    "POST /api/scraper/stop": {
      "desc": "Stop Reddit scraper",
      "auth": "admin"
    },
    "GET /api/scraper/status": {
      "desc": "Scraper status",
      "auth": true,
      "response": {"running": true, "last_run": "2024-01-29T12:00:00Z"}
    }
  },
  "instagram": {
    "POST /api/instagram/scrape": {
      "desc": "Trigger Instagram scrape",
      "auth": "admin",
      "body": {"creators": ["username1", "username2"]}
    },
    "GET /api/instagram/status": {
      "desc": "Instagram scraper status",
      "auth": true
    }
  }
}
```

## Data Endpoints

```json
{
  "subreddits": {
    "GET /api/subreddits": {
      "desc": "List subreddits",
      "auth": true,
      "params": {
        "limit": 100,
        "offset": 0,
        "approved": true
      }
    },
    "GET /api/subreddits/{id}": {
      "desc": "Get subreddit details",
      "auth": true
    },
    "PUT /api/subreddits/{id}": {
      "desc": "Update subreddit",
      "auth": "admin",
      "body": {"approved": true, "tags": ["tag1", "tag2"]}
    }
  },
  "users": {
    "GET /api/users": {
      "desc": "List Reddit users",
      "auth": true,
      "params": {
        "is_creator": true,
        "limit": 100
      }
    },
    "GET /api/users/{id}": {
      "desc": "Get user details",
      "auth": true
    }
  }
}
```

## Instagram Endpoints

```json
{
  "creators": {
    "GET /api/instagram/creators": {
      "desc": "List Instagram creators",
      "auth": true,
      "params": {"active": true, "limit": 50}
    },
    "POST /api/instagram/creators": {
      "desc": "Add creator",
      "auth": "admin",
      "body": {"username": "creator_name"}
    }
  },
  "content": {
    "GET /api/instagram/posts": {
      "desc": "Get Instagram posts",
      "auth": true,
      "params": {"creator_id": "123", "limit": 20}
    },
    "GET /api/instagram/reels": {
      "desc": "Get Instagram reels",
      "auth": true,
      "params": {"viral": true, "min_views": 100000}
    }
  }
}
```

## Categorization

```json
{
  "endpoints": {
    "POST /api/categorization/analyze": {
      "desc": "AI categorization",
      "auth": true,
      "body": {"text": "content to analyze"},
      "response": {"tags": ["tag1", "tag2"], "confidence": 0.95}
    },
    "GET /api/categorization/tags": {
      "desc": "Available tags",
      "auth": true,
      "response": {"categories": 11, "tags": 82}
    }
  }
}
```

## Response Formats

```json
{
  "success": {
    "status": 200,
    "data": {},
    "meta": {
      "timestamp": "2024-01-29T12:00:00Z",
      "request_id": "abc-123",
      "cached": false
    }
  },
  "error": {
    "status": 400,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid parameters",
      "details": {}
    },
    "meta": {
      "timestamp": "2024-01-29T12:00:00Z",
      "request_id": "abc-123"
    }
  }
}
```

---

_API Version: 2.0.0 | Status: Production | Updated: 2024-01-29_
_Navigate: [← docs/](README.md) | [→ DEPLOYMENT.md](DEPLOYMENT.md)_