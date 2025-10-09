# Phase 2: Backend Refactoring & Optimization

┌─ REFACTORING PLAN ──────────────────────────────────────┐
│ ● STARTING    │ ░░░░░░░░░░░░░░░░░░░░ 0% COMPLETE       │
│ Version: 2.0.0 │ Start Date: 2025-10-08 21:30           │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "docs/backend/BACKEND_IMPROVEMENT_SYSTEM.md",
  "current": "docs/backend/PHASE_2_REFACTORING_PLAN.md",
  "phase": 2,
  "estimated_duration": "44-60 hours",
  "team_size": "1-2 developers"
}
```

---

## Executive Summary

**Mission**: Refactor backend for better maintainability, performance, and code quality.

```json
{
  "objectives": {
    "async_conversion": "Convert blocking sleep calls to async (9 total)",
    "file_splitting": "Split large files into focused modules",
    "config_consolidation": "Centralize scattered environment variable access",
    "code_quality": "Improve maintainability and testability"
  },
  "timeline": {
    "total_hours": "44-60 hours",
    "weeks": "1-2 weeks (full-time) or 2-3 weeks (part-time)",
    "priority": "HIGH - Foundation for future features"
  },
  "success_criteria": {
    "async_blocking": "0 blocking sleep calls in async code",
    "file_size": "No file >500 lines",
    "config": "100% centralized configuration",
    "test_coverage": "50%+ after refactoring"
  }
}
```

---

## Part 1: Async Sleep Conversion (16-20 hours)

### 1.1 Reddit Scraper (Priority: P1 - Easier, High Impact)

**Current State:**
```json
{
  "architecture": "Async-based (async/await)",
  "async_functions": 8,
  "blocking_sleep_calls": 3,
  "location": "All in SYNC helper functions",
  "impact": "Blocks event loop during database retries"
}
```

**Sleep Call Locations:**
1. `save_subreddit()` - line 1183 (database retry loop)
2. `save_posts()` - line 1558 (database retry loop)
3. `save_user()` - line 1691 (database retry loop)

**Refactoring Strategy:**

#### Step 1: Convert Helper Functions to Async (2-3 hours)

```python
# BEFORE (SYNC):
def save_subreddit(self, subreddit_data: dict):
    """Save subreddit to database with retry logic"""
    for attempt in range(max_retries):
        try:
            self.supabase.table('reddit_subreddits').upsert(subreddit_data).execute()
            break
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)  # ❌ BLOCKS EVENT LOOP
            else:
                raise

# AFTER (ASYNC):
async def save_subreddit(self, subreddit_data: dict):
    """Save subreddit to database with async retry logic"""
    for attempt in range(max_retries):
        try:
            # Note: Supabase client is sync, wrap in executor
            result = await asyncio.to_thread(
                self.supabase.table('reddit_subreddits').upsert(subreddit_data).execute
            )
            break
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)  # ✅ NON-BLOCKING
            else:
                raise
```

#### Step 2: Update All Callers (1-2 hours)

**Files to update:**
- `reddit_scraper.py` - Update calls to `save_subreddit()`, `save_posts()`, `save_user()`
- Add `await` to all function calls
- Verify all calling functions are async

**Expected Changes:**
```python
# BEFORE:
self.save_subreddit(subreddit_data)
self.save_posts(posts)
self.save_user(user_data)

# AFTER:
await self.save_subreddit(subreddit_data)
await self.save_posts(posts)
await self.save_user(user_data)
```

#### Step 3: Test & Verify (1 hour)

- Run Reddit scraper in development
- Monitor event loop performance
- Verify no blocking operations
- Check error handling works correctly

**Estimated Total: 4-6 hours**

---

### 1.2 Instagram Scraper (Priority: P2 - Complex, Architectural Change)

**Current State:**
```json
{
  "architecture": "Threading-based (threading.Thread)",
  "async_functions": 2,
  "blocking_sleep_calls": 6,
  "challenge": "Entire scraper uses threading, not async/await",
  "effort": "High - requires architectural refactoring"
}
```

**Sleep Call Locations:**
1. `_apply_rate_limiting()` - line 312 (rate limiting)
2. `_fetch_reels()` - line 452 (retry delay)
3. `_fetch_posts()` - line 525 (retry delay)
4. `process_all_creators()` - line 1851 (thread wait)
5. `process_all_creators()` - line 1866 (thread stagger)

**Refactoring Strategy:**

#### Option A: Full Async Conversion (Recommended, 12-16 hours)

Convert from threading to async/await architecture:

**Phase A1: Core Functions to Async (6-8 hours)**

```python
# BEFORE (Threading):
class InstagramScraperUnified:
    def process_creator(self, creator: dict) -> bool:
        """Process single creator (sync)"""
        reels = self._fetch_reels(creator['ig_user_id'])
        posts = self._fetch_posts(creator['ig_user_id'])
        return True

    def process_all_creators(self, creators: List[dict]):
        """Process using threads"""
        threads = []
        for creator in creators:
            thread = threading.Thread(target=self.process_creator, args=(creator,))
            threads.append(thread)
            thread.start()
            time.sleep(0.05)  # Stagger threads

        for thread in threads:
            thread.join()

