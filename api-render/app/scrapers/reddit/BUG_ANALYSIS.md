# Reddit Scraper Bug Analysis

┌─ BUG DISCOVERY ─────────────────────────────────────────┐
│ 🔴 CRITICAL  │ Cache only loading 999/10,850 (9.2%)    │
└─────────────────────────────────────────────────────────┘

## Issue Summary

```json
{
  "severity": "CRITICAL",
  "issue": "Cache pagination broken - only 1 batch loaded",
  "evidence": {
    "expected_total": 10850,
    "actual_loaded": 999,
    "batches_expected": 11,
    "batches_actual": 1,
    "completion_rate": "9.2%"
  },
  "impact": "SEVERE - 90.8% of subreddits treated as 'new', causing data loss via unprotected UPSERT",
  "root_cause": "UNKNOWN - investigating Supabase range() behavior",
  "discovered": "2025-09-29 19:51:19 UTC",
  "version": "3.1.0 - Protected Field UPSERT"
}
```

## Evidence from Production Logs

```json
{
  "timestamp": "2025-09-29 19:51:19.341329+00",
  "level": "error",
  "message": "⚠️ Cache incomplete: 999/10850 (9.2%)",
  "action": "cache_validation_failed"
}
```

```json
{
  "timestamp": "2025-09-29 19:51:19.275935+00",
  "level": "info",
  "message": "✅ Loaded 999 subreddits into cache in 1 batches (0.0s)",
  "action": "cache_loaded"
}
```

## Current Pagination Logic

```python
# Location: simple_main.py lines 260-315
async def load_all_subreddits_cache(self):
    batch_size = 1000
    offset = 0
    total_loaded = 0
    batch_num = 0

    while True:
        batch_num += 1

        result = self.supabase.table('reddit_subreddits').select(
            'name, review, primary_category, tags, over18'
        ).range(offset, offset + batch_size - 1).order('name').execute()

        if not result.data:
            break

        batch_count = len(result.data)
        total_loaded += batch_count
        offset += batch_count

        # ❌ BUG: This breaks too early!
        if batch_count < batch_size:
            break
```

## Problem Analysis

```
┌─ EXPECTED BEHAVIOR ──────────────────────────────────────┐
│                                                          │
│ Batch 1: range(0, 999) → 1000 records                  │
│ Batch 2: range(1000, 1999) → 1000 records              │
│ Batch 3: range(2000, 2999) → 1000 records              │
│ ...                                                      │
│ Batch 11: range(10000, 10999) → 850 records (last)     │
│                                                          │
│ Break condition: batch_count (850) < batch_size (1000)  │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌─ ACTUAL BEHAVIOR ────────────────────────────────────────┐
│                                                          │
│ Batch 1: range(0, 999) → 999 records ❌                 │
│                                                          │
│ Break condition: batch_count (999) < batch_size (1000)  │
│ ⚠️ Loop exits after FIRST batch!                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Possible Root Causes

```json
{
  "hypothesis_1": {
    "theory": "Supabase .range() is exclusive on end",
    "evidence": "range(0, 999) returns 999 records instead of 1000",
    "test": "range(0, 999) should return indices 0-999 inclusive (1000 total)",
    "probability": "HIGH"
  },
  "hypothesis_2": {
    "theory": "Supabase has default limit of 999",
    "evidence": "Exactly 999 records returned",
    "test": "Check Supabase/PostgREST client for default limits",
    "probability": "MEDIUM"
  },
  "hypothesis_3": {
    "theory": "Database has exactly 999 records starting with '0'",
    "evidence": "First batch stopped at exactly 999",
    "test": "SELECT COUNT(*) FROM reddit_subreddits WHERE name < 'BigArms'",
    "probability": "LOW (we know total is 10,850)"
  },
  "hypothesis_4": {
    "theory": "Supabase Python client version issue",
    "evidence": "supabase==2.4.0, postgrest==0.13.2",
    "test": "Check if newer versions fixed range() behavior",
    "probability": "MEDIUM"
  }
}
```

## Immediate Impact

```
┌─ DATA LOSS RISK ─────────────────────────────────────────┐
│                                                          │
│ Subreddits in cache:       999 (9.2%)                    │
│ Subreddits NOT in cache:  9,851 (90.8%)                 │
│                                                          │
│ When NOT in cache → Treated as "new"                     │
│ When treated as "new" → Protected UPSERT logic runs      │
│ Protected UPSERT → Fetches from DB (so data is safe!)   │
│                                                          │
│ ✅ v3.1.0 FIX PREVENTS DATA LOSS                         │
│    (Fetches existing data before UPSERT)                │
│                                                          │
│ ⚠️ Performance impact: 9,851 extra DB queries per cycle │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Why v3.1.0 Protected UPSERT Saves Us

