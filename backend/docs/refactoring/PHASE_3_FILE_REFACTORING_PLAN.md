# Phase 3: File Refactoring Plan

## Overview

**Goal:** Split large monolithic files into focused, maintainable modules
**Timeline:** Phase 3 (4-6 hours)
**Status:** Planning

---

## Instagram Scraper Refactoring

### Current State
- **File:** `app/scrapers/instagram/services/instagram_scraper.py`
- **Lines:** 2,136
- **Methods:** 25
- **Issues:**
  - Single file responsible for API calls, storage, analytics, and orchestration
  - Hard to test individual components
  - Difficult to maintain and extend
  - High coupling between concerns

### Target Architecture (5 Modules)

```
app/scrapers/instagram/
├── services/
│   ├── __init__.py
│   ├── instagram_scraper.py (REFACTORED - ~400 lines)
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── api.py (~400 lines)
│   │   ├── storage.py (~600 lines)
│   │   ├── analytics.py (~400 lines)
│   │   └── utils.py (~150 lines)
│   └── instagram_config.py (TO BE DEPRECATED)
```

---

## Module Breakdown

### Module 1: `instagram_scraper.py` (Core Orchestration)
**Lines:** ~400
**Responsibility:** Main scraper class, lifecycle management, concurrency control

**Methods:**
- `__init__()` - Initialize scraper with dependencies
- `should_continue()` - Check control signals
- `request_stop()` - Graceful shutdown
- `_get_supabase()` - Database client
- `_log_to_system()` - System logging
- `_get_creator_content_counts()` - Check existing content
- `process_creator()` - Orchestrate single creator processing
- `process_creators_concurrent()` - Concurrent processing with asyncio
- `run()` - Main execution loop
- `get_creators_to_process()` - Fetch creator queue

**Dependencies:**
- Imports from `modules.api`, `modules.storage`, `modules.analytics`, `modules.utils`
- Uses composition: `self.api`, `self.storage`, `self.analytics`

---

### Module 2: `modules/api.py` (API Communication)
**Lines:** ~400
**Responsibility:** All Instagram API interactions, rate limiting, retries

**Class:** `InstagramAPI`

**Methods:**
- `__init__(config, logger)` - Initialize with config and logger
- `_apply_rate_limiting()` - Rate limit enforcement
- `_make_api_request(endpoint, params)` - HTTP request with retries
- `fetch_profile(username)` - Get profile data
- `fetch_reels(user_id, count)` - Get reels with pagination
- `fetch_posts(user_id, count)` - Get posts with pagination

**Attributes:**
- `last_request_time` - Rate limiting state
- `api_calls_made` - Counter
- `successful_calls` - Counter
- `failed_calls` - Counter

**Dependencies:**
- `requests` library
- `config.instagram` for endpoints and headers
- `tenacity` for retry logic

---

### Module 3: `modules/storage.py` (Database Operations)
**Lines:** ~600
**Responsibility:** All database writes, R2 uploads, follower tracking

**Class:** `InstagramStorage`

**Methods:**
- `__init__(supabase, logger)` - Initialize with Supabase client
- `store_reels(creator_id, username, reels, niche)` - Save reels to DB + R2
- `store_posts(creator_id, username, posts, niche)` - Save posts to DB + R2
- `track_follower_growth(creator_id, username, followers, following, media_count)` - Record history
- `update_creator_analytics(creator_id, analytics)` - Update analytics fields
- `update_creator_profile(creator_id, profile_data, growth_data)` - Update profile

**Dependencies:**
- `supabase` client
- `r2_config` and media storage utilities
- `modules.utils` for data transformation

---

### Module 4: `modules/analytics.py` (Analytics Engine)
**Lines:** ~400
**Responsibility:** Calculate all creator metrics and format reports

**Class:** `InstagramAnalytics`

**Methods:**
- `__init__(config, logger)` - Initialize with config
- `calculate_analytics(creator_id, reels, posts, profile_data)` - Main calculation
- `format_analytics_summary(analytics)` - Human-readable report
- `_calculate_reel_metrics(reels, followers)` - Reel-specific metrics
- `_calculate_post_metrics(posts, followers)` - Post-specific metrics
- `_calculate_viral_content(reels, posts, analytics)` - Viral detection
- `_calculate_posting_patterns(content)` - Frequency and consistency
- `_determine_best_content_type(analytics)` - Performance comparison

**Dependencies:**
- `config.instagram` for viral thresholds
- `modules.utils` for data extraction

---

### Module 5: `modules/utils.py` (Helper Functions)
**Lines:** ~150
**Responsibility:** Pure utility functions, data transformations

