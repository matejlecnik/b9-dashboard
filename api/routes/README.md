# Routes - API Endpoints

## Overview
This directory contains all API endpoint definitions organized by functionality.

## ⚠️ STATUS: COMPLETE - DO NOT MODIFY
The scraper routes are **COMPLETE** and working correctly. Do not modify without explicit approval.

## Files

### scraper_routes.py
**Reddit Scraper Control Endpoints**

- `POST /api/scraper/start` - Enable Reddit scraper
  - Updates `system_control` table to set enabled=true
  - Scraper will start within 30 seconds

- `POST /api/scraper/stop` - Disable Reddit scraper
  - Updates `system_control` table to set enabled=false
  - Scraper will stop within 30 seconds

- `GET /api/scraper/status` - Get Reddit scraper status
  - Returns: enabled state, last heartbeat, statistics

- `POST /api/scraper/analyze-subreddit/{name}` - Analyze specific subreddit
  - Fetches subreddit data and calculates quality score
  - Used for manual subreddit discovery

- `POST /api/scraper/discover-subreddits` - Discover from user posts
  - Analyzes user post history to find new subreddits

### instagram_scraper_routes.py
**Instagram Scraper Control Endpoints**

- `POST /api/instagram/scraper/start` - Enable Instagram scraper
  - Updates database AND launches subprocess
  - Fixed to ensure scraper actually starts

- `POST /api/instagram/scraper/stop` - Disable Instagram scraper
  - Updates database to stop scraper

- `GET /api/instagram/scraper/status` - Get status
  - Returns: enabled state, heartbeat, control info

- `GET /api/instagram/scraper/cycle-status` - Current cycle info
  - Returns: cycle number, duration, progress

- `GET /api/instagram/scraper/success-rate` - Success metrics
  - Returns: API call success rate, error counts

- `GET /api/instagram/scraper/cost-metrics` - Cost analysis
  - Returns: API usage, estimated costs

### user_routes.py
**Reddit User Discovery Endpoints**

- `POST /api/users/discover` - Discover Reddit user
  - **Used by dashboard posting page "Add User" button**
  - Fetches user data from Reddit
  - Calculates quality scores
  - Saves to `reddit_users` table
  - Request body: `{"username": "reddit_username"}`

- `GET /api/users/health` - Health check
  - Simple endpoint to verify user routes are working

Note: Other user management (toggle-creator, search) is handled client-side via Supabase

## Dashboard Integration

### Reddit Monitor Page
- Uses `/api/scraper/status` for current state
- Uses `/api/scraper/start` and `/stop` for control

### Instagram Monitor Page
- Uses `/api/instagram/scraper/status` for current state
- Uses `/api/instagram/scraper/cycle-status` for progress
- Uses `/api/instagram/scraper/start` and `/stop` for control

### Posting Page
- Uses `/api/users/discover` when adding new users
- Direct Supabase queries for user list and toggle

## Authentication
Currently no authentication required (internal tool only).
CORS configured for dashboard domain.

## Error Handling
All endpoints return structured error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical details"
}
```

## Rate Limiting
Applied when Redis is available:
- Default: 100 requests/minute per IP
- Scraper endpoints: 10 requests/minute

## Logging
All operations logged to `system_logs` table with appropriate source tags.

---

## `/api/scraper/cycle-status` Endpoint Details

### Purpose
Displays the current scraper cycle time - how long the scraper has been running since its last start.

### How It Works

1. **Checks Scraper Status**
   - Queries `system_control` table for `enabled` field where `script_name = 'reddit_scraper'`
   - If `enabled = false`, returns "Not Active" status

2. **Finds Start Time**
   - Searches `system_logs` table for most recent "Starting scraping cycle" message
   - Filters by `source = 'reddit_scraper'`
   - Uses the timestamp from the log entry as start time

3. **Calculates Elapsed Time**
   - Computes difference between current time and start time
   - Formats as human-readable string (e.g., "32m 41s", "2h 15m")

### Response Format

```json
{
  "success": true,
  "running": true,
  "status": "Running",
  "cycle": {
    "start_time": "2025-09-15T17:55:45.065484+00:00",
    "elapsed_seconds": 1961,
    "elapsed_formatted": "32m 41s"
  }
}
```

### Status Values
- **"Not Active"** - Scraper is disabled in control table
- **"Running"** - Scraper is enabled and running
- **"Unknown"** - Scraper is enabled but no start log found

### Database Tables Used
- `system_control` - Checks if scraper is enabled
- `system_logs` - Finds scraper start messages (filtered by source='reddit_scraper')

### Log Patterns Matched
- `"🔄 Starting scraping cycle #X"` - Scraping cycle starts
- `"🚀 Continuous scraper vX.X.X started"` - Continuous scraper initialization

## Testing Examples

```bash
# Test Reddit scraper endpoint
curl https://b9-dashboard.onrender.com/api/scraper/cycle-status

# Test Instagram scraper endpoint
curl https://b9-dashboard.onrender.com/api/instagram/scraper/status

# Pretty print responses
curl -s https://b9-dashboard.onrender.com/api/scraper/cycle-status | python3 -m json.tool
```