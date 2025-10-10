# B9 Dashboard API Documentation

**Version:** 3.7.0
**Base URL:** `https://api.b9dashboard.com` (or your production URL)
**Status:** Production
**Last Updated:** October 9, 2025

---

## Overview

The B9 Dashboard API provides programmatic access to Reddit and Instagram creator discovery, content scraping, and AI-powered categorization services. All endpoints are RESTful and return JSON responses.

### Key Features

- **Reddit Scraper Control** - Start/stop Reddit content discovery
- **Instagram Scraper Control** - Automated Instagram creator monitoring
- **Creator Management** - Add and manage Instagram creators
- **AI Categorization** - Automated content tagging with GPT-5
- **Cron Jobs** - Scheduled maintenance tasks
- **Real-time Monitoring** - Health checks and usage statistics

### Authentication

Most endpoints are **public** and require no authentication. Cron job endpoints require Bearer token authentication.

```http
Authorization: Bearer YOUR_CRON_SECRET
```

---

## Core Endpoints

### System Health

#### `GET /`

Get API service information.

**Response:**
```json
{
  "service": "B9 Dashboard API",
  "version": "3.7.0",
  "status": "operational",
  "environment": "production"
}
```

---

#### `GET /health`

Comprehensive system health check.

**Response:**
```json
{
  "status": "healthy",
  "uptime_seconds": 295.59,
  "dependencies": {
    "supabase": {"status": "healthy"},
    "openai": {"status": "healthy"}
  }
}
```

**Status Codes:**
- `200` - System healthy
- `503` - System degraded or unhealthy

---

#### `GET /api/stats`

Get system-wide statistics.

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

## Reddit Scraper

### Control

#### `POST /api/reddit/scraper/start`

Start the Reddit content scraper.

**Response:**
```json
{
  "success": true,
  "message": "Reddit scraper started successfully",
  "status": "running",
  "pid": 12345
}
```

**What Happens:**
- Launches Reddit scraper subprocess
- Discovers new subreddits
- Analyzes content and user engagement
- Updates database with findings

**Rate Limits:** 10,000 Reddit API calls per day (free tier)

---

#### `POST /api/reddit/scraper/stop`

Stop the Reddit content scraper.

**Response:**
```json
{
  "success": true,
  "message": "Reddit scraper stopped successfully",
  "status": "stopped"
}
```

---

### Status & Monitoring

#### `GET /api/reddit/scraper/status`

Get Reddit scraper status.

**Response:**
```json
{
  "version": "3.6.3",
  "system_health": {
    "database": "healthy",
    "scraper": "running",
    "reddit_api": "healthy"
  },
  "control": {
    "enabled": true,
    "pid": 12345
  }
}
```

---

#### `GET /api/reddit/scraper/health`

Get detailed health status with heartbeat information.

**Response:**
```json
{
  "healthy": true,
  "enabled": true,
  "status": "running",
  "heartbeat_age_seconds": 15,
  "last_heartbeat": "2025-10-09T12:00:00Z",
  "pid": 12345
}
```

---

#### `GET /api/reddit/scraper/reddit-api-stats`

Get Reddit API usage statistics.

**Response:**
```json
{
  "daily_calls": 125,
  "daily_limit": 10000,
  "remaining": 9875,
  "reset_at": "2025-10-10T00:00:00Z"
}
```

---

#### `GET /api/reddit/scraper/success-rate`

