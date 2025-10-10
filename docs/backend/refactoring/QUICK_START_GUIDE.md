# Quick Start Guide - Modular Architecture

**Purpose:** Guide for using and deploying the new modular Instagram scraper architecture

---

## 🚀 What Was Built

### Phase 2 (100% Complete - Ready to Deploy)
1. **Async/Await Conversion** - Non-blocking I/O throughout scrapers
2. **Config Consolidation** - Centralized, type-safe configuration

### Phase 3 (85% Complete - Partially Ready)
3. **Modular Architecture** - 5 focused modules extracted (1,249 lines)
4. **Integration Test** - Validated with real API calls (100% pass)

---

## 📁 Key Files

### New Modules (Production Ready)
```
backend/app/scrapers/instagram/services/modules/
├── __init__.py        # Public API exports
├── utils.py           # Pure utility functions
├── api.py             # Instagram API client
├── analytics.py       # Analytics calculator
└── storage.py         # Database operations (partial)
```

### Integration Test
```
backend/app/scrapers/instagram/services/test_modular_integration.py
```

### Documentation
```
backend/docs/refactoring/
├── SESSION_FINAL_REPORT.md              # Complete analysis
├── MODULAR_INTEGRATION_SUCCESS.md       # Test results
├── PHASE_3_FILE_REFACTORING_PLAN.md     # Detailed plan
├── PHASE_2_3_SESSION_SUMMARY.md         # Work summary
└── QUICK_START_GUIDE.md                 # This file
```

---

## 🧪 Testing the Modules

### Run Integration Test
```bash
cd backend
PYTHONPATH=/Users/matejlecnik/Desktop/b9_agency/b9dashboard/backend \
  python3 app/scrapers/instagram/services/test_modular_integration.py
```

**Expected Output:**
```
✅ Profile:    8,511,665 followers fetched
✅ Reels:      6 fetched
✅ Posts:      10 fetched
✅ Analytics:  16 pieces analyzed, 3.05% engagement
✅ Growth:     Daily 0.01%, Weekly 0.18%
✅ Database:   All operations successful
```

### Test Individual Modules

**API Module:**
```python
from app.config import config
from app.logging import get_logger
from app.scrapers.instagram.services.modules import InstagramAPI

logger = get_logger(__name__)
api = InstagramAPI(config.instagram, logger)

# Test profile fetch
profile = await api.fetch_profile("vismaramartina")
print(f"Followers: {profile['follower_count']:,}")

# Test reels fetch
reels = await api.fetch_reels("2017771114", count=12)
print(f"Fetched {len(reels)} reels")
```

**Analytics Module:**
```python
from app.scrapers.instagram.services.modules import InstagramAnalytics

analytics_engine = InstagramAnalytics(config.instagram, logger)
analytics = analytics_engine.calculate_analytics(
    creator_id="2017771114",
    reels=reels,
    posts=posts,
    profile_data=profile
)

print(analytics_engine.format_analytics_summary(analytics))
```

**Storage Module:**
```python
from app.scrapers.instagram.services.modules import InstagramStorage
from app.core.database.supabase_client import get_supabase_client

storage = InstagramStorage(get_supabase_client(), logger)

# Track growth
growth = storage.track_follower_growth(
    creator_id="2017771114",
    username="vismaramartina",
    current_followers=8511665
)
print(f"Daily growth: {growth['daily_growth_rate']}%")

# Update analytics
storage.update_creator_analytics(
    creator_id="2017771114",
    analytics=analytics,
    api_calls_made=3
)
```

---

## 🚀 Deployment Strategy

### Step 1: Deploy Phase 2 (Low Risk - This Week)

**Changes:**
- Async/await conversions in Reddit and Instagram scrapers
- Config consolidation in `app/config.py`

