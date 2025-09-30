# Reddit Scraper Phase 1: Async API Optimization

┌─ OPTIMIZATION STATUS ───────────────────────────────────┐
│ ⏳ PLANNED     │ ░░░░░░░░░░░░░░░░░░░░ 0% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "PHASE_1_ASYNC_OPTIMIZATION.md",
  "parent": "../README.md",
  "related": [
    {"path": "app/scrapers/reddit/reddit_scraper.py", "desc": "Main scraper", "status": "TO_MODIFY"},
    {"path": "app/scrapers/reddit/public_reddit_api.py", "desc": "API client", "status": "TO_MODIFY"}
  ]
}
```

## System Metrics

```json
{
  "current_version": "3.1.2",
  "target_version": "3.2.0",
  "performance": {
    "current_subreddit_time": "30-45s",
    "target_subreddit_time": "8-12s",
    "expected_speedup": "3-6x",
    "api_call_time_current": "2.5-5s (sequential)",
    "api_call_time_target": "0.8-1.2s (parallel)"
  },
  "compatibility": {
    "fake_useragent": "PRESERVED",
    "proxy_rotation": "PRESERVED",
    "authentication": "PRESERVED",
    "anti_detection": "UNCHANGED"
  }
}
```

## Project Status

```
Phase 1     [⏳ PLANNED]  Async API + Connection Pooling
Phase 2     [░░ PENDING]  Parallel Subreddit Processing
Phase 3     [░░ PENDING]  Database Batch Operations
Phase 4     [░░ PENDING]  Caching & Fine-tuning
```

---

## Objective

**Transform synchronous Reddit API calls into parallel async operations with HTTP connection pooling for 3-6x speedup per subreddit.**

### Current Bottleneck

```python
# reddit_scraper.py:408-419 - Sequential API calls (~2-5 seconds)
subreddit_info = self.api.get_subreddit_info(subreddit_name, proxy)  # ~500ms
rules = self.api.get_subreddit_rules(subreddit_name, proxy)          # ~400ms
hot_30 = self.api.get_subreddit_hot_posts(subreddit_name, 30, proxy) # ~600ms
top_10_weekly = self.api.get_subreddit_top_posts(subreddit_name, 'week', 10, proxy)  # ~500ms
top_100_yearly = self.api.get_subreddit_top_posts(subreddit_name, 'year', 100, proxy) # ~800ms

# Total: ~2.8s minimum (sequential)
# + TCP handshake overhead: +100-200ms per request = +0.5-1s
# Actual total: 3.3-5s per subreddit for API calls alone
```

### Target Implementation

```python
# Parallel execution with connection pooling (~800ms)
results = await asyncio.gather(
    self.api.get_subreddit_info(subreddit_name, proxy),
    self.api.get_subreddit_rules(subreddit_name, proxy),
    self.api.get_subreddit_hot_posts(subreddit_name, 30, proxy),
    self.api.get_subreddit_top_posts(subreddit_name, 'week', 10, proxy),
    self.api.get_subreddit_top_posts(subreddit_name, 'year', 100, proxy)
)

# Total: ~800ms (limited by slowest request)
# Speedup: 3.3-5s → 0.8-1.2s = 3-5x faster
```

---

## Threading Architecture

```json
{
  "model": "Proxy-based Thread Distribution",
  "description": "1 main thread per proxy, each processes subreddits sequentially",
  "layers": {
    "layer_1_main_threads": {
      "count": "1-3 (1 per active proxy)",
      "assignment": "Round-robin subreddit distribution",
      "concurrency": "Sequential within thread"
    },
    "layer_2_api_calls": {
      "count": "5 parallel calls per subreddit",
      "technology": "aiohttp + asyncio.gather()",
      "concurrency": "Parallel within subreddit"
    },
    "layer_3_user_processing": {
      "count": "5 async tasks per subreddit",
      "technology": "asyncio tasks (replacing ThreadPoolExecutor)",
      "concurrency": "Parallel batch of 5 users"
    }
  },
  "peak_concurrency": "3 threads × 5 user tasks = 15 concurrent operations"
}
```

### Visual Architecture

```
┌─────────────────────────────────────────────────────────┐
│ PROXY A THREAD (Main Thread 1)                         │
│  ├─ Subreddit 1 (sequential)                           │
│  │   ├─ Fetch 5 API calls (parallel - Phase 1)         │
│  │   └─ Process 5 users (5 async tasks)                │
│  ├─ Subreddit 4                                         │
│  │   ├─ Fetch 5 API calls (parallel)                   │
│  │   └─ Process 5 users (5 async tasks)                │
│  └─ Subreddit 7...                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PROXY B THREAD (Main Thread 2)                         │
│  ├─ Subreddit 2 (sequential)                           │
│  │   ├─ Fetch 5 API calls (parallel - Phase 1)         │
│  │   └─ Process 5 users (5 async tasks)                │
│  └─ Subreddit 5...                                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PROXY C THREAD (Main Thread 3)                         │
│  ├─ Subreddit 3 (sequential)                           │
│  │   ├─ Fetch 5 API calls (parallel - Phase 1)         │
│  │   └─ Process 5 users (5 async tasks)                │
│  └─ Subreddit 6...                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Dependencies

