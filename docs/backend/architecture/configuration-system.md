# Backend Configuration System

## Overview
The backend uses a **hierarchical configuration system** with multiple layers:
1. Environment variables (.env files)
2. Static configuration classes
3. Database-driven dynamic configuration
4. Service-specific configuration modules

---

## Configuration Files Hierarchy

### 1. Main Application Config
**File:** `backend/app/config.py`

**Purpose:** Central configuration hub for the entire application

**Contains:**
- `DatabaseConfig` - Database connection settings
- `ScraperConfig` - General scraper configuration
- `APIConfig` - FastAPI server configuration
- `CacheConfig` - Caching settings
- `MonitoringConfig` - Logging and monitoring
- `HetznerServerConfig` - Production server optimization (CPX31)
- `InstagramScraperConfig` - Instagram-specific settings (detailed)
- `ExternalServicesConfig` - Third-party API credentials
- `Config` - Main configuration class (singleton)

**Key Features:**
- Environment-based configuration (production vs development)
- Validation on import
- Global `config` instance
- Type-safe dataclasses

**Usage:**
```python
from app.config import config

# Access settings
batch_size = config.instagram.batch_size
is_prod = config.is_production
db_connections = config.database.max_connections
```

---

### 2. Dynamic Configuration Manager
**File:** `backend/app/core/config/config_manager.py`

**Purpose:** Runtime configuration from database (system_control table)

**Architecture:**
- Fetches config from `system_control` table
- 5-minute cache with force refresh option
- Fallback to hardcoded defaults if DB unavailable
- UPDATE support via `update_config()`

**Use Case:**
- Reddit scraper runtime settings (batch_size, rate_limit_delay, etc.)
- Allows config changes without redeployment
- Supports A/B testing and dynamic tuning

**Default Values:**
```python
DEFAULTS = {
    "batch_size": 50,
    "user_batch_size": 30,
    "posts_per_subreddit": 30,
    "rate_limit_delay": 1.0,
    "max_retries": 3,
    "timeout": 300,
    "cache_batch_size": 1000,
    "heartbeat_interval": 30,
    "max_threads": 5
}
```

**Usage:**
```python
from app.core.config.config_manager import ConfigManager

manager = ConfigManager(supabase_client)
config = manager.get_config()
batch_size = manager.get("batch_size", 50)
```

---

### 3. Scraper-Specific Config
**File:** `backend/app/core/config/scraper_config.py`

**Purpose:** Base scraper configuration logic

**Contains:**
- Shared scraper utilities
- Common rate limiting logic
- Batch processing defaults

---

### 4. R2 Storage Config
**File:** `backend/app/core/config/r2_config.py`

**Purpose:** Cloudflare R2 (S3-compatible) storage configuration

**Settings:**
- Bucket configuration
- Access credentials
- Public URL endpoints
- Upload settings

**Usage:**
```python
from app.core.config.r2_config import R2Config

r2 = R2Config()
bucket = r2.bucket_name
public_url = r2.get_public_url(file_key)
```

---

### 5. Instagram Scraper Config
**File:** `backend/app/scrapers/instagram/services/instagram_config.py`

**Purpose:** Instagram scraper module-specific settings

**Details:**
- RapidAPI credentials and endpoints
- Content fetching strategy (new vs existing creators)
- Performance tuning (requests_per_second, concurrent_creators)
- Retry logic configuration
- Viral detection thresholds
- Cost tracking settings

**Optimization Notes:**
- `concurrent_creators: 10` - Tested vs 20, optimal for performance
- `requests_per_second: 55` - RapidAPI rate limit compliance
- `retry_backoff_multiplier: 2.5` - Exponential backoff for failed requests

---

### 6. Logging Config
**File:** `backend/app/logging/config.py`

**Purpose:** Logging system configuration

**Settings:**
- Log levels (DEBUG, INFO, WARNING, ERROR)
- Log file paths
- Formatters and handlers
- Rotation policies

---

## Configuration Loading Order

```
1. .env file loaded                 (via dotenv)
2. Environment variables resolved   (os.getenv)
3. config.py initialized            (static defaults + env overrides)
4. config.validate() runs           (on import)
5. ConfigManager fetches DB config  (runtime, cached)
```

---

## Environment Variables Reference

### Required Variables
```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# External APIs
OPENAI_API_KEY=sk-xxx
RAPIDAPI_KEY=xxx  # Instagram scraper

# R2 Storage (Optional - for media)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=b9-media
R2_PUBLIC_URL=https://media.b9.com
```

### Optional Variables
```bash
# Server
ENVIRONMENT=production|development
PORT=8000
WORKERS=8
LOG_LEVEL=INFO|DEBUG|WARNING|ERROR

# Performance Tuning
INSTAGRAM_CONCURRENT_CREATORS=10
INSTAGRAM_REQUESTS_PER_SECOND=55
INSTAGRAM_BATCH_SIZE=50

# Feature Flags
FEATURE_VIRAL_DETECTION=true
FEATURE_AUTO_CATEGORIZATION=true
ENABLE_ANALYTICS=true
ENABLE_COST_TRACKING=true
```

---

## Configuration Best Practices

### Static vs Dynamic Config

**Use Static Config (`config.py`) For:**
- API credentials and secrets
- Server infrastructure settings (workers, ports)
- Feature flags that rarely change
- External service endpoints

**Use Dynamic Config (`ConfigManager`) For:**
- Scraper performance tuning (batch sizes, delays)
- Runtime behavior that may need adjustment
- A/B testing parameters
- Settings that operators need to change without redeployment

### Security Considerations

1. **Never commit secrets to config files**
   - Always use environment variables
   - Use .env.example as template

2. **Validate on startup**
   - `config.validate()` runs on import
   - Fails fast in production if misconfigured

3. **Sensitive data handling**
   - API keys masked in logs
   - Database credentials never exposed in API responses

### Performance Optimization

**Hetzner CPX31 (4 vCPUs, 8GB RAM):**
- Workers: 8 (calculated: (4 × 2) + 1 = 9, capped at 8)
- Memory per worker: 800MB (total: 6.4GB, leaving 1.6GB for system)
- Connection pool: 20 per worker
- Request timeout: 120s

**Instagram Scraper:**
- Concurrent creators: 10 (tested, optimal)
- Rate limit: 55 req/s (RapidAPI compliance)
- Batch size: 50 creators per cycle

---

## Configuration Migration Path

### Current State (v3.x → v4.0)
- Static config for stability
- Database config for Reddit scraper only
- Manual environment variable management

### Future State (v5.x+)
- Unified ConfigManager for all scrapers
- Web UI for config management
- Configuration versioning and rollback
- Dynamic feature flags via database

---

## Troubleshooting

### Config Validation Fails
```python
# Check validation errors
is_valid, errors = config.validate()
print(errors)  # Lists missing/invalid settings
```

### Database Config Not Loading
```python
# Force refresh from database
manager = ConfigManager(supabase)
config = manager.get_config(force_refresh=True)
```

### Environment Variables Not Loading
```bash
# Check .env file exists and is in correct location
ls -la .env

# Verify dotenv loading
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('SUPABASE_URL'))"
```

---

## Related Documentation
- `docs/backend/deployment/hetzner-optimization.md` - Server configuration details
- `docs/backend/api/external-control-guide.md` - API-based config updates
- `ROADMAP.md` - Phase 5+ configuration improvements

---

**Last Updated:** 2025-10-10
**Version:** 4.0.0
**Maintainer:** B9 Development Team
