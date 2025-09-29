# B9 Dashboard API

┌─ API STATUS ────────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% PRODUCTION   │
└─────────────────────────────────────────────────────────┘

## System Metrics

```json
{
  "status": {
    "api": "RUNNING",
    "reddit_scraper": "ACTIVE",
    "instagram_scraper": "ACTIVE",
    "database": "CONNECTED",
    "cache": "OPERATIONAL"
  },
  "performance": {
    "avg_response_time": "89ms",
    "requests_per_second": 150,
    "memory_usage": "480MB",
    "cpu_usage": "35%",
    "uptime": "99.99%",
    "query_performance": "+30% after optimization"
  },
  "data": {
    "reddit_users": 298456,
    "subreddits": 5847,
    "instagram_creators": 1247,
    "database_size": "5.8GB",
    "fields_optimized": 85,
    "indexes_added": 7
  }
}
```

## Navigation

```json
{
  "current": "README.md",
  "documentation": {
    "ARCHITECTURE.md": {"desc": "System design", "tokens": 500},
    "docs/API.md": {"desc": "Endpoint reference", "tokens": 400},
    "docs/DEPLOYMENT.md": {"desc": "Deploy guide", "tokens": 300},
    "docs/MONITORING.md": {"desc": "Health monitoring", "tokens": 350}
  },
  "modules": {
    "app/core/": {"desc": "Infrastructure", "status": "STABLE"},
    "app/routes/": {"desc": "API endpoints", "status": "ACTIVE"},
    "app/services/": {"desc": "Business logic", "status": "STABLE"},
    "app/scrapers/": {"desc": "Data acquisition", "status": "RUNNING"}
  }
}
```

## Quick Start

```bash
# Setup
make install        # Install dependencies
make venv          # Create virtual environment

# Development
make dev           # Start development server
make test          # Run test suite
make lint          # Check code quality

# Operations
make health        # Check system health
make metrics       # View performance metrics
make logs          # View application logs

# Deployment
make deploy        # Deploy to production
```

## Architecture Overview

```
┌──────────────┐
│   Frontend   │
│  (Next.js)   │
└──────┬───────┘
       │ HTTPS/JSON
       ▼
┌──────────────┐     ┌──────────────┐
│  FastAPI     │────▶│  Middleware  │
│   Routes     │     │ (CORS, Auth) │
└──────┬───────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   Services   │────▶│    Cache     │
│   (Logic)    │     │   (Memory)   │
└──────┬───────┘     └──────────────┘
       │
       ├────────┬──────────┐
       ▼        ▼          ▼
┌──────────┐ ┌──────┐ ┌────────┐
│ Scrapers │ │OpenAI│ │Supabase│
└──────────┘ └──────┘ └────────┘
```

## API Endpoints

```json
{
  "health": {
    "GET /health": "Liveness check",
    "GET /ready": "Readiness check",
    "GET /metrics": "Performance metrics"
  },
  "stats": {
    "GET /api/stats": "System statistics",
    "GET /api/stats/dashboard": "Dashboard metrics"
  },
  "reddit": {
    "GET /api/reddit/subreddits": "List subreddits",
    "GET /api/reddit/users": "List users",
    "POST /api/reddit/categorize": "Categorize subreddit"
  },
  "instagram": {
    "GET /api/instagram/creators": "List creators",
    "POST /api/instagram/scrape": "Start scraping"
  },
  "scraper": {
    "GET /api/scraper/status": "Scraper status",
    "POST /api/scraper/start": "Start scrapers",
    "POST /api/scraper/stop": "Stop scrapers"
  }
}
```

## Configuration

```json
{
  "environment_variables": {
    "required": [
      "DATABASE_URL",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY"
    ],
    "optional": [
      "PORT",
      "ENVIRONMENT",
      "LOG_LEVEL",
      "CACHE_ENABLED",
      "MONITORING_ENABLED"
    ]
  },
  "defaults": {
    "PORT": 8000,
    "WORKERS": 4,
    "LOG_LEVEL": "INFO",
    "CACHE_TTL": 300,
    "MAX_CONNECTIONS": 20
  }
}
```