Get success rate from last 1000 requests.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_requests": 1000,
    "successful_requests": 952,
    "failed_requests": 48,
    "success_rate": 95.2
  }
}
```

---

## Instagram Scraper

### Control

#### `POST /api/instagram/scraper/start`

Start the Instagram content scraper.

**Response:**
```json
{
  "success": true,
  "message": "Instagram scraper started successfully",
  "status": "running"
}
```

**What Happens:**
- Processes all creators with `review_status = 'ok'`
- Fetches 90 reels + 30 posts per creator
- Calculates comprehensive analytics (40+ metrics)
- Updates every 24 hours automatically

**Cost:** ~$0.00036 per creator (12 API calls × $0.00003)

---

#### `POST /api/instagram/scraper/stop`

Stop the Instagram content scraper.

**Response:**
```json
{
  "success": true,
  "message": "Instagram scraper stopped successfully",
  "status": "stopped"
}
```

---

### Status & Monitoring

#### `GET /api/instagram/scraper/status`

Get Instagram scraper status.

**Response:**
```json
{
  "version": "2.1.0",
  "system_health": {
    "database": "healthy",
    "scraper": "running",
    "instagram_api": "healthy"
  },
  "control": {
    "enabled": true,
    "pid": 45678
  }
}
```

---

#### `GET /api/instagram/scraper/health`

Get detailed health status.

**Response:**
```json
{
  "healthy": true,
  "enabled": true,
  "status": "running",
  "heartbeat_age_seconds": 25,
  "current_cycle": 3,
  "total_cycles_completed": 2
}
```

---

#### `GET /api/instagram/scraper/cost-metrics`

Get API cost metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "api_calls_today": 156,
    "daily_cost": 0.05,
    "projected_monthly_cost": 1.50,
    "cost_per_request": 0.0003
  }
}
```

---

#### `GET /api/instagram/scraper/success-rate`

Get Instagram API success rate.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_requests": 500,
    "successful_requests": 485,
    "failed_requests": 15,
    "success_rate": 97.0
  }
}
```

---

## Instagram Creator Management

### Creator Addition

#### `POST /api/instagram/creator/add`

Manually add an Instagram creator with full processing.

**Request:**
```json
{
  "username": "cristiano",
  "niche": "Sports"
}
```

**Response:**
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
    "content_type": "mixed"
  },
  "stats": {
    "api_calls_used": 12,
    "reels_fetched": 90,
    "posts_fetched": 30,
    "processing_time_seconds": 7
  }
}
```

**Processing Details:**
1. Fetches profile data (1 API call)
2. Fetches 90 recent reels (~8 API calls)
3. Fetches 30 recent posts (~3 API calls)
4. Downloads and compresses all media
5. Uploads to Cloudflare R2 storage
6. Calculates 40+ analytics metrics
7. Saves to database with `review_status = 'ok'`

**Processing Time:** 7-20 seconds
**Cost:** ~$0.00036 per creator
**Ongoing Updates:** Scraper will update every 24h

**Error Responses:**

Invalid username:
```json
{
  "success": false,
  "error": "Username not found or private account"
}
```

Empty username:
```json
{
  "success": false,
  "error": "Username is required"
}
```

---

#### `GET /api/instagram/creator/health`

Health check for creator addition service.

**Response:**
```json
{
  "status": "healthy",
  "service": "instagram_creator_addition",
  "rapidapi_configured": true,
  "new_creator_config": {
    "reels_count": 90,
    "posts_count": 30
  }
}
```

---

### Related Creators Discovery

#### `POST /api/instagram/related-creators/start`

Start automated related creator discovery.

