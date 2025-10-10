# Render Cron Jobs Setup Guide

┌─ CRON-001: LOG CLEANUP ─────────────────────────────────┐
│ ● DEPLOYED │ Daily at 2 AM UTC | 30-day retention       │
│ Risk: DISK_OVERFLOW | Status: PRODUCTION                │
└──────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "backend/",
  "current": "backend/docs/CRON_SETUP.md",
  "siblings": [
    {"path": "backend/README.md", "desc": "Backend overview", "status": "ACTIVE"}
  ],
  "related": [
    {"path": "backend/render.yaml", "desc": "Render deployment config", "status": "PRODUCTION"},
    {"path": "backend/app/api/cron.py", "desc": "Cron API endpoints", "status": "ACTIVE"},
    {"path": "backend/app/jobs/log_cleanup.py", "desc": "Log cleanup implementation", "status": "ACTIVE"}
  ]
}
```

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Cron Jobs](#cron-jobs)
4. [Deployment Guide](#deployment-guide)
5. [Configuration](#configuration)
6. [Testing & Verification](#testing--verification)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Security](#security)

---

## Overview

This guide covers the setup and deployment of Render cron jobs for the B9 Dashboard backend. Cron jobs are scheduled tasks that run automatically at specified intervals to perform maintenance operations.

### Purpose

**Primary Goal:** Prevent disk overflow by automatically cleaning old logs from Supabase database and local filesystem.

### Critical Details

```json
{
  "project_id": "CRON-001",
  "deadline": "2025-10-15",
  "risk": "DISK_OVERFLOW",
  "priority": "CRITICAL",
  "status": "DEPLOYED"
}
```

### Available Cron Jobs

| Job ID | Name | Schedule | Retention | Purpose |
|--------|------|----------|-----------|---------|
| CRON-001 | `b9-log-cleanup` | Daily 2 AM UTC | 30 days | Cleanup old logs (DB + files) |
| CRON-002 | `cdn-r2-migration` | TBD | N/A | Migrate Instagram CDN → R2 storage |

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                  RENDER CRON SERVICE                    │
│                   (b9-log-cleanup)                      │
│                                                         │
│  Schedule: "0 2 * * *" (Daily at 2 AM UTC)            │
│  Runtime: python3                                       │
│  Region: Oregon                                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ curl POST with Bearer token
                  ↓
┌─────────────────────────────────────────────────────────┐
│              MAIN API SERVICE                           │
│            (b9-dashboard-api)                           │
│                                                         │
│  POST /api/cron/cleanup-logs                           │
│  Authorization: Bearer {CRON_SECRET}                    │
│  Query: ?retention_days=30                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Triggers cleanup job
                  ↓
┌─────────────────────────────────────────────────────────┐
│           LOG CLEANUP JOB                               │
│     (app/jobs/log_cleanup.py)                          │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  Supabase Cleanup   │  │  Local File Cleanup │    │
│  │  • Delete old logs  │  │  • Delete old files │    │
│  │  • Batch processing │  │  • Size tracking    │    │
│  │  • Count tracking   │  │  • Error handling   │    │
│  └─────────────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Component Flow

1. **Render Cron Trigger**
   - Executes `startCommand` from `render.yaml` at scheduled time
   - Uses `curl` to POST to API endpoint with authentication

2. **API Authentication**
   - Validates `Authorization: Bearer {CRON_SECRET}` header
   - Returns 401 if token missing or invalid
   - Returns 500 if `CRON_SECRET` not configured

3. **Job Execution**
   - Runs `full_log_cleanup()` from `app/jobs/log_cleanup.py`
   - Cleans Supabase database logs (batch processing)
   - Cleans local log files from `logs/` directory
   - Returns cleanup statistics

4. **Result Reporting**
   - Logs success/failure with detailed statistics
   - Returns JSON response with cleanup results
   - Render dashboard shows execution history

---

## Cron Jobs

### CRON-001: Log Cleanup

**Purpose:** Automatically delete logs older than 30 days to prevent disk overflow.

**Configuration:**

```yaml
# backend/render.yaml (lines 64-86)
- type: cron
  name: b9-log-cleanup
  runtime: python3
  buildCommand: "pip install -r requirements.txt"
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  startCommand: 'curl -X POST "${RENDER_SERVICE_URL}/api/cron/cleanup-logs?retention_days=30" -H "Authorization: Bearer ${CRON_SECRET}"'
  plan: starter
  region: oregon
  branch: main
  rootDir: backend
  autoDeploy: true
  envVars:
    - key: RENDER_SERVICE_URL
      fromService:
        type: web
        name: b9-dashboard-api
        property: host
    - key: CRON_SECRET
      generateValue: true  # Render auto-generates secure random value
    - key: SUPABASE_URL
      sync: true  # Sync from main service
    - key: SUPABASE_SERVICE_ROLE_KEY
      sync: true  # Sync from main service