## Background Tasks

```json
{
  "scrapers": {
    "reddit_continuous": {
      "interval": "60s",
      "batch_size": 100,
      "rate_limit": "60/min",
      "status": "RUNNING"
    },
    "instagram_scraper": {
      "interval": "300s",
      "batch_size": 50,
      "rate_limit": "200/hour",
      "status": "RUNNING"
    }
  },
  "maintenance": {
    "cleanup_logs": {
      "schedule": "DAILY",
      "time": "00:00",
      "retention": "30 days"
    },
    "memory_monitor": {
      "interval": "300s",
      "threshold": "1500MB",
      "action": "ALERT"
    }
  }
}
```

## Performance Optimization

```json
{
  "optimizations": {
    "caching": {
      "type": "In-memory LRU",
      "size": 1000,
      "ttl": "5min",
      "hit_rate": "85%"
    },
    "database": {
      "connection_pool": 20,
      "query_cache": true,
      "batch_writes": true,
      "indexes": "optimized"
    },
    "api": {
      "response_compression": true,
      "request_batching": true,
      "rate_limiting": true,
      "async_processing": true
    }
  }
}
```

## Monitoring

```bash
# Health checks
curl http://localhost:8000/health      # Basic health
curl http://localhost:8000/ready       # Readiness
curl http://localhost:8000/metrics     # Metrics

# Logs
make logs                              # Application logs
make logs-error                        # Error logs only

# Performance
make profile                           # Run profiler
make analyze-profile                   # Analyze results
```

## Directory Structure

```
api-render/
├── /app/                 # Application code
│   ├── /core/           # Infrastructure
│   ├── /middleware/     # Request handling
│   ├── /routes/         # API endpoints
│   ├── /services/       # Business logic
│   ├── /scrapers/       # Data acquisition
│   └── /utils/          # Utilities
├── /scripts/            # Standalone scripts
├── /tests/              # Test suite
├── /docs/               # Documentation
├── main.py              # Entry point
├── Makefile            # Commands
└── requirements.txt     # Dependencies
```

## Deployment

```json
{
  "provider": "Render.com",
  "plan": "Standard",
  "region": "us-west",
  "url": "https://b9-dashboard.onrender.com",
  "auto_deploy": {
    "enabled": true,
    "branch": "main",
    "on_push": true
  },
  "resources": {
    "cpu": "1 vCPU",
    "memory": "2GB",
    "disk": "10GB"
  }
}
```

## Testing

```bash
# Run all tests
make test

# Specific tests
make test-unit          # Unit tests only
make test-integration   # Integration tests

# Coverage
pytest --cov=app --cov-report=html
```

## Troubleshooting

```json
{
  "common_issues": {
    "high_memory": {
      "symptoms": ["Memory > 1.5GB", "Slow responses"],
      "diagnosis": "make metrics",
      "solution": "Restart service or upgrade plan"
    },
    "database_connection": {
      "symptoms": ["500 errors", "Timeout"],
      "diagnosis": "Check DATABASE_URL",
      "solution": "Verify Supabase status"
    },
    "scraper_stuck": {
      "symptoms": ["No new data"],
      "diagnosis": "make scraper-status",
      "solution": "make scraper-stop && make scraper-start"
    }
  }
}
```

## Development Workflow

```json
{
  "workflow": [
    {"step": 1, "action": "Create feature branch"},
    {"step": 2, "action": "Write tests first"},
    {"step": 3, "action": "Implement feature"},
    {"step": 4, "action": "Run make lint"},
    {"step": 5, "action": "Run make test"},
    {"step": 6, "action": "Push to branch"},
    {"step": 7, "action": "Create PR"},
    {"step": 8, "action": "Auto-deploy on merge"}
  ]
}
```

---

_API Version: 2.0.0 | Framework: FastAPI | Runtime: Python 3.11 | Updated: 2024-01-28_
_Navigate: [→ ARCHITECTURE.md](ARCHITECTURE.md) | [→ API.md](docs/API.md)_