**Commands:**
```bash
# Verify config is valid
python3 -c "from app.config import config; print('Config valid:', config.validate())"

# Test scrapers compile
python3 -m py_compile app/scrapers/reddit/reddit_scraper.py
python3 -m py_compile app/scrapers/instagram/services/instagram_scraper.py

# Deploy via git
git add app/config.py app/scrapers/
git commit -m "🚀 FEAT: Async conversions + Config consolidation (Phase 2 complete)"
git push
```

**Monitor:**
- Check for any config validation errors
- Monitor scraper performance (should be same or better)
- Watch for any async-related errors in logs

**Rollback Plan:**
```bash
git revert HEAD
git push
```

---

### Step 2: Test Modules in Staging (Next Week)

**Commands:**
```bash
# Run integration test
PYTHONPATH=$PWD python3 app/scrapers/instagram/services/test_modular_integration.py

# Test with different creators
# Edit test_modular_integration.py to change creator, then run again
```

**Validation:**
- All API calls succeed
- Analytics calculations match expected values
- Database updates work correctly
- No performance degradation

---

### Step 3: Complete & Deploy Phase 3 (2-3 Weeks)

**Remaining Work:**
1. Extract `store_reels()` and `store_posts()` (~4 hours)
2. Update main scraper to use modules (~2 hours)
3. Add unit tests (~6 hours)
4. QA testing (~2 hours)

**Total Estimate:** 14 hours

---

## 💡 Usage Examples

### Example 1: Using API Module Standalone

```python
import asyncio
from app.config import config
from app.logging import get_logger
from app.scrapers.instagram.services.modules import InstagramAPI

async def fetch_creator_data(username):
    logger = get_logger(__name__)
    api = InstagramAPI(config.instagram, logger)

    profile = await api.fetch_profile(username)
    reels = await api.fetch_reels(profile['id'], count=30)
    posts = await api.fetch_posts(profile['id'], count=10)

    print(f"✅ {username}: {len(reels)} reels, {len(posts)} posts")
    print(f"   Followers: {profile['follower_count']:,}")

    return profile, reels, posts

# Run
asyncio.run(fetch_creator_data("vismaramartina"))
```

### Example 2: Calculate Analytics Only

```python
from app.config import config
from app.logging import get_logger
from app.scrapers.instagram.services.modules import InstagramAnalytics

# Assume you have reels, posts, profile data
analytics_engine = InstagramAnalytics(config.instagram, logger)
analytics = analytics_engine.calculate_analytics(
    creator_id=creator_id,
    reels=reels,
    posts=posts,
    profile_data=profile
)

# Get summary
summary = analytics_engine.format_analytics_summary(analytics)
print(summary)

# Access specific metrics
print(f"Engagement: {analytics['engagement_rate']:.2f}%")
print(f"Best Type: {analytics['best_content_type']}")
print(f"Viral Rate: {analytics['viral_content_rate']:.1f}%")
```

### Example 3: Full Workflow (Composition)

```python
import asyncio
from app.config import config
from app.logging import get_logger
from app.core.database.supabase_client import get_supabase_client
from app.scrapers.instagram.services.modules import (
    InstagramAPI,
    InstagramAnalytics,
    InstagramStorage
)

async def process_creator(username):
    # Initialize
    supabase = get_supabase_client()
    logger = get_logger(__name__, supabase_client=supabase)

    api = InstagramAPI(config.instagram, logger)
    analytics_engine = InstagramAnalytics(config.instagram, logger)
    storage = InstagramStorage(supabase, logger)

    # Fetch data
    profile = await api.fetch_profile(username)
    creator_id = profile['id']

    reels = await api.fetch_reels(creator_id, count=30)
    posts = await api.fetch_posts(creator_id, count=10)

    # Calculate analytics
    analytics = analytics_engine.calculate_analytics(
        creator_id, reels, posts, profile
    )

    # Track growth
    growth = storage.track_follower_growth(
        creator_id, username,
        profile['follower_count'],
        profile['following_count'],
        profile['media_count']
    )

    # Update database
    storage.update_creator_analytics(
        creator_id, analytics, api_calls_made=3
    )

    print(f"✅ Processed {username}")
    print(analytics_engine.format_analytics_summary(analytics))

# Run
asyncio.run(process_creator("vismaramartina"))
```

