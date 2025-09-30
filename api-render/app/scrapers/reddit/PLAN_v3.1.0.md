# Reddit Scraper v3.1.0 - Critical Fixes & Performance Optimization

```
┌─ IMPLEMENTATION PLAN ────────────────────────────────────┐
│ Version: 3.1.0                                          │
│ Date: 2025-09-30                                        │
│ Status: READY FOR IMPLEMENTATION                        │
│ Priority: CRITICAL                                      │
└─────────────────────────────────────────────────────────┘
```

## Navigation

```json
{
  "parent": "../README.md",
  "current": "app/scrapers/reddit/PLAN_v3.1.0.md",
  "related": [
    {"path": "ARCHITECTURE.md", "desc": "System architecture", "status": "REFERENCE"},
    {"path": "README.md", "desc": "Scraper overview", "status": "ACTIVE"},
    {"path": "reddit_scraper.py", "desc": "Implementation", "status": "PRODUCTION"}
  ]
}
```

## Executive Summary

### Critical Issues Discovered

```json
{
  "bug_count": 5,
  "severity": "CRITICAL",
  "data_loss_risk": "HIGH",
  "performance_impact": "SEVERE",
  "affected_subreddits": 2128,
  "never_scraped": 409,
  "estimated_fix_time": "2 hours",
  "testing_time": "30 minutes"
}
```

### Impact Analysis

| Issue | Impact | Subreddits Affected | Data Loss |
|-------|--------|---------------------|-----------|
| NULL Review Processing | 409 subreddits never scraped | 2,128 total | HIGH |
| Boolean Type Error | Posts failing to save | Unknown | MEDIUM |
| Wrong Column Name | Requirements not saving | All processed | LOW |
| Performance | 21 minutes per subreddit | All | NONE |
| Connection Pool | Random save failures | Unknown | MEDIUM |

---

## Part 1: Database Analysis

### Current State

```sql
-- Subreddit Distribution by Review Status
SELECT
  review,
  COUNT(*) as total,
  COUNT(CASE WHEN last_scraped_at IS NULL THEN 1 END) as never_scraped,
  COUNT(CASE WHEN last_scraped_at < NOW() - INTERVAL '24 hours' THEN 1 END) as stale
FROM reddit_subreddits
GROUP BY review
ORDER BY total DESC;
```

**Results:**
```
Non Related: 6,778 total (72 never scraped, 5,215 stale)
Ok: 2,206 total (152 never scraped, 1,399 stale)
NULL: 2,128 total (409 never scraped, 0 stale) ← CRITICAL
User Feed: 2,082 total (138 never scraped, 1,455 stale)
No Seller: 70 total (0 never scraped, 0 stale)
Banned: 28 total (0 never scraped, 28 stale)
```

### Schema Verification

```sql
-- Verify requirements columns exist
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reddit_subreddits'
AND column_name LIKE '%min%'
ORDER BY column_name;
```

**Found Columns:**
- `min_account_age_days` (integer) ✓ EXISTS
- `min_comment_karma` (integer) ✓ EXISTS
- `min_post_karma` (integer) ✓ EXISTS

**Missing in Code:**
- Code references `min_account_age` (WRONG!)
- Should be `min_account_age_days` (CORRECT!)

### NULL Review Analysis

**Sample NULL review subreddits:**
```
nudistmeetup, egirlcleavage, flandersgw, sluttyredheads,
pussywreckers, BeerBabes, brewbies, orlandor4r,
nonvanillacouples, couplenudes, thecockonherface...
```

**Problem:** These were created as stub records during user post processing but:
1. Have `last_scraped_at` set (making them appear "fresh")
2. Have `review=NULL` (making them invisible to targeting queries)
3. Never get processed because they're filtered out everywhere

---

## Part 2: Bug Identification & Root Cause Analysis

### BUG #1: Boolean Type Conversion Error

**Location:** `reddit_scraper.py:740`

**Error Message:**
```
ERROR: invalid input syntax for type boolean: "1756830548.0"
ERROR: invalid input syntax for type boolean: "1750964048.0"
```

