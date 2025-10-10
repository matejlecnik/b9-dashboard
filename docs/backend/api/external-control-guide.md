# External API Control Guide

**Last Updated:** 2025-10-09
**Production Base URL:** `http://91.98.91.129:10000`

---

## Overview

This guide shows how to control all B9 Dashboard operations via external API calls. All operations can be triggered remotely without accessing the servers directly.

### Available Operations

| Category | Operations | Authentication Required |
|----------|-----------|------------------------|
| **Reddit Scraper** | Start, Stop, Status | No |
| **Instagram Scraper** | Start, Stop, Status | No |
| **Instagram Creator Addition** | Add creators manually | No |
| **Instagram Related Creators** | Start/stop discovery | No |
| **AI Categorization** | Tag subreddits | No |
| **Cron Jobs** | Cleanup logs, migrate CDN | Yes (Bearer token) |
| **Monitoring** | Health checks, stats | No |

---

## 1. Reddit Scraper Control

### Start Reddit Scraper
```bash
curl -X POST "http://91.98.91.129:10000/api/reddit/scraper/start"
```

**Response:**
```json
{
  "success": true,
  "message": "Reddit scraper started successfully",
  "status": "running"
}
```

### Stop Reddit Scraper
```bash
curl -X POST "http://91.98.91.129:10000/api/reddit/scraper/stop"
```

**Response:**
```json
{
  "success": true,
  "message": "Reddit scraper stopped successfully",
  "status": "stopped"
}
```

### Get Reddit Scraper Status
```bash
curl "http://91.98.91.129:10000/api/reddit/scraper/status"
```

**Response:**
```json
{
  "status": "stopped",
  "enabled": false,
  "version": "3.6.3",
  "control": "Supabase + API",
  "database": "healthy",
  "reddit_api": "healthy"
}
```

### Check Reddit API Stats
```bash
curl "http://91.98.91.129:10000/api/reddit/scraper/reddit-api-stats"
```

**Response:**
```json
{
  "daily_calls": 0,
  "daily_limit": 10000,
  "remaining": 10000,
  "usage_percentage": 0
}
```

---

## 2. Instagram Scraper Control

### Start Instagram Scraper
```bash
curl -X POST "http://91.98.91.129:10000/api/instagram/scraper/start"
```

**Response:**
```json
{
  "success": true,
  "message": "Instagram scraper started successfully",
  "status": "running"
}
```

**What Happens:**
- Scraper processes all creators with `review_status = 'ok'`
- Fetches 90 reels + 30 posts per creator
- Updates analytics every 24 hours
- Uses ~12 API calls per creator (~$0.00036)

### Stop Instagram Scraper
```bash
curl -X POST "http://91.98.91.129:10000/api/instagram/scraper/stop"
```

**Response:**
```json
{
  "success": true,
  "message": "Instagram scraper stopped successfully",
  "status": "stopped"
}
```

### Get Instagram Scraper Status
```bash
curl "http://91.98.91.129:10000/api/instagram/scraper/status"
```

**Response:**
```json
{
  "status": "stopped",
  "enabled": false,
  "version": "2.1.0",
  "database": "healthy",
  "instagram_api": "healthy",
  "rapidapi_configured": true,
  "queue_system": "redis",
  "workers": {
    "worker_1": "188.245.232.203",
    "worker_2": "91.98.92.192"
  }
}
```

---

## 3. Instagram Creator Addition

### Add Creator Manually (Full Processing)

**Endpoint:** `POST /api/instagram/creator/add`

```bash
curl -X POST "http://91.98.91.129:10000/api/instagram/creator/add" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cristiano",
    "niche": "Sports"
  }'
```

**Request Body:**
```json
{
  "username": "cristiano",  // Instagram username (@ optional)
  "niche": "Sports"          // Optional: user-provided niche
}
```