# AFTER (Async):
class InstagramScraperUnified:
    async def process_creator(self, creator: dict) -> bool:
        """Process single creator (async)"""
        reels = await self._fetch_reels(creator['ig_user_id'])
        posts = await self._fetch_posts(creator['ig_user_id'])
        return True

    async def process_all_creators(self, creators: List[dict]):
        """Process using asyncio tasks"""
        # Create tasks for concurrent processing
        tasks = []
        for creator in creators:
            task = asyncio.create_task(self.process_creator(creator))
            tasks.append(task)
            await asyncio.sleep(0.05)  # Stagger tasks

        # Wait for all tasks with gathering
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
```

**Phase A2: HTTP Client to Async (3-4 hours)**

```python
# BEFORE (Sync requests):
import requests
response = requests.get(url, headers=headers)

# AFTER (Async aiohttp):
import aiohttp
async with aiohttp.ClientSession() as session:
    async with session.get(url, headers=headers) as response:
        data = await response.json()
```

**Phase A3: Rate Limiting to Async (1-2 hours)**

```python
# BEFORE (Blocking):
def _apply_rate_limiting(self):
    time_since_last = time.time() - self.last_request_time
    if time_since_last < Config.RATE_LIMIT_DELAY:
        time.sleep(Config.RATE_LIMIT_DELAY - time_since_last)  # ❌ BLOCKS
    self.last_request_time = time.time()

# AFTER (Async):
async def _apply_rate_limiting(self):
    time_since_last = time.time() - self.last_request_time
    if time_since_last < Config.RATE_LIMIT_DELAY:
        await asyncio.sleep(Config.RATE_LIMIT_DELAY - time_since_last)  # ✅ NON-BLOCKING
    self.last_request_time = time.time()
```

**Phase A4: Controller Updates (2 hours)**

Update `instagram_controller.py` and `instagram_controller_redis.py` to use async:

```python
# BEFORE:
def run_scraper():
    scraper = InstagramScraperUnified()
    scraper.process_all_creators(creators)

# AFTER:
async def run_scraper():
    scraper = InstagramScraperUnified()
    await scraper.process_all_creators(creators)

# In worker.py or API endpoint:
asyncio.run(run_scraper())
```

**Estimated Total: 12-16 hours**

#### Option B: Minimal Changes (Faster, Less Optimal)

Keep threading, only fix rate limiting sleep:
- Convert `_apply_rate_limiting()` to use async
- Add small async wrapper for rate limiting
- Keep threading architecture

**Estimated: 2-3 hours** (but less performance gain)

**Recommendation:** **Option A** - Full async conversion for long-term maintainability

---

### 1.3 Benefits of Async Conversion

```json
{
  "performance": {
    "reddit_scraper": "10-15% faster (non-blocking retries)",
    "instagram_scraper": "30-40% faster (true concurrency vs threading)",
    "hetzner_optimization": "Better CPU utilization on CPX31 (4 vCPU)"
  },
  "code_quality": {
    "consistency": "Both scrapers use same async patterns",
    "testability": "Easier to test with pytest-asyncio",
    "maintainability": "Clearer control flow, no GIL issues"
  },
  "scalability": {
    "concurrent_creators": "Can process 10-20 simultaneously (vs 5 with threads)",
    "resource_usage": "Lower memory overhead (async tasks vs threads)",
    "rate_limiting": "More precise (no blocking delays)"
  }
}
```

---

## Part 2: File Refactoring (20-30 hours)

### 2.1 Instagram Scraper Refactoring (12-15 hours)

**Current:** `instagram_scraper.py` - 2,133 lines (SINGLE FILE)

**Target:** 5 focused modules, each <500 lines

#### Module Breakdown:

**1. `instagram_scraper.py` (300 lines)** - Main orchestrator
```python
"""
Main Instagram scraper class - orchestration only
"""
from .api_client import InstagramAPIClient
from .data_processor import InstagramDataProcessor
from .media_handler import InstagramMediaHandler
from .rate_limiter import RateLimiter
from .metrics_tracker import MetricsTracker