```

**Schedule:** Daily at 2 AM UTC (cron syntax: `0 2 * * *`)

**Retention:** 30 days (configurable via `retention_days` query parameter)

**Implementation Files:**

1. **API Endpoint:** `backend/app/api/cron.py:28-103`
   - POST `/api/cron/cleanup-logs`
   - Authentication: Bearer token validation
   - Returns cleanup statistics

2. **Job Implementation:** `backend/app/jobs/log_cleanup.py`
   - `cleanup_old_logs()`: Supabase database cleanup (lines 19-96)
   - `cleanup_local_log_files()`: Local file cleanup (lines 98-168)
   - `full_log_cleanup()`: Orchestrates both cleanups (lines 170-200)

**What Gets Cleaned:**

```json
{
  "supabase_logs": {
    "table": "logs",
    "criteria": "timestamp < (NOW() - INTERVAL '30 days')",
    "batch_size": 1000,
    "behavior": "Delete in batches to avoid timeouts"
  },
  "local_files": {
    "directory": "logs/",
    "criteria": "file_mtime < (NOW() - 30 days)",
    "behavior": "Delete files, track sizes"
  }
}
```

**Expected Results:**

```json
{
  "status": "success",
  "message": "Log cleanup completed (retention: 30 days)",
  "results": {
    "supabase": {
      "deleted": 1500,
      "retention_days": 30,
      "cutoff_date": "2024-10-01T02:00:00",
      "status": "success"
    },
    "local": {
      "deleted_files": 25,
      "deleted_bytes": 15728640,
      "deleted_mb": 15.0,
      "retention_days": 30,
      "status": "success"
    },
    "retention_days": 30,
    "timestamp": "2024-10-31T02:05:23",
    "status": "success"
  }
}
```

---

### CRON-002: CDN to R2 Migration (Future)

**Purpose:** Migrate Instagram CDN URLs to Cloudflare R2 storage for better performance and cost optimization.

**Configuration:** TBD (not yet deployed)

**Implementation:** `backend/app/api/cron.py:105-194`

**Features:**
- Downloads media from Instagram CDN
- Compresses images (300KB target) and videos (1.5MB @ 720p)
- Uploads to Cloudflare R2 storage
- Updates database with R2 URLs
- Idempotent (safe to run multiple times)

---

## Deployment Guide

### Prerequisites

1. **Render Account**
   - Project created: `b9-dashboard`
   - Main API service deployed: `b9-dashboard-api`
   - Blueprint file ready: `backend/render.yaml`

2. **Environment Variables**
   - `SUPABASE_URL`: Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (admin access)
   - `CRON_SECRET`: Auto-generated by Render (secure random value)

3. **Dependencies**
   - Python 3.12+
   - FastAPI
   - Supabase Python client
   - All requirements in `backend/requirements.txt`

### Step 1: Verify render.yaml Configuration

**Location:** `backend/render.yaml` (lines 64-86)

**Checklist:**

```bash
# 1. Check cron service configuration
cat backend/render.yaml | grep -A 25 "type: cron"

# 2. Verify environment variable sync
cat backend/render.yaml | grep -A 5 "envVars:"

# 3. Confirm schedule and retention
cat backend/render.yaml | grep -E "schedule:|retention_days"
```

**Expected Output:**

```yaml
- type: cron
  name: b9-log-cleanup
  runtime: python3
  buildCommand: "pip install -r requirements.txt"
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  startCommand: 'curl -X POST "${RENDER_SERVICE_URL}/api/cron/cleanup-logs?retention_days=30" -H "Authorization: Bearer ${CRON_SECRET}"'
  # ... env vars with sync: true
