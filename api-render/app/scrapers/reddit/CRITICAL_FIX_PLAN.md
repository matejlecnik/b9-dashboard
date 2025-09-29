# Reddit Scraper Critical Fix v3.1.0

┌─ STATUS: ✅ COMPLETED ──────────────────────────────────┐
│ v3.1.0 DEPLOYED: 2025-09-29 19:49 UTC                  │
│ v3.1.1 DEPLOYED: 2025-09-29 22:01 UTC (pagination fix) │
│ ████████████████████ 100% COMPLETE                     │
└─────────────────────────────────────────────────────────┘

## Issue Summary

```json
{
  "severity": "CRITICAL - RESOLVED",
  "impact": "Data loss for review, primary_category, tags, subscribers",
  "affected_records": "~9,851 subreddits (when cache incomplete)",
  "error_rate": "30.5% → <2%",
  "version_deployed": "3.1.0 - Protected Field UPSERT",
  "version_current": "3.1.1 - Cache Pagination Fix",
  "actual_time": "45 minutes + 15 minutes (v3.1.1 hotfix)",
  "priority": "COMPLETED",
  "deployed_at": "2025-09-29 22:01 UTC",
  "status": "PRODUCTION"
}
```

## Root Cause Analysis

```
┌─ ISSUE #1: INCOMPLETE CACHE ────────────────────────────────┐
│ Symptom:   Cache loading intermittently fails               │
│ Timeline:  19:04 UTC: ✅ 10,850 subs | 19:06 UTC: ❌ 999   │
│ Cause:     Pagination breaks when .order('name') missing    │
│ Impact:    91% of subreddits NOT in cache                   │
└──────────────────────────────────────────────────────────────┘

┌─ ISSUE #2: UNPROTECTED UPSERT ──────────────────────────────┐
│ Location:  simple_main.py:2428-2438 (queue_new_subreddits) │
│ Problem:   UPSERT overwrites existing data with defaults    │
│ Fields:    review, primary_category, tags, subscribers      │
│ Trigger:   Subreddit NOT in cache → treated as "new"        │
│ Result:    Existing database record overwritten             │
└──────────────────────────────────────────────────────────────┘

┌─ ISSUE #3: VERSION TRACKING ─────────────────────────────────┐
│ Problem:   No version logged at startup                     │
│ Impact:    Cannot verify which code is deployed             │
│ Need:      Prominent version logging + increment tracking   │
└──────────────────────────────────────────────────────────────┘
```

## Data Loss Example

```json
{
  "scenario": "Cache has 999/10,850 subreddits (9.2%)",
  "trigger": "User posts from r/gonewild discovered",
  "detection": "r/gonewild NOT in cache → is_new_subreddit = True",
  "execution": "UPSERT with defaults",
  "result": {
    "before": {
      "review": "Ok",
      "primary_category": "Style",
      "tags": ["lingerie", "bikini"],
      "subscribers": 50000
    },
    "after": {
      "review": null,
      "primary_category": "Unknown",
      "tags": null,
      "subscribers": 0
    },
    "data_loss": ["review", "primary_category", "tags", "subscribers"]
  }
}
```

## Solution Strategy

```
┌─ PROTECTED UPSERT APPROACH ──────────────────────────────────┐
│                                                              │
│ ✓ For NEW subreddits:    Create with defaults               │
│ ✓ For EXISTING:          Preserve protected fields          │
│ ✓ For ALL:               Update last_scraped_at to re-queue │
│                                                              │
│ Key Insight: Copy logic from update_subreddit_and_metrics() │
│              (lines 2150-2230) which already has protection  │
└──────────────────────────────────────────────────────────────┘
```

## Protected Fields Logic

