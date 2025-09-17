# System Logging Guide for B9 Dashboard API

## 🚨 MANDATORY: All Logs MUST Use system_logs Table

**CRITICAL**: Every script in the B9 Dashboard API must log to the centralized `system_logs` table in Supabase. This is not optional - it's required for monitoring, debugging, and analytics.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Logs Table Structure](#system-logs-table-structure)
3. [How to Use System Logger](#how-to-use-system-logger)
4. [Source Naming Convention](#source-naming-convention)
5. [Examples](#examples)
6. [Migration Checklist](#migration-checklist)
7. [Best Practices](#best-practices)

---

## Overview

The B9 Dashboard API uses a centralized logging system that:
- Writes to both Python logging and Supabase `system_logs` table
- Provides thread-safe batch insertion for performance
- Includes automatic retry logic for failed insertions
- Tracks performance metrics and error contexts
- Ensures all services use consistent logging format

**Location**: `/api/utils/system_logger.py`

---

## System Logs Table Structure

The `system_logs` table in Supabase has the following schema:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | bigint | Yes | Auto-increment primary key |
| `timestamp` | timestamptz | Yes | When the log was created |
| `source` | varchar | **YES** | Service name (see naming convention below) |
| `script_name` | varchar | No | Specific script/module name |
| `level` | varchar | No | Log level: debug/info/warning/error/critical |
| `message` | text | Yes | Log message (max 1000 chars) |
| `context` | jsonb | No | Additional structured data |
| `user_id` | text | No | User identifier if applicable |
| `duration_ms` | integer | No | Operation duration in milliseconds |
| `items_processed` | integer | No | Number of items processed |

---

## How to Use System Logger

### 1. Import the System Logger

```python
# For files in /api directory
from utils.system_logger import system_logger, log_api_call, log_scraper_activity

# For files in subdirectories (e.g., /api/routes/, /api/core/)
from ..utils.system_logger import system_logger, log_api_call, log_scraper_activity

# For standalone scripts with fallback
try:
    from utils.system_logger import system_logger
except ImportError:
    system_logger = None  # Graceful degradation
```

### 2. Basic Logging

```python
# Basic logging at different levels
system_logger.debug("Debug message", source="api", script_name="my_script")
system_logger.info("Info message", source="api", script_name="my_script")
system_logger.warning("Warning message", source="api", script_name="my_script")
system_logger.error("Error message", source="api", script_name="my_script")
system_logger.critical("Critical message", source="api", script_name="my_script")
```

### 3. Logging with Context

```python
system_logger.info(
    "User action completed",
    source="api",
    script_name="user_routes",
    context={
        "user_id": "usr_123",
        "action": "profile_update",
        "changes": {"name": "new_name", "email": "new_email"}
    },
    user_id="usr_123",
    duration_ms=150
)
```

### 4. Specialized Logging Methods

```python
# API Call Logging
log_api_call(
    source="api",
    endpoint="/api/users/123",
    method="GET",
    status_code=200,
    response_time_ms=45,
    script_name="user_routes"
)

# Scraper Activity Logging
log_scraper_activity(
    source="reddit_scraper",
    activity="subreddit_discovery",
    items_processed=100,
    success_count=95,
    failure_count=5,
    script_name="reddit_scraper"
)

# Exception Logging (automatically captures traceback)
try:
    risky_operation()
except Exception:
    system_logger.log_exception(
        source="api",
        script_name="my_script",
        context={"operation": "risky_operation"}
    )
```

---

## Source Naming Convention

**CRITICAL**: The `source` field MUST be consistent across all scripts. Use these standardized source names:

| Source | Description | Used By |
|--------|-------------|---------|
| `api` | Main API and utilities | main.py, cache.py, rate_limit.py, monitoring.py |
| `reddit_scraper` | Reddit scraping service | reddit_scraper.py, continuous_scraper.py, scraper_routes.py |
| `instagram_scraper` | Instagram scraping service | unified_scraper.py, continuous_instagram_scraper.py, instagram_scraper_routes.py |
| `reddit_categorizer` | AI categorization service | categorization_service.py |
| `user_discovery` | User discovery operations | user_routes.py (discovery operations) |
| `api_user_discovery` | User API endpoints | user_routes.py (API endpoints) |

**Note**: Some legacy code uses variations like `api_user_discovery` or `manual_add`. These should be standardized in future updates.

---

## Examples

### Example 1: API Route with Error Handling

```python
from fastapi import APIRouter, HTTPException
from ..utils.system_logger import system_logger, log_api_call

router = APIRouter()

@router.get("/api/data")
async def get_data():
    try:
        # Log API call start
        log_api_call(
            source="api",
            endpoint="/api/data",
            method="GET",
            script_name="data_routes"
        )

        # Perform operation
        data = fetch_data()

        # Log success
        system_logger.info(
            "Data fetched successfully",
            source="api",
            script_name="data_routes",
            context={"record_count": len(data)}
        )

        return data

    except Exception as e:
        # Log error with full context
        system_logger.error(
            f"Failed to fetch data: {e}",
            source="api",
            script_name="data_routes",
            context={"error": str(e)},
            sync=True  # Immediate insertion for errors
        )
        raise HTTPException(status_code=500, detail=str(e))
```

### Example 2: Scraper with Performance Tracking

```python
from datetime import datetime
from ..utils.system_logger import log_scraper_activity

def scrape_subreddits(subreddit_list):
    start_time = datetime.now()
    success_count = 0
    failure_count = 0

    for subreddit in subreddit_list:
        try:
            scrape_single_subreddit(subreddit)
            success_count += 1
        except Exception as e:
            failure_count += 1
            system_logger.warning(
                f"Failed to scrape r/{subreddit}: {e}",
                source="reddit_scraper",
                script_name="subreddit_scraper",
                context={"subreddit": subreddit, "error": str(e)}
            )

    # Log overall activity with metrics
    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    log_scraper_activity(
        source="reddit_scraper",
        activity="batch_subreddit_scraping",
        items_processed=len(subreddit_list),
        success_count=success_count,
        failure_count=failure_count,
        script_name="subreddit_scraper",
        context={
            "duration_ms": duration_ms,
            "success_rate": success_count / len(subreddit_list) if subreddit_list else 0
        }
    )
```

### Example 3: Service Initialization

```python
from utils.system_logger import system_logger

async def initialize_service():
    try:
        # Initialize components
        await database.connect()
        await cache.initialize()

        system_logger.info(
            "Service initialized successfully",
            source="api",
            script_name="main",
            context={
                "database": "connected",
                "cache": "ready",
                "environment": os.getenv("ENVIRONMENT", "development")
            }
        )

    except Exception as e:
        system_logger.critical(
            f"Service initialization failed: {e}",
            source="api",
            script_name="main",
            context={"error": str(e)},
            sync=True  # Critical errors should be logged immediately
        )
        raise
```

---

## Migration Checklist

When updating a script to use system_logs, follow this checklist:

- [ ] Import system_logger from the correct path
- [ ] Add fallback for import errors if it's a standalone script
- [ ] Replace or supplement `logger.info/error/warning` calls with system_logger
- [ ] Always include the `source` parameter (use standard naming)
- [ ] Add `script_name` parameter (usually the filename without .py)
- [ ] Include relevant `context` for debugging
- [ ] Use `sync=True` for critical errors
- [ ] Add performance metrics (`duration_ms`, `items_processed`) where applicable
- [ ] Test that logs appear in the `system_logs` table

---

## Best Practices

### 1. Always Include Source
```python
# ❌ BAD - Missing source
system_logger.info("Operation completed")

# ✅ GOOD - Includes source
system_logger.info("Operation completed", source="api", script_name="my_script")
```

### 2. Use Structured Context
```python
# ❌ BAD - String concatenation
system_logger.info(f"Processed {count} items in {time}ms", source="api")

# ✅ GOOD - Structured context
system_logger.info(
    "Batch processing complete",
    source="api",
    script_name="processor",
    context={"items_count": count, "duration_ms": time}
)
```

### 3. Handle Import Gracefully
```python
# ✅ GOOD - Graceful fallback
try:
    from ..utils.system_logger import system_logger
except ImportError:
    system_logger = None

# Later in code
if system_logger:
    system_logger.info("Message", source="api", script_name="script")
```

### 4. Use Appropriate Log Levels
- **DEBUG**: Detailed diagnostic info (usually disabled in production)
- **INFO**: General informational messages
- **WARNING**: Warning messages for potentially harmful situations
- **ERROR**: Error events that might still allow the app to continue
- **CRITICAL**: Very serious errors that might cause the app to abort

### 5. Batch vs Sync Insertion
```python
# Normal operation - batched for performance
system_logger.info("Regular log", source="api", script_name="script")

# Critical error - immediate insertion
system_logger.error("Critical failure", source="api", sync=True)
```

### 6. Performance Tracking
```python
# Track operation performance
start = time.time()
result = expensive_operation()
duration_ms = int((time.time() - start) * 1000)

system_logger.info(
    "Expensive operation completed",
    source="api",
    script_name="performance",
    duration_ms=duration_ms,
    items_processed=len(result)
)
```

---

## Current Implementation Status

### ✅ Fully Integrated Scripts
- `api/main.py`
- `api/start.py`
- `api/core/reddit_scraper.py`
- `api/core/continuous_scraper.py`
- `api/core/continuous_instagram_scraper.py`
- `api/routes/scraper_routes.py`
- `api/routes/user_routes.py`
- `api/routes/instagram_scraper_routes.py`
- `api/services/categorization_service.py`
- `api/services/instagram/unified_scraper.py`
- `api/utils/cache.py`
- `api/utils/rate_limit.py`
- `api/utils/monitoring.py`

### 📝 Scripts Requiring Review
- Any new scripts added after this documentation

---

## Troubleshooting

### Logs Not Appearing in Supabase
1. Check environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
2. Verify the script includes `source` parameter
3. Check if using `sync=True` for immediate insertion
4. Call `system_logger.flush()` to force batch insertion

### Import Errors
1. Check the import path based on file location
2. Use try/except for graceful degradation
3. Ensure `__init__.py` includes system_logger exports

### Performance Issues
1. Use batched insertion (default) instead of `sync=True`
2. Limit context data size
3. Truncate long messages (automatic at 1000 chars)

---

## Monitoring & Analytics

You can query the `system_logs` table for insights:

```sql
-- Recent errors by source
SELECT source, COUNT(*) as error_count
FROM system_logs
WHERE level = 'error'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY error_count DESC;

-- Performance metrics
SELECT
  source,
  script_name,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as operation_count
FROM system_logs
WHERE duration_ms IS NOT NULL
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY source, script_name
ORDER BY avg_duration DESC;

-- Scraper success rates
SELECT
  source,
  SUM((context->>'success_count')::int) as total_success,
  SUM((context->>'failure_count')::int) as total_failure
FROM system_logs
WHERE source LIKE '%scraper%'
  AND context->>'success_count' IS NOT NULL
GROUP BY source;
```

---

## Support

For questions or issues with the logging system:
1. Check this documentation first
2. Review the `system_logger.py` implementation
3. Check existing implementations in integrated scripts
4. Verify Supabase connection and table structure

Remember: **All logs MUST go through system_logs** - this is not optional!