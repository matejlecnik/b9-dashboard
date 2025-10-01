# Database Background Jobs & Maintenance

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● ACTIVE    │ █████████████░░░░░░░ 65% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "docs/database/BACKGROUND_JOBS.md",
  "parent": "docs/INDEX.md"
}
```

## Overview

┌─ JOB SCHEDULER ─────────────────────────────────────────┐
│ ⚠️ NO PG_CRON │ EXTERNAL SCHEDULING │ API-TRIGGERED   │
└─────────────────────────────────────────────────────────┘

## 🚨 TODO: CRITICAL - IMPLEMENT RENDER CRON JOBS

```json
{
  "PRIORITY": "CRITICAL",
  "DEADLINE": "Within 30 days to prevent disk overflow",
  "STATUS": "NOT IMPLEMENTED",
  "RISK": "System logs will overflow disk if not cleaned",
  "SOLUTION": "Implement Render cron jobs as documented below",
  "DOCUMENTATION": "See TODO_CRON_SETUP.md for implementation"
}
```

## Critical Information

```json
{
  "WARNING": "NO DATABASE-LEVEL SCHEDULING",
  "pg_cron": "NOT INSTALLED",
  "triggers": "NONE ACTIVE",
  "scheduling": "MUST BE DONE EXTERNALLY",
  "execution": "Via API calls or external cron",
  "log_retention": "2 DAYS - AUTOMATIC DELETION"
}
```

## 🗑️ Log Cleanup System

### Automatic Log Deletion
```sql
-- ⚠️ CRITICAL: Logs older than 2 days are PERMANENTLY DELETED
FUNCTION cleanup_old_logs()
{
  "retention_period": "2 DAYS",
  "deletion_type": "PERMANENT",
  "batch_mode": "ALL AT ONCE (not chunked)",
  "current_table_size": "1.8GB",
  "growth_rate": "~50MB/day",
  "must_run": "DAILY or logs will grow infinitely"
}

-- Implementation Details:
DELETE FROM system_logs
WHERE timestamp < NOW() - INTERVAL '2 days';

-- Self-documenting: Creates log entry showing deletion count
INSERT INTO system_logs (level, message, context)
VALUES ('info', 'Automated cleanup completed',
        jsonb_build_object('deleted_rows', count));
```

### How to Schedule Log Cleanup
```bash
# Option 1: External cron (recommended)
# Add to system crontab or scheduler:
0 3 * * * curl -X POST https://api.b9agency.com/admin/cleanup-logs \
  -H "Authorization: Bearer $API_KEY"

# Option 2: Python scheduler
import schedule
from supabase import create_client

def cleanup_logs():
    supabase.rpc('cleanup_old_logs').execute()

schedule.every().day.at("03:00").do(cleanup_logs)

# Option 3: GitHub Actions
# .github/workflows/cleanup.yml
on:
  schedule:
    - cron: '0 3 * * *'
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/rest/v1/rpc/cleanup_old_logs \
            -H "apikey: ${{ secrets.SUPABASE_KEY }}"
```

## 📋 Job Management Tables

### `system_control` Table
```json
{
  "purpose": "Script scheduling and monitoring",
  "columns": {
    "script_name": "Identifier for the job",
    "enabled": "Whether job should run",
    "schedule": "Cron expression (informational only)",
    "status": "running|stopped|error",
    "last_heartbeat": "Health check timestamp",
    "max_runtime_minutes": "Timeout configuration",
    "requests_today": "Daily quota tracking",
    "consecutive_errors": "Error threshold monitoring"
  },
  "note": "Schedule field is NOT executed - for documentation only"
}
```

### `script_jobs` Table
```json
{
  "purpose": "Job execution history",
  "columns": {
    "job_id": "Unique job identifier",
    "script_name": "Which script ran",
    "status": "pending|running|completed|failed",
    "progress": "0-100 percentage",
    "started_at": "Execution start time",
    "completed_at": "Execution end time",
    "error_message": "Failure details"
  },
  "current_status": "EMPTY - no jobs recorded"
}
```

### `scraper_control` Table
```json
{
  "purpose": "Reddit scraper orchestration",
  "columns": {
    "scraper_name": "reddit_users|reddit_posts|reddit_subs",
    "is_active": "Enable/disable flag",
    "last_run": "Previous execution",
    "next_run": "Planned execution (informational)",
    "config": "JSON configuration"
  }
}
```

## 🔄 Required Daily Jobs

### 1. Log Cleanup (CRITICAL)
```sql
-- Must run daily or logs grow infinitely
SELECT cleanup_old_logs();

Schedule: Daily at 3:00 AM
Priority: CRITICAL
Impact: Prevents disk overflow
Current Size: 1.8GB (51K rows)
Deletion: Removes ~25K rows/day
```

### 2. Rate Limit Reset
```sql
-- Reset daily API quotas
SELECT reset_daily_request_counts();

Schedule: Daily at 00:00 UTC
Priority: HIGH
Impact: Resets requests_today counter
Affects: API rate limiting
```

### 3. Old Rate Limits Cleanup
```sql
-- Remove expired rate limit records
SELECT cleanup_old_rate_limits();

Schedule: Daily at 3:30 AM
Priority: MEDIUM
Impact: Cleanup api_rate_limits table
```

## 📊 Periodic Maintenance Jobs

### Instagram Stats Rollup
```sql
-- Aggregate Instagram creator statistics
SELECT update_all_instagram_creator_stats();