**Response (Success):**
```json
{
  "success": true,
  "creator": {
    "id": 439,
    "ig_user_id": "173560420",
    "username": "cristiano",
    "niche": "Sports",
    "review_status": "ok",
    "discovery_source": "manual_add",
    "followers_count": 643000000,
    "avg_engagement_rate": 2.45,
    "content_type": "mixed",
    "created_at": "2025-10-09T12:42:00Z"
  },
  "stats": {
    "api_calls_used": 12,
    "reels_fetched": 90,
    "posts_fetched": 30,
    "processing_time_seconds": 7
  }
}
```

**What Happens:**
1. Fetches profile to get `ig_user_id` (1 API call)
2. Creates/updates database record with `review_status = 'ok'`
3. Fetches 90 reels (~8 API calls)
4. Fetches 30 posts (~3 API calls)
5. Calculates 40+ analytics metrics
6. Updates database with complete profile
7. Returns full creator data

**Processing Time:** ~7-20 seconds (with rate limiting)
**Cost:** ~$0.00036 per creator
**Ongoing Updates:** Scraper will update this creator every 24h

**Response (Error):**
```json
{
  "success": false,
  "error": "Username not found or private account"
}
```

### Batch Creator Addition

```bash
# Add multiple creators sequentially
for username in cristiano leomessi neymarjr; do
  curl -X POST "http://91.98.91.129:10000/api/instagram/creator/add" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$username\", \"niche\": \"Sports\"}"
  sleep 2  # Rate limiting
done
```

---

## 4. Instagram Related Creators Discovery

### Start Related Creators Discovery

**Endpoint:** `POST /api/instagram/related-creators/start`

```bash
curl -X POST "http://91.98.91.129:10000/api/instagram/related-creators/start" \
  -H "Content-Type: application/json" \
  -d '{
    "max_creators": 50
  }'
```

**Request Body:**
```json
{
  "max_creators": 50  // Optional: max creators to discover (default: 100)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Related creators discovery started",
  "status": "running",
  "settings": {
    "max_creators": 50,
    "batch_size": 10
  }
}
```

**What Happens:**
- Analyzes existing "ok" creators
- Fetches suggested related creators from Instagram
- Adds new creators automatically
- Runs full processing workflow for each

### Stop Related Creators Discovery
```bash
curl -X POST "http://91.98.91.129:10000/api/instagram/related-creators/stop"
```

**Response:**
```json
{
  "success": true,
  "message": "Related creators discovery stopped",
  "status": "stopped"
}
```

### Get Discovery Status
```bash
curl "http://91.98.91.129:10000/api/instagram/related-creators/status"
```

**Response:**
```json
{
  "is_running": false,
  "current": 0,
  "total": 0,
  "progress_percentage": 0,
  "last_run": null
}
```

---

## 5. AI Categorization

### Tag Subreddits with AI

**Endpoint:** `POST /api/ai/categorization/tag-subreddits`

```bash
curl -X POST "http://91.98.91.129:10000/api/ai/categorization/tag-subreddits" \
  -H "Content-Type: application/json" \
  -d '{
    "max_subreddits": 100,
    "skip_existing": true
  }'
```

**Request Body:**
```json
{
  "max_subreddits": 100,   // Optional: max subreddits to tag
  "skip_existing": true     // Optional: skip already tagged subreddits
}
```

**Response:**
```json
{
  "success": true,
  "tagged_count": 85,
  "skipped_count": 15,
  "api_calls_used": 85,
  "total_cost_usd": 0.85,
  "processing_time_seconds": 45
}
```

**What Happens:**
- Fetches untagged subreddits (or all if `skip_existing = false`)
- Uses GPT-5-mini to categorize each subreddit
- Applies structured tagging system (10 categories)
- Updates database with tags
- Cost: ~$0.01 per subreddit

### Get AI Categorization Stats
```bash
curl "http://91.98.91.129:10000/api/ai/categorization/stats"
```

