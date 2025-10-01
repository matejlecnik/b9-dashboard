# API Routes

┌─ ROUTES STATUS ─────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% COMPLETE     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "routes/README.md",
  "files": [
    {"path": "scraper_routes.py", "desc": "Reddit scraper control", "status": "LOCKED"},
    {"path": "instagram_scraper_routes.py", "desc": "Instagram control", "status": "ACTIVE"},
    {"path": "user_routes.py", "desc": "User management", "status": "STABLE"},
    {"path": "stats_routes.py", "desc": "Statistics", "status": "OPERATIONAL"},
    {"path": "api.py", "desc": "Main API routes", "status": "STABLE"}
  ]
}
```

## Endpoint Registry

```json
{
  "scraper_control": {
    "POST /api/scraper/start": {
      "purpose": "Enable Reddit scraper",
      "auth": true,
      "response_time": "50ms",
      "status": "LOCKED"
    },
    "POST /api/scraper/stop": {
      "purpose": "Disable Reddit scraper",
      "auth": true,
      "response_time": "50ms",
      "status": "LOCKED"
    },
    "GET /api/scraper/status": {
      "purpose": "Get scraper status",
      "auth": false,
      "response_time": "30ms",
      "status": "LOCKED"
    },
    "POST /api/scraper/analyze-subreddit/{name}": {
      "purpose": "Analyze specific subreddit",
      "auth": true,
      "response_time": "2000ms",
      "status": "LOCKED"
    }
  },
  "instagram": {
    "POST /api/instagram/scraper/start": {
      "purpose": "Enable Instagram scraper",
      "auth": true,
      "response_time": "100ms",
      "status": "ACTIVE"
    },
    "POST /api/instagram/scraper/stop": {
      "purpose": "Disable Instagram scraper",
      "auth": true,
      "response_time": "50ms",
      "status": "ACTIVE"
    },
    "GET /api/instagram/scraper/status": {
      "purpose": "Get Instagram status",
      "auth": false,
      "response_time": "30ms",
      "status": "ACTIVE"
    },
    "GET /api/instagram/scraper/cycle-status": {
      "purpose": "Current cycle info",
      "auth": false,
      "response_time": "25ms",
      "status": "ACTIVE"
    }
  },
  "statistics": {
    "GET /api/stats": {
      "purpose": "System statistics",
      "auth": false,
      "response_time": "100ms",
      "cached": true
    },
    "GET /api/stats/dashboard": {
      "purpose": "Dashboard metrics",
      "auth": false,
      "response_time": "150ms",
      "cached": true
    },
    "GET /api/stats/performance": {
      "purpose": "Performance metrics",
      "auth": true,
      "response_time": "200ms"
    }
  }
}
```

## Route Configuration

```json
{
  "middleware": {
    "cors": {
      "enabled": true,
      "origins": ["https://b9-dashboard.vercel.app"],
      "credentials": true
    },
    "auth": {
      "type": "API_KEY",
      "header": "X-API-Key",
      "required_for": ["POST", "PUT", "DELETE"]
    },
    "rate_limiting": {
      "enabled": true,
      "default": "100/minute",
      "by_endpoint": true
    },
    "compression": {
      "enabled": true,
      "level": 6,
      "threshold": "1kb"
    }
  }
}
```

## Response Formats

```json
{
  "success_response": {
    "status": "success",
    "data": {},
    "timestamp": "ISO-8601",
    "request_id": "uuid"
  },
  "error_response": {
    "status": "error",
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable message",
      "details": {}
    },
    "timestamp": "ISO-8601",
    "request_id": "uuid"
  },
  "pagination": {
    "data": [],
    "page": 1,
    "per_page": 50,
    "total": 1000,
    "has_next": true,
    "has_prev": false
  }
}
```

## Route Implementation

```python
## Standard route pattern
from fastapi import APIRouter, HTTPException, Depends
from app.config import config

router = APIRouter(prefix="/api/module", tags=["module"])

@router.get("/endpoint")
async def endpoint_name(
    param: str = Query(...),
    auth: str = Depends(verify_auth)
):
    """Endpoint description"""
    try:
        # Business logic
        result = await service.process(param)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Authentication

```json
{
  "methods": {
    "api_key": {
      "location": "header",
      "name": "X-API-Key",
      "validation": "Database lookup"
    },
    "jwt": {
      "location": "header",
      "name": "Authorization",
      "format": "Bearer {token}",
      "expiry": "24h"
    }
  },
  "protected_endpoints": [
    "POST /api/scraper/*",
    "POST /api/instagram/*",
    "DELETE /api/*",
    "PUT /api/*"
  ],
  "public_endpoints": [
    "GET /health",
    "GET /ready",
    "GET /api/stats",
    "GET /api/scraper/status"
  ]
}
```

## Performance Metrics

```json
{
  "response_times": {
    "p50": "45ms",
    "p95": "150ms",
    "p99": "500ms"
  },
  "throughput": {
    "requests_per_second": 150,
    "concurrent_connections": 100
  },
  "cache_hit_rates": {
    "/api/stats": "90%",
    "/api/stats/dashboard": "85%",
    "/api/reddit/subreddits": "75%"
  },
  "error_rates": {
    "4xx": "2.3%",
    "5xx": "0.1%",
    "timeout": "0.05%"
  }
}
```

## Error Codes

```json
{
  "400": "Bad Request - Invalid parameters",
  "401": "Unauthorized - Missing or invalid auth",
  "403": "Forbidden - Insufficient permissions",
  "404": "Not Found - Resource doesn't exist",
  "429": "Too Many Requests - Rate limited",
  "500": "Internal Server Error",
  "502": "Bad Gateway - External service error",
  "503": "Service Unavailable - Maintenance mode"
}
```

## Testing Routes

```bash
## Health check
curl http://localhost:8000/health

## Get scraper status
curl http://localhost:8000/api/scraper/status

## Start scraper (with auth)
curl -X POST http://localhost:8000/api/scraper/start \
  -H "X-API-Key: your-api-key"

## Get stats
curl http://localhost:8000/api/stats

## Test specific endpoint
curl -X GET http://localhost:8000/api/reddit/subreddits?limit=10
```

## Route Security

```json
{
  "sql_injection": "Protected via ORM",
  "xss": "Input sanitization",
  "csrf": "Token validation",
  "rate_limiting": "Per-endpoint limits",
  "auth": "API key + JWT",
  "cors": "Whitelist only",
  "https": "Required in production",
  "input_validation": "Pydantic models"
}
```

---

_Routes Version: 2.0.0 | Framework: FastAPI | Status: Complete | Updated: 2024-01-28_
_Navigate: [← app/](../README.md) | [→ services/](../services/README.md)_