```json
{
  "protected_fields": {
    "review": {
      "preserve_if": "NOT NULL",
      "update_if": "NULL or empty",
      "rationale": "Manually reviewed by human"
    },
    "primary_category": {
      "preserve_if": "NOT IN (NULL, '', 'Unknown')",
      "update_if": "NULL, empty, or 'Unknown'",
      "rationale": "May be manually categorized"
    },
    "tags": {
      "preserve_if": "NOT NULL AND length > 0",
      "update_if": "NULL or empty array",
      "rationale": "Manually tagged for discovery"
    },
    "over18": {
      "preserve_if": "NOT NULL",
      "update_if": "NULL",
      "rationale": "May be manually corrected"
    },
    "subscribers": {
      "preserve_if": "> 0",
      "update_if": "0 or NULL",
      "rationale": "Prevent resetting to 0"
    },
    "accounts_active": {
      "preserve_if": "> 0",
      "update_if": "0 or NULL",
      "rationale": "Prevent resetting to 0"
    }
  }
}
```

## Implementation Plan

### Phase 1: Test Scripts [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "duration": "15 minutes",
  "tests": [
    {
      "id": "TEST-001",
      "file": "test_protected_upsert.py",
      "desc": "Verify UPSERT preserves existing data",
      "steps": [
        "Create test subreddit with review='Ok', category='Style', tags=['lingerie']",
        "Clear cache to simulate cache miss",
        "Run queue_new_subreddits() with test subreddit",
        "Verify review still 'Ok', category still 'Style', tags preserved",
        "Verify last_scraped_at updated to None (re-queued)"
      ],
      "expected": "All existing data preserved"
    },
    {
      "id": "TEST-002",
      "file": "test_cache_validation.py",
      "desc": "Detect incomplete cache loads",
      "steps": [
        "Query total subreddit count from database",
        "Run cache loading with pagination",
        "Compare loaded count vs expected count",
        "Verify warning logged if mismatch"
      ],
      "expected": "Cache loads 10,850/10,850 (100%)"
    },
    {
      "id": "TEST-003",
      "file": "test_subscribers_api.py",
      "desc": "Verify API returns subscriber counts",
      "steps": [
        "Fetch about data for known subreddit (r/gonewild)",
        "Verify 'subscribers' field exists in response",
        "Verify subscribers > 0 for active subreddit"
      ],
      "expected": "Subscribers field populated with real count"
    }
  ]
}
```

### Phase 2: Fix queue_new_subreddits() [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "duration": "20 minutes",
  "location": "simple_main.py:2400-2520",
  "changes": [
    {
      "change_id": "FIX-001",
      "desc": "Add database fetch for existing protected fields",
      "before": "is_new_subreddit = name.lower() not in self.all_subreddits_cache",
      "after": "existing = self.supabase.table('reddit_subreddits').select('review, primary_category, tags, over18, subscribers, accounts_active').eq('name', name).execute()",
      "lines": "After line 2413"
    },
    {
      "change_id": "FIX-002",
      "desc": "Build protected UPSERT data",
      "logic": "Only include field in upsert_data if existing value is NULL/empty/Unknown",
      "protected": ["review", "primary_category", "tags", "over18", "subscribers", "accounts_active"],
      "lines": "Replace lines 2428-2438"
    },
    {
      "change_id": "FIX-003",
      "desc": "Update logging to distinguish NEW vs EXISTING",
      "message_new": "🆕 New subreddit discovered: r/{name}",
      "message_existing": "🔄 Existing subreddit re-queued (protected): r/{name}",
      "context": "Include protected_fields array in log context",
      "lines": "Replace lines 2440-2503"
    }
  ]
}
```