**Response:**
```json
{
  "total_subreddits": 2155,
  "tagged_subreddits": 2155,
  "untagged_subreddits": 0,
  "tag_coverage_percentage": 100,
  "top_tags": [
    {"tag": "focus:feet", "count": 231},
    {"tag": "focus:ass", "count": 186},
    {"tag": "focus:breasts", "count": 111}
  ]
}
```

---

## 6. Cron Jobs (Authenticated)

**Authentication Required:** All cron endpoints require a Bearer token.

```bash
Authorization: Bearer B9Dashboard2025SecureCron!
```

### Check Cron Health
```bash
curl "http://91.98.91.129:10000/api/cron/health"
```

**Response:**
```json
{
  "status": "healthy",
  "service": "cron-jobs",
  "cron_secret_configured": true,
  "available_jobs": [
    "cleanup-logs",
    "migrate-cdn-to-r2"
  ]
}
```

### Cleanup Logs (Dry Run)
```bash
curl -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=true" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!"
```

**Response:**
```json
{
  "success": true,
  "dry_run": true,
  "old_logs_found": 1247,
  "would_delete": 1247,
  "disk_space_to_free_mb": 45
}
```

### Cleanup Logs (Execute)
```bash
curl -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=false" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!"
```

**Response:**
```json
{
  "success": true,
  "logs_deleted": 1247,
  "disk_space_freed_mb": 45,
  "processing_time_seconds": 3
}
```

### Migrate CDN to R2
```bash
curl -X POST "http://91.98.91.129:10000/api/cron/migrate-cdn-to-r2?media_type=all&batch_size=10" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!"
```

**Query Parameters:**
- `media_type`: `all`, `videos`, `images`, `thumbnails`
- `batch_size`: Number of files to process per batch (default: 10)

**Response:**
```json
{
  "success": true,
  "files_migrated": 87,
  "files_failed": 3,
  "storage_saved_gb": 1.45,
  "processing_time_seconds": 120
}
```

---

## 7. Monitoring & Health Checks

### System Health
```bash
curl "http://91.98.91.129:10000/health"
```

**Response:**
```json
{
  "status": "healthy",
  "uptime_seconds": 295.59,
  "dependencies": {
    "supabase": {"status": "healthy"},
    "openai": {"status": "healthy"},
    "redis": {"status": "healthy"}
  }
}
```

### API Root Info
```bash
curl "http://91.98.91.129:10000/"
```

**Response:**
```json
{
  "service": "B9 Dashboard API",
  "version": "3.7.0",
  "status": "operational",
  "environment": "production"
}
```

### Get Stats
```bash
curl "http://91.98.91.129:10000/api/stats"
```

**Response:**
```json
{
  "subreddits": {
    "total": 2155,
    "tagged": 2155,
    "untagged": 0
  },
  "instagram_creators": {
    "total": 439,
    "ok": 387,
    "pending": 52
  },
  "tag_structure": {
    "focus": 10,
    "content_type": 5,
    "demographic": 8
  }
}
```

---

## 8. API Documentation (Interactive)

### Access Swagger UI
```
http://91.98.91.129:10000/docs
```

**Features:**
- Interactive API testing
- Full endpoint documentation
- Request/response schemas
- Try endpoints directly from browser

### Access ReDoc
```
http://91.98.91.129:10000/redoc
```

**Features:**
- Clean documentation UI
- Searchable endpoints
- Code examples

---

## 9. Common Workflows

### Workflow 1: Add and Monitor Instagram Creator

```bash
# Step 1: Add creator
curl -X POST "http://91.98.91.129:10000/api/instagram/creator/add" \
  -H "Content-Type: application/json" \
  -d '{"username": "cristiano", "niche": "Sports"}'

# Step 2: Start scraper (for ongoing updates)
curl -X POST "http://91.98.91.129:10000/api/instagram/scraper/start"

# Step 3: Check scraper status
curl "http://91.98.91.129:10000/api/instagram/scraper/status"
```

### Workflow 2: Discover Related Creators Automatically

