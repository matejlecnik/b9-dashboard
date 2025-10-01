# TODO: Render Cron Job Implementation Guide

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● PRODUCTION │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "docs/database/TODO_CRON_SETUP.md",
  "parent": "docs/INDEX.md"
}
```

## Overview

┌─ IMPLEMENTATION TODO ───────────────────────────────────┐
│ ⚠️ CRITICAL │ DEADLINE: 30 DAYS │ DISK OVERFLOW RISK  │
└─────────────────────────────────────────────────────────┘

## Priority Timeline

```json
{
  "IMMEDIATE": {
    "task": "Log Cleanup",
    "risk": "Disk overflow in ~30 days",
    "current_size": "1.8GB",
    "growth": "50MB/day"
  },
  "HIGH": {
    "task": "Rate Limit Reset",
    "impact": "API quotas not resetting"
  },
  "MEDIUM": {
    "task": "Instagram Stats",
    "impact": "Stale analytics data"
  }
}
```

## Step 1: Create API Endpoints

### Create `api-render/app/routes/maintenance_routes.py`
```python
from fastapi import APIRouter, HTTPException, Depends, Header
from supabase import Client
import os
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])

def verify_maintenance_key(x_maintenance_key: Optional[str] = Header(None)):
    """Verify maintenance API key"""
    expected_key = os.getenv("MAINTENANCE_API_KEY")
    if not expected_key or x_maintenance_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid maintenance key")
    return True

