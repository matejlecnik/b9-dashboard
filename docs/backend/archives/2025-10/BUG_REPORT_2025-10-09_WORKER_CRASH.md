# Critical Bug Report: Worker Crash During Reel Saving

**Date**: 2025-10-09
**Severity**: 🔴 **CRITICAL** - Blocks all Instagram creator additions
**Status**: 🔍 **UNDER INVESTIGATION**

---

## Executive Summary

Instagram creator addition endpoint crashes during content saving phase. Profile data saves successfully but worker process terminates with SIGABRT (code 134) when attempting to batch save reels, resulting in 0 content in database despite API logging success messages.

---

## Issue Details

### What's Working ✅
- Profile fetching from Instagram API
- Profile data saving (followers_count, full_name, etc.)
- Initial creator record creation
- R2 profile picture upload
- Content fetching (90 reels + 30 posts)

### What's Failing ❌
- **Batch saving reels to database** - Worker crashes
- **Batch saving posts to database** - Never reaches this step
- **R2 video uploads** - Interrupted by crash
- **Analytics calculation** - Never completes
- **Final response** - HTTP timeout due to crash

---

## Reproduction Steps

1. Call `/api/instagram/creator/add` with any valid username:
   ```bash
   curl -X POST http://91.98.91.129:10000/api/instagram/creator/add \
     -H "Content-Type: application/json" \
     -d '{"username": "spacex", "niche": "Space"}'
   ```

2. Observe logs showing:
   ```
   ✅ Profile fetched
   📹 Fetching 90 reels
   📸 Fetching 30 posts
   💾 Saving 70 reels to database
   [ERROR] Worker (pid:7) was sent code 134!
   ```

3. Worker crashes, API restarts

4. Check database: Profile data saved, 0 reels/posts

**Frequency**: 100% reproduction rate
**Tested with**: nasa, spacex, techcrunch - all crash

---

## Evidence

### Database State Comparison

#### NASA (Before Bug Fix)
```
ID: 440
IG User ID: 528817151
Full Name: NULL ❌
Followers: NULL ❌
Following: NULL ❌
Posts Count: 0
Reels in DB: 0 ❌
Posts in DB: 0 ❌
Last Scraped: 2025-10-09T13:15:59Z
```

#### SpaceX (After Await Fix, Before Crash Fix)
```
ID: 441
IG User ID: 20311520
Full Name: SpaceX ✅
Followers: 16,977,410 ✅
Following: 3 ✅
Posts Count: 0
Reels in DB: 0 ❌
Posts in DB: 0 ❌
Last Scraped: 2025-10-09T13:29:05Z
```

### Server Logs

```
2025-10-09 13:29:05 - INFO - 📹 Step 2/3: Fetching 90 reels for spacex
2025-10-09 13:29:26 - INFO - 📸 Step 3/3: Fetching 30 posts for spacex
2025-10-09 13:29:28 - INFO - 💾 Saving 70 reels to database for spacex
2025-10-09 13:29:28 - INFO - 📤 Starting R2 upload for reel 3728746008982478217
2025-10-09 13:29:28 - INFO - ⬇️ Downloading video from Instagram CDN...
[2025-10-09 13:30:28] [ERROR] Worker (pid:7) was sent code 134!
```

**Timeline**:
- 13:29:05 - Profile fetched ✅
- 13:29:05-13:29:26 - Fetching reels (21 seconds)
- 13:29:26-13:29:28 - Fetching posts (2 seconds)
- 13:29:28 - Started saving reels
- 13:30:28 - Worker crashed (60 seconds later = HTTP timeout)

---

## Root Cause Analysis

### Error Code
**SIGABRT (134)** indicates one of:
1. **Assertion failure** in code
2. **Out of memory** - likely given 70 reels with video data
3. **Fatal exception** in batch insert
4. **Database transaction failure**

### Suspected Location
File: `backend/app/scrapers/instagram/services/instagram_scraper.py`
Method: `batch_save_reels()` or similar batch insert method

### Why Profile Data Saves But Reels Don't
1. Profile save uses single `.update()` or `.insert()` - lightweight
2. Reel save uses batch insert of 70 records with video data - memory intensive
3. Crash happens during batch operation

---

## Previously Fixed Related Bug

### Bug #1: Missing Await (FIXED ✅)
**File**: `backend/app/api/instagram/creators.py` line 322
**Issue**:
```python
# Before (broken)
processing_success = scraper.process_creator(creator_obj)

# After (fixed)
processing_success = await scraper.process_creator(creator_obj)
```