class InstagramScraperUnified:
    def __init__(self):
        self.api_client = InstagramAPIClient()
        self.processor = InstagramDataProcessor()
        self.media = InstagramMediaHandler()
        self.rate_limiter = RateLimiter()
        self.metrics = MetricsTracker()

    async def process_creator(self, creator: dict) -> bool:
        """High-level orchestration only"""
        await self.rate_limiter.wait()
        profile = await self.api_client.fetch_profile(creator['ig_user_id'])
        reels = await self.api_client.fetch_reels(creator['ig_user_id'])
        posts = await self.api_client.fetch_posts(creator['ig_user_id'])

        processed = self.processor.process_creator_data(profile, reels, posts)
        await self.media.upload_media(processed['media'])

        self.metrics.record_success()
        return True
```

**2. `api_client.py` (400 lines)** - RapidAPI HTTP client
```python
"""
Instagram RapidAPI client
Handles all HTTP requests to Instagram Looter API
"""
class InstagramAPIClient:
    async def fetch_profile(self, user_id: str) -> dict:
        """Fetch profile data"""

    async def fetch_reels(self, user_id: str, count: int = 12) -> List[dict]:
        """Fetch reels with retry logic"""

    async def fetch_posts(self, user_id: str, count: int = 12) -> List[dict]:
        """Fetch posts with retry logic"""

    async def _make_request(self, endpoint: str, params: dict) -> dict:
        """Unified request handler with retries"""
```

**3. `data_processor.py` (500 lines)** - Data parsing & validation
```python
"""
Process and validate Instagram API responses
"""
class InstagramDataProcessor:
    def process_creator_data(self, profile, reels, posts) -> dict:
        """Process all creator data"""

    def _parse_reel(self, reel_data: dict) -> dict:
        """Parse single reel"""

    def _parse_post(self, post_data: dict) -> dict:
        """Parse single post"""

    def _validate_data(self, data: dict) -> bool:
        """Validate processed data"""
```

**4. `media_handler.py` (400 lines)** - R2 uploads & compression
```python
"""
Handle media uploads to Cloudflare R2
"""
class InstagramMediaHandler:
    async def upload_media(self, media_items: List[dict]) -> List[str]:
        """Upload all media items"""

    async def upload_profile_picture(self, url: str, creator_id: str) -> str:
        """Upload profile picture"""

    async def upload_carousel(self, images: List[str], post_id: str) -> List[str]:
        """Upload carousel images"""

    async def upload_video(self, url: str, post_id: str) -> str:
        """Compress and upload video"""
```

**5. `rate_limiter.py` (200 lines)** - Rate limiting logic
```python
"""
Rate limiting and request throttling
"""
class RateLimiter:
    def __init__(self):
        self.last_request = 0.0
        self.delay = Config.RATE_LIMIT_DELAY

    async def wait(self):
        """Wait for rate limit if needed"""
        elapsed = time.time() - self.last_request
        if elapsed < self.delay:
            await asyncio.sleep(self.delay - elapsed)
        self.last_request = time.time()
```

**6. `metrics_tracker.py` (300 lines)** - Stats & monitoring
```python
"""
Track scraper performance metrics
"""
class MetricsTracker:
    def record_success(self):
        """Record successful creator processing"""

    def record_failure(self, error: Exception):
        """Record failure with error details"""

    def get_summary(self) -> dict:
        """Get performance summary"""