Even though the cache is incomplete, our v3.1.0 fix prevents data loss:

```python
# In queue_new_subreddits() - lines 2485-2558
# Even if NOT in cache, we fetch existing data:
existing = self.supabase.table('reddit_subreddits').select(
    'review, primary_category, tags, over18, subscribers, accounts_active'
).eq('name', name).execute()

# Then only UPSERT fields that are NULL/empty
if existing_data.get('review'):
    protected_fields.append('review')  # Don't include in UPSERT
else:
    upsert_data['review'] = review_status  # Include new value
```

**Result**: Data is preserved even with incomplete cache! But performance suffers.

## Proposed Solutions

```json
{
  "solution_1": {
    "name": "Fix range() calculation",
    "change": "Use range(offset, offset + batch_size) instead of range(offset, offset + batch_size - 1)",
    "rationale": "If Supabase range() is exclusive on end",
    "risk": "LOW",
    "test_required": true
  },
  "solution_2": {
    "name": "Add explicit limit()",
    "change": ".select().limit(batch_size).offset(offset).order('name')",
    "rationale": "Standard SQL pagination pattern",
    "risk": "LOW",
    "test_required": true
  },
  "solution_3": {
    "name": "Change break condition",
    "change": "if batch_count == 0: break",
    "rationale": "Only break on empty result, not < batch_size",
    "risk": "LOW - might do one extra query at end",
    "test_required": false
  },
  "solution_4": {
    "name": "Remove break condition entirely",
    "change": "while result.data: ... (break only if no data)",
    "rationale": "Let empty result terminate loop naturally",
    "risk": "LOW",
    "test_required": false
  }
}
```

## Recommended Fix (IMMEDIATE)

```python
# OPTION 1: Change break condition (SAFEST - works regardless of range() behavior)
# Location: simple_main.py line 310
# BEFORE:
if batch_count < batch_size:
    break

# AFTER:
if batch_count == 0:
    break
# This ensures we continue until we get NO results, not just fewer results
```

## Test Plan

```json
{
  "test_1": {
    "desc": "Verify Supabase range() behavior",
    "query": ".range(0, 999).execute()",
    "expected": "1000 records",
    "check": "len(result.data) == 1000"
  },
  "test_2": {
    "desc": "Test with explicit limit/offset",
    "query": ".limit(1000).offset(0).execute()",
    "expected": "1000 records",
    "check": "len(result.data) == 1000"
  },
  "test_3": {
    "desc": "Test pagination with new break condition",
    "expected": "10,850 records total",
    "check": "Cache validation passes 100%"
  }
}
```

## Files to Investigate

```json
{
  "primary": [
    "app/scrapers/reddit/simple_main.py:260-315 (cache loading)",
    "app/scrapers/reddit/continuous_v3.py:23 (imports simple_main)",
    "start.py:59 (launches continuous_v3)"
  ],
  "dependencies": [
    "app/core/database/supabase_client.py (Supabase initialization)",
    "requirements.txt (supabase==2.4.0, postgrest==0.13.2)"
  ]
}
```

## Next Steps

```
┌─ ACTION PLAN ────────────────────────────────────────────┐
│                                                          │
│ [1] Test range() behavior locally with .env             │
│ [2] Implement break condition fix (batch_count == 0)    │
│ [3] Test cache loading completes 10,850/10,850          │
│ [4] Deploy as v3.1.1 hotfix                             │
│ [5] Verify in production logs                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Monitoring Query

```sql
-- Check cache loading success
SELECT
  timestamp,
  message,
  context->>'loaded' as loaded,
  context->>'expected' as expected,
  context->>'batches' as batches
FROM system_logs
WHERE source = 'reddit_scraper'
  AND (message LIKE '%Cache%' OR message LIKE '%cache%')
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

---

_Analysis Version: 1.0 | Created: 2025-09-29 | Priority: CRITICAL | Status: INVESTIGATING_