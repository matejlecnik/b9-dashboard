# Scraper Routes Documentation

## ⚠️ STATUS: COMPLETE - DO NOT MODIFY

This file documents the scraper-related API endpoints. These endpoints are **COMPLETE** and working correctly.

## `/api/scraper/cycle-status` Endpoint

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

## Implementation Notes

The endpoint queries the unified `system_logs` table filtering by `source='reddit_scraper'` to find scraper-related log messages. All scraper operations now log to this centralized table with proper source identification.

## Testing

```bash
# Test the endpoint
curl https://b9-dashboard.onrender.com/api/scraper/cycle-status

# Pretty print the response
curl -s https://b9-dashboard.onrender.com/api/scraper/cycle-status | python3 -m json.tool
```

---

**Last Updated**: 2025-09-15
**Status**: ✅ COMPLETE - Working correctly, do not modify