```json
{
  "new_packages": [
    {"name": "aiohttp", "version": ">=3.9.0", "purpose": "Async HTTP client with connection pooling"}
  ],
  "existing_preserved": [
    {"name": "requests", "status": "REPLACED by aiohttp"},
    {"name": "fake_useragent", "status": "UNCHANGED"},
    {"name": "asyncio", "status": "EXPANDED usage"}
  ]
}
```

**Installation:**
```bash
pip install aiohttp>=3.9.0
```

---

### File Modifications

```json
{
  "files_modified": 2,
  "total_lines_changed": "~150-200",
  "breakdown": [
    {
      "file": "public_reddit_api.py",
      "lines_modified": "~100-120",
      "changes": [
        "Add aiohttp imports",
        "Add session management (__aenter__, __aexit__)",
        "Convert _request_with_retry to async",
        "Convert 6 public methods to async",
        "Replace requests.get with aiohttp",
        "Replace time.sleep with asyncio.sleep"
      ]
    },
    {
      "file": "reddit_scraper.py",
      "lines_modified": "~50-80",
      "changes": [
        "Initialize aiohttp session in run()",
        "Replace sequential API calls with asyncio.gather()",
        "Convert process_single_user to async",
        "Replace ThreadPoolExecutor with asyncio tasks",
        "Add session cleanup",
        "Update version to 3.2.0"
      ]
    }
  ]
}
```

---

### Code Changes: public_reddit_api.py

#### A. Imports (Line 6-9)

```python
# ADD:
import aiohttp
import asyncio
```

#### B. Session Management (After __init__)

```python
async def __aenter__(self):
    """Async context manager entry - creates aiohttp session"""
    connector = aiohttp.TCPConnector(
        limit=20,              # Max 20 concurrent connections total
        limit_per_host=10,     # Max 10 per host
        ttl_dns_cache=300      # Cache DNS for 5 minutes
    )
    timeout = aiohttp.ClientTimeout(total=30, connect=15)
    self.session = aiohttp.ClientSession(connector=connector, timeout=timeout)
    return self

async def __aexit__(self, exc_type, exc_val, exc_tb):
    """Async context manager exit - closes session"""
    if self.session:
        await self.session.close()

async def ensure_session(self):
    """Ensure session exists (for non-context-manager use)"""
    if self.session is None or self.session.closed:
        connector = aiohttp.TCPConnector(limit=20, limit_per_host=10)
        self.session = aiohttp.ClientSession(connector=connector)
```

#### C. Convert _request_with_retry to Async (Line 29-123)

```python
async def _request_with_retry(self, url: str, proxy_config: Dict) -> Optional[Dict]:
    """Make async HTTP request with retry logic and error handling"""

    await self.ensure_session()

    proxy_str = proxy_config['proxy']
    proxy_url = f"http://{proxy_str}"

    retries = 0
    while retries < self.max_retries:
        try:
            start_time = time.time()
            user_agent = self.proxy_manager.generate_user_agent()

            async with self.session.get(
                url,
                headers={'User-Agent': user_agent},
                proxy=proxy_url,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as response:
                response_time_ms = int((time.time() - start_time) * 1000)
                status_code = response.status

                endpoint = url.split('reddit.com')[1] if 'reddit.com' in url else url
                logger.info(f"🌐 REDDIT API: {endpoint} [{status_code}] {response_time_ms}ms")

                # Handle status codes (404, 403, 429)
                if status_code == 404:
                    json_response = await response.json()
                    # ... handle banned/not_found

                if status_code == 403:
                    return {'error': 'forbidden', 'status': 403}

                if status_code == 429:
                    rate_limit_delay = min(5 + (retries * 2), 30)
                    logger.warning(f"⏳ Rate limited - waiting {rate_limit_delay}s")
                    if retries >= 5:
                        return {'error': 'rate_limited', 'status': 429}
                    await asyncio.sleep(rate_limit_delay)  # ← Changed from time.sleep
                    retries += 1
                    continue

                response.raise_for_status()

                # Update proxy stats (success)
                self.proxy_manager.update_proxy_stats(proxy_config, True)

                return await response.json()

        except aiohttp.ClientError as e:
            retries += 1
            self.proxy_manager.update_proxy_stats(proxy_config, False)

            if retries < self.max_retries:
                delay = self.base_delay
                logger.warning(f"⚠️ Request failed (attempt {retries}/{self.max_retries}) - retrying in {delay:.1f}s")
                await asyncio.sleep(delay)  # ← Changed from time.sleep
            else:
                logger.error(f"❌ Request failed after {self.max_retries} retries: {str(e)[:100]}")
                break

    return None
```

