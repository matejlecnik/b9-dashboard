# Documentation Map

┌─ NAVIGATION HUB ────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% MAPPED       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "DOCUMENTATION_MAP.md",
  "siblings": [
    {"path": "DOCUMENTATION_STANDARDS.md", "desc": "Rules & compliance", "status": "ENFORCED"},
    {"path": "DOCUMENTATION_TEMPLATE.md", "desc": "Copy template", "status": "READY"},
    {"path": "SESSION_LOG.md", "desc": "Development history", "status": "ACTIVE"},
    {"path": "QUICK_CODES.md", "desc": "Jump shortcuts", "status": "REFERENCE"}
  ]
}
```

## Document Network

```json
{
  "root": {
    "CLAUDE.md": {"tokens": 500, "status": "HUB", "desc": "Control center"},
    "README.md": {"tokens": 400, "status": "UPDATED", "desc": "Project overview"}
  },
  "docs": {
    "development": {
      "DOCUMENTATION_MAP.md": {"tokens": 400, "status": "CURRENT", "desc": "This file"},
      "DOCUMENTATION_STANDARDS.md": {"tokens": 500, "status": "ENFORCED", "desc": "Mandatory rules"},
      "DOCUMENTATION_TEMPLATE.md": {"tokens": 300, "status": "TEMPLATE", "desc": "Copy source"},
      "SESSION_LOG.md": {"tokens": 500, "status": "ACTIVE", "desc": "History tracker"},
      "QUICK_CODES.md": {"tokens": 400, "status": "REFERENCE", "desc": "Shortcuts"}
    },
    "deployment": {
      "DEPLOYMENT.md": {"tokens": 300, "status": "GUIDE", "desc": "Deploy process"},
      "DEPLOYMENT_SECRETS.md": {"tokens": 200, "status": "SECURE", "desc": "Secret management"}
    },
    "performance": {
      "PERFORMANCE_OPTIMIZATION.md": {"tokens": 500, "status": "GUIDE", "desc": "Speed tips"}
    },
    "archive": {
      "REDDIT_SCRAPER_ISSUES_DASHBOARD.md": {"tokens": 800, "status": "ARCHIVED"},
      "REDDIT_SCRAPER_COMPREHENSIVE_ISSUES.md": {"tokens": 600, "status": "ARCHIVED"},
      "REDDIT_SCRAPER_ARCHITECTURE_v3.0.md": {"tokens": 500, "status": "ARCHIVED"},
      "PHASE_1_ASYNC_OPTIMIZATION.md": {"tokens": 400, "status": "ARCHIVED"}
    }
  }
}
```

## Dashboard Documentation

```json
{
  "dashboard": {
    "root": {
      "README.md": {"tokens": 400, "status": "UPDATED", "desc": "Dashboard overview"}
    },
    "src/app": {
      "README.md": {"tokens": 200, "status": "PENDING", "desc": "App structure"},
      "reddit": {
        "README.md": {"tokens": 350, "status": "LOCKED", "desc": "Reddit dashboard"},
        "subreddit-review/README.md": {"tokens": 300, "status": "LOCKED"},
        "categorization/README.md": {"tokens": 300, "status": "LOCKED"},
        "posting/README.md": {"tokens": 300, "status": "LOCKED"},
        "user-analysis/README.md": {"tokens": 300, "status": "LOCKED"},
        "post-analysis/README.md": {"tokens": 300, "status": "LOCKED"}
      },
      "instagram": {
        "README.md": {"tokens": 400, "status": "UPDATED", "desc": "Instagram dashboard"},
        "analytics/README.md": {"tokens": 350, "status": "PENDING"},
        "creator-review/README.md": {"tokens": 400, "status": "PENDING"},
        "viral-content/README.md": {"tokens": 400, "status": "PENDING"},
        "niching/README.md": {"tokens": 350, "status": "PENDING"}
      },
      "models": {
        "README.md": {"tokens": 300, "status": "PLANNED"},
        "[id]/README.md": {"tokens": 250, "status": "PLANNED"},
        "new/README.md": {"tokens": 250, "status": "PLANNED"}
      }
    },
    "components": {
      "README.md": {"tokens": 400, "status": "PENDING"},
      "shared/README.md": {"tokens": 300, "status": "PENDING"}
    },
    "lib": {
      "README.md": {"tokens": 350, "status": "PENDING"}
    },
    "hooks": {
      "README.md": {"tokens": 300, "status": "PENDING"}
    }
  }
}
```

## API Documentation

```json
{
  "api-render": {
    "README.md": {"tokens": 400, "status": "UPDATED", "desc": "API overview"},
    "scrapers": {
      "README.md": {"tokens": 350, "status": "UPDATED"},
      "reddit/README.md": {"tokens": 350, "status": "UPDATED"},
      "instagram/README.md": {"tokens": 350, "status": "UPDATED"}
    },
    "routes": {
      "README.md": {"tokens": 300, "status": "UPDATED"}
    },
    "services": {
      "README.md": {"tokens": 400, "status": "UPDATED"},
      "instagram/README.md": {"tokens": 350, "status": "UPDATED"},
      "tags/README.md": {"tokens": 350, "status": "UPDATED"},
      "tags/TAG_CATEGORIES.md": {"tokens": 400, "status": "SOURCE_OF_TRUTH"},
      "tags/tag_definitions.py": {"tokens": 300, "status": "IMPLEMENTATION"}
    },
    "core": {
      "database/README.md": {"tokens": 400, "status": "UPDATED"},
      "cache/README.md": {"tokens": 350, "status": "UPDATED"},
      "config/README.md": {"tokens": 300, "status": "UPDATED"},
      "clients/README.md": {"tokens": 350, "status": "UPDATED"}
    }
  }
}
```

## Status Summary

```json
{
  "statistics": {
    "total_files": 45,
    "updated": 15,
    "pending": 20,
    "locked": 6,
    "planned": 4
  },
  "completion": {
    "api_render": 100,
    "dashboard_core": 30,
    "docs": 20,
    "overall": 45
  },
  "token_budget": {
    "total": 15000,
    "average_per_file": 333,
    "max_file": 800,
    "min_file": 200
  }
}
```

## Execution Plan

```json
{
  "immediate": {
    "priority": "P0",
    "files": [
      "docs/development/SESSION_LOG.md",
      "docs/development/QUICK_CODES.md",
      "dashboard/src/app/README.md"
    ]
  },
  "this_sprint": {
    "priority": "P1",
    "files": [
      "dashboard/src/app/instagram/*/README.md",
      "dashboard/src/components/README.md",
      "dashboard/src/lib/README.md"
    ]
  },
  "future": {
    "priority": "P2",
    "files": [
      "dashboard/src/app/models/*/README.md",
      "docs/archive/*.md"
    ]
  }
}
```

## Quick Navigation

```bash
# Jump to sections
$ open ../../CLAUDE.md           # Hub
$ open ../deployment/            # Deploy docs
$ open ../../dashboard/          # Frontend
$ open ../../api-render/         # Backend

# Check status
$ grep -c "PENDING" DOCUMENTATION_MAP.md
$ grep -c "UPDATED" DOCUMENTATION_MAP.md
```

---

_Map Version: 2.0.0 | Updated: 2024-01-28 | Coverage: 100%_
_Navigate: [← CLAUDE.md](../../CLAUDE.md) | [→ SESSION_LOG.md](SESSION_LOG.md)_