```

### Step 2: Deploy Cron Service via Render Dashboard

**Manual Deployment Steps:**

1. **Navigate to Render Dashboard**
   ```
   https://dashboard.render.com
   → Select project: b9-dashboard
   ```

2. **Create New Cron Job**
   ```
   → Click "New +"
   → Select "Cron Job"
   → Connect to GitHub repo: matejlecnik/b9-dashboard
   → Branch: main
   ```

3. **Configure Cron Service**
   ```
   Name: b9-log-cleanup
   Region: Oregon
   Build Command: pip install -r requirements.txt
   Schedule: 0 2 * * *
   Start Command: curl -X POST "${RENDER_SERVICE_URL}/api/cron/cleanup-logs?retention_days=30" -H "Authorization: Bearer ${CRON_SECRET}"
   Root Directory: backend
   Plan: Starter ($0/month)
   ```

4. **Add Environment Variables**
   ```
   → Click "Environment Variables"

   RENDER_SERVICE_URL:
     - Type: "From Service"
     - Service: b9-dashboard-api
     - Property: host

   CRON_SECRET:
     - Type: "Generate Value"
     - (Render creates secure random token)

   SUPABASE_URL:
     - Type: "Sync from Service"
     - Service: b9-dashboard-api
     - Variable: SUPABASE_URL

   SUPABASE_SERVICE_ROLE_KEY:
     - Type: "Sync from Service"
     - Service: b9-dashboard-api
     - Variable: SUPABASE_SERVICE_ROLE_KEY
   ```

5. **Enable Auto-Deploy**
   ```
   → Toggle "Auto-Deploy: Yes"
   → This ensures cron service updates on git push
   ```

6. **Create Service**
   ```
   → Click "Create Cron Job"
   → Wait for initial build to complete (~2-3 minutes)
   ```

### Step 3: Verify Deployment

**Check Service Status:**

```bash
# 1. Verify cron service is healthy
curl https://b9-log-cleanup.onrender.com/api/cron/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "cron-jobs",
#   "cron_secret_configured": true,
#   "available_jobs": ["cleanup-logs", "migrate-cdn-to-r2"]
# }
```

**Check Environment Variables:**

```bash
# 1. Navigate to Render Dashboard
# 2. Select cron service: b9-log-cleanup
# 3. Click "Environment" tab
# 4. Verify all 4 env vars are set:
#    - RENDER_SERVICE_URL (from service)
#    - CRON_SECRET (generated)
#    - SUPABASE_URL (synced)
#    - SUPABASE_SERVICE_ROLE_KEY (synced)
```

### Step 4: Blueprint Deployment (Alternative)

**Using render.yaml for automated deployment:**

```bash
# 1. Ensure render.yaml is in repository root
ls backend/render.yaml

# 2. Commit and push to trigger deploy
git add backend/render.yaml
git commit -m "feat: Add cron service for log cleanup"
git push origin main

# 3. Render automatically detects and deploys cron service
#    (requires "Blueprint" feature enabled in Render project)
```

**Blueprint Deployment Notes:**

- Render reads `render.yaml` from repository root
- Auto-creates services defined in YAML
- Syncs environment variables automatically
- Enables infrastructure-as-code workflow

---

## Configuration

### Environment Variables

**Required Variables:**

| Variable | Type | Source | Purpose |
|----------|------|--------|---------|
| `RENDER_SERVICE_URL` | String | From Service | Main API URL for cron to call |
| `CRON_SECRET` | String | Generate Value | Authentication token for cron endpoints |
| `SUPABASE_URL` | String | Sync from Service | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | String | Sync from Service | Admin access for database operations |

**Configuration in render.yaml:**

```yaml
envVars:
  - key: RENDER_SERVICE_URL
    fromService:
      type: web
      name: b9-dashboard-api
      property: host
  - key: CRON_SECRET
    generateValue: true  # Render generates secure token
  - key: SUPABASE_URL
    sync: true  # Syncs from main API service
  - key: SUPABASE_SERVICE_ROLE_KEY
    sync: true  # Syncs from main API service
```

**Why Sync Environment Variables?**

- **DRY Principle:** Single source of truth (main API service)
- **Security:** No need to duplicate secrets
- **Maintenance:** Update once, propagates to all services
- **Consistency:** Ensures cron uses same database as API

### Schedule Configuration

**Cron Schedule Syntax:**

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sun-Sat)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Current Schedule:** `0 2 * * *`
- Minute: 0 (on the hour)
- Hour: 2 (2 AM UTC = 6 PM PST / 7 PM PDT)
- Day: * (every day)
- Month: * (every month)
- Weekday: * (every weekday)

**Alternative Schedules:**

```yaml
# Every 6 hours
"0 */6 * * *"

