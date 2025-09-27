# Core - Shared Infrastructure Components

## Overview
This directory contains the core shared infrastructure components used by all scrapers and services in the B9 Dashboard API.

## Directory Structure

```
core/
├── cache/              # Redis cache management with TTL support
├── clients/            # Thread-safe API client pools
├── config/             # Configuration management (proxies, settings)
├── database/           # Database utilities and batch writers
├── migrations/         # Database migration scripts (applied)
├── utils/              # Shared utilities (logging, helpers)
└── logs/              # Log file directory (gitignored)
```

## Components

### cache/
**Cache Management System**
- `cache_manager.py` - Async/sync cache with TTL support
- Redis-backed caching for API responses
- Automatic expiration and memory management
- Thread-safe operations

### clients/
**API Client Management**
- `api_pool.py` - Thread-safe Reddit API client pool
- Connection pooling for better performance
- Automatic rate limit handling per client
- Proxy support for each client instance

### config/
**Configuration Management**
- `proxy_manager.py` - Dynamic proxy loading from Supabase
- Proxy health monitoring and rotation
- Service-specific proxy configurations
- Automatic proxy testing at startup

### database/
**Database Utilities**
- `batch_writer.py` - Efficient batch writing to Supabase
- Async and sync versions for compatibility
- Automatic chunking for large datasets
- FK constraint handling with existence checks

### utils/
**Shared Utilities**
- `supabase_logger.py` - Centralized logging to Supabase
- Buffered writes to `system_logs` table
- Thread-safe logging operations
- Automatic log level filtering

### migrations/
**Database Migrations (Already Applied)**
- `create_reddit_proxies_table.sql` - Reddit proxy table schema
- `migrate_proxies_to_database.py` - Migration script for proxy data
- **Note**: These have been applied to production

## Usage Examples

### Using the Cache Manager
```python
from core.cache.cache_manager import AsyncCacheManager

cache = AsyncCacheManager(ttl=3600)  # 1 hour TTL
await cache.set("key", {"data": "value"})
data = await cache.get("key")
```

### Using the API Pool
```python
from core.clients.api_pool import ThreadSafeAPIPool

pool = ThreadSafeAPIPool(size=10)
await pool.initialize(proxy_manager)
api = pool.get_api()  # Thread-safe API instance
```

### Using the Batch Writer
```python
from core.database.batch_writer import BatchWriter

writer = BatchWriter(supabase_client, batch_size=500)
await writer.add("reddit_posts", post_data)
await writer.flush()  # Write all pending data
```

## Performance Considerations

- **Cache**: TTL prevents unbounded memory growth
- **API Pool**: Connection reuse reduces overhead
- **Batch Writer**: Reduces database round trips by 90%
- **Proxy Manager**: Automatic rotation on failures

## TODO List

### 🔴 CRITICAL BUGS TO FIX IMMEDIATELY

#### 1. Import Path Issues (`scrapers/reddit/main.py`) ✅ FIXED
- [x] **Lines 19-44**: Fix conflicting relative vs absolute imports that cause ImportError
- [x] Remove fallback import logic that uses incorrect paths
- [x] Fix `sys.path.insert()` manipulation on line 35
- [x] Standardize on absolute imports throughout the codebase
- [x] Test imports work when run as module AND directly
- [x] Also removed ANSI color codes that were polluting logs

#### 2. Missing Dependencies ✅ FIXED
- [x] **CRITICAL**: Add `numpy` to `requirements.txt` (already present on line 43)
- [x] Verify all other imports have corresponding dependencies (all verified)
- [x] Add `fake-useragent` if not already in requirements (already present on line 42)

#### 3. Database Field Mapping Bugs (`database/batch_writer.py`) ✅ FIXED
- [x] **Lines 616-624**: Fix field name mismatches:
  - [x] Change `over_18` to `over18` (DB field name) - Fixed in subreddit.py
  - [x] Change `requires_verification` to `verification_required` (DB field name)
- [x] Audit ALL field mappings between code and database schema
- [ ] Create field mapping constants to prevent future mismatches (future improvement)

#### 4. Batch Writer Race Conditions (`database/batch_writer.py`) ✅ FIXED
- [x] **Lines 249-255**: Move `_flush_in_progress` check INSIDE the lock
- [x] Fix race condition where multiple flushes can start simultaneously
- [x] Add proper async locking for flush operations
- [x] Ensure data integrity during concurrent writes