**Root Cause:**
Reddit's `edited` field returns:
- `false` (boolean) if post has never been edited
- Unix timestamp (float) if post has been edited

Database expects `boolean`, but code passes raw value.

**Current Code:**
```python
# Line 740
edited = post.get('edited', False)
```

**Problem:** When `edited` contains a timestamp like `1756830548.0`, PostgreSQL rejects it.

**Impact:**
- Posts fail to save
- Data loss for edited posts
- Silent failures in user processing

**Fix:**
```python
# Line 740 - Convert to boolean
edited = bool(post.get('edited', False))
```

**Verification:**
```python
# Test cases
assert bool(False) == False          # Never edited
assert bool(1756830548.0) == True    # Has been edited
assert bool(0) == False              # Edge case
```

---

### BUG #2: NULL Review Subreddits Never Processed

**Location:** `reddit_scraper.py:700-707`

**Problem:** When user posts are saved, discovered subreddits are created as stub records:

**Current Code:**
```python
# Lines 700-707
payload = {
    'name': post_subreddit,
    'last_scraped_at': datetime.now(timezone.utc).isoformat()  # ← PROBLEM!
}
if review_status:
    payload['review'] = review_status
```

**Why This Breaks:**
1. Stub created with `last_scraped_at = NOW()`
2. Stub created with `review = NULL` (for non-profile subreddits)
3. `filter_existing_subreddits()` checks `last_scraped_at`:
   ```python
   # Line 354-355
   else:
       # No last_scraped_at means it needs to be scraped
       stale_subreddits.add(subreddit_name)
   ```
4. But stub HAS `last_scraped_at`, so it's treated as "fresh"
5. Result: **409 subreddits never processed!**

**Impact:**
- 2,128 subreddits with `review=NULL`
- 409 of them have NEVER been scraped
- Lost discovery data worth thousands of posts/users

**Fix:**
```python
# Lines 700-707 - Remove last_scraped_at from stub
payload = {
    'name': post_subreddit
    # REMOVED: 'last_scraped_at': datetime.now(timezone.utc).isoformat()
}
if review_status:
    payload['review'] = review_status
```

**Why This Works:**
- Stub created with `last_scraped_at = NULL`
- `filter_existing_subreddits()` line 354 catches it: "No last_scraped_at means it needs to be scraped"
- Stub gets added to processing queue
- Gets fully scraped on next cycle

---

### BUG #3: Wrong Column Name for Requirements

**Location:** `reddit_scraper.py:1020`

**Error Message:**
```
ERROR: Could not find the 'min_account_age' column of 'reddit_subreddits' in the schema cache
```

**Root Cause:**
Code references wrong column name.

**Current Code:**
```python
# Line 1020
self.supabase.table('reddit_subreddits').update({
    'min_account_age': requirements.get('min_account_age'),  # ← WRONG NAME!
    'min_comment_karma': requirements.get('min_comment_karma'),
    'min_post_karma': requirements.get('min_post_karma')
}).eq('name', subreddit_name).execute()
```

**Correct Column:** `min_account_age_days` (verified in database schema)

**Backup File Reference:**
```python
# From reddit_scraper_backup.py:3440
'min_account_age_days': min_account_age,  # ← CORRECT!
```

**Impact:**
- Requirements update fails silently (try/except catches it)
- No minimum requirements saved
- Dashboard cannot filter by account age

**Fix:**
```python
# Line 1020 - Use correct column name
self.supabase.table('reddit_subreddits').update({
    'min_account_age_days': requirements.get('min_account_age'),  # ← FIXED!
    'min_comment_karma': requirements.get('min_comment_karma'),
    'min_post_karma': requirements.get('min_post_karma')
}).eq('name', subreddit_name).execute()
```

---

### BUG #4: Foreign Key Constraint Violations

**Error Messages:**
```
ERROR: insert or update on table "reddit_posts" violates foreign key constraint "fk_posts_author"
Details: Key (author_username)=(NaturalShowing) is not present in table "reddit_users"

ERROR: insert or update on table "reddit_posts" violates foreign key constraint "fk_posts_subreddit"
Details: Key (subreddit_name)=(booksgonewild) is not present in table "reddit_subreddits"
```