```

**Migration Plan:**
1. Create new module files (1 hour)
2. Move code from main file to modules (4-6 hours)
3. Update imports and dependencies (2-3 hours)
4. Test each module independently (3-4 hours)
5. Integration testing (2 hours)

**Estimated: 12-15 hours**

---

### 2.2 Reddit Scraper Refactoring (10-12 hours)

**Current:** `reddit_scraper.py` - 1,808 lines (SINGLE FILE)

**Target:** 4 focused modules, each <500 lines

#### Module Breakdown:

**1. `reddit_scraper.py` (300 lines)** - Main orchestrator
**2. `subreddit_processor.py` (500 lines)** - Subreddit scraping
**3. `user_processor.py` (500 lines)** - User scraping
**4. `discovery_engine.py` (300 lines)** - Subreddit discovery
**5. `cache_manager.py` (200 lines)** - Cache management

**Estimated: 10-12 hours**

---

## Part 3: Configuration Consolidation (8-10 hours)

### 3.1 Current State

```json
{
  "scattered_calls": 119,
  "files_affected": 26,
  "patterns": [
    "os.getenv('KEY', 'default')",
    "os.environ['KEY']",
    "os.environ.get('KEY')"
  ],
  "issues": [
    "No type validation",
    "Duplicated default values",
    "No centralized config validation",
    "Hard to test (requires env var mocking)"
  ]
}
```

### 3.2 Target Architecture

**Single config module:** `app/config.py` (already exists, needs adoption)

```python
# app/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    supabase_url: str
    supabase_service_key: str

    # External APIs
    openai_api_key: str
    rapidapi_key: str
    rapidapi_host: str = "instagram-looter2.p.rapidapi.com"

    # Storage
    r2_account_id: Optional[str] = None
    r2_access_key: Optional[str] = None
    r2_secret_key: Optional[str] = None
    r2_bucket_name: str = "b9-instagram-media"
    enable_r2_storage: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Environment
    environment: str = "production"

    class Config:
        env_file = ".env"
        case_sensitive = False

# Global instance
settings = Settings()
```

### 3.3 Migration Strategy

**Phase 1: Update imports (3-4 hours)**
```python
# BEFORE:
import os
api_key = os.getenv("RAPIDAPI_KEY")

# AFTER:
from app.config import settings
api_key = settings.rapidapi_key
```

**Phase 2: Remove os imports (1 hour)**

**Phase 3: Test configuration loading (2-3 hours)**

**Phase 4: Add configuration validation (2 hours)**

**Estimated: 8-10 hours**

---

## Part 4: Implementation Timeline

### Week 1: Async Conversion (16-20 hours)

**Days 1-2: Reddit Scraper (4-6 hours)**
- Convert 3 helper functions to async
- Update all callers
- Test and verify

**Days 3-5: Instagram Scraper (12-14 hours)**
- Convert core functions to async
- Replace requests with aiohttp
- Update rate limiting
- Update controllers
- Integration testing

### Week 2: File Refactoring (20-30 hours)

**Days 1-3: Instagram Refactoring (12-15 hours)**
- Create 5 modules
- Move code systematically
- Update imports
- Test each module

**Days 4-5: Reddit Refactoring (10-12 hours)**
- Create 4 modules
- Move code systematically
- Integration testing

### Week 3: Configuration & Testing (8-10 hours)

**Days 1-2: Config Consolidation (8-10 hours)**
- Update 119 os.getenv() calls
- Centralize configuration
- Add validation

**Day 3: Final Integration Testing**
- End-to-end testing
- Performance benchmarking
- Documentation updates

---

## Success Criteria

```json
{
  "code_quality": {
    "async_blocking": "0 blocking sleep calls in async code ✅",
    "max_file_size": "500 lines ✅",
    "config_centralization": "100% ✅",
    "test_coverage": "50%+ ✅"
  },
  "performance": {
    "reddit_scraper": "10-15% faster",
    "instagram_scraper": "30-40% faster",
    "hetzner_cpu_usage": "80%+ on CPX31"
  },
  "maintainability": {
    "module_count": "9 focused modules (vs 2 monoliths)",
    "avg_module_size": "<400 lines",
    "single_config_source": true
  }
}
```

---

## Risk Mitigation

```json
{
  "risks": [
    {
      "risk": "Breaking existing functionality",
      "mitigation": "Incremental changes, test after each step, Git branches"
    },
    {
      "risk": "Async conversion complexity",
      "mitigation": "Start with Reddit (simpler), learn, then apply to Instagram"
    },
    {
      "risk": "Import circular dependencies",
      "mitigation": "Clear module hierarchy, dependency injection"
    },
    {
      "risk": "Performance regression",
      "mitigation": "Benchmark before/after, monitor Hetzner metrics"
    }
  ]
}
```

---

## Next Steps

**Immediate (Today):**
1. Start with Reddit async conversion (easiest, high impact)
2. Convert `save_subreddit()`, `save_posts()`, `save_user()` to async
3. Test in development environment

**This Week:**
1. Complete Reddit async conversion (4-6h)
2. Start Instagram async conversion (12-16h)

**Next Week:**
1. File refactoring (Instagram, then Reddit)
2. Configuration consolidation

---

_Plan Version: 2.0.0 | Created: 2025-10-08 | Status: READY TO EXECUTE_
