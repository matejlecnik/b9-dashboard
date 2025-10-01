# Core Infrastructure

┌─ INFRASTRUCTURE STATUS ─────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% STABLE      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "core/README.md",
  "subdirectories": [
    {"path": "cache/", "desc": "Caching system", "status": "ACTIVE"},
    {"path": "clients/", "desc": "API clients", "status": "STABLE"},
    {"path": "config/", "desc": "Configuration", "status": "STABLE"},
    {"path": "database/", "desc": "Database layer", "status": "OPERATIONAL"}
  ]
}
```

## Component Status

```json
{
  "components": {
    "cache_manager": {
      "status": "OPERATIONAL",
      "type": "In-memory LRU",
      "ttl": "5min",
      "max_size": 1000,
      "eviction": "LRU"
    },
    "api_pool": {
      "status": "STABLE",
      "max_clients": 10,
      "thread_safe": true,
      "reuse": true
    },
    "database": {
      "status": "CONNECTED",
      "provider": "Supabase",
      "pool_size": 20,
      "batch_writer": true,
      "rate_limiter": true
    },
    "config": {
      "status": "LOADED",
      "source": "Environment",
      "validation": "PASSED",
      "hot_reload": false
    }
  }
}
```

## Directory Structure

```
core/
├── /cache/                 # Caching utilities
│   ├── __init__.py
│   ├── cache_manager.py   # LRU cache implementation
│   └── README.md
├── /clients/              # API client management
│   ├── __init__.py
│   ├── api_pool.py       # Thread-safe client pool
│   └── README.md
├── /config/              # Configuration management
│   ├── __init__.py
│   ├── proxy_manager.py  # Proxy configuration
│   ├── scraper_config.py # Scraper settings
│   └── README.md
├── /database/            # Database layer
│   ├── __init__.py
│   ├── batch_writer.py  # Batch write operations
│   ├── rate_limiter.py  # Query rate limiting
│   ├── supabase_client.py # Client initialization
│   └── README.md
└── exceptions.py         # Custom exceptions
```

## Cache System

```json
{
  "implementation": "cache/cache_manager.py",
  "features": {
    "async_support": true,
    "sync_support": true,
    "ttl": true,
    "lru_eviction": true,
    "thread_safe": true
  },
  "configuration": {
    "default_ttl": 300,
    "max_size": 1000,
    "eviction_policy": "LRU"
  },
  "usage": {
    "get": "cache.get(key)",
    "set": "cache.set(key, value, ttl=300)",
    "delete": "cache.delete(key)",
    "clear": "cache.clear()"
  }
}
```

## Database Layer

```json
{
  "client": {
    "provider": "Supabase",
    "connection_pool": {
      "min": 5,
      "max": 20,
      "timeout": 30
    }
  },
  "batch_writer": {
    "batch_size": 100,
    "flush_interval": "5s",
    "retry_on_failure": true,
    "max_retries": 3
  },
  "rate_limiter": {
    "requests_per_second": 100,
    "burst_size": 200,
    "per_operation": true
  },
  "optimization": {
    "query_cache": true,
    "prepared_statements": true,
    "connection_reuse": true
  }
}
```

## Configuration Management

```json
{
  "scraper_config": {
    "reddit": {
      "batch_size": 100,
      "rate_limit": "60/min",
      "max_workers": 10,
      "retry_attempts": 3
    },
    "instagram": {
      "batch_size": 50,
      "rate_limit": "200/hour",
      "max_workers": 5,
      "retry_attempts": 3
    }
  },
  "proxy_manager": {
    "enabled": false,
    "rotation": "round_robin",
    "health_check": true,
    "timeout": 30
  }
}
```

## Client Pool

```json
{
  "api_pool": {
    "purpose": "Manage API client instances",
    "features": [
      "Thread-safe access",
      "Client reuse",
      "Automatic cleanup",
      "Health monitoring"
    ],
    "limits": {
      "max_clients": 10,
      "idle_timeout": 300,
      "max_age": 3600
    }
  }
}
```

## Exception Hierarchy

```python
## Custom exceptions
ScraperException
├── RateLimitException
├── AuthenticationException
├── DataValidationException
└── NetworkException

DatabaseException
├── ConnectionException
├── QueryException
└── TransactionException

CacheException
├── CacheMissException
└── CacheFullException
```

## Performance Metrics

```json
{
  "cache": {
    "hit_rate": "85%",
    "avg_get_time": "0.5ms",
    "avg_set_time": "1ms",
    "memory_usage": "50MB"
  },
  "database": {
    "avg_query_time": "45ms",
    "connection_pool_usage": "60%",
    "batch_write_throughput": "1000/s"
  },
  "rate_limiter": {
    "requests_allowed": "98%",
    "avg_wait_time": "100ms",
    "burst_usage": "40%"
  }
}
```

## Recent Improvements

```json
{
  "completed": [
    {"date": "2025-01-27", "fix": "Centralized configuration", "impact": "HIGH"},
    {"date": "2025-01-27", "fix": "Thread safety fixes", "impact": "CRITICAL"},
    {"date": "2025-01-27", "fix": "Memory leak prevention", "impact": "HIGH"},
    {"date": "2025-01-27", "fix": "Rate limiter async fix", "impact": "MEDIUM"},
    {"date": "2025-01-27", "fix": "LRU cache implementation", "impact": "MEDIUM"}
  ]
}
```

## Usage Examples

```python
## Cache usage
from app.core.cache import cache_manager

cache = cache_manager.CacheManager()
cache.set("key", "value", ttl=300)
value = cache.get("key")

## Database usage
from app.core.database import supabase_client

client = supabase_client.get_client()
data = client.table("users").select("*").execute()

## Batch writer
from app.core.database import batch_writer

writer = batch_writer.BatchWriter()
writer.add("users", {"name": "John"})
writer.flush()

## Rate limiter
from app.core.database import rate_limiter

limiter = rate_limiter.RateLimiter()
await limiter.acquire()  # Wait for rate limit
```

---

_Core Version: 2.0.0 | Status: Stable | Updated: 2024-01-28_
_Navigate: [← app/](../README.md) | [→ cache/](cache/README.md)_