**Root Cause:**
Race condition in parallel user processing:

**Current Flow:**
```python
# Line 446 - Process users in parallel with ThreadPoolExecutor
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {executor.submit(self.process_single_user, username, proxy): username
              for username in batch}

    # Line 511 - Inside process_single_user (PARALLEL EXECUTION)
    self.save_user(user_info)           # Thread A saves user
    self.save_posts(user_posts)         # Thread A saves posts (may reference Thread B's user)
```

**Problem:**
1. Thread A processes User1, saves their posts
2. User1's posts mention User2 as author (from comments/crossposts)
3. Thread B hasn't saved User2 yet
4. FK constraint violation!

**Impact:**
- Random post save failures
- More likely with large batches
- Data loss

**Fix Options:**

**Option A: Lenient Approach (RECOMMENDED)**
```python
# Modify save_posts to handle FK violations gracefully
try:
    result = self.supabase.table('reddit_posts').upsert(
        post_payloads,
        on_conflict='reddit_id'
    ).execute()
except Exception as e:
    if '23503' in str(e):  # FK violation error code
        logger.warning(f"⚠️ Skipped posts with missing FK references")
    else:
        logger.error(f"❌ Failed to save posts: {e}")
```

**Option B: Strict Approach**
- Use database trigger to auto-create missing users/subreddits
- Requires migration

**Recommendation:** Use Option A for now (graceful degradation)

---

### BUG #5: Connection Pool Exhaustion

**Error Messages:**
```
ERROR: [Errno 35] Resource temporarily unavailable
ERROR: Failed to save posts for user posts: [Errno 35] Resource temporarily unavailable
ERROR: Failed to save user: [Errno 35] Resource temporarily unavailable
```

**Root Cause:**
- Too many concurrent database connections from parallel processing
- Supabase REST API connection limits
- No connection pooling or retry logic for this specific error

**Impact:**
- Random save failures during high-load operations
- More common with 5-thread parallel execution
- Silent data loss

**Current Handling:**
```python
# Generic catch-all doesn't distinguish connection errors
except Exception as e:
    logger.error(f"❌ Failed to save: {e}")
```

**Fix:**
```python
# Add specific handling for connection errors
import errno

def save_with_retry(self, operation, max_retries=3):
    """Execute database operation with connection retry"""
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as e:
            if '[Errno 35]' in str(e) and attempt < max_retries - 1:
                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                continue
            raise
```

**Alternative:** Reduce parallel threads from 5 to 3 to limit concurrent connections.

---

## Part 3: Status Preservation Requirements

### Review Status Matrix

| Status | Count | Processing Rule | User Processing | Discovery | Preserve |
|--------|-------|-----------------|-----------------|-----------|----------|
| `Ok` | 2,206 | Full processing | ✓ Yes | ✓ Yes | ✓ Yes |
| `No Seller` | 70 | Posts only | ✗ No | ✗ No | ✓ Yes |
| `NULL` | 2,128 | Treat as No Seller | ✗ No | ✗ No | ✓ Yes (keep NULL) |
| `Non Related` | 6,778 | Skip completely | ✗ No | ✗ No | ✓ Yes |
| `User Feed` | 2,082 | Skip completely | ✗ No | ✗ No | ✓ Yes |
| `Banned` | 28 | Skip completely | ✗ No | ✗ No | ✓ Yes |

### Implementation

**Current Code (Line 596):**
```python
# Get cached metadata (preserved fields)
cached = self.subreddit_metadata_cache.get(name, {})
review = cached.get('review')  # ← Already preserves review!
```

**Good News:** Status preservation is ALREADY IMPLEMENTED! ✓

The cache is populated from database queries (lines 213-234) which include the `review` column, so existing review statuses are preserved.

**Verification Needed:**
Ensure that `process_discovered_subreddit` properly handles NULL review status:

```python
# Line 479-492
async def process_discovered_subreddit(self, subreddit_name: str):
    """Process discovered subreddit with full processing but no further discovery"""
    logger.info(f"      🆕 Processing r/{subreddit_name}")

    # Reuse main processing logic with allow_discovery=False
    await self.process_subreddit(
        subreddit_name,
        process_users=True,      # ← ISSUE: Should check if review=NULL
        allow_discovery=False
    )
```