# Twice daily (2 AM and 2 PM UTC)
"0 2,14 * * *"

# Weekly on Sunday at 3 AM UTC
"0 3 * * 0"

# Monthly on 1st at 4 AM UTC
"0 4 1 * *"
```

### Retention Configuration

**Default:** 30 days (configurable via query parameter)

**Modify Retention:**

```yaml
# backend/render.yaml
startCommand: 'curl -X POST "${RENDER_SERVICE_URL}/api/cron/cleanup-logs?retention_days=60" ...'
#                                                                           ↑ Change here
```

**Retention Recommendations:**

| Environment | Retention | Reasoning |
|-------------|-----------|-----------|
| Development | 7 days | Fast iteration, limited storage |
| Staging | 14 days | Testing + debugging needs |
| Production | 30 days | Compliance + incident investigation |
| Archive | 90+ days | Long-term compliance requirements |

---

## Testing & Verification

### Local Testing

**1. Test API Endpoint Locally:**

```bash
# 1. Start local API server
cd backend
python start.py

# 2. Set CRON_SECRET for testing
export CRON_SECRET="test-secret-12345"

# 3. Test cron endpoint
curl -X POST "http://localhost:10000/api/cron/cleanup-logs?retention_days=30" \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -v

# Expected output:
# {
#   "status": "success",
#   "message": "Log cleanup completed (retention: 30 days)",
#   "results": {
#     "supabase": {"deleted": 150, "retention_days": 30, ...},
#     "local": {"deleted_files": 5, "deleted_mb": 2.5, ...}
#   }
# }
```

**2. Test Authentication:**

```bash
# Missing Authorization header
curl -X POST "http://localhost:10000/api/cron/cleanup-logs" -v
# Expected: 401 Unauthorized

# Invalid token
curl -X POST "http://localhost:10000/api/cron/cleanup-logs" \
  -H "Authorization: Bearer wrong-token" -v
# Expected: 401 Unauthorized

# Invalid format (missing "Bearer")
curl -X POST "http://localhost:10000/api/cron/cleanup-logs" \
  -H "Authorization: test-secret-12345" -v
# Expected: 401 Unauthorized
```

**3. Test Health Endpoint:**

```bash
# Health check (no auth required)
curl http://localhost:10000/api/cron/health

# Expected output:
# {
#   "status": "healthy",
#   "service": "cron-jobs",
#   "cron_secret_configured": true,
#   "available_jobs": ["cleanup-logs", "migrate-cdn-to-r2"]
# }
```

### Production Testing

**1. Manual Trigger (Render Dashboard):**

```
1. Go to: https://dashboard.render.com
2. Select project: b9-dashboard
3. Select service: b9-log-cleanup
4. Click "Manual Deploy" → "Trigger Run"
5. Wait for execution (~30-60 seconds)
6. Check "Logs" tab for output
```

**2. Manual Trigger (curl):**

```bash
# Get CRON_SECRET from Render dashboard
# Environment → CRON_SECRET → "Reveal"

# Trigger manually
curl -X POST "https://YOUR-API-URL/api/cron/cleanup-logs?retention_days=30" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" \
  -v

# Check response status and output
```

**3. Verify Execution:**

```bash
# Check Render dashboard logs
https://dashboard.render.com
→ b9-log-cleanup
→ Logs tab
→ Look for: "✅ Log cleanup completed successfully"

# Example log output:
# 2024-10-31T02:00:15 INFO: 🧹 Starting full log cleanup (retention: 30 days)
# 2024-10-31T02:00:17 INFO: Found 1500 old log entries to delete
# 2024-10-31T02:00:23 INFO: Deleted batch: 1000 entries (total: 1000/1500)
# 2024-10-31T02:00:28 INFO: Deleted batch: 500 entries (total: 1500/1500)
# 2024-10-31T02:00:30 INFO: ✅ Log cleanup complete: 1500 entries deleted
# 2024-10-31T02:00:32 INFO: ✅ Local log cleanup complete: 25 files deleted (15.0 MB)
```

---

## Monitoring

### Render Dashboard

**Access:** https://dashboard.render.com → b9-dashboard → b9-log-cleanup

**Key Metrics:**

1. **Execution History**
   - Last run timestamp
   - Execution duration
   - Success/failure status
   - Exit code (0 = success)

2. **Logs**
   - Real-time log stream
   - Filter by date/time
   - Search for keywords ("ERROR", "SUCCESS", "deleted")

3. **Metrics**
   - CPU usage
   - Memory usage
   - Network bandwidth

### Log Monitoring

**Search for Issues:**

```bash
# View recent cron logs
https://dashboard.render.com → b9-log-cleanup → Logs

