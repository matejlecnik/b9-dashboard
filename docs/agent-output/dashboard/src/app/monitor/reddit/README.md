# Reddit Monitor Page Documentation

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● LOCKED    │ ████████████████████ 100% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/app/monitor/reddit/README.md",
  "parent": "dashboard/src/app/monitor/reddit/README.md"
}
```

## Overview

## ⚠️ STATUS: COMPLETE - DO NOT MODIFY

This page provides real-time monitoring of the Reddit scraper system. **This page is COMPLETE** and working correctly.

## Overview

The Reddit Monitor page (`/monitor/reddit`) displays:
- Live scraper status and metrics
- Current cycle time (how long scraper has been running)
- Success rate statistics
- Real-time logs from the scraper
- API activity monitoring

## Key Features

### 1. Current Cycle Display
Shows how long the scraper has been running since its last start.

**Display States:**
- **"32m 41s"** - Active scraper with calculated elapsed time
- **"Not Active"** - Scraper is disabled in Supabase
- **"Unknown"** - Scraper enabled but no start log found
- **"Loading..."** - Fetching data

**Subtitle Messages:**
- "Scraper Active" - When running normally
- "Scraper Disabled" - When turned off in control table
- "No Start Log Found" - When enabled but can't find start time

### 2. Success Rate Card
Displays the Reddit API success rate percentage based on recent requests.

### 3. Live Log Viewer
Real-time streaming of scraper logs from Supabase with:
- Auto-refresh every 5 seconds
- Color-coded log levels
- Expandable log entries
- Timestamp display

### 4. Control Buttons
- **Start Scraper** - Enables scraper in control table
- **Stop Scraper** - Disables scraper in control table

## Data Sources

### API Endpoints
- `/api/scraper/cycle-status` - Gets current cycle time
- `/api/scraper/reddit-api-stats` - Gets success rate statistics
- `/api/scraper/control` - Start/stop scraper control

### Supabase Tables
- `scraper_control` - Scraper enabled/disabled status
- `reddit_scraper_logs` - Log entries and start messages
- Direct real-time subscriptions for live updates

## Implementation Details

### Cycle Time Calculation
1. Fetches from API endpoint every 10 seconds
2. API checks if scraper is enabled in `scraper_control`
3. Searches for most recent "Scraper started" log
4. Calculates elapsed time from log timestamp
5. Formats as human-readable string

### Log Patterns Recognized
- `"✅ Scraper started via API with PID XX"` - API starts
- `"🚀 Continuous scraper v2.1.0 started"` - Continuous scraper starts

## File Structure
```
/app/monitor/reddit/
├── page.tsx              # Main monitor page component
└── README.md            # This documentation (DO NOT MODIFY)

/components/
├── LogViewerSupabase.tsx    # Real-time log viewer
├── RedditMonitorSidebar.tsx # Sidebar with metrics
└── ApiActivityLog.tsx       # API activity display
```

## Testing

1. Navigate to `/monitor/reddit` in the dashboard
2. Verify cycle time displays correctly
3. Check that logs stream in real-time
4. Test start/stop buttons functionality

## Performance Considerations

- Cycle data refreshes every 10 seconds
- Logs refresh every 5 seconds
- Uses React.memo for optimized rendering
- Implements proper cleanup for subscriptions

---

**Last Updated**: 2025-09-15
**Status**: ✅ COMPLETE - Working correctly, do not modify
**Note**: Current Cycle feature fully implemented and tested

---

_Version: 1.0.0 | Updated: 2025-10-01_