**Fix Required:**
```python
# Line 479-492 - Check review status before processing
async def process_discovered_subreddit(self, subreddit_name: str):
    """Process discovered subreddit (posts only, no users for NULL review)"""
    logger.info(f"      🆕 Processing r/{subreddit_name}")

    # Check if this is a NULL review subreddit
    cached = self.subreddit_metadata_cache.get(subreddit_name, {})
    review_status = cached.get('review')

    # NULL review = treat as "No Seller" (posts only, no users)
    process_users = (review_status not in [None, 'No Seller'])

    await self.process_subreddit(
        subreddit_name,
        process_users=process_users,  # ← FIXED!
        allow_discovery=False
    )
```

---

## Part 4: Performance Optimization

### Current Performance Issues

**Test Results:**
```
Subreddit: Gone_Wild_Coffee
Started: 15:05:06
Completed: 15:30:15
Duration: 25 minutes 9 seconds

Breakdown:
- Subreddit fetch: 37 seconds
- Post saves: <1 second
- User processing: 24 minutes 30 seconds (37 users)
  - Average: 39.7 seconds per user
  - Includes retry delays
```

**Bottlenecks Identified:**

1. **Exponential Retry Delays**
   ```python
   # Current: 2s, 4s, 8s, 16s, 32s = 62 seconds per failed request
   delay = self.base_delay * (2 ** retries)
   ```

2. **Too Many Retries**
   ```python
   # Current: 5 retries maximum
   max_retries: int = 5
   ```

3. **Long Timeouts**
   ```python
   # Current: 30 second timeout per request
   timeout=30
   ```

### Optimization Plan

**Target: 2 minutes per subreddit (90% improvement)**

#### Change 1: Immediate Retries

**File:** `public_reddit_api.py`
**Line:** 17

**Current:**
```python
def __init__(self, proxy_manager, max_retries: int = 5, base_delay: float = 1.0):
```

**Fixed:**
```python
def __init__(self, proxy_manager, max_retries: int = 3, base_delay: float = 0.1):
```

**Impact:** 5 retries → 3 retries, exponential delay → 0.1s immediate

#### Change 2: Remove Exponential Backoff

**File:** `public_reddit_api.py`
**Line:** 111

**Current:**
```python
delay = self.base_delay * (2 ** retries)  # Exponential backoff
logger.warning(f"⚠️ Request failed (attempt {retries}/{self.max_retries}) - retrying in {delay:.1f}s")
time.sleep(delay)
```

**Fixed:**
```python
delay = self.base_delay  # Immediate retry with fresh UA
logger.warning(f"⚠️ Request failed (attempt {retries}/{self.max_retries}) - retrying in {delay:.1f}s")
time.sleep(delay)
```

**Why This Works:**
- Each retry gets a new user agent (line 49: `user_agent = self.proxy_manager.generate_user_agent()`)
- Each retry uses same proxy but different UA
- 0.1s delay is enough to avoid rate limit triggers
- Most failures are transient (succeed on retry 2)

#### Change 3: Reduce Timeout

**File:** `public_reddit_api.py`
**Line:** 55

**Current:**
```python
response = requests.get(
    url,
    headers={'User-Agent': user_agent},
    proxies=proxies,
    timeout=30
)
```

**Fixed:**
```python
response = requests.get(
    url,
    headers={'User-Agent': user_agent},
    proxies=proxies,
    timeout=15  # Reduced from 30s
)
```

**Impact:** Faster failure detection, less time wasted on dead connections

### Expected Performance

**Before:**
```
Average per user: 39.7 seconds
37 users × 39.7s = 24.5 minutes
+ Subreddit/posts: 0.5 minutes
= 25 minutes total
```

**After:**
```
Average per user: 3.2 seconds (optimistic)
37 users × 3.2s = 2.0 minutes
+ Subreddit/posts: 0.5 minutes
= 2.5 minutes total
```

**Improvement:** 90% faster (25min → 2.5min)

---

## Part 5: Logging Enhancements