# Search for errors
Filter: "ERROR"
Filter: "❌"
Filter: "failed"

# Search for successes
Filter: "✅ Log cleanup completed successfully"
Filter: "deleted"
```

**Expected Log Patterns:**

```
SUCCESS:
✅ Log cleanup completed successfully: 1500 DB logs, 25 local files

PARTIAL SUCCESS:
⚠️ Log cleanup completed with warnings: {...}

FAILURE:
❌ Log cleanup failed: [error details]
```

### Alerting

**Render Alerts:**

```
1. Go to Render Dashboard
2. Select service: b9-log-cleanup
3. Click "Notifications"
4. Configure:
   - Email on failure
   - Slack webhook (optional)
   - PagerDuty integration (optional)
```

**Custom Alerts:**

```python
# Add to app/jobs/log_cleanup.py
import logging
from app.core.notifications import send_alert

async def full_log_cleanup(retention_days: int = 30):
    try:
        result = await cleanup_old_logs(retention_days)

        # Alert if cleanup deleted unusual amount
        if result["deleted"] > 10000:
            send_alert(f"⚠️ High log deletion: {result['deleted']} entries")

        return result
    except Exception as e:
        # Alert on failure
        send_alert(f"❌ Log cleanup failed: {e}")
        raise
```

---

## Troubleshooting

### Common Issues

#### 1. Cron Job Not Running

**Symptoms:**
- No logs in Render dashboard
- Last run timestamp not updating
- No cleanup happening

**Diagnosis:**

```bash
# 1. Check cron service status
https://dashboard.render.com → b9-log-cleanup → "Status"

# 2. Verify schedule configuration
cat backend/render.yaml | grep schedule

# 3. Check service logs for errors
https://dashboard.render.com → b9-log-cleanup → "Logs"
```

**Solutions:**

```bash
# Solution 1: Verify schedule is valid
# Invalid: "0 2 * * * *" (6 fields - not supported by Render)
# Valid: "0 2 * * *" (5 fields)

# Solution 2: Check if service is suspended
# Render suspends services after 90 days inactivity
# → Manually trigger to reactivate

# Solution 3: Verify autoDeploy is enabled
autoDeploy: true  # in render.yaml
```

#### 2. Authentication Failure (401)

**Symptoms:**
- Logs show: "401 Unauthorized"
- Cron triggers but API rejects request

**Diagnosis:**

```bash
# 1. Check if CRON_SECRET is set
https://dashboard.render.com → b9-log-cleanup → Environment → CRON_SECRET

# 2. Verify main API has CRON_SECRET
https://dashboard.render.com → b9-dashboard-api → Environment → CRON_SECRET

# 3. Check startCommand format
cat backend/render.yaml | grep startCommand
```

**Solutions:**

```bash
# Solution 1: Regenerate CRON_SECRET
1. Go to Render Dashboard → b9-dashboard-api → Environment
2. Delete existing CRON_SECRET
3. Add new CRON_SECRET → "Generate Value"
4. Redeploy both services

# Solution 2: Fix startCommand format
# Invalid: -H "Authorization: ${CRON_SECRET}"
# Valid:   -H "Authorization: Bearer ${CRON_SECRET}"

# Solution 3: Verify Authorization header parsing
# Check app/api/cron.py:68-72 for proper Bearer token extraction
```

#### 3. Supabase Connection Failure

**Symptoms:**
- Logs show: "Supabase client required for log cleanup"
- Database queries fail

**Diagnosis:**

```bash
# 1. Check SUPABASE_URL is set
https://dashboard.render.com → b9-log-cleanup → Environment → SUPABASE_URL

# 2. Check SUPABASE_SERVICE_ROLE_KEY is set
https://dashboard.render.com → b9-log-cleanup → Environment → SUPABASE_SERVICE_ROLE_KEY

# 3. Test Supabase connection
curl https://YOUR_SUPABASE_URL/rest/v1/ \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Solutions:**