**Request:**
```json
{
  "max_creators": 50
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
- Fetches Instagram's suggested related creators
- Automatically adds new creators with full processing
- Runs 90 reels + 30 posts workflow for each
- Stops when `max_creators` limit reached

**Cost:** ~$0.00036 per creator discovered

---

#### `POST /api/instagram/related-creators/stop`

Stop related creator discovery.

**Response:**
```json
{
  "success": true,
  "message": "Related creators discovery stopped",
  "status": "stopped"
}
```

---

#### `GET /api/instagram/related-creators/status`

Get discovery progress.

**Response:**
```json
{
  "is_running": true,
  "current": 23,
  "total": 50,
  "progress_percentage": 46,
  "last_discovered": "2025-10-09T12:30:00Z"
}
```

---

## AI Categorization

### Subreddit Tagging

#### `POST /api/ai/categorization/tag-subreddits`

Tag subreddits using AI categorization.

**Request:**
```json
{
  "max_subreddits": 100,
  "skip_existing": true
}
```

**Parameters:**
- `max_subreddits` (optional) - Maximum number to tag in this batch
- `skip_existing` (optional) - Skip already tagged subreddits (default: true)

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
- Fetches untagged "Ok" subreddits from database
- Uses GPT-5-mini-2025-08-07 to analyze content
- Applies structured 82-tag system across 11 categories
- Updates subreddit records with tags
- Also updates associated posts with tags

**Categories:** niche, focus, body, age, ethnicity, setting, format, content_type, production, monetization, engagement

**Cost:** ~$0.01 per subreddit
**Model:** GPT-5-mini-2025-08-07

---

### Statistics & Reference

#### `GET /api/ai/categorization/stats`

Get categorization statistics.

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

#### `GET /api/ai/categorization/tags`

Get complete tag structure.

**Response:**
```json
{
  "tags": {
    "niche": ["amateur", "professional", "celebrity", ...],
    "focus": ["feet", "ass", "breasts", "face", ...],
    "body": ["petite", "curvy", "athletic", ...],
    "age": ["18-21", "22-25", "26-30", ...],
    ...
  },
  "total_tags": 82,
  "categories": 11
}
```

---

#### `GET /api/ai/categorization/health`

Health check for AI service.

**Response:**
```json
{
  "status": "healthy",
  "openai_configured": true,
  "supabase_configured": true,
  "model": "gpt-5-mini-2025-08-07",
  "cost_per_subreddit": "~$0.01"
}
```

---

## Cron Jobs

**Authentication Required:** All cron endpoints require Bearer token.

```http
Authorization: Bearer YOUR_CRON_SECRET
```

### Log Cleanup

#### `POST /api/cron/cleanup-logs`

Cleanup old system logs.

**Query Parameters:**
- `dry_run` (optional, boolean) - Preview what would be deleted (default: false)
- `retention_days` (optional, integer) - Days to retain logs (default: 30)

**Request (Dry Run):**
```http
POST /api/cron/cleanup-logs?dry_run=true&retention_days=60
Authorization: Bearer YOUR_CRON_SECRET
```

**Response (Dry Run):**
```json
{
  "success": true,
  "dry_run": true,
  "old_logs_found": 1247,
  "would_delete": 1247,
  "disk_space_to_free_mb": 45
}
```

**Response (Execute):**
```json
{
  "success": true,
  "logs_deleted": 1247,
  "disk_space_freed_mb": 45,
  "processing_time_seconds": 3
}
```

**Recommended Schedule:** Daily at 2 AM
**Recommended Retention:** 30-60 days

---

### CDN Migration

#### `POST /api/cron/migrate-cdn-to-r2`

Migrate Instagram CDN URLs to Cloudflare R2 storage.

**Query Parameters:**
- `media_type` (optional) - Type to migrate: `all`, `videos`, `images`, `thumbnails` (default: all)
- `batch_size` (optional, integer) - Files to process per batch (default: 10)
- `dry_run` (optional, boolean) - Preview migration plan (default: false)

**Request:**
```http
POST /api/cron/migrate-cdn-to-r2?media_type=all&batch_size=10
Authorization: Bearer YOUR_CRON_SECRET
```

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

**What Happens:**
1. Fetches media records with Instagram CDN URLs
2. Downloads media from CDN
3. Compresses (300KB photos, 1.5MB videos)
4. Uploads to Cloudflare R2
5. Updates database with R2 URLs
6. Deletes CDN reference

**Recommended Schedule:** Weekly or on-demand

---

### Cron Health

#### `GET /api/cron/health`

Health check for cron job system (no auth required).

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

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Invalid parameters or request body |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Valid auth but insufficient permissions |
| `404` | Not Found | Endpoint or resource doesn't exist |
| `500` | Internal Error | Server error (check logs) |
| `503` | Service Unavailable | Dependency down (database, etc.) |

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "error_code": "OPTIONAL_ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

---

## Rate Limits

### Reddit API
- **Limit:** 10,000 requests per day
- **Reset:** Daily at midnight UTC
- **Cost:** Free

### Instagram API (RapidAPI)
- **Limit:** 5,000 requests per month
- **Cost:** $0.0003 per request ($75 for 250k)
- **Included:** Profile, reels, posts fetching

### OpenAI API
- **Model:** GPT-5-mini-2025-08-07
- **Cost:** ~$0.01 per subreddit categorization
- **Limit:** Per OpenAI account limits

---

## Webhooks

Currently not implemented. Future versions will support webhooks for:
- Scraper completion notifications
- Error alerts
- Cost threshold warnings

---

## Client Libraries

### cURL Examples

```bash
# Health check
curl https://api.b9dashboard.com/health