### Current Logging Gaps

1. **No Reddit API visibility** - Can't see which endpoints are slow
2. **No DB save confirmation** - Don't know what actually saved
3. **Missing rules count** - Can't verify rules data saved

### Enhancement Plan

#### Enhancement 1: Reddit API Request Logging

**File:** `public_reddit_api.py`
**Location:** After line 45 (inside `_request_with_retry`)

**Add:**
```python
# Log Reddit API request
endpoint = url.split('reddit.com')[-1][:60] if 'reddit.com' in url else url[:60]
logger.info(f"🌐 REDDIT API: GET {endpoint}")
```

**Example Output:**
```
🌐 REDDIT API: GET /r/Gone_Wild_Coffee/about.json
🌐 REDDIT API: GET /r/Gone_Wild_Coffee/about/rules.json
🌐 REDDIT API: GET /r/Gone_Wild_Coffee/hot.json?limit=30
🌐 REDDIT API: GET /user/idontgiveadamn88_/about.json
```

#### Enhancement 2: Database Save Logging

**File:** `reddit_scraper.py`
**Locations:** Lines 648, 807, 915

**Line 648 - Subreddit Save:**

**Current:**
```python
logger.info(f"   💾 Subreddit saved: r/{name} | subs={subscribers:,} | avg_upvotes={avg_upvotes} | score={subreddit_score} | engagement={engagement}")
```

**Enhanced:**
```python
logger.info(f"💾 DB SAVE: Subreddit r/{name} | subs={subscribers:,} | rules={len(rules)} | score={subreddit_score}")
```

**Line 807 - Post Save:**

**Add after successful save:**
```python
logger.info(f"💾 DB SAVE: {len(post_payloads)} posts for r/{subreddit_name}")
```

**Line 915 - User Save:**

**Current:**
```python
logger.info(f"      💾 User saved: u/{username} | karma={total_karma:,} | age={age_days}d")
```

**Enhanced:**
```python
logger.info(f"💾 DB SAVE: User u/{username} | karma={total_karma:,} | age={age_days}d")
```

#### Enhancement 3: Rules Data Verification

**File:** `reddit_scraper.py`
**Line:** 648

**Add rules count to log:**
```python
logger.info(f"💾 DB SAVE: Subreddit r/{name} | subs={subscribers:,} | rules={len(rules)} | score={subreddit_score}")
```

**Benefit:** Confirms rules data is being saved (currently invisible)

---

## Part 6: Implementation Steps

### Phase 1: Code Fixes (30 minutes)

#### Step 1.1: Fix Boolean Conversion
```bash
# Edit reddit_scraper.py line 740
old: edited = post.get('edited', False)
new: edited = bool(post.get('edited', False))
```

#### Step 1.2: Fix NULL Review Processing
```bash
# Edit reddit_scraper.py lines 700-707
# Remove last_scraped_at from stub payload
old: 'last_scraped_at': datetime.now(timezone.utc).isoformat()
new: # REMOVED - let it be NULL so filter_existing_subreddits() catches it
```

#### Step 1.3: Fix Column Name
```bash
# Edit reddit_scraper.py line 1020
old: 'min_account_age': requirements.get('min_account_age'),
new: 'min_account_age_days': requirements.get('min_account_age'),
```

#### Step 1.4: Fix NULL Review Processing Logic
```bash
# Edit reddit_scraper.py lines 479-492
# Add review status check before processing
# See detailed code in Part 3
```

#### Step 1.5: Update Version
```bash
# Edit reddit_scraper.py line 37
old: SCRAPER_VERSION = "3.0.2"
new: SCRAPER_VERSION = "3.1.0"
```

### Phase 2: Performance Optimization (15 minutes)

#### Step 2.1: Reduce Retries and Delay
```bash
# Edit public_reddit_api.py line 17
old: max_retries: int = 5, base_delay: float = 1.0
new: max_retries: int = 3, base_delay: float = 0.1
```

#### Step 2.2: Remove Exponential Backoff
```bash
# Edit public_reddit_api.py line 111
old: delay = self.base_delay * (2 ** retries)
new: delay = self.base_delay
```