### Phase 3: Cache Validation [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "duration": "5 minutes",
  "location": "After line 291 (cache loading)",
  "implementation": {
    "step_1": "Query total count: SELECT COUNT(*) FROM reddit_subreddits",
    "step_2": "Compare: total_loaded vs expected_count",
    "step_3": "Log ERROR if incomplete with completion rate",
    "step_4": "Log SUCCESS if complete"
  },
  "monitoring": {
    "metric": "cache_completion_rate",
    "alert_threshold": "< 95%",
    "action": "Log to system_logs for investigation"
  }
}
```

### Phase 4: Version Update [░░░░░░░░░░░░░░░░░░░░] 0%

```json
{
  "duration": "3 minutes",
  "changes": [
    {
      "file": "simple_main.py",
      "line": 66,
      "old": "SCRAPER_VERSION = \"3.0.0 - Simplified Architecture\"",
      "new": "SCRAPER_VERSION = \"3.1.0 - Protected Field UPSERT\""
    },
    {
      "location": "After line 135 (initialization)",
      "add": "Prominent version log with banner + database log entry",
      "format": "={'='*80}\\nReddit Scraper v3.1.0\\n={'='*80}"
    }
  ]
}
```

## Testing Checklist

```
┌─ PRE-DEPLOYMENT TESTS ───────────────────────────────────────┐
│                                                              │
│ [ ] TEST-001: Protected UPSERT preserves existing data      │
│ [ ] TEST-002: Cache validation detects incomplete loads     │
│ [ ] TEST-003: Subscribers field populated from API          │
│ [ ] TEST-004: New subreddit creates with defaults           │
│ [ ] TEST-005: User profile detection (u_ prefix)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌─ POST-DEPLOYMENT VERIFICATION ───────────────────────────────┐
│                                                              │
│ [ ] Version shows "3.1.0 - Protected Field UPSERT"          │
│ [ ] Cache loads 10,850/10,850 subreddits (100%)             │
│ [ ] Logs show "🔄 Existing subreddit re-queued (protected)" │
│ [ ] Error rate < 2% (down from 30.5%)                       │
│ [ ] Query sample subreddits - data unchanged                │
│ [ ] Monitor for 1 hour - zero data loss incidents           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Deployment Steps

```json
{
  "steps": [
    {
      "step": 1,
      "action": "Run all test scripts locally",
      "commands": [
        "python test_protected_upsert.py",
        "python test_cache_validation.py",
        "python test_subscribers_api.py"
      ],
      "duration": "10 min",
      "gate": "All tests MUST pass"
    },
    {
      "step": 2,
      "action": "Commit changes",
      "files": [
        "app/scrapers/reddit/simple_main.py",
        "app/scrapers/reddit/test_*.py",
        "app/scrapers/reddit/CRITICAL_FIX_PLAN.md"
      ],
      "message": "🔧 CRITICAL FIX v3.1.0: Protected field UPSERT prevents data loss",
      "duration": "2 min"
    },
    {
      "step": 3,
      "action": "Push to GitHub",
      "command": "git push origin main",
      "duration": "1 min"
    },
    {
      "step": 4,
      "action": "Monitor deployment",
      "checks": [
        "Wait for Render auto-deploy",
        "Check logs for version: 3.1.0",
        "Verify cache: 10,850/10,850"
      ],
      "duration": "5 min"
    },
    {
      "step": 5,
      "action": "Verify fixes in production",
      "checks": [
        "Search logs for protected re-queue messages",
        "Query 10 random existing subreddits",
        "Verify data unchanged",
        "Check error rate < 2%"
      ],
      "duration": "5 min"
    }
  ],
  "total_time": "23 minutes"
}
```

## Success Criteria

```
┌─ METRICS ────────────────────────────────────────────────────┐
│                                                              │
│ Cache Loading:     [████████████████████] 100% (10,850)     │
│ Data Preservation: [████████████████████] 100%              │
│ Error Rate:        [████░░░░░░░░░░░░░░░░] 2% (was 30.5%)   │
│ Uptime:            [████████████████████] 100%              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

```json
{
  "success_criteria": {
    "critical": [
      "All 5 test scripts pass locally",
      "Cache loads 10,850/10,850 (100%)",
      "Existing subreddits preserve review/category/tags",
      "Zero data overwrites in 1 hour"
    ],
    "important": [
      "Version logged as 3.1.0",
      "Error rate < 2%",
      "Subscribers populated from API"
    ],
    "metrics": {
      "cache_completeness": "100%",
      "data_preservation": "100%",
      "error_reduction": "93.5%",
      "deployment_success": "REQUIRED"
    }
  }
}
```

## Monitoring Queries

```sql
-- 1. Verify version deployed
SELECT message, timestamp, context->>'version' as version
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Scraper Version: 3.1.0%'
ORDER BY timestamp DESC
LIMIT 1;

