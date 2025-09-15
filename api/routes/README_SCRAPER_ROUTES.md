# Scraper Routes Documentation

## ⚠️ STATUS: COMPLETE - DO NOT MODIFY

This file documents the scraper-related API endpoints. These endpoints are **COMPLETE** and working correctly.

## `/api/scraper/cycle-status` Endpoint

### Purpose
Displays the current scraper cycle time - how long the scraper has been running since its last start.

### How It Works

1. **Checks Scraper Status**
   - Queries `scraper_control` table for `enabled` field
   - If `enabled = false`, returns "Not Active" status

2. **Finds Start Time**
   - Searches for most recent "Scraper started" log message
   - If not found, searches for "Continuous scraper...started" log
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
- `scraper_control` - Checks if scraper is enabled
- `reddit_scraper_logs` - Finds scraper start messages

### Log Patterns Matched
- `"✅ Scraper started via API with PID XX"` - API-initiated starts
- `"🚀 Continuous scraper v2.1.0 started"` - Continuous scraper starts

## Implementation Notes

The endpoint uses sequential queries instead of `or_()` because the Supabase Python client doesn't support complex OR conditions. It first tries to find "Scraper started" logs, then falls back to "Continuous scraper" logs if none are found.

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