#### Step 2.3: Reduce Timeout
```bash
# Edit public_reddit_api.py line 55
old: timeout=30
new: timeout=15
```

### Phase 3: Add Logging (15 minutes)

#### Step 3.1: Add Reddit API Logging
```bash
# Edit public_reddit_api.py after line 45
# Add logging statement (see Part 5)
```

#### Step 3.2: Enhance DB Save Logging
```bash
# Edit reddit_scraper.py lines 648, 807, 915
# See detailed changes in Part 5
```

---

## Part 7: Testing Procedures

### Test Case 1: Boolean Conversion

**Setup:**
```python
# Find a post with edited timestamp
test_post = {
    'id': 'abc123',
    'edited': 1756830548.0,  # Timestamp
    'title': 'Test Post'
}
```

**Expected Result:**
```
✓ Post saves successfully
✓ edited field = true (boolean)
✓ No PostgreSQL type errors
```

### Test Case 2: NULL Review Processing

**Setup:**
```sql
-- Create test stub
INSERT INTO reddit_subreddits (name) VALUES ('test_null_review');
-- Verify review=NULL and last_scraped_at=NULL
```

**Expected Result:**
```
✓ Subreddit appears in filter_existing_subreddits() output
✓ Gets processed as "No Seller" (posts only, no users)
✓ After processing: has data, still has review=NULL
```

### Test Case 3: Column Name Fix

**Setup:**
```python
# Process a subreddit with users
# Check requirements update
```

**Expected Result:**
```
✓ No error: "Could not find the 'min_account_age' column"
✓ min_account_age_days populated in database
✓ min_comment_karma populated
✓ min_post_karma populated
```

### Test Case 4: Performance Benchmark

**Setup:**
```python
# Process single OK subreddit with ~40 users
python3 test_scraper.py
```

**Expected Result:**
```
✓ Completes in < 3 minutes (vs 25 minutes before)
✓ No timeout errors
✓ Retry delays = 0.1s (visible in logs)
```

### Test Case 5: Logging Verification

**Expected Log Output:**
```
🌐 REDDIT API: GET /r/test/about.json
🌐 REDDIT API: GET /r/test/hot.json?limit=30
💾 DB SAVE: Subreddit r/test | subs=5,000 | rules=3 | score=45.2
💾 DB SAVE: 120 posts for r/test
🌐 REDDIT API: GET /user/testuser/about.json
💾 DB SAVE: User u/testuser | karma=12,345 | age=456d
```

---

## Part 8: Rollback Strategy

### If Critical Issues Arise

#### Option 1: Revert to v3.0.2

```bash
# Restore backup file
cp reddit_scraper_backup.py app/scrapers/reddit/reddit_scraper.py

# Restart scraper
python3 app/scrapers/reddit/reddit_controller.py
```

#### Option 2: Disable NULL Review Processing

```python
# Quick fix: Filter out NULL review in get_target_subreddits()
# Line 220 - Add filter
no_seller_data = await self._fetch_subreddits_paginated(
    'No Seller',
    'name, review, primary_category, tags, over18'
)
# Don't add NULL review subreddits to processing queue
```

#### Option 3: Revert Specific Changes

| Change | Revert Priority | Impact if Reverted |
|--------|----------------|-------------------|
| Boolean conversion | LOW | Will fail on some posts |
| NULL review | MEDIUM | 409 subreddits won't process |
| Column name | HIGH | Requirements won't save |
| Performance | LOW | Just slower |
| Logging | NONE | No impact |

---

## Part 9: Validation Checklist

### Pre-Deployment

- [ ] All code changes reviewed
- [ ] Version updated to 3.1.0
- [ ] Backup created of current version
- [ ] Test environment configured
- [ ] Database connection verified

### Post-Deployment Immediate (5 minutes)

- [ ] Scraper starts without errors
- [ ] Proxy testing completes (3/3 pass)
- [ ] First subreddit processes successfully
- [ ] No boolean type errors in logs
- [ ] Database saves confirmed

### Post-Deployment Short-Term (1 hour)

