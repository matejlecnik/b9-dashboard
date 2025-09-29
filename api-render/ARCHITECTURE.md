# API Architecture

┌─ SYSTEM ARCHITECTURE ───────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% DOCUMENTED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "ARCHITECTURE.md",
  "siblings": [
    {"path": "docs/API.md", "desc": "Endpoint reference", "status": "ACTIVE"},
    {"path": "docs/DEPLOYMENT.md", "desc": "Deploy guide", "status": "OPERATIONAL"},
    {"path": "docs/MONITORING.md", "desc": "Health monitoring", "status": "ACTIVE"}
  ]
}
```

## System Overview

```json
{
  "type": "Monolithic FastAPI Application",
  "deployment": "Render.com",
  "database": "Supabase PostgreSQL",
  "runtime": "Python 3.11",
  "framework": "FastAPI + Uvicorn",
  "architecture_pattern": "Layered Architecture"
}
```

## Directory Structure

```
api-render/
├── /app/                        # Application code
│   ├── /core/                   # Infrastructure layer
│   │   ├── /cache/              # Caching utilities
│   │   ├── /clients/            # API client pools
│   │   ├── /config/             # Configuration
│   │   └── /database/           # DB connections
│   │
│   ├── /middleware/             # Request/Response handling
│   │   └── error_handler.py    # Global error handling
│   │
│   ├── /routes/                 # API endpoints (Presentation layer)
│   │   ├── api.py               # Main API routes
│   │   ├── instagram.py         # Instagram endpoints
│   │   ├── reddit.py            # Reddit endpoints
│   │   └── stats.py             # Statistics endpoints
│   │
│   ├── /services/               # Business logic layer
│   │   ├── /tags/               # Tag categorization
│   │   ├── /instagram/          # Instagram logic
│   │   └── database.py          # DB service
│   │
│   ├── /scrapers/               # Data acquisition layer
│   │   ├── /reddit/             # Reddit scraper
│   │   └── /instagram/          # Instagram scraper
│   │
│   └── /utils/                  # Shared utilities
│       ├── monitoring.py        # Performance monitoring
│       ├── memory_monitor.py    # Memory tracking
│       └── system_logger.py     # Logging utilities
│
├── /scripts/                    # Standalone scripts
├── /tests/                      # Test suite
├── /docs/                       # Documentation
├── main.py                      # Application entry point
└── requirements.txt             # Dependencies
```

## Data Flow

```
┌──────────────┐
│   Frontend   │
│  Dashboard   │
└──────┬───────┘
       │ HTTP/JSON
       ▼
┌──────────────┐
│  API Routes  │ ◄── Middleware (Auth, CORS, Errors)
│   (FastAPI)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Services   │ ◄── Business Logic
│  (Business)  │
└──────┬───────┘
       │
       ├────────┬──────────┐
       ▼        ▼          ▼