#### D. Convert All Public Methods to Async

```python
# ALL 6 methods get 'async' keyword and 'await' for _request_with_retry

async def get_subreddit_info(self, subreddit_name: str, proxy_config: Dict) -> Optional[Dict]:
    url = f"https://www.reddit.com/r/{subreddit_name}/about.json"
    response = await self._request_with_retry(url, proxy_config)
    # ... rest unchanged

async def get_subreddit_rules(self, subreddit_name: str, proxy_config: Dict) -> List[Dict]:
    url = f"https://www.reddit.com/r/{subreddit_name}/about/rules.json"
    response = await self._request_with_retry(url, proxy_config)
    # ... rest unchanged

async def get_subreddit_hot_posts(self, subreddit_name: str, limit: int = 30, proxy_config: Dict = None) -> List[Dict]:
    url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={limit}"
    response = await self._request_with_retry(url, proxy_config)
    # ... rest unchanged

async def get_subreddit_top_posts(self, subreddit_name: str, time_filter: str = 'year', limit: int = 100, proxy_config: Dict = None) -> List[Dict]:
    url = f"https://www.reddit.com/r/{subreddit_name}/top.json?t={time_filter}&limit={limit}"
    response = await self._request_with_retry(url, proxy_config)
    # ... rest unchanged

async def get_user_info(self, username: str, proxy_config: Dict) -> Optional[Dict]:
    url = f"https://www.reddit.com/user/{username}/about.json"
    response = await self._request_with_retry(url, proxy_config)
    # ... rest unchanged

async def get_user_posts(self, username: str, limit: int = 30, proxy_config: Dict = None) -> List[Dict]:
    url = f"https://www.reddit.com/user/{username}/submitted.json?limit={limit}"
    response = await self._request_with_retry(url, proxy_config)
    # ... rest unchanged
```

---

### Code Changes: reddit_scraper.py

#### A. Initialize Async Session (Line 115)

```python
# OLD:
self.api = PublicRedditAPI(self.proxy_manager)

# NEW:
self.api = PublicRedditAPI(self.proxy_manager)
await self.api.ensure_session()
```

#### B. Parallelize API Calls (Line 408-419)

```python
# OLD - Sequential:
subreddit_info = self.api.get_subreddit_info(subreddit_name, proxy)
if not subreddit_info or 'error' in subreddit_info:
    logger.error(f"❌ Failed to fetch r/{subreddit_name}")
    return set()

rules = self.api.get_subreddit_rules(subreddit_name, proxy)
hot_30 = self.api.get_subreddit_hot_posts(subreddit_name, 30, proxy)
top_10_weekly = self.api.get_subreddit_top_posts(subreddit_name, 'week', 10, proxy)
top_100_yearly = self.api.get_subreddit_top_posts(subreddit_name, 'year', 100, proxy)

# NEW - Parallel:
results = await asyncio.gather(
    self.api.get_subreddit_info(subreddit_name, proxy),
    self.api.get_subreddit_rules(subreddit_name, proxy),
    self.api.get_subreddit_hot_posts(subreddit_name, 30, proxy),
    self.api.get_subreddit_top_posts(subreddit_name, 'week', 10, proxy),
    self.api.get_subreddit_top_posts(subreddit_name, 'year', 100, proxy),
    return_exceptions=True
)

subreddit_info, rules, hot_30, top_10_weekly, top_100_yearly = results

# Error handling for parallel results
if not subreddit_info or isinstance(subreddit_info, Exception) or 'error' in subreddit_info:
    logger.error(f"❌ Failed to fetch r/{subreddit_name}")
    return set()

if isinstance(rules, Exception): rules = []
if isinstance(hot_30, Exception): hot_30 = []
if isinstance(top_10_weekly, Exception): top_10_weekly = []
if isinstance(top_100_yearly, Exception): top_100_yearly = []
```