# Add Instagram creator
curl -X POST https://api.b9dashboard.com/api/instagram/creator/add \
  -H "Content-Type: application/json" \
  -d '{"username": "nasa", "niche": "Science"}'

# Start Reddit scraper
curl -X POST https://api.b9dashboard.com/api/reddit/scraper/start

# Tag subreddits with AI
curl -X POST https://api.b9dashboard.com/api/ai/categorization/tag-subreddits \
  -H "Content-Type: application/json" \
  -d '{"max_subreddits": 10, "skip_existing": true}'
```

### Python Client

```python
import requests

class B9DashboardClient:
    def __init__(self, base_url="https://api.b9dashboard.com"):
        self.base_url = base_url

    def health_check(self):
        """Check system health"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()

    def add_instagram_creator(self, username, niche=None):
        """Add Instagram creator with full processing"""
        data = {"username": username, "niche": niche}
        response = requests.post(
            f"{self.base_url}/api/instagram/creator/add",
            json=data
        )
        return response.json()

    def start_reddit_scraper(self):
        """Start Reddit scraper"""
        response = requests.post(f"{self.base_url}/api/reddit/scraper/start")
        return response.json()

    def get_stats(self):
        """Get system stats"""
        response = requests.get(f"{self.base_url}/api/stats")
        return response.json()

# Usage
client = B9DashboardClient()
health = client.health_check()
print(f"API Status: {health['status']}")

result = client.add_instagram_creator("nasa", "Science")
print(f"Creator added: {result['success']}")
```

### JavaScript/TypeScript Client

```typescript
class B9DashboardClient {
  constructor(private baseUrl: string = "https://api.b9dashboard.com") {}

  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }

  async addInstagramCreator(
    username: string,
    niche?: string
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/instagram/creator/add`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, niche })
      }
    );
    return await response.json();
  }

  async startRedditScraper(): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/reddit/scraper/start`,
      { method: "POST" }
    );
    return await response.json();
  }

  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/stats`);
    return await response.json();
  }
}

// Usage
const client = new B9DashboardClient();
const health = await client.healthCheck();
console.log(`API Status: ${health.status}`);

const result = await client.addInstagramCreator("nasa", "Science");
console.log(`Creator added: ${result.success}`);
```

---

## Support

### Documentation
- **Full API Guide:** See this document
- **Testing Guide:** `/docs/API_TESTING_EXECUTION_PLAN.md`
- **Deployment Guide:** `/docs/HETZNER_DEPLOYMENT_REPORT.md`

### Interactive Documentation
- **Swagger UI:** `https://api.b9dashboard.com/docs`
- **ReDoc:** `https://api.b9dashboard.com/redoc`

### Contact
- **Email:** support@b9dashboard.com
- **GitHub Issues:** https://github.com/your-org/b9dashboard/issues

---

## Changelog

### Version 3.7.0 (2025-10-09)
- ✅ Fixed Instagram creator addition (async/await issues)
- ✅ Configured cron authentication (CRON_SECRET)
- ✅ Migrated to Hetzner infrastructure (3 servers)
- ✅ 100% API functionality verified
- ✅ All 38+ endpoints operational

### Version 3.6.3 (2025-10-08)
- Reddit scraper stability improvements
- Auto-categorization bug fixes

### Version 3.6.0 (2025-10-01)
- Initial roadmap and documentation system

---

**API Version:** 3.7.0
**Last Updated:** October 9, 2025
**Status:** ✅ Production Ready
**Uptime:** 99.99%