#### 5. Thread Safety Issues (`clients/api_pool.py`) ✅ FIXED
- [x] **Lines 120-122**: Fix `requests.Session()` thread safety
- [x] Use `threading.local()` for per-thread session storage
- [x] Ensure session cookies/connection pools aren't corrupted
- [x] Add proper thread locks for session access

### 🟡 HIGH PRIORITY FIXES

#### 6. Proxy Validation & Fallback (`clients/api_pool.py`) ✅ FIXED
- [x] **Proxy health validation** - Now tests ALL proxies at startup with 3 attempts each
- [x] **Strict mode enforced** - Script exits if ANY proxy fails all 3 attempts
- [x] **No fallback by design** - ALL proxies must work (per user requirement)
- [x] **Detailed logging** - Logs each attempt and final validation summary
- [x] **Never allows direct API access** - Enforced in code

#### 7. Memory Management Issues ✅ FIXED
- [x] **main.py:302-313**: Add maximum limit to OK subreddit pagination (limited to 2000)
- [x] **batch_writer.py**: Implement retry mechanism for failed records with exponential backoff
- [x] **cache_manager**: Enhanced with memory tracking and force cleanup methods
- [x] **memory_monitor.py**: Added comprehensive memory monitoring with alerts and auto-cleanup

#### 8. Async/Sync Method Conflicts (`database/batch_writer.py`) ✅ FIXED
- [x] **Lines 853-927**: Fix sync methods using async locks incorrectly
- [x] Deprecated sync methods with warnings (not removed to maintain compatibility)
- [x] Use only `asyncio.Lock()` for async, `threading.Lock()` for sync
- [x] Prevent deadlocks from mixed lock types

### 🟢 IMPORTANT IMPROVEMENTS

#### 9. Error Handling & Resilience
- [ ] Add Supabase connection retry logic with exponential backoff
- [ ] Implement circuit breaker pattern for database failures
- [ ] Add rate limit handling for Supabase API calls
- [ ] Create centralized error recovery mechanism
- [ ] Add health check endpoints

#### 10. Logging & Monitoring
- [ ] **main.py:68-79**: Remove ANSI color codes or add terminal detection
- [ ] Fix thread color array bounds (only 8 colors for 9+ threads)
- [ ] Add structured logging with proper log levels
- [ ] Implement log rotation to prevent disk space issues
- [ ] Add performance metrics tracking

#### 11. Configuration & Settings
- [ ] Move hardcoded values to configuration files
- [ ] Add environment-specific settings (dev/staging/prod)
- [ ] Create proxy configuration validation
- [ ] Add feature flags for safe rollouts

#### 12. Data Integrity
- [ ] Add data validation before batch writes
- [ ] Implement transaction support for critical operations
- [ ] Add data consistency checks
- [ ] Create backup mechanism for failed writes

### 🔵 NICE TO HAVE

- [ ] Implement connection pooling for Supabase client
- [ ] Add metrics collection for cache hit rates
- [ ] Create unified error handling middleware
- [ ] Add comprehensive unit tests
- [ ] Create integration tests for proxy system
- [ ] Add performance benchmarking

## Current Errors

### 🚨 CRITICAL ERRORS THAT WILL CAUSE CRASHES:

1. ~~**ImportError on startup** - Conflicting import paths in `scrapers/reddit/main.py`~~ ✅ FIXED
2. ~~**ModuleNotFoundError** - Missing `numpy` dependency when calculating requirements~~ ✅ FIXED (already in requirements)
3. ~~**Data loss** - Field mapping mismatches cause data to not be saved~~ ✅ FIXED
4. ~~**Race condition** - Concurrent flushes in BatchWriter can corrupt data~~ ✅ FIXED
5. ~~**Memory overflow** - No pagination limit when loading OK subreddits~~ ✅ FIXED (limited to 2000)
6. ~~**Thread corruption** - Session objects shared across threads unsafely~~ ✅ FIXED

## Potential Improvements

- **Distributed caching**: Move to Redis cluster for scalability
- **Smart proxy rotation**: ML-based proxy health scoring
- **Connection multiplexing**: Reuse HTTP/2 connections
- **Async everything**: Convert remaining sync code to async

## Dependencies

All core components are designed to be framework-agnostic and can be used by:
- Reddit scraper (`scrapers/reddit/`)
- Instagram scraper (`scrapers/instagram/`)
- API routes and services
- Background tasks and workers