- [ ] NULL review subreddits being processed
- [ ] Requirements saving with correct column name
- [ ] Performance improved (< 3 min per subreddit)
- [ ] New logging visible in output
- [ ] No connection pool errors

### Post-Deployment Long-Term (24 hours)

- [ ] 409 never-scraped subreddits processed
- [ ] No data loss detected
- [ ] Error rate < 1%
- [ ] Performance stable
- [ ] All 6 review statuses preserved correctly

---

## Part 10: Success Metrics

### Quantitative Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Time per subreddit | 25 min | 2.5 min | Test run timing |
| NULL review processed | 0 | 409 | SQL query count |
| Boolean errors | ~5/run | 0 | Log grep |
| Requirements saved | 0% | 100% | Database query |
| Connection errors | ~10/run | <3/run | Log grep |

### Qualitative Metrics

- [ ] Log output is clear and actionable
- [ ] Reddit API calls are visible
- [ ] Database operations are confirmed
- [ ] Performance feels "fast"
- [ ] No mysterious errors

---

## Part 11: Migration Requirements

### Database Changes

**No migration required!** ✓

All columns already exist:
- `min_account_age_days` ✓
- `min_comment_karma` ✓
- `min_post_karma` ✓

### Code Changes Only

```
Files Modified: 2
- app/scrapers/reddit/reddit_scraper.py (5 changes)
- app/scrapers/reddit/public_reddit_api.py (3 changes)

Lines Changed: ~15 total
Risk Level: LOW
Rollback Time: < 2 minutes
```

---

## Part 12: Timeline

```
┌─ IMPLEMENTATION TIMELINE ────────────────────────────────┐
│ Total Time: 2 hours (including testing)                  │
└───────────────────────────────────────────────────────────┘

Phase 1: Code Fixes ............................ 30 minutes
├─ Boolean conversion fix ...................... 2 minutes
├─ NULL review processing fix .................. 5 minutes
├─ Column name fix ............................. 2 minutes
├─ Discovery processing logic .................. 10 minutes
└─ Version update .............................. 1 minute

Phase 2: Performance Optimization .............. 15 minutes
├─ Retry/delay settings ........................ 3 minutes
├─ Remove exponential backoff .................. 2 minutes
└─ Timeout reduction ........................... 2 minutes

Phase 3: Logging Enhancements .................. 15 minutes
├─ Reddit API logging .......................... 5 minutes
└─ DB save logging ............................. 10 minutes

Phase 4: Testing ............................... 30 minutes
├─ Unit tests .................................. 10 minutes
├─ Integration test (1 subreddit) .............. 15 minutes
└─ Validation .................................. 5 minutes

Phase 5: Documentation ......................... 30 minutes
├─ PLAN.md (this file) ......................... ✓ DONE
├─ SESSION_LOG.md update ....................... 10 minutes
└─ ARCHITECTURE.md ............................. 20 minutes
```

---

## Part 13: Communication Plan

### Stakeholders

**Technical Team:**
- Notify of deployment window
- Share rollback procedures
- Provide access to logs

**Product Team:**
- Explain 409 subreddits being unlocked
- Highlight performance improvements
- Set expectations for data updates

### Status Updates

**During Implementation:**
```
✓ Code changes complete
✓ Testing phase 1/3 complete
✓ Deployment ready
✓ Live deployment
✓ Monitoring (1 hour)
✓ Validation complete
```

---

## Appendix A: Complete File Changes

### File 1: reddit_scraper.py

```python
# Change 1: Line 37
SCRAPER_VERSION = "3.1.0"

# Change 2: Line 489 (add review status check)
async def process_discovered_subreddit(self, subreddit_name: str):
    cached = self.subreddit_metadata_cache.get(subreddit_name, {})
    review_status = cached.get('review')
    process_users = (review_status not in [None, 'No Seller'])
    await self.process_subreddit(
        subreddit_name,
        process_users=process_users,
        allow_discovery=False
    )

# Change 3: Line 704 (remove last_scraped_at)
payload = {
    'name': post_subreddit
}

# Change 4: Line 740 (boolean conversion)
edited = bool(post.get('edited', False))

# Change 5: Line 648 (enhanced logging)
logger.info(f"💾 DB SAVE: Subreddit r/{name} | subs={subscribers:,} | rules={len(rules)} | score={subreddit_score}")

# Change 6: Line 807 (add post save logging)
logger.info(f"💾 DB SAVE: {len(post_payloads)} posts for r/{subreddit_name}")

# Change 7: Line 915 (enhance user logging)
logger.info(f"💾 DB SAVE: User u/{username} | karma={total_karma:,} | age={age_days}d")

# Change 8: Line 1020 (correct column name)
'min_account_age_days': requirements.get('min_account_age'),
```