┌──────────┐ ┌──────┐ ┌────────┐
│ Scrapers │ │Cache │ │Database│
│(External)│ │(Redis)│ │(Supabase)
└──────────┘ └──────┘ └────────┘
```

## Layer Responsibilities

```json
{
  "presentation": {
    "location": "/app/routes/",
    "responsibility": "HTTP handling, request/response transformation",
    "components": [
      "API endpoint definitions",
      "Request validation",
      "Response formatting",
      "CORS handling"
    ]
  },
  "business": {
    "location": "/app/services/",
    "responsibility": "Business logic and rules",
    "components": [
      "Tag categorization",
      "Data processing",
      "Validation rules",
      "Service orchestration"
    ]
  },
  "data": {
    "location": "/app/scrapers/, /app/core/database/",
    "responsibility": "Data acquisition and persistence",
    "components": [
      "Reddit scraping",
      "Instagram scraping",
      "Database operations",
      "Cache management"
    ]
  },
  "infrastructure": {
    "location": "/app/core/",
    "responsibility": "Technical concerns",
    "components": [
      "Configuration management",
      "Connection pooling",
      "Rate limiting",
      "Monitoring"
    ]
  }
}
```

## Key Components

```json
{
  "main.py": {
    "purpose": "Application entry point",
    "responsibilities": [
      "FastAPI app initialization",
      "Route registration",
      "Middleware setup",
      "Background task scheduling"
    ]
  },
  "scrapers": {
    "reddit": {
      "purpose": "Reddit data acquisition",
      "rate_limit": "60 requests/minute",
      "concurrency": 10,
      "batch_size": 100
    },
    "instagram": {
      "purpose": "Instagram data acquisition",
      "rate_limit": "200 requests/hour",
      "concurrency": 5,
      "batch_size": 50
    }
  },
  "database": {
    "provider": "Supabase",
    "tables": [
      "reddit_users",
      "reddit_posts",
      "reddit_subreddits",
      "instagram_creators",
      "instagram_posts",
      "system_logs",
      "system_control"
    ],
    "connection_pool": {
      "min_size": 5,
      "max_size": 20
    }
  }
}
```

## API Endpoints

```json
{
  "groups": {
    "/api/stats": {
      "purpose": "System statistics",
      "methods": ["GET"],
      "auth": false
    },
    "/api/reddit": {
      "purpose": "Reddit operations",
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "auth": true
    },
    "/api/instagram": {
      "purpose": "Instagram operations",
      "methods": ["GET", "POST"],
      "auth": true
    },
    "/api/categorization": {
      "purpose": "AI categorization",
      "methods": ["POST"],
      "auth": true
    },
    "/api/scraper": {
      "purpose": "Scraper control",
      "methods": ["GET", "POST"],
      "auth": true
    }
  }
}
```

## Background Tasks

```json
{
  "scheduled_tasks": [
    {
      "name": "reddit_continuous_scraper",
      "schedule": "CONTINUOUS",
      "interval": "60s",
      "purpose": "Monitor Reddit activity"
    },
    {
      "name": "instagram_scraper",
      "schedule": "CONTINUOUS",
      "interval": "300s",
      "purpose": "Fetch Instagram posts"
    },
    {
      "name": "memory_monitor",
      "schedule": "PERIODIC",
      "interval": "300s",
      "purpose": "Track memory usage"
    },
    {
      "name": "cleanup_old_logs",
      "schedule": "DAILY",
      "time": "00:00",
      "purpose": "Remove old log entries"
    }
  ]
}
```

## Performance Characteristics

```json
{
  "metrics": {
    "avg_response_time": "89ms",
    "p95_response_time": "245ms",
    "requests_per_second": 150,
    "concurrent_connections": 100,
    "memory_usage": "600MB",
    "cpu_usage": "40%"
  },
  "bottlenecks": [
    {"component": "Supabase queries", "impact": "HIGH", "solution": "Add caching"},
    {"component": "OpenAI API", "impact": "MEDIUM", "solution": "Batch requests"},
    {"component": "Memory growth", "impact": "LOW", "solution": "Periodic restart"}
  ]
}
```

## Security

```json
{
  "authentication": {
    "type": "API Key",
    "location": "Environment variable",
    "validation": "Per-request"
  },
  "cors": {
    "enabled": true,
    "origins": ["https://b9-dashboard.vercel.app"],
    "credentials": true
  },
  "rate_limiting": {
    "enabled": true,
    "default": "100 requests/minute",
    "by_endpoint": true
  },
  "secrets_management": {
    "provider": "Environment variables",
    "rotation": "Manual",
    "storage": "Render encrypted"
  }
}
```

## Scaling Considerations

```json
{
  "current_limits": {
    "max_concurrent_users": 100,
    "max_requests_per_second": 150,
    "database_connections": 20,
    "memory_limit": "2GB"
  },
  "scaling_strategy": {
    "vertical": {
      "current": "Render Standard",
      "next": "Render Pro",
      "trigger": "Memory > 1.5GB"
    },
    "horizontal": {
      "current": "Single instance",
      "next": "Multi-instance with load balancer",
      "trigger": "RPS > 200"
    }
  },
  "optimization_opportunities": [
    "Implement Redis caching",
    "Add database read replicas",
    "Use connection pooling",
    "Implement request batching"
  ]
}
```

## Monitoring & Observability

```json
{
  "logging": {
    "framework": "Python logging + Supabase",
    "levels": ["DEBUG", "INFO", "WARNING", "ERROR"],
    "storage": "Supabase system_logs table",
    "retention": "30 days"
  },
  "metrics": {
    "collection": "Custom decorators",
    "storage": "In-memory + Supabase",
    "dashboards": ["Render metrics", "Custom /metrics endpoint"]
  },
  "health_checks": {
    "/health": "Basic liveness",
    "/ready": "Readiness with dependencies",
    "/metrics": "Performance metrics"
  },
  "alerting": {
    "provider": "Render",
    "channels": ["Email"],
    "triggers": ["Deploy failure", "High memory", "Errors"]
  }
}
```

## Development Workflow

```bash
# Local development
make dev                 # Start local server
make test               # Run tests
make lint               # Code quality

# Deployment
git push origin main    # Auto-deploy to Render

# Monitoring
make logs               # View live logs
make metrics           # Performance metrics
make health            # Health status
```

---

_Architecture Version: 2.0.0 | Pattern: Layered | Updated: 2024-01-28_
_Navigate: [← README.md](README.md) | [→ API.md](docs/API.md)_