Schedule: Hourly
Priority: MEDIUM
Processing: ~220 creators
Updates: reels_count, avg_views, engagement
Performance: ~500ms execution
```

### Proxy Performance Calculation
```sql
-- Update proxy success rates
WITH proxy_stats AS (
  SELECT
    proxy_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful
  FROM proxy_logs
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY proxy_id
)
UPDATE reddit_proxies
SET success_rate = successful::FLOAT / total_requests
FROM proxy_stats
WHERE reddit_proxies.id = proxy_stats.proxy_id;

Schedule: Every 6 hours
Priority: LOW
```

### User Score Recalculation
```sql
-- Update Reddit user quality scores
UPDATE reddit_users
SET overall_user_score = (
  karma_quality_score * 0.3 +
  age_quality_score * 0.3 +
  posting_frequency_score * 0.4
)
WHERE last_scraped_at > last_score_update;

Schedule: Daily at 4:00 AM
Priority: MEDIUM
Batch Size: 10,000 users
```

## 🚨 Job Monitoring

### Health Check Query
```sql
-- Monitor job health
SELECT
  script_name,
  enabled,
  status,
  last_heartbeat,
  CASE
    WHEN last_heartbeat < NOW() - INTERVAL '5 minutes' THEN 'DEAD'
    WHEN consecutive_errors > 10 THEN 'FAILING'
    WHEN status = 'error' THEN 'ERROR'
    ELSE 'HEALTHY'
  END as health,
  consecutive_errors,
  last_error
FROM system_control
WHERE enabled = true;
```

### Failed Job Detection
```sql
-- Find stuck or failed jobs
SELECT
  job_id,
  script_name,
  status,
  started_at,
  error_message,
  NOW() - started_at as runtime
FROM script_jobs
WHERE status IN ('running', 'failed')
  AND started_at < NOW() - INTERVAL '1 hour';
```

## 🔧 External Scheduler Setup

### Python APScheduler Example
```python
from apscheduler.schedulers.background import BackgroundScheduler
from supabase import create_client
import os

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_SERVICE_KEY']
)

scheduler = BackgroundScheduler()

# Critical: Log cleanup
@scheduler.scheduled_job('cron', hour=3, minute=0)
def cleanup_logs():
    result = supabase.rpc('cleanup_old_logs').execute()
    print(f"Cleaned up logs: {result}")

# Daily: Reset counters
@scheduler.scheduled_job('cron', hour=0, minute=0)
def reset_counters():
    supabase.rpc('reset_daily_request_counts').execute()

# Hourly: Instagram stats
@scheduler.scheduled_job('interval', hours=1)
def update_instagram():
    supabase.rpc('update_all_instagram_creator_stats').execute()

scheduler.start()
```

### Node.js Cron Example
```javascript
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Daily log cleanup at 3 AM
cron.schedule('0 3 * * *', async () => {
  const { data, error } = await supabase
    .rpc('cleanup_old_logs');
  console.log('Log cleanup:', data || error);
});

// Reset rate limits at midnight
cron.schedule('0 0 * * *', async () => {
  await supabase.rpc('reset_daily_request_counts');
});
```

## 📈 Job Performance Metrics

```json
{
  "cleanup_old_logs": {
    "execution_time": "~2-5 seconds",
    "rows_affected": "~25,000/day",
    "disk_freed": "~50MB/day"
  },
  "update_instagram_stats": {
    "execution_time": "~500ms",
    "rows_updated": "220 creators",
    "frequency": "hourly"
  },
  "reset_daily_counts": {
    "execution_time": "<100ms",
    "rows_updated": "~10-20",
    "frequency": "daily"
  }
}
```

## ⚠️ Critical Warnings

```json
{
  "IMMEDIATE_ACTION_REQUIRED": {
    "log_cleanup": {
      "status": "NOT SCHEDULED",
      "risk": "DISK OVERFLOW IN ~30 DAYS",
      "action": "IMPLEMENT DAILY cleanup_old_logs()",
      "current_size": "1.8GB",
      "growth": "50MB/day"
    }
  },
  "NO_AUTOMATIC_EXECUTION": {
    "reason": "No pg_cron extension",
    "solution": "Must use external scheduler",
    "options": ["API endpoint", "Python script", "GitHub Actions", "System cron"]
  },
  "DATA_LOSS_RISK": {
    "logs_deleted_after": "2 DAYS",
    "recovery": "IMPOSSIBLE",
    "backup_strategy": "Export important logs before deletion"
  }
}
```

## 🔍 Troubleshooting

### Job Not Running
```sql
-- Check if job is enabled
SELECT * FROM system_control
WHERE script_name = 'your_job_name';

-- Check last execution
SELECT * FROM script_jobs
WHERE script_name = 'your_job_name'
ORDER BY created_at DESC LIMIT 1;

-- Force execution
SELECT your_function_name();
```

### Log Table Growing
```sql
-- Check log size
SELECT
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('system_logs')) as size,
  MIN(timestamp) as oldest_log,
  MAX(timestamp) as newest_log
FROM system_logs;

-- Manual cleanup if needed
SELECT cleanup_old_logs();
```

---

_Job System: External | Retention: 2 Days | Status: REQUIRES SETUP | Updated: 2025-01-29_

---

_Version: 1.0.0 | Updated: 2025-10-01_