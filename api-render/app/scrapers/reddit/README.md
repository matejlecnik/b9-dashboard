# Reddit Scraper (Pending Rebuild)

┌─ SCRAPER STATUS ────────────────────────────────────────┐
│ ⚠️ REBUILDING │ ░░░░░░░░░░░░░░░░░░░░ 0% NOT STARTED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../../README.md",
  "current": "app/scrapers/reddit/README.md",
  "files": [
    {"path": "reddit_controller.py", "desc": "Process supervisor", "status": "ACTIVE"},
    {"path": "reddit_scraper.py", "desc": "Main scraper", "status": "PRODUCTION"},
    {"path": "ARCHITECTURE.md", "desc": "System architecture", "status": "REFERENCE"},
    {"path": "PLAN_v3.1.0.md", "desc": "Implementation plan", "status": "REFERENCE"}
  ],
  "related": [
    {"path": "../../../reddit_scraper_backup.py", "desc": "v2.4.0 reference", "status": "BACKUP"}
  ]
}
```

## Current State

```json
{
  "status": "TRANSITIONING",
  "old_scraper": {
    "version": "v3.4.0",
    "status": "REMOVED",
    "reason": "Data loss issues",
    "removed_files": [
      "simple_main.py (142KB)",
      "processors/calculator.py (22KB)"
    ]
  },
  "new_scraper": {
    "file": "reddit_scraper.py",
    "version": "v3.0.0",
    "status": "IN_DEVELOPMENT",
    "reference": "reddit_scraper_backup.py (v2.4.0)",
    "planned_features": [
      "AsyncPRAW with proxy support",
      "Multi-account rotation",
      "Self-contained logging and metrics",
      "Proven data integrity"
    ]
  }
}
```

## Infrastructure Status

```json
{
  "controller": {
    "file": "reddit_controller.py",
    "version": "v2.0.0",
    "status": "SIMPLIFIED",
    "lines": 164,
    "description": "Minimal process supervisor - starts/stops scraper based on database flag",
    "responsibilities": [
      "Check database enabled flag every 30s",
      "Start/stop scraper process",
      "Update heartbeat for monitoring"
    ],
    "no_longer_does": [
      "Logging (scraper handles this)",
      "Metrics collection (scraper handles this)",
      "Cycle tracking (scraper handles this)",
      "Timeout management (scraper handles this)"
    ]
  },
  "single_fetcher": {
    "endpoint": "/api/subreddits/fetch-single",
    "status": "OPERATIONAL",
    "usage": "Manual subreddit fetching"
  },
  "database": {
    "tables": ["reddit_subreddits", "reddit_posts", "reddit_users"],
    "status": "INTACT",
    "data": "PRESERVED"
  },
  "control": {
    "table": "system_control",
    "script_name": "reddit_scraper",
    "status": "READY"
  }
}
```

## Migration Plan

```json
{
  "phase_1": {
    "task": "Implement reddit_scraper.py",
    "source": "../../reddit_scraper_backup.py (reference)",
    "target": "reddit_scraper.py",
    "changes_needed": [
      "Copy proven scraping logic from backup",
      "Add self-contained logging to system_logs",
      "Add metrics collection and cycle tracking",
      "Implement async run() loop",
      "Add graceful stop() method for controller"
    ],
    "scraper_responsibilities": [
      "All logging to system_logs table",
      "Cycle counting and timing",
      "Stats collection (posts, subreddits, users)",
      "Error handling and reporting",
      "Timeout management",
      "Checking enabled flag during operation"
    ]
  },
  "phase_2": {
    "task": "Test data integrity",
    "validation": [
      "No data loss",
      "Proper foreign key handling",
      "Correct write order"
    ]
  },
  "phase_3": {
    "task": "Deploy new scraper",
    "steps": [
      "Update reddit_controller.py imports",
      "Test locally",
      "Deploy to production"
    ]
  }
}
```

## Quick Commands

```bash
# Check continuous runner status
psql -c "SELECT enabled, status FROM system_control WHERE script_name='reddit_scraper'"

# View scraper base file
cat ../../reddit_scraper_backup.py | head -100

# Test single fetcher
curl -X POST "https://b9-dashboard.onrender.com/api/subreddits/fetch-single" \
  -H "Content-Type: application/json" \
  -d '{"subreddit_name": "test"}'
```

---

_Reddit Scraper Rebuild | Status: Pending | Base: v2.4.0_
_Navigate: [← scrapers/](../README.md) | [→ reddit_controller.py](reddit_controller.py)_