# Utils - Utility Functions

## Overview
This directory contains utility functions and helpers used throughout the API.

## Files

### system_logger.py
**Centralized Logging System**

Unified logging to Supabase `system_logs` table:
- `SystemLogger` class with singleton pattern
- Batched inserts for performance (100 logs/batch)
- Auto-flush every 5 seconds
- Thread-safe operation

**Usage:**
```python
from utils.system_logger import system_logger

system_logger.info("Operation completed", source="reddit_scraper")
system_logger.error("Failed to fetch", source="api", sync=True)
```

**Log Levels:**
- DEBUG, INFO, WARNING, ERROR, SUCCESS

**Sources:**
- reddit_scraper, instagram_scraper, api, reddit_categorizer, user_discovery

### cache.py
**Redis Caching Manager**

Provides caching functionality when Redis is available:
- `CacheManager` class
- Automatic fallback when Redis unavailable
- TTL support for cache expiration
- JSON serialization for complex objects

**Key Features:**
- Graceful degradation (works without Redis)
- Configurable TTL per key
- Bulk operations support
- Connection pooling

**Note:** Redis often unavailable on free Render tier

### rate_limit.py
**API Rate Limiting**

Rate limiting decorator for API endpoints:
- `RateLimiter` class
- Redis-backed when available
- Per-IP tracking
- Configurable limits per endpoint

**Default Limits:**
- 100 requests/minute general
- 10 requests/minute for scraper control

**Usage:**
```python
@rate_limit(max_calls=10, time_window=60)
async def endpoint():
    pass
```

### monitoring.py
**Health Check and Metrics**

System monitoring utilities:
- Memory usage tracking
- Request counting
- Error rate monitoring
- Uptime tracking

**Endpoints Supported:**
- /health - Detailed health status
- /ready - Kubernetes readiness
- /alive - Simple liveness check

## Common Patterns

### Logging Pattern
```python
try:
    # Operation
    system_logger.info("Success", source="component")
except Exception as e:
    system_logger.error(f"Failed: {e}", source="component", sync=True)
```

### Caching Pattern
```python
cache_manager = CacheManager()
cached = await cache_manager.get("key")
if not cached:
    data = expensive_operation()
    await cache_manager.set("key", data, ttl=300)
```

### Rate Limiting Pattern
```python
rate_limiter = RateLimiter()
if not await rate_limiter.check_rate_limit(ip, endpoint):
    raise HTTPException(429, "Rate limit exceeded")
```

## Configuration

All utilities use environment variables:
- `REDIS_URL` - Redis connection string
- `LOG_LEVEL` - Logging verbosity
- `CACHE_TTL` - Default cache TTL
- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting

## Performance Considerations

- Logging: Batched inserts reduce database load
- Caching: Significantly improves response times
- Rate Limiting: Minimal overhead (~1ms)
- All utilities designed for async operation

## Error Handling

All utilities fail gracefully:
- Logger: Falls back to console logging
- Cache: Returns None on Redis failure
- Rate Limiter: Allows all requests if Redis down
- Monitoring: Returns basic status on error

## Important Notes

1. **Redis dependency** - Most utils work without Redis
2. **Thread safety** - All utilities are thread-safe
3. **Async first** - Designed for async/await patterns
4. **Production ready** - Used in production on Render
5. **Low overhead** - Minimal performance impact