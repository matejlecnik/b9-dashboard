# Business Services

┌─ SERVICES STATUS ───────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████░░░░ 85% COMPLETE      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "services/README.md",
  "subdirectories": [
    {"path": "tags/", "desc": "Tag categorization", "status": "SOURCE_OF_TRUTH"},
    {"path": "instagram/", "desc": "Instagram logic", "status": "ACTIVE"}
  ],
  "files": [
    {"path": "categorization_service_tags.py", "desc": "AI categorization", "status": "STABLE"},
    {"path": "database.py", "desc": "DB service", "status": "OPERATIONAL"},
    {"path": "single_subreddit_fetcher.py", "desc": "Reddit fetcher", "status": "STABLE"}
  ]
}
```

## Service Registry

```json
{
  "categorization": {
    "file": "categorization_service_tags.py",
    "purpose": "AI-powered subreddit tagging",
    "provider": "OpenAI GPT-4",
    "tags": 82,
    "performance": {
      "avg_time": "1.2s",
      "success_rate": "98%",
      "cost_per_call": "$0.02"
    }
  },
  "database": {
    "file": "database.py",
    "purpose": "Supabase client management",
    "connections": {
      "pool_size": 20,
      "timeout": 30,
      "retry": true
    }
  },
  "instagram_scraper": {
    "directory": "instagram/",
    "purpose": "Instagram data acquisition",
    "rate_limit": "60 req/sec",
    "batch_size": 300,
    "workers": 60
  },
  "reddit_fetcher": {
    "file": "single_subreddit_fetcher.py",
    "purpose": "Subreddit data fetching",
    "rate_limit": "60 req/min",
    "cache_ttl": 300
  }
}
```

## Tag Categorization System

```json
{
  "location": "tags/TAG_CATEGORIES.md",
  "implementation": "tags/tag_definitions.py",
  "statistics": {
    "total_tags": 82,
    "categories": 11,
    "tags_per_subreddit": {
      "min": 1,
      "max": 2,
      "preferred": 1
    }
  },
  "categories": [
    {"name": "niche", "count": 14},
    {"name": "focus", "count": 10},
    {"name": "body", "count": 9},
    {"name": "ass", "count": 4},
    {"name": "breasts", "count": 7},
    {"name": "age", "count": 5},
    {"name": "ethnicity", "count": 7},
    {"name": "style", "count": 12},
    {"name": "hair", "count": 4},
    {"name": "special", "count": 8},
    {"name": "content", "count": 2}
  ]
}
```

## Service Architecture

```
┌─────────────────┐
│  API Routes     │
└────────┬────────┘
         │ Calls
         ▼
┌─────────────────┐
│    Services     │◄── Business Logic Layer
├─────────────────┤
│ • Categorization│
│ • Database      │
│ • Instagram     │
│ • Reddit        │
└────────┬────────┘
         │ Uses
         ▼
┌─────────────────┐
│ Infrastructure  │
├─────────────────┤
│ • Supabase      │
│ • OpenAI        │
│ • Cache         │
└─────────────────┘
```

## Service Patterns

```python
# Standard service pattern
class ServiceName:
    def __init__(self):
        self.config = load_config()
        self.client = initialize_client()
        self.cache = CacheManager()

    async def process(self, data):
        # Check cache
        cached = await self.cache.get(data.id)
        if cached:
            return cached

        # Business logic
        result = await self._process_internal(data)

        # Cache result
        await self.cache.set(data.id, result)

        # Log metrics
        log_performance(result)

        return result
```

## Performance Metrics

```json
{
  "categorization_service": {
    "requests_per_day": 5000,
    "avg_response_time": "1.2s",
    "success_rate": "98%",
    "error_rate": "2%",
    "monthly_cost": "$150"
  },
  "instagram_service": {
    "creators_tracked": 1247,
    "posts_per_hour": 500,
    "api_calls_per_day": 12000,
    "success_rate": "95%"
  },
  "database_service": {
    "queries_per_second": 50,
    "connection_pool_usage": "60%",
    "avg_query_time": "45ms",
    "cache_hit_rate": "75%"
  }
}
```

## Error Handling

```json
{
  "retry_strategy": {
    "max_attempts": 3,
    "initial_delay": "1s",
    "max_delay": "30s",
    "exponential_backoff": true
  },
  "error_types": {
    "RateLimitError": "Wait and retry",
    "APIError": "Log and alert",
    "ValidationError": "Return to client",
    "DatabaseError": "Retry with backoff"
  },
  "logging": {
    "destination": "system_logs table",
    "level": "INFO",
    "format": "JSON",
    "retention": "30 days"
  }
}
```

## Service Dependencies

```json
{
  "external": {
    "OpenAI": {
      "purpose": "AI categorization",
      "version": "GPT-4",
      "fallback": "GPT-3.5"
    },
    "Supabase": {
      "purpose": "Database",
      "version": "2.0",
      "required": true
    },
    "Instagram API": {
      "purpose": "Data fetching",
      "unofficial": true,
      "rate_limited": true
    }
  },
  "internal": {
    "cache_manager": "app.core.cache",
    "rate_limiter": "app.core.database",
    "logger": "app.utils.system_logger"
  }
}
```

## Health Monitoring

```json
{
  "health_checks": {
    "database_connection": {
      "interval": "30s",
      "timeout": "5s",
      "critical": true
    },
    "openai_api": {
      "interval": "60s",
      "timeout": "10s",
      "critical": false
    },
    "cache_availability": {
      "interval": "60s",
      "timeout": "1s",
      "critical": false
    }
  },
  "alerts": {
    "error_rate_high": "> 5%",
    "response_time_slow": "> 3s",
    "connection_pool_exhausted": "> 90%"
  }
}
```

## Testing

```bash
# Test all services
pytest app/services/

# Test with mock data
pytest app/services/ --mock-external

# Performance test
pytest app/services/ --benchmark

# Integration test
pytest app/services/ --integration
```

## Future Improvements

```json
{
  "planned": [
    {"feature": "Redis caching", "impact": "50% faster", "effort": "8h"},
    {"feature": "Service mesh", "impact": "Better monitoring", "effort": "16h"},
    {"feature": "GraphQL layer", "impact": "Flexible queries", "effort": "24h"},
    {"feature": "Event sourcing", "impact": "Audit trail", "effort": "40h"}
  ],
  "in_progress": [
    {"feature": "Retry queue", "completion": 40, "eta": "2024-02-01"},
    {"feature": "Health dashboard", "completion": 20, "eta": "2024-02-05"}
  ]
}
```

---

_Services Version: 2.0.0 | Pattern: Service Layer | Updated: 2024-01-28_
_Navigate: [← app/](../README.md) | [→ tags/](tags/README.md)_