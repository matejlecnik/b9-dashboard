# B9 Dashboard API

┌─ API STATUS ────────────────────────────────────────────┐
│ ● LIVE        │ ████████████████████ 100% DEPLOYED    │
└─────────────────────────────────────────────────────────┘

## System Metrics

```json
{
  "status": {
    "api": "LIVE",
    "reddit_scraper": "V3.6.3_ACTIVE",
    "instagram_scraper": "V2.1.0_ACTIVE",
    "database": "SUPABASE_REST",
    "cache": "REDIS_ACTIVE",
    "deployment": "HETZNER_CLOUD_3_SERVERS"
  },
  "performance": {
    "avg_response_time": "89ms",
    "requests_per_second": 150,
    "memory_usage": "480MB",
    "cpu_usage": "35%",
    "uptime": "99.99%",
    "query_performance": "+30% after optimization",
    "architecture": "v3.7.0 optimized + Redis job queue",
    "last_deployment": "2025-10-08T15:01:00Z"
  },
  "data": {
    "reddit_users": 309608,
    "reddit_posts": 1830000,
    "subreddits": 34682,
    "instagram_creators": 1247,
    "database_size": "8.4GB",
    "fields_optimized": 85,
    "indexes_added": 7
  }
}
```

## 💾 Media Storage (Cloudflare R2)

Permanent storage for Instagram photos and videos with automatic compression:

**Features:**
- ✅ Automatic compression (photos: 300KB, videos: 1.5MB @ 720p)
- ✅ H.264 video codec (QuickTime & Safari compatible)
- ✅ Deduplication (skip upload if already in R2)
- ✅ Zero egress fees (unlimited bandwidth)
- ✅ Cost: ~$1,590/year for 10K creators (17.6TB)

**Setup:** See [docs/R2_STORAGE_SETUP.md](docs/R2_STORAGE_SETUP.md)

## Navigation

```json
{
  "parent": "../CLAUDE.md",
  "current": "api-render/README.md",
  "documentation": {
    "../docs/backend/ARCHITECTURE.md": {"desc": "System design", "status": "STABLE"},
    "../docs/backend/API.md": {"desc": "Endpoint reference", "status": "COMPLETE"},
    "../docs/backend/RENDER_API_DEPLOYMENT.md": {"desc": "Deploy guide", "status": "ACTIVE"},
    "../docs/backend/MONITORING.md": {"desc": "Health monitoring", "status": "OPERATIONAL"},
    "../docs/backend/logging.md": {"desc": "Logging system", "status": "ENFORCED"},
    "docs/R2_STORAGE_SETUP.md": {"desc": "Cloudflare R2 media storage", "status": "ACTIVE"}
  },
  "modules": {
    "app/core/": {"desc": "Infrastructure", "status": "STABLE"},
    "app/api/": {"desc": "API endpoints", "status": "ACTIVE"},
    "app/services/": {"desc": "Business logic", "status": "STABLE"},
    "app/scrapers/": {"desc": "Data acquisition v3.4.5", "status": "LIVE"}
  }
}
```

## Quick Start

```bash
## Setup
make install        # Install dependencies
make venv          # Create virtual environment

## Development
make dev           # Start development server
make test          # Run test suite
make lint          # Check code quality

## Operations
make health        # Check system health
make metrics       # View performance metrics
make logs          # View application logs

## Deployment
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
## Health checks
curl http://localhost:8000/health      # Basic health
curl http://localhost:8000/ready       # Readiness
curl http://localhost:8000/metrics     # Metrics

## Logs
make logs                              # Application logs
make logs-error                        # Error logs only

## Performance
make profile                           # Run profiler
make analyze-profile                   # Analyze results
```

## Directory Structure

```
api-render/
├── /app/                 # Application code
│   ├── /core/           # Infrastructure
│   ├── /middleware/     # Request handling
│   ├── /api/            # API endpoints (routes)
│   ├── /services/       # Business logic
│   ├── /scrapers/       # Data acquisition
│   └── /utils/          # Utilities
├── /scripts/            # Standalone scripts
├── /tests/              # Test suite
├── /migrations/         # Database migrations
├── main.py              # Entry point
├── Makefile            # Commands
└── requirements.txt     # Dependencies
```

## Deployment

```json
{
  "provider": "Hetzner Cloud",
  "architecture": "Distributed (1 API + 2 Workers)",
  "region": "eu-central (Falkenstein, Germany)",
  "cost": "€30.05/month (94.7% savings vs Render)",
  "servers": {
    "api_server": {
      "type": "CPX11",
      "specs": "2 vCPU AMD, 2 GB RAM, 40 GB SSD",
      "ip": "91.98.91.129",
      "services": ["FastAPI", "Redis Server"],
      "cost": "€3.85/month"
    },
    "worker_1": {
      "type": "CPX31",
      "specs": "4 vCPU AMD, 8 GB RAM, 160 GB SSD",
      "ip": "188.245.232.203",
      "services": ["Instagram Scraper Worker"],
      "cost": "€13.10/month"
    },
    "worker_2": {
      "type": "CPX31",
      "specs": "4 vCPU AMD, 8 GB RAM, 160 GB SSD",
      "ip": "91.98.92.192",
      "services": ["Instagram Scraper Worker"],
      "cost": "€13.10/month"
    }
  },
  "deployment": {
    "method": "Docker Compose",
    "containers": ["FastAPI API", "Redis", "Worker (×2)"],
    "networking": "Redis job queue (BRPOP/LPUSH)"
  },
  "documentation": {
    "guide": "docs/deployment/HETZNER_MIGRATION_GUIDE.md",
    "reference": "docs/deployment/HETZNER_QUICK_REFERENCE.md",
    "info": "docs/deployment/HETZNER_DEPLOYMENT_INFO.md"
  }
}
```

## Testing

```bash
## Run all tests
make test

## Specific tests
make test-unit          # Unit tests only
make test-integration   # Integration tests

## Coverage
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

_API Version: 3.7.0 | Framework: FastAPI | Runtime: Python 3.11 | Updated: 2025-10-07_
_Navigate: [→ ARCHITECTURE.md](../docs/backend/ARCHITECTURE.md) | [→ API.md](../docs/backend/API.md) | [→ DEPLOYMENT.md](../docs/backend/RENDER_API_DEPLOYMENT.md)_