-- 2. Check cache completeness
SELECT
  message,
  context->>'loaded' as loaded,
  context->>'expected' as expected,
  context->>'completion_rate' as rate
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%Cache%'
  AND timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC
LIMIT 1;

-- 3. Monitor protected re-queues
SELECT
  message,
  context->'protected_fields' as protected,
  context->>'existing_review' as review,
  context->>'cache_miss' as cache_miss
FROM system_logs
WHERE source = 'reddit_scraper'
  AND message LIKE '%re-queued (protected)%'
  AND timestamp > NOW() - INTERVAL '30 minutes'
LIMIT 20;

-- 4. Verify no data loss (sample check)
SELECT
  name,
  review,
  primary_category,
  tags,
  subscribers,
  last_scraped_at
FROM reddit_subreddits
WHERE name IN ('gonewild', 'sexygirls', 'Doppleganger', 'onlyfans')
ORDER BY name;

-- 5. Error rate calculation
SELECT
  level,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM system_logs
WHERE source = 'reddit_scraper'
  AND timestamp > NOW() - INTERVAL '30 minutes'
GROUP BY level
ORDER BY count DESC;
```

## Action Items

```json
{
  "immediate": [
    {"id": "ACT-001", "task": "Create 3 test scripts", "owner": "Claude", "eta": "15m", "status": "COMPLETED"},
    {"id": "ACT-002", "task": "Implement protected UPSERT", "owner": "Claude", "eta": "20m", "status": "COMPLETED"},
    {"id": "ACT-003", "task": "Add cache validation", "owner": "Claude", "eta": "5m", "status": "COMPLETED"},
    {"id": "ACT-004", "task": "Update version to 3.1.0", "owner": "Claude", "eta": "3m", "status": "COMPLETED"}
  ],
  "deployment": [
    {"id": "DEP-001", "task": "Run all tests locally", "gate": "REQUIRED", "status": "COMPLETED"},
    {"id": "DEP-002", "task": "Commit + push to GitHub", "gate": "REQUIRED", "status": "COMPLETED"},
    {"id": "DEP-003", "task": "Monitor deployment", "gate": "REQUIRED", "status": "COMPLETED"},
    {"id": "DEP-004", "task": "Verify in production", "gate": "REQUIRED", "status": "COMPLETED"}
  ],
  "monitoring": [
    {"id": "MON-001", "task": "Watch logs for 1 hour", "interval": "continuous", "status": "COMPLETED"},
    {"id": "MON-002", "task": "Spot check 10 subreddits", "interval": "every 15m", "status": "COMPLETED"},
    {"id": "MON-003", "task": "Track error rate", "threshold": "< 2%", "status": "COMPLETED"}
  ]
}
```

## Risk Assessment

```
┌─ RISKS ──────────────────────────────────────────────────────┐
│                                                              │
│ 🔴 HIGH: Code regression breaks cache loading               │
│    Mitigation: Cache validation logs + alerts               │
│                                                              │
│ 🟡 MED: Protected logic too strict, prevents updates        │
│    Mitigation: Test scripts validate both NEW + EXISTING    │
│                                                              │
│ 🟢 LOW: Database query performance impact                   │
│    Mitigation: One extra SELECT per discovered subreddit    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

_Plan Version: 1.0 | Created: 2025-09-29 | Priority: CRITICAL | ETA: 45 minutes_