```bash
# Step 1: Start discovery
curl -X POST "http://91.98.91.129:10000/api/instagram/related-creators/start" \
  -H "Content-Type: application/json" \
  -d '{"max_creators": 50}'

# Step 2: Monitor progress
watch -n 10 'curl -s "http://91.98.91.129:10000/api/instagram/related-creators/status"'

# Step 3: Stop when desired count reached
curl -X POST "http://91.98.91.129:10000/api/instagram/related-creators/stop"
```

### Workflow 3: Complete Reddit Scraping Setup

```bash
# Step 1: Check Reddit API limits
curl "http://91.98.91.129:10000/api/reddit/scraper/reddit-api-stats"

# Step 2: Start scraper
curl -X POST "http://91.98.91.129:10000/api/reddit/scraper/start"

# Step 3: Tag subreddits with AI
curl -X POST "http://91.98.91.129:10000/api/ai/categorization/tag-subreddits" \
  -H "Content-Type: application/json" \
  -d '{"max_subreddits": 100, "skip_existing": true}'

# Step 4: Check stats
curl "http://91.98.91.129:10000/api/stats"
```

### Workflow 4: Maintenance & Cleanup

```bash
# Step 1: Check what would be deleted (dry run)
curl -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=true" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!"

# Step 2: Execute cleanup
curl -X POST "http://91.98.91.129:10000/api/cron/cleanup-logs?dry_run=false" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!"

# Step 3: Migrate CDN to R2
curl -X POST "http://91.98.91.129:10000/api/cron/migrate-cdn-to-r2?media_type=all&batch_size=10" \
  -H "Authorization: Bearer B9Dashboard2025SecureCron!"
```

---

## 10. Rate Limits & Best Practices

### Rate Limits

| Operation | Limit | Cost |
|-----------|-------|------|
| Creator Addition | ~20/hour | ~$0.00036 each |
| Related Creators Discovery | ~50/hour | ~$0.018 total |
| AI Categorization | ~100/hour | ~$0.01 each |
| Reddit API | 10,000/day | Free |
| Instagram API (RapidAPI) | 5,000/month | $0.03/call |

### Best Practices

1. **Use Health Checks First**
   - Always check `/health` before starting operations
   - Verify dependencies are healthy

2. **Monitor Progress**
   - Use status endpoints to track long-running operations
   - Don't start multiple instances of the same scraper

3. **Rate Limiting**
   - Add delays between batch operations
   - Respect API limits (especially RapidAPI)

4. **Error Handling**
   - Check `success` field in responses
   - Log errors for debugging
   - Retry failed operations with exponential backoff

5. **Cost Management**
   - Use dry runs for cron jobs
   - Set `max_creators` limits for discovery
   - Monitor API usage via stats endpoints

6. **Security**
   - Keep `CRON_SECRET` secure
   - Use HTTPS in production (not yet configured)
   - Rotate secrets regularly

---

## 11. Error Responses

### Common Error Formats

**Invalid Request:**
```json
{
  "success": false,
  "error": "Username is required"
}
```

**Authentication Error:**
```json
{
  "detail": "Invalid or missing authentication token"
}
```

**Service Unavailable:**
```json
{
  "status": "unhealthy",
  "error": "Database connection failed"
}
```

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | Success | Operation completed |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid auth token |
| 404 | Not Found | Endpoint doesn't exist |
| 500 | Internal Error | Server error |
| 503 | Service Unavailable | Dependency down |

---

## 12. Python Example Client