**Functions:**
- `identify_external_url_type(url)` - Classify URLs (OnlyFans, Linktree, etc.)
- `extract_bio_links(bio_data)` - Parse bio link data
- `extract_hashtags(text)` - Find hashtags in text
- `extract_mentions(text)` - Find mentions in text
- `calculate_engagement_rate(likes, comments, followers)` - Simple calculation
- `to_iso(timestamp)` - Unix timestamp to ISO format

**Dependencies:** None (pure functions)

---

## Refactoring Strategy

### Phase 3A: Create Module Structure (1h)
1. Create `modules/` directory
2. Create `modules/__init__.py` with public API
3. Create stub files for each module
4. Define class interfaces and method signatures

### Phase 3B: Extract Utilities (30min)
1. Move pure functions to `modules/utils.py`
2. Add comprehensive docstrings
3. Write unit tests for utilities

### Phase 3C: Extract Analytics (1h)
1. Move analytics methods to `modules/analytics.py`
2. Create `InstagramAnalytics` class
3. Update imports in main scraper
4. Test analytics calculation

### Phase 3D: Extract API Layer (1h)
1. Move API methods to `modules/api.py`
2. Create `InstagramAPI` class
3. Handle rate limiting state
4. Update imports in main scraper

### Phase 3E: Extract Storage Layer (1.5h)
1. Move storage methods to `modules/storage.py`
2. Create `InstagramStorage` class
3. Handle R2 upload logic
4. Update imports in main scraper

### Phase 3F: Refactor Core Scraper (1h)
1. Update `instagram_scraper.py` to use new modules
2. Use composition: `self.api`, `self.storage`, `self.analytics`
3. Simplify `process_creator()` to orchestration only
4. Update all method calls to use new modules

### Phase 3G: Testing & Validation (30min)
1. Run syntax checks on all modules
2. Test import structure
3. Verify scraper still runs
4. Update documentation

---

## Reddit Scraper Refactoring

### Current State
- **File:** `app/scrapers/reddit/reddit_scraper.py`
- **Lines:** 1,808
- **Methods:** ~20

### Target Architecture (4 Modules)

```
app/scrapers/reddit/
├── reddit_scraper.py (REFACTORED - ~400 lines)
├── modules/
│   ├── __init__.py
│   ├── api.py (~350 lines)
│   ├── storage.py (~450 lines)
│   ├── analytics.py (~300 lines)
│   └── utils.py (~150 lines)
```

### Module Responsibilities

1. **reddit_scraper.py** - Core orchestration, lifecycle, concurrency
2. **modules/api.py** - PRAW wrapper, Reddit API calls, rate limiting
3. **modules/storage.py** - Supabase writes, data persistence
4. **modules/analytics.py** - Subreddit analysis, auto-categorization
5. **modules/utils.py** - Data transformation, text processing

---

## Benefits of Refactoring

### Code Quality
- **Single Responsibility Principle:** Each module has one clear purpose
- **Testability:** Easier to write unit tests for isolated components
- **Maintainability:** Changes to API layer don't affect storage logic
- **Readability:** ~400-line files are easier to understand than 2,000-line files

### Performance
- **Faster imports:** Only load needed modules
- **Better caching:** Isolated modules can be cached independently
- **Parallel development:** Multiple developers can work on different modules

### Extensibility
- **Plugin architecture:** Easy to add new analytics or storage backends
- **API versioning:** Can support multiple API versions in parallel
- **Testing mocks:** Simple to mock individual components

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Keep original files as backup
- Test thoroughly before committing
- Use git for easy rollback

### Risk 2: Import Cycles
**Mitigation:**
- Clear dependency hierarchy (utils → analytics → api → storage → core)
- Use dependency injection
- Avoid circular imports

### Risk 3: Performance Regression
**Mitigation:**
- Benchmark before/after
- Profile import times
- Monitor scraper performance metrics

---

## Success Criteria

- ✅ No file exceeds 500 lines
- ✅ All modules pass syntax checks
- ✅ Instagram scraper runs without errors
- ✅ Reddit scraper runs without errors
- ✅ Import time < 2 seconds
- ✅ Test coverage maintained or improved
- ✅ Documentation updated

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 3A | Create module structure | 1h | ⏳ Pending |
| 3B | Extract utilities | 30min | ⏳ Pending |
| 3C | Extract analytics | 1h | ⏳ Pending |
| 3D | Extract API layer | 1h | ⏳ Pending |
| 3E | Extract storage layer | 1.5h | ⏳ Pending |
| 3F | Refactor core scraper | 1h | ⏳ Pending |
| 3G | Testing & validation | 30min | ⏳ Pending |

**Total Estimated Time:** 6.5 hours

---

## Next Steps

1. Review this plan with stakeholders
2. Create backup branch for safety
3. Start with Phase 3A: Create module structure
4. Proceed incrementally, testing at each step