```bash
# Solution 1: Verify environment variable sync
# render.yaml should have:
envVars:
  - key: SUPABASE_URL
    sync: true
  - key: SUPABASE_SERVICE_ROLE_KEY
    sync: true

# Solution 2: Manually set values (if sync fails)
1. Copy values from b9-dashboard-api service
2. Paste into b9-log-cleanup environment variables

# Solution 3: Check Supabase service status
https://status.supabase.com
```

#### 4. Timeout Errors

**Symptoms:**
- Cron job times out after 30 seconds
- Logs show: "Request timeout"
- Large log volumes not cleaned

**Diagnosis:**

```bash
# 1. Check number of logs in database
SELECT COUNT(*) FROM logs WHERE timestamp < NOW() - INTERVAL '30 days';

# 2. Check batch size
cat backend/app/jobs/log_cleanup.py | grep batch_size
```

**Solutions:**

```python
# Solution 1: Increase batch size
async def cleanup_old_logs(retention_days: int = 30, batch_size: int = 5000):
    # Increase from 1000 to 5000

# Solution 2: Add timeout to curl command (render.yaml)
startCommand: 'curl --max-time 300 -X POST ...'  # 5 minute timeout

# Solution 3: Run cleanup more frequently
schedule: "0 */12 * * *"  # Every 12 hours instead of daily
```

#### 5. Local File Cleanup Not Working

**Symptoms:**
- Supabase logs deleted successfully
- Local files not deleted
- Logs show: "directory_not_found"

**Diagnosis:**

```bash
# 1. Check if logs directory exists
ls -la logs/

# 2. Verify log directory path
cat backend/app/jobs/log_cleanup.py | grep log_dir

# 3. Check file permissions
ls -la logs/ | head -10
```

**Solutions:**

```bash
# Solution 1: Create logs directory
mkdir -p logs/
chmod 755 logs/

# Solution 2: Update log_dir path in cleanup function
def cleanup_local_log_files(log_dir: str = "/app/logs", retention_days: int = 30):
    # Use absolute path in production

# Solution 3: Verify Render file system
# Render uses ephemeral storage - files reset on deploy
# Consider using persistent storage for logs (Render Disks)
```

### Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check CRON_SECRET, verify Bearer token format |
| 404 | Endpoint not found | Verify API is deployed, check URL in startCommand |
| 500 | Internal server error | Check API logs for Python exceptions |
| 503 | Service unavailable | API may be deploying or suspended, wait and retry |
| Timeout | Request took too long | Increase batch size, run more frequently |

---

## Security

### Authentication

**Bearer Token Flow:**

```
1. Render cron sends request:
   curl -H "Authorization: Bearer ${CRON_SECRET}" ...

2. API validates token (app/api/cron.py:56-78):
   - Check CRON_SECRET env var exists
   - Verify Authorization header present
   - Verify "Bearer " prefix
   - Compare token with CRON_SECRET
   - Reject if mismatch (401 Unauthorized)

3. Execute job if valid
```

**Security Best Practices:**

```json
{
  "token_generation": {
    "method": "Render generateValue",
    "length": "32+ characters",
    "entropy": "High (cryptographically secure random)",
    "rotation": "Manually rotate every 90 days"
  },
  "token_storage": {
    "location": "Render environment variables (encrypted at rest)",
    "access": "Only accessible to Render services",
    "exposure": "Never log or return in API responses"
  },
  "token_transmission": {
    "protocol": "HTTPS only (TLS 1.3)",
    "header": "Authorization: Bearer {token}",
    "query_params": "Never pass token in URL"
  }
}
```

### Access Control

**Who Can Trigger Cron Jobs:**

```json
{
  "automated": {
    "source": "Render cron service (scheduled)",
    "auth": "CRON_SECRET environment variable",
    "frequency": "Per schedule configuration"
  },
  "manual_render_dashboard": {
    "source": "Render account owner/team members",
    "auth": "Render account authentication",
    "action": "Click 'Trigger Run' button"
  },
  "manual_api": {
    "source": "Anyone with CRON_SECRET",
    "auth": "Bearer token in Authorization header",
    "access": "Restricted - only share with trusted systems"
  }
}
```

**Principle of Least Privilege:**

- Cron service only has access to:
  - Main API URL (RENDER_SERVICE_URL)
  - Supabase database (read/write logs table)
  - Local filesystem (read/write logs directory)
- No access to:
  - User data
  - Other Supabase tables
  - Payment information
  - API keys for third-party services

### Audit Logging