#### C. Convert process_single_user to Async (Line 524-542)

```python
async def process_single_user(self, username: str, proxy: dict) -> dict:
    """Process a single user (async version)"""
    try:
        # Fetch user info and posts in parallel
        user_info, user_posts = await asyncio.gather(
            self.api.get_user_info(username, proxy),
            self.api.get_user_posts(username, 30, proxy),
            return_exceptions=True
        )

        if isinstance(user_info, Exception) or not user_info or 'error' in user_info:
            return None

        if isinstance(user_posts, Exception):
            user_posts = []

        self.save_user(user_info)
        self.save_posts(user_posts)

        subs = self.extract_subreddits_from_posts(user_posts)

        return {
            'user_info': user_info,
            'subreddits': subs
        }
    except Exception as e:
        logger.debug(f"      ⚠️ Error processing u/{username}: {e}")
        return None
```

#### D. Replace ThreadPoolExecutor with Asyncio (Line 454-472)

```python
# OLD - ThreadPoolExecutor:
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(self.process_single_user, username, proxy): username
              for username in batch}

    for future in as_completed(futures):
        username = futures[future]
        try:
            result = future.result()
            if result:
                user_data_list.append(result['user_info'])
                discovered_subreddits.update(result['subreddits'])
        except Exception as e:
            logger.debug(f"      ⚠️ Failed to process u/{username}: {e}")

# NEW - Asyncio tasks:
tasks = [self.process_single_user(username, proxy) for username in batch]
results = await asyncio.gather(*tasks, return_exceptions=True)

for result in results:
    if isinstance(result, Exception):
        logger.debug(f"      ⚠️ Failed to process user: {result}")
        continue

    if result:
        user_data_list.append(result['user_info'])
        discovered_subreddits.update(result['subreddits'])
```

#### E. Session Cleanup (After Line 167)

```python
# Before exiting run() method
if self.api and self.api.session:
    await self.api.session.close()
```

#### F. Update Version (Line 38)

```python
SCRAPER_VERSION = "3.2.0"
```

---

## Compatibility Matrix

```json
{
  "anti_detection": {
    "fake_useragent_library": {"status": "PRESERVED", "impact": "NONE"},
    "proxy_rotation": {"status": "PRESERVED", "impact": "NONE"},
    "authenticated_proxies": {"status": "PRESERVED", "impact": "NONE"},
    "user_agent_rotation": {"status": "PRESERVED", "impact": "NONE"},
    "request_delays": {"status": "PRESERVED", "impact": "NONE"},
    "round_robin_proxy": {"status": "PRESERVED", "impact": "NONE"}
  },
  "proxy_format": {
    "current": "username:password@host:port",
    "after_phase_1": "username:password@host:port",
    "compatibility": "100% IDENTICAL"
  },
  "user_agent_header": {
    "current": "headers={'User-Agent': proxy_manager.generate_user_agent()}",
    "after_phase_1": "headers={'User-Agent': proxy_manager.generate_user_agent()}",
    "compatibility": "100% IDENTICAL"
  }
}
```

---

## Performance Benchmarks

### Expected Results

```json
{
  "before_phase_1": {
    "single_subreddit": "30-45s",
    "api_calls_sequential": "2.5-5s",
    "tcp_handshake_overhead": "+100-200ms per request",
    "user_processing": "ThreadPoolExecutor (5 threads)",
    "100_subreddits": "50-75 minutes"
  },
  "after_phase_1": {
    "single_subreddit": "8-12s",
    "api_calls_parallel": "0.8-1.2s",
    "connection_pooling": "Reuses connections (saves 100-200ms)",
    "user_processing": "Asyncio tasks (5 parallel)",
    "100_subreddits": "13-20 minutes"
  },
  "improvements": {
    "per_subreddit_speedup": "3-4x",
    "api_call_speedup": "3-5x",
    "connection_overhead_reduction": "15-30%",
    "overall_speedup": "3-6x"
  }
}
```

### Measurement Points

```python
# Add timing to process_subreddit
start_time = time.time()

# ... API calls ...

api_time = time.time() - start_time
logger.info(f"   ⏱️  API calls: {api_time:.2f}s")

# ... user processing ...

total_time = time.time() - start_time
logger.info(f"   ⏱️  Total: {total_time:.2f}s")
```

---

## Testing Strategy

