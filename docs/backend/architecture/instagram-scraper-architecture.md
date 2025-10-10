# Instagram Scraper Architecture

## Overview
The Instagram scraper has two controller implementations:

### 1. Direct Processing Controller
**File:** `backend/app/scrapers/instagram/instagram_controller.py`

**Type:** Synchronous, direct processing
**Status:** ✅ Production (currently used by API and start.py)

**Architecture:**
- Processes creators directly in a single process
- Fetches enabled creators from database
- Processes each creator sequentially
- Updates database directly

**Used By:**
- `backend/start.py:124` - Auto-start on server launch
- `backend/app/api/instagram/scraper.py:708` - API start endpoint

**Pros:**
- Simple, straightforward architecture
- No external dependencies (Redis)
- Easy to debug and monitor

**Cons:**
- Single process, limited scalability
- Can't distribute across multiple servers
- No job persistence on restart

---

### 2. Redis Queue Controller
**File:** `backend/app/scrapers/instagram/instagram_controller_redis.py`

**Type:** Distributed queue architecture
**Status:** 🚧 Available (not currently wired to production)

**Architecture:**
- Adds creator jobs to Redis queue
- Workers (via `worker.py`) pull jobs from queue
- Enables horizontal scaling with multiple workers
- Job persistence across restarts

**Used By:**
- Not currently integrated into production flow
- Designed for future scale-out architecture

**Pros:**
- Horizontal scaling (multiple workers)
- Better resource utilization
- Job persistence via Redis
- Load balancing across workers

**Cons:**
- Requires Redis server
- More complex architecture
- Additional infrastructure to manage

---

## Migration Path

### Current State (v3.x)
Using direct processing controller for simplicity and stability.

### Future State (v4.x+)
Consider migrating to Redis queue architecture when:
- Processing more than 100 creators regularly
- Need to distribute load across multiple servers
- Require better failure recovery and job retry logic

### Migration Steps (When Ready)
1. Ensure Redis server is available and configured
2. Update `start.py` to reference `instagram_controller_redis.py`
3. Deploy worker processes (`worker.py`) on target servers
4. Update API routes to use queue-based endpoints
5. Test with small subset of creators
6. Gradually migrate all creators to queue-based processing

---

## Recommendation
**Keep both controllers** until migration to Phase 5-6 (Tracking Interface).
The direct controller is production-proven and stable for current scale.
The Redis controller provides a clear migration path for future scaling needs.

---

**Last Updated:** 2025-10-10
**Version:** 4.0.0
**Related Files:**
- `backend/app/scrapers/instagram/instagram_controller.py`
- `backend/app/scrapers/instagram/instagram_controller_redis.py`
- `backend/worker.py`