**What Gets Logged:**

```python
# app/api/cron.py logs:
logger.info(f"🧹 Cron job triggered: cleanup-logs (retention: {retention_days} days)")
logger.info(f"✅ Log cleanup completed successfully: {result['supabase']['deleted']} DB logs")
logger.warning("⚠️ Log cleanup completed with warnings: {result}")
logger.error(f"❌ Log cleanup failed: {e}", exc_info=True)
logger.warning("Invalid cron secret provided")  # Security event
```

**Audit Trail:**

1. **Render Dashboard Logs**
   - All cron executions logged with timestamp
   - Success/failure status tracked
   - Execution duration recorded

2. **Application Logs**
   - Every cron trigger logged with retention period
   - Cleanup statistics logged (deleted count)
   - Authentication failures logged

3. **Supabase Logs** (if enabled)
   - Database queries logged
   - Deletion operations tracked

### Token Rotation

**Recommended Schedule:** Every 90 days

**Rotation Process:**

```bash
# 1. Generate new CRON_SECRET
https://dashboard.render.com → b9-dashboard-api → Environment
→ CRON_SECRET → Delete
→ Add new → "Generate Value"

# 2. Redeploy services
→ b9-dashboard-api → "Manual Deploy"
→ b9-log-cleanup → "Manual Deploy"

# 3. Verify new token works
→ b9-log-cleanup → "Trigger Run"
→ Check logs for success

# 4. Document rotation in changelog
git commit -m "security: Rotated CRON_SECRET token"
```

### Secrets Management

**What NOT to Do:**

```bash
# ❌ DON'T hardcode secrets in code
CRON_SECRET = "my-secret-token-12345"

# ❌ DON'T commit secrets to git
git add .env
git commit -m "Add production secrets"

# ❌ DON'T log secrets
logger.info(f"Using CRON_SECRET: {cron_secret}")

# ❌ DON'T return secrets in API responses
return {"cron_secret": os.getenv("CRON_SECRET")}
```

**What TO Do:**

```bash
# ✅ Use environment variables
cron_secret = os.getenv("CRON_SECRET")

# ✅ Use .gitignore for local .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# ✅ Log authentication events (not tokens)
logger.warning("Invalid cron secret provided")  # No token value

# ✅ Use Render's encrypted environment storage
# Render encrypts all env vars at rest
```

---

## Quick Reference

### URLs

```bash
# Production API
https://b9-dashboard-api.onrender.com

# Cron Health Check
https://b9-dashboard-api.onrender.com/api/cron/health

# Cleanup Logs Endpoint
POST https://b9-dashboard-api.onrender.com/api/cron/cleanup-logs?retention_days=30
Header: Authorization: Bearer {CRON_SECRET}

# Render Dashboard
https://dashboard.render.com/web/b9-dashboard
```

### Commands

```bash
# Manual trigger (requires CRON_SECRET)
curl -X POST "https://YOUR-API-URL/api/cron/cleanup-logs?retention_days=30" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -v

# Health check (no auth)
curl https://YOUR-API-URL/api/cron/health

# View logs
https://dashboard.render.com → b9-log-cleanup → Logs

# Redeploy cron service
https://dashboard.render.com → b9-log-cleanup → "Manual Deploy"
```

### File Locations

```bash
# Configuration
backend/render.yaml              # Render deployment config (lines 64-86)

# Implementation
backend/app/api/cron.py          # API endpoints (POST /api/cron/cleanup-logs)
backend/app/jobs/log_cleanup.py  # Job implementation (cleanup logic)

# Documentation
backend/docs/CRON_SETUP.md       # This file
ROADMAP.md                       # Project roadmap (CRON-001 status)
CLAUDE.md                        # Mission control (critical queue)
```

---

## Version History

```json
{
  "v1.0.0": {
    "date": "2025-10-09",
    "status": "DEPLOYED",
    "changes": [
      "Initial CRON-001 deployment",
      "Log cleanup job configured",
      "30-day retention period set",
      "Daily 2 AM UTC schedule",
      "Bearer token authentication",
      "Comprehensive documentation created"
    ]
  }
}
```

---

_Version: 1.0.0 | Updated: 2025-10-09 | Status: PRODUCTION_
_Navigate: [→ render.yaml](../render.yaml) | [→ cron.py](../app/api/cron.py) | [→ log_cleanup.py](../app/jobs/log_cleanup.py)_