**Impact**: Method is async but wasn't awaited, so returned coroutine object immediately (truthy) without executing. This caused:
- No actual processing
- API returned success instantly
- No content fetched or saved
- NASA shows all NULL values

**Fix Status**: ✅ Deployed and verified working

---

## Current System State

### API Server
- Status: Crash loop
- Symptom: Worker restarts every ~60 seconds during creator addition
- Resource: Hetzner CPX11 (2 vCPU, 2GB RAM)

### Workers
- Worker 1: Unhealthy (Redis connection drops)
- Worker 2: Unhealthy (Redis connection drops)
- Resource: Hetzner CPX31 (8 vCPU, 8GB RAM each)

### Redis
- Status: Running
- Issue: Connections drop every ~2 minutes
- Warning: Memory overcommit not enabled

---

## Impact Assessment

### Functionality Impact
- 🔴 **Instagram creator manual addition**: 100% broken
- 🟡 **Instagram scraper**: Unknown (uses same process_creator method)
- 🟢 **Reddit scraper**: Not affected
- 🟢 **API health checks**: Working
- 🟢 **Database queries**: Working

### Business Impact
- Cannot add new Instagram creators manually
- Cannot test creator processing workflow
- Blocks Phase 4 testing
- Production deployment incomplete

---

## Investigation Needed

### Immediate Questions
1. What is the actual exception causing SIGABRT?
2. Is it memory exhaustion (2GB API server)?
3. Is batch insert size too large (70 reels)?
4. Are there circular references causing memory leak?
5. Is R2 upload blocking and causing timeout?

### Code to Review
1. `instagram_scraper.py` - batch_save_reels() method
2. `instagram_scraper.py` - batch save logic
3. `instagram_scraper.py` - R2 video upload (blocking vs async)
4. Memory usage during reel processing

### Logs to Examine
```bash
# Get full error traceback
ssh root@91.98.91.129 'docker logs b9-api --tail=500 2>&1 | grep -A 20 "Traceback\|Exception\|Error"'

# Check memory usage
ssh root@91.98.91.129 'docker stats b9-api --no-stream'

# Check for OOM kills
ssh root@91.98.91.129 'dmesg | grep -i "out of memory"'
```

---

## Potential Solutions

### Option 1: Reduce Batch Size
Split 70 reels into smaller batches (e.g., 10 at a time)
```python
# Instead of:
batch_save_reels(all_70_reels)

# Do:
for batch in chunks(reels, size=10):
    batch_save_reels(batch)
```

### Option 2: Defer R2 Uploads
Save database records first, upload videos in background
```python
# Save records immediately
batch_save_reels(reels)

# Upload videos via background task
background_tasks.add_task(upload_videos_to_r2, reels)
```

### Option 3: Increase API Server Memory
Upgrade from CPX11 (2GB) to CPX21 (4GB)
- Cost: +$6/month
- May not solve root cause

### Option 4: Fix Memory Leaks
Profile code, find circular references, fix leaks

---

## Next Steps

1. **Examine full error traceback** from Docker logs
2. **Check memory usage** during processing
3. **Review batch_save_reels()** implementation
4. **Test with reduced batch size** (10 reels)
5. **Verify R2 uploads** aren't blocking
6. **Fix Redis connection drops** (separate issue)

---

## Testing Status

### Phase 1: Core Health ✅
- 4/4 endpoints passed

### Phase 2: Reddit Scraper ✅
- 6/6 endpoints passed

### Phase 3: Instagram Creator Addition ❌
- 5/5 API tests passed (false positives)
- 0/5 database verification passed
- **BLOCKED by worker crash**

### Phases 4-8: ⏸️ **BLOCKED**
Cannot proceed until creator addition works

---

## Files Modified

1. `backend/app/api/instagram/creators.py` - Added await (DEPLOYED)
2. `backend/scripts/verify_database.py` - Created for 3-layer verification
3. `backend/docs/BUG_REPORT_2025-10-09_WORKER_CRASH.md` - This file

---

## Related Issues

- **Issue #1**: Redis workers showing unhealthy status
- **Issue #2**: Redis connection drops every ~2 minutes
- **Issue #3**: Memory overcommit warning in Redis

---

**Report created by**: Claude Code (AI Assistant)
**Last updated**: 2025-10-09 13:35 UTC
**Status**: Awaiting human investigation