```json
{
  "phases": [
    {
      "phase": "Unit Testing",
      "duration": "15 min",
      "tests": [
        "Verify aiohttp session creation",
        "Test async API methods individually",
        "Verify proxy authentication works",
        "Verify user agent rotation works",
        "Test error handling (404, 403, 429)"
      ]
    },
    {
      "phase": "Integration Testing",
      "duration": "20 min",
      "tests": [
        "Test 1 subreddit end-to-end",
        "Verify all data saved correctly",
        "Compare before/after database records",
        "Measure timing improvements",
        "Test with 3 different proxies"
      ]
    },
    {
      "phase": "Load Testing",
      "duration": "30 min",
      "tests": [
        "Test 10 subreddits",
        "Monitor proxy health",
        "Check for rate limiting",
        "Verify connection pool stability",
        "Monitor error rates"
      ]
    }
  ]
}
```

### Test Commands

```bash
# Install dependencies
pip install aiohttp>=3.9.0

# Test single subreddit
python3 test_v3_1_0.py

# Monitor performance
# Check timing logs in output
# Compare database counts before/after

# Verify proxy stats
# Query reddit_proxies table for success/error counts
```

---

## Rollback Plan

```json
{
  "strategy": "Keep sync version as backup",
  "steps": [
    "1. Backup current files before changes",
    "2. Save as public_reddit_api_sync.py (backup)",
    "3. Implement async version",
    "4. If issues occur: revert import in reddit_scraper.py",
    "5. git commit before changes for easy revert"
  ],
  "recovery_time": "< 5 minutes"
}
```

### Backup Commands

```bash
# Before Phase 1
cp app/scrapers/reddit/public_reddit_api.py app/scrapers/reddit/public_reddit_api_sync.py
git add -A
git commit -m "Backup before Phase 1 async optimization"

# If rollback needed
git revert HEAD
# Or manually restore from public_reddit_api_sync.py
```

---

## Risk Assessment

```json
{
  "overall_risk": "LOW",
  "risks": [
    {
      "risk": "aiohttp compatibility issues",
      "probability": "LOW",
      "impact": "MEDIUM",
      "mitigation": "Well-tested library, backup available"
    },
    {
      "risk": "Proxy authentication fails",
      "probability": "VERY LOW",
      "impact": "HIGH",
      "mitigation": "Format identical to requests, tested in unit tests"
    },
    {
      "risk": "Connection pool exhaustion",
      "probability": "LOW",
      "impact": "MEDIUM",
      "mitigation": "Limits set (20 total, 10 per host)"
    },
    {
      "risk": "Rate limiting increases",
      "probability": "VERY LOW",
      "impact": "LOW",
      "mitigation": "Delays preserved, parallel within subreddit only"
    }
  ]
}
```

---

## Timeline

```json
{
  "total_estimated_time": "65 minutes",
  "breakdown": {
    "code_changes": "30-45 min",
    "unit_testing": "15 min",
    "integration_testing": "15-20 min"
  },
  "schedule": [
    {"time": "0-45min", "task": "Implement async changes"},
    {"time": "45-60min", "task": "Unit test API methods"},
    {"time": "60-75min", "task": "Integration test 1 subreddit"},
    {"time": "75-80min", "task": "Measure & document results"}
  ]
}
```

---

## Success Criteria

```json
{
  "required": [
    "✅ All API calls work with proxies",
    "✅ All API calls work with fake user agents",
    "✅ Data saved correctly to database",
    "✅ No increase in error rate",
    "✅ 3x+ speedup per subreddit"
  ],
  "optional": [
    "✅ 4-6x speedup achieved",
    "✅ Connection pooling metrics visible",
    "✅ Proxy success rates unchanged",
    "✅ No rate limiting increases"
  ]
}
```

---

## Next Steps

```json
{
  "after_phase_1": [
    {
      "id": "PHASE-2",
      "name": "Parallel Subreddit Processing",
      "description": "Process 3 subreddits in parallel (1 per proxy thread)",
      "expected_speedup": "2-3x additional",
      "status": "PENDING"
    },
    {
      "id": "PHASE-3",
      "name": "Database Batch Operations",
      "description": "Batch user UPSERTS, parallel discovery",
      "expected_speedup": "1.3-1.5x additional",
      "status": "PENDING"
    }
  ]
}
```

---

## Version History

```
v3.1.2  [2025-09-30]  Duplicate processing fix (Ok/No Seller skip cache)
v3.2.0  [PENDING]     Phase 1: Async API + Connection Pooling
```

---

_Last Updated: 2025-09-30 | Status: PLANNED | Risk: LOW | Priority: HIGH_