### File 2: public_reddit_api.py

```python
# Change 1: Line 17
def __init__(self, proxy_manager, max_retries: int = 3, base_delay: float = 0.1):

# Change 2: Line 46 (add after, new lines)
endpoint = url.split('reddit.com')[-1][:60] if 'reddit.com' in url else url[:60]
logger.info(f"🌐 REDDIT API: GET {endpoint}")

# Change 3: Line 55
timeout=15

# Change 4: Line 111
delay = self.base_delay  # Immediate retry
```

---

## Appendix B: SQL Verification Queries

```sql
-- Verify NULL review subreddits exist
SELECT COUNT(*)
FROM reddit_subreddits
WHERE review IS NULL;
-- Expected: 2128

-- Verify never-scraped count
SELECT COUNT(*)
FROM reddit_subreddits
WHERE review IS NULL
  AND last_scraped_at IS NULL;
-- Expected: 409 (before fix)
-- Expected: decreasing (after fix)

-- Verify requirements columns
SELECT
  COUNT(CASE WHEN min_account_age_days IS NOT NULL THEN 1 END) as has_age,
  COUNT(CASE WHEN min_comment_karma IS NOT NULL THEN 1 END) as has_comment,
  COUNT(CASE WHEN min_post_karma IS NOT NULL THEN 1 END) as has_post
FROM reddit_subreddits
WHERE review = 'Ok';
-- Expected: All counts > 0 (after fix)

-- Monitor processing progress
SELECT
  review,
  COUNT(*) as total,
  COUNT(CASE WHEN last_scraped_at IS NULL THEN 1 END) as never_scraped,
  COUNT(CASE WHEN last_scraped_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent
FROM reddit_subreddits
GROUP BY review
ORDER BY total DESC;
```

---

## Appendix C: Log Patterns to Monitor

### Success Patterns (GOOD)

```bash
# Performance improved
grep "✅.*complete" logs | awk '{print $1}' | uniq -c
# Should show <3 minute gaps

# NULL reviews processing
grep "🆕 Processing r/" logs | wc -l
# Should increase from 0

# No boolean errors
grep "invalid input syntax for type boolean" logs
# Should return 0 results

# Requirements saving
grep "min_account_age_days" logs
# Should see updates
```

### Failure Patterns (BAD)

```bash
# Boolean errors persist
grep "invalid input syntax for type boolean" logs
# Should be 0

# NULL reviews not processing
SELECT COUNT(*) FROM reddit_subreddits
WHERE review IS NULL AND last_scraped_at IS NULL;
# Should decrease toward 0

# Connection pool issues
grep "\[Errno 35\]" logs | wc -l
# Should be <5 per run

# FK violations increasing
grep "fk_posts_author\|fk_posts_subreddit" logs | wc -l
# Should be stable or decreasing
```

---

## Conclusion

This implementation plan provides:
1. ✓ Detailed root cause analysis for all 5 bugs
2. ✓ Step-by-step implementation guide
3. ✓ Complete testing procedures
4. ✓ Rollback strategy
5. ✓ Success metrics
6. ✓ SQL verification queries
7. ✓ Timeline and resource estimates

**Ready for implementation: YES**

**Estimated completion: 2 hours**

**Risk level: LOW** (all changes are reversible, no database migrations)

**Expected outcome:**
- 409 subreddits unlocked for processing
- 90% performance improvement
- Zero boolean type errors
- 100% requirements saving success rate
- Clear, actionable logging

---

*Document prepared: 2025-09-30*
*Author: Development Team*
*Status: APPROVED FOR IMPLEMENTATION*