@router.post("/cleanup-logs")
async def cleanup_logs(authorized: bool = Depends(verify_maintenance_key)):
    """
    Clean up system logs older than 2 days
    CRITICAL: Must run daily to prevent disk overflow
    """
    try:
        supabase = get_supabase_client()
        result = supabase.rpc("cleanup_old_logs").execute()

        # Log the cleanup operation
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "source": "maintenance",
            "script_name": "cleanup_logs",
            "level": "info",
            "message": f"Cleanup completed: {result.data}"
        }
        supabase.table("system_logs").insert(log_data).execute()

        return {"status": "success", "result": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-rate-limits")
async def reset_rate_limits(authorized: bool = Depends(verify_maintenance_key)):
    """Reset daily API rate limits"""
    try:
        supabase = get_supabase_client()
        result = supabase.rpc("reset_daily_request_counts").execute()
        return {"status": "success", "result": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-instagram-stats")
async def update_instagram_stats(authorized: bool = Depends(verify_maintenance_key)):
    """Update Instagram creator statistics"""
    try:
        supabase = get_supabase_client()
        result = supabase.rpc("update_all_instagram_creator_stats").execute()
        return {"status": "success", "result": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def maintenance_status(authorized: bool = Depends(verify_maintenance_key)):
    """Check maintenance job status"""
    try:
        supabase = get_supabase_client()

        # Get last cleanup time
        logs = supabase.table("system_logs")\
            .select("*")\
            .eq("script_name", "cleanup_logs")\
            .order("timestamp", desc=True)\
            .limit(1)\
            .execute()

        # Get current log table size
        size_query = supabase.rpc("get_table_size", {"table_name": "system_logs"}).execute()

        return {
            "last_cleanup": logs.data[0] if logs.data else None,
            "table_size": size_query.data,
            "status": "healthy"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Update `api-render/main.py`
```python
## Add to imports
from app.routes.maintenance_routes import router as maintenance_router

## Add to routers (around line 200)
app.include_router(maintenance_router)
```

## Step 2: Add Environment Variable

Add to your Render environment variables:
```
MAINTENANCE_API_KEY=<generate-secure-key-here>
```

Generate secure key:
```bash
openssl rand -hex 32
```

## Step 3: Configure Render Cron Jobs

In Render Dashboard (dashboard.render.com):

1. **Navigate to your service** → b9-dashboard
2. **Go to "Jobs" tab**
3. **Click "New Cron Job"**

### Cron Job 1: Log Cleanup (CRITICAL)
```json
{
  "name": "cleanup-logs",
  "schedule": "0 3 * * *",
  "command": "curl -X POST https://b9-dashboard.onrender.com/api/maintenance/cleanup-logs -H 'X-Maintenance-Key: YOUR_KEY'",
  "timezone": "UTC"
}
```

### Cron Job 2: Rate Limit Reset
```json
{
  "name": "reset-rate-limits",
  "schedule": "0 0 * * *",
  "command": "curl -X POST https://b9-dashboard.onrender.com/api/maintenance/reset-rate-limits -H 'X-Maintenance-Key: YOUR_KEY'",
  "timezone": "UTC"
}
```

### Cron Job 3: Instagram Stats
```json
{
  "name": "update-instagram-stats",
  "schedule": "0 * * * *",
  "command": "curl -X POST https://b9-dashboard.onrender.com/api/maintenance/update-instagram-stats -H 'X-Maintenance-Key: YOUR_KEY'",
  "timezone": "UTC"
}
```

## Step 4: Optional - APScheduler Backup

### Create `api-render/app/services/scheduler.py`
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
from supabase import Client
import os

logger = logging.getLogger(__name__)

class BackgroundScheduler:
    def __init__(self, supabase_client: Client):
        self.scheduler = AsyncIOScheduler()
        self.supabase = supabase_client

    async def cleanup_logs(self):
        """Backup job for log cleanup"""
        try:
            result = self.supabase.rpc("cleanup_old_logs").execute()
            logger.info(f"Log cleanup completed: {result.data}")
        except Exception as e:
            logger.error(f"Log cleanup failed: {e}")

    async def reset_rate_limits(self):
        """Backup job for rate limit reset"""
        try:
            result = self.supabase.rpc("reset_daily_request_counts").execute()
            logger.info(f"Rate limits reset: {result.data}")
        except Exception as e:
            logger.error(f"Rate limit reset failed: {e}")

    async def update_instagram_stats(self):
        """Backup job for Instagram stats"""
        try:
            result = self.supabase.rpc("update_all_instagram_creator_stats").execute()
            logger.info(f"Instagram stats updated: {result.data}")
        except Exception as e:
            logger.error(f"Instagram stats update failed: {e}")

    def start(self):
        """Start the scheduler with all jobs"""
        # Only run if Render cron fails (check via env var)
        if os.getenv("ENABLE_BACKUP_SCHEDULER") == "true":
            # Log cleanup at 3:15 AM (15 min after Render cron)
            self.scheduler.add_job(
                self.cleanup_logs,
                CronTrigger(hour=3, minute=15),
                id="cleanup_logs",
                replace_existing=True
            )

            # Rate limit reset at 12:15 AM
            self.scheduler.add_job(
                self.reset_rate_limits,
                CronTrigger(hour=0, minute=15),
                id="reset_rate_limits",
                replace_existing=True
            )

            # Instagram stats every hour at :15
            self.scheduler.add_job(
                self.update_instagram_stats,
                CronTrigger(minute=15),
                id="update_instagram_stats",
                replace_existing=True
            )

            self.scheduler.start()
            logger.info("Backup scheduler started")

    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
```

### Add to `requirements.txt`
```
apscheduler==3.10.4
```

## Step 5: Monitoring

### Create monitoring endpoint in `api-render/app/routes/admin_routes.py`
```python
@router.get("/jobs")
async def job_status():
    """Monitor job execution history"""
    supabase = get_supabase_client()

    # Get recent job logs
    logs = supabase.table("system_logs")\
        .select("*")\
        .in_("script_name", ["cleanup_logs", "reset_rate_limits", "update_instagram_stats"])\
        .order("timestamp", desc=True)\
        .limit(50)\
        .execute()

    # Get table sizes
    tables = ["system_logs", "reddit_posts", "instagram_creators"]
    sizes = {}
    for table in tables:
        size = supabase.rpc("get_table_size", {"table_name": table}).execute()
        sizes[table] = size.data

    return {
        "recent_jobs": logs.data,
        "table_sizes": sizes,
        "next_runs": {
            "cleanup_logs": "Daily at 3:00 AM UTC",
            "reset_rate_limits": "Daily at 12:00 AM UTC",
            "update_instagram_stats": "Every hour"
        }
    }
```

## Testing

### Manual Test Commands
```bash
## Test log cleanup
curl -X POST https://b9-dashboard.onrender.com/api/maintenance/cleanup-logs \
  -H "X-Maintenance-Key: YOUR_KEY"

## Test rate limit reset
curl -X POST https://b9-dashboard.onrender.com/api/maintenance/reset-rate-limits \
  -H "X-Maintenance-Key: YOUR_KEY"

## Test Instagram stats
curl -X POST https://b9-dashboard.onrender.com/api/maintenance/update-instagram-stats \
  -H "X-Maintenance-Key: YOUR_KEY"

## Check status
curl https://b9-dashboard.onrender.com/api/maintenance/status \
  -H "X-Maintenance-Key: YOUR_KEY"
```

## Verification Checklist

- [ ] Environment variable `MAINTENANCE_API_KEY` set in Render
- [ ] API endpoints deployed and accessible
- [ ] Cron jobs configured in Render dashboard
- [ ] Test manual execution of each endpoint
- [ ] Monitor first automated runs
- [ ] Check logs for successful execution
- [ ] Verify disk space is being freed

## Alternative: If Render Cron Not Available

Use GitHub Actions (free) - create `.github/workflows/database-maintenance.yml`:
```yaml
name: Database Maintenance

on:
  schedule:
    - cron: '0 3 * * *'  # Log cleanup at 3 AM UTC
    - cron: '0 0 * * *'  # Rate limit reset at midnight
    - cron: '0 * * * *'  # Instagram stats hourly
  workflow_dispatch:  # Allow manual trigger

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Logs
        if: github.event.schedule == '0 3 * * *' || github.event_name == 'workflow_dispatch'
        run: |
          curl -X POST https://b9-dashboard.onrender.com/api/maintenance/cleanup-logs \
            -H "X-Maintenance-Key: ${{ secrets.MAINTENANCE_API_KEY }}"

      - name: Reset Rate Limits
        if: github.event.schedule == '0 0 * * *' || github.event_name == 'workflow_dispatch'
        run: |
          curl -X POST https://b9-dashboard.onrender.com/api/maintenance/reset-rate-limits \
            -H "X-Maintenance-Key: ${{ secrets.MAINTENANCE_API_KEY }}"

      - name: Update Instagram Stats
        if: github.event.schedule == '0 * * * *' || github.event_name == 'workflow_dispatch'
        run: |
          curl -X POST https://b9-dashboard.onrender.com/api/maintenance/update-instagram-stats \
            -H "X-Maintenance-Key: ${{ secrets.MAINTENANCE_API_KEY }}"
```

---

_TODO Added: 2025-01-29 | Priority: CRITICAL | Deadline: 30 days_

---

_Version: 1.0.0 | Updated: 2025-10-01_