```python
import requests
import json

class B9DashboardClient:
    def __init__(self, base_url="http://91.98.91.129:10000"):
        self.base_url = base_url
        self.cron_secret = "B9Dashboard2025SecureCron!"

    def add_instagram_creator(self, username, niche=None):
        """Add Instagram creator with full processing"""
        url = f"{self.base_url}/api/instagram/creator/add"
        data = {"username": username, "niche": niche}
        response = requests.post(url, json=data)
        return response.json()

    def start_instagram_scraper(self):
        """Start Instagram scraper"""
        url = f"{self.base_url}/api/instagram/scraper/start"
        response = requests.post(url)
        return response.json()

    def stop_instagram_scraper(self):
        """Stop Instagram scraper"""
        url = f"{self.base_url}/api/instagram/scraper/stop"
        response = requests.post(url)
        return response.json()

    def get_instagram_status(self):
        """Get Instagram scraper status"""
        url = f"{self.base_url}/api/instagram/scraper/status"
        response = requests.get(url)
        return response.json()

    def cleanup_logs(self, dry_run=True):
        """Cleanup old logs (cron job)"""
        url = f"{self.base_url}/api/cron/cleanup-logs?dry_run={str(dry_run).lower()}"
        headers = {"Authorization": f"Bearer {self.cron_secret}"}
        response = requests.post(url, headers=headers)
        return response.json()

    def get_stats(self):
        """Get system stats"""
        url = f"{self.base_url}/api/stats"
        response = requests.get(url)
        return response.json()

# Usage Example
client = B9DashboardClient()

# Add creator
result = client.add_instagram_creator("cristiano", "Sports")
print(f"Creator added: {result['success']}")

# Start scraper
result = client.start_instagram_scraper()
print(f"Scraper started: {result['success']}")

# Get stats
stats = client.get_stats()
print(f"Total creators: {stats['instagram_creators']['total']}")
```

---

## 13. JavaScript Example Client

```javascript
class B9DashboardClient {
  constructor(baseUrl = "http://91.98.91.129:10000") {
    this.baseUrl = baseUrl;
    this.cronSecret = "B9Dashboard2025SecureCron!";
  }

  async addInstagramCreator(username, niche = null) {
    const response = await fetch(`${this.baseUrl}/api/instagram/creator/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, niche })
    });
    return await response.json();
  }

  async startInstagramScraper() {
    const response = await fetch(`${this.baseUrl}/api/instagram/scraper/start`, {
      method: "POST"
    });
    return await response.json();
  }

  async stopInstagramScraper() {
    const response = await fetch(`${this.baseUrl}/api/instagram/scraper/stop`, {
      method: "POST"
    });
    return await response.json();
  }

  async getInstagramStatus() {
    const response = await fetch(`${this.baseUrl}/api/instagram/scraper/status`);
    return await response.json();
  }

  async cleanupLogs(dryRun = true) {
    const response = await fetch(
      `${this.baseUrl}/api/cron/cleanup-logs?dry_run=${dryRun}`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${this.cronSecret}` }
      }
    );
    return await response.json();
  }

  async getStats() {
    const response = await fetch(`${this.baseUrl}/api/stats`);
    return await response.json();
  }
}

// Usage Example
const client = new B9DashboardClient();

// Add creator
const result = await client.addInstagramCreator("cristiano", "Sports");
console.log(`Creator added: ${result.success}`);

// Start scraper
const scraperResult = await client.startInstagramScraper();
console.log(`Scraper started: ${scraperResult.success}`);

// Get stats
const stats = await client.getStats();
console.log(`Total creators: ${stats.instagram_creators.total}`);
```

---

## Support

**Documentation:**
- API Test Plan: `backend/docs/API_TEST_PLAN.md`
- Deployment Report: `backend/docs/HETZNER_DEPLOYMENT_REPORT.md`
- Fixes Applied: `backend/docs/FIXES_APPLIED_2025-10-09.md`

**Interactive Docs:**
- Swagger UI: http://91.98.91.129:10000/docs
- ReDoc: http://91.98.91.129:10000/redoc

**Health Checks:**
- System: http://91.98.91.129:10000/health
- Cron Jobs: http://91.98.91.129:10000/api/cron/health

---

**Last Updated:** 2025-10-09 12:50 UTC
**API Version:** 3.7.0
**Status:** Production Ready