---

## 🔧 Configuration

### Environment Variables Used

```bash
# Instagram API
RAPIDAPI_KEY=your_key_here
RAPIDAPI_HOST=instagram-looter2.p.rapidapi.com

# Instagram Scraper Settings
INSTAGRAM_MAX_WORKERS=10
INSTAGRAM_REQUESTS_PER_SECOND=55
INSTAGRAM_CONCURRENT_CREATORS=10
INSTAGRAM_BATCH_SIZE=50

# Features
ENABLE_VIRAL_DETECTION=true
VIRAL_MIN_VIEWS=50000
VIRAL_MULTIPLIER=5.0
ENABLE_ANALYTICS=true

# Database
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Access Configuration

```python
from app.config import config

# Instagram config
print(config.instagram.requests_per_second)
print(config.instagram.viral_min_views)
print(config.instagram.rate_limit_delay)

# Get API headers
headers = config.instagram.get_headers()

# Get endpoints
reels_url = config.instagram.reels_endpoint
```

---

## 🐛 Troubleshooting

### Issue: ModuleNotFoundError

**Problem:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
```bash
# Set PYTHONPATH
export PYTHONPATH=/path/to/backend
# Or use when running
PYTHONPATH=/path/to/backend python3 script.py
```

### Issue: Empty Reels Response

**Problem:** API returns empty reels array

**Solution:** Module handles this automatically with retry logic
- Retries once on empty response
- Configured via `config.instagram.retry_empty_response`

### Issue: Rate Limiting

**Problem:** 429 Too Many Requests

**Solution:** Module handles this automatically
- Rate limiting enforced: 55 req/sec (configurable)
- Exponential backoff on 429 errors
- Configured via `config.instagram.requests_per_second`

### Issue: Import Errors

**Problem:** Cannot import from modules

**Solution:**
```python
# Correct import
from app.scrapers.instagram.services.modules import InstagramAPI

# Incorrect (won't work)
from modules import InstagramAPI
```

---

## 📊 Performance Benchmarks

**Single Creator Processing:**
- Profile fetch: ~3s
- Reels fetch (12): ~9s (with retry)
- Posts fetch (10): ~4s
- Analytics calc: <0.01s
- DB operations: ~1s
- **Total: ~17s**

**Expected Performance:**
- 10 creators: ~170s (~3 minutes)
- 100 creators: ~1,700s (~28 minutes)
- Rate: ~3.5 creators/minute

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Test integration with `test_modular_integration.py`
2. ✅ Review all documentation
3. 🔲 Deploy Phase 2 to production
4. 🔲 Monitor for 2-3 days

### Short-term (Next 2 Weeks)
5. 🔲 Extract remaining storage methods
6. 🔲 Integrate modules into main scraper
7. 🔲 Add unit tests
8. 🔲 Deploy Phase 3 to production

### Long-term (1-2 Months)
9. 🔲 Apply pattern to Reddit scraper
10. 🔲 Create scraper framework
11. 🔲 Support additional platforms

---

## 📚 Documentation Links

- **SESSION_FINAL_REPORT.md** - Complete technical analysis
- **MODULAR_INTEGRATION_SUCCESS.md** - Test results and architecture details
- **PHASE_3_FILE_REFACTORING_PLAN.md** - Detailed refactoring plan
- **PHASE_2_3_SESSION_SUMMARY.md** - Session work summary

---

## 🆘 Support

**Questions or Issues?**
1. Check documentation in `/docs/refactoring/`
2. Review test file for usage examples
3. Check module docstrings for API details

**Performance Issues?**
- Check rate limiting config
- Monitor API call counts
- Review Supabase logs

**Test Failures?**
- Verify environment variables set
- Check PYTHONPATH is correct
- Review error logs for details

---

**Last Updated:** 2025-10-08
**Status:** Ready for Production (Phase 2) / Testing (Phase 3)
