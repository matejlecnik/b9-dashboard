# Reddit Scraper Audit & Cleanup Plan

┌─ SYSTEM STATUS ─────────────────────────────────────────┐
│ 🔴 AUDIT PENDING │ ░░░░░░░░░░░░░░░░░░░░ 0% COMPLETE   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "COMPREHENSIVE_AUDIT_PLAN.md",
  "parent": "api-render/app/scrapers/reddit/",
  "related": [
    {"path": "README.md", "desc": "Scraper documentation", "status": "OUTDATED"},
    {"path": "simple_main.py", "desc": "Core v3.x logic", "status": "ACTIVE"},
    {"path": "continuous_v3.py", "desc": "Main loop", "status": "ACTIVE"},
    {"path": "start.py", "desc": "Entry point", "status": "PRODUCTION"}
  ]
}
```

## Audit Results

```json
{
  "timestamp": "2025-09-29T22:00:00Z",
  "version": "v3.2.2",
  "files_total": 17,
  "files_active": 7,
  "dead_code": 10,
  "cleanup_potential": "59%",
  "supabase_logging": {
    "covered": 3,
    "missing": 4,
    "coverage": "43%"
  },
  "code_quality": {
    "formatted": false,
    "linted": false,
    "type_checked": false,
    "print_statements": 7
  }
}
```

## File Classification

```
ACTIVE    [██████████████████░░░░░░░░░░░░░░░░░░░] 41% (7/17)
DEAD      [██████████████████████████████░░░░░░] 59% (10/17)
```

## Active Files Map

```json
{
  "entry": {
    "file": "start.py",
    "line": 59,
    "spawns": "continuous_v3.py",
    "status": "PRODUCTION"
  },
  "core_scraper": [
    {"file": "continuous_v3.py", "lines": 334, "role": "Main loop", "status": "ACTIVE"},
    {"file": "simple_main.py", "lines": 3102, "role": "Core logic", "status": "ACTIVE"},
    {"file": "processors/calculator.py", "lines": 423, "role": "Metrics", "status": "ACTIVE"},
    {"file": "processors/__init__.py", "lines": 1, "role": "Package", "status": "ACTIVE"},
    {"file": "__init__.py", "lines": 1, "role": "Package", "status": "ACTIVE"}
  ],
  "dependencies": [
    {"module": "api_pool.py", "logging": "❌ MISSING", "critical": true},
    {"module": "proxy_manager.py", "logging": "✅ PRESENT", "critical": false},
    {"module": "supabase_client.py", "logging": "❌ MISSING", "critical": true},
    {"module": "exceptions.py", "logging": "❌ MISSING", "critical": true}
  ]
}
```

## Dead Code Inventory

```json
{
  "old_architecture": {
    "files": ["main.py", "continuous.py", "scrapers/*.py"],
    "lines": 2845,
    "last_used": "2024-12-15",
    "reason": "Replaced by v3.x simplified architecture",
    "action": "DELETE"
  },
  "test_files": {
    "files": ["test_*.py"],
    "count": 6,
    "lines": 892,
    "type": "One-off fixes, not unit tests",
    "action": "DELETE"
  }
}
```

## Critical Issues

```json
{
  "C-001": {
    "severity": "CRITICAL",
    "issue": "Missing Supabase logging in core modules",
    "affected": ["api_pool.py", "exceptions.py", "supabase_client.py", "calculator.py"],
    "impact": "Logs not visible in dashboard (43% coverage)",
    "effort": "3h",
    "priority": 1
  },
  "C-002": {
    "severity": "CRITICAL",
    "issue": "59% dead code in production",
    "files": 10,
    "impact": "Confusion, slow deploys, wasted resources",
    "effort": "30m",
    "priority": 0
  }
}
```

## Execution Plan

```json
{
  "phase_1": {
    "name": "Dead Code Removal",
    "status": "PENDING",
    "effort": "30m",
    "priority": "IMMEDIATE",
    "commands": [
      "rm -rf app/scrapers/reddit/scrapers/",
      "rm app/scrapers/reddit/main.py",
      "rm app/scrapers/reddit/continuous.py",
      "rm app/scrapers/reddit/test_*.py"
    ],
    "validation": ["No import errors", "Scraper starts", "Git commit"],
    "progress": "░░░░░░░░░░"
  },
  "phase_2": {
    "name": "Supabase Logging Integration",
    "status": "PENDING",
    "effort": "3h",
    "priority": "HIGH",
    "modules": {
      "api_pool.py": {"effort": "45m", "events": 8},
      "exceptions.py": {"effort": "30m", "events": 4},
      "supabase_client.py": {"effort": "30m", "events": 5},
      "calculator.py": {"effort": "30m", "events": 6}
    },
    "progress": "░░░░░░░░░░"
  },
  "phase_3": {
    "name": "Code Quality",
    "status": "PENDING",
    "effort": "1h",
    "priority": "MEDIUM",
    "tools": ["black", "flake8", "mypy"],
    "config": {
      "max_line_length": 120,
      "python_version": "3.11",
      "ignore": ["E203", "W503"]
    },
    "progress": "░░░░░░░░░░"
  },
  "phase_4": {
    "name": "Config Centralization",
    "status": "PENDING",
    "effort": "1h",
    "priority": "MEDIUM",
    "hardcoded_values": {
      "RATE_LIMIT_DELAY": {"current": 1.0, "move_to": "system_control.config"},
      "MAX_RETRIES": {"current": 3, "move_to": "system_control.config"},
      "TIMEOUT": {"current": 300, "move_to": "system_control.config"}
    },
    "progress": "░░░░░░░░░░"
  },
  "phase_5": {
    "name": "Documentation",
    "status": "PENDING",
    "effort": "2h",
    "priority": "LOW",
    "deliverables": [
      "Architecture diagram",
      "Docstrings (90% coverage)",
      "Troubleshooting guide"
    ],
    "progress": "░░░░░░░░░░"
  }
}
```

## Metrics Comparison

```
┌─ CURRENT STATE ─────────────────────────────────────────┐
│ Files:           17  │ Supabase Logs:  43%  │ Docs: 60%│
│ Dead Code:       59% │ Code Quality:    0%  │ Tests: 0%│
│ Active:          41% │ Type Hints:     30%  │ Lint: NO │
└──────────────────────────────────────────────────────────┘

┌─ TARGET STATE ──────────────────────────────────────────┐
│ Files:            7  │ Supabase Logs: 100%  │ Docs: 90%│
│ Dead Code:        0% │ Code Quality:  100%  │ Tests: 0%│
│ Active:         100% │ Type Hints:     70%  │ Lint: YES│
└──────────────────────────────────────────────────────────┘
```

## Risk Assessment

```json
{
  "dead_code_removal": {
    "risk": "LOW",
    "mitigation": "Git preserves history",
    "validation": "Test scraper startup"
  },
  "logging_changes": {
    "risk": "MEDIUM",
    "mitigation": "Add gradually, test each module",
    "validation": "Check dashboard logs"
  },
  "code_formatting": {
    "risk": "LOW",
    "mitigation": "Black is reversible",
    "validation": "Run tests after format"
  }
}
```

## Quick Commands

```bash
# Phase 1: Clean dead code
$ cd api-render/app/scrapers/reddit
$ rm -rf scrapers/ main.py continuous.py test_*.py
$ git add -A && git commit -m "🧹 CLEANUP: Remove v2.x dead code (59% reduction)"

# Phase 2: Test logging
$ python -c "from simple_main import SimplifiedRedditScraper; s = SimplifiedRedditScraper()"
$ tail -f /tmp/reddit_scraper.log

# Phase 3: Format code
$ black . --line-length 120
$ flake8 . --max-line-length=120 --extend-ignore=E203,W503

# Phase 4: Validate changes
$ python continuous_v3.py --test
$ curl -X POST "https://b9-dashboard.onrender.com/api/scraper/status"
```

## Timeline

```
Week 1  [████████████████████░░░░░░░░░░░░░░░░] Phase 1-2 (3.5h)
Week 2  [░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░] Phase 3-4 (2h)
Week 3  [░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░] Phase 5 (2h)
```

## Commit Strategy

```json
{
  "branch": "feature/scraper-audit-cleanup",
  "commits": [
    {"phase": 1, "message": "🧹 CLEANUP: Remove v2.x dead code (59% reduction)"},
    {"phase": 2, "message": "📊 LOGGING: Add Supabase integration (100% coverage)"},
    {"phase": 3, "message": "✨ QUALITY: Add black + flake8 + mypy"},
    {"phase": 4, "message": "⚙️ CONFIG: Centralize hardcoded values to DB"},
    {"phase": 5, "message": "📚 DOCS: Add architecture + docstrings (90%)"}
  ]
}
```

## Performance Impact

```json
{
  "before": {
    "files": 17,
    "lines": 6847,
    "size_kb": 284,
    "deploy_time_s": 45,
    "log_visibility": "43%"
  },
  "after": {
    "files": 7,
    "lines": 3859,
    "size_kb": 156,
    "deploy_time_s": 28,
    "log_visibility": "100%",
    "improvement": {
      "files": "-59%",
      "lines": "-44%",
      "size": "-45%",
      "deploy": "-38%",
      "visibility": "+133%"
    }
  }
}
```

## Action Items

```json
{
  "immediate": [
    {"id": "A-001", "task": "Delete dead code", "effort": "30m", "status": "READY"},
    {"id": "A-002", "task": "Add logging to api_pool", "effort": "45m", "status": "READY"}
  ],
  "this_week": [
    {"id": "A-003", "task": "Complete Supabase logging", "effort": "2h", "status": "PENDING"},
    {"id": "A-004", "task": "Apply code formatting", "effort": "1h", "status": "PENDING"}
  ],
  "this_month": [
    {"id": "A-005", "task": "Centralize config", "effort": "1h", "status": "PENDING"},
    {"id": "A-006", "task": "Update documentation", "effort": "2h", "status": "PENDING"}
  ],
  "backlog": [
    {"id": "B-001", "task": "Create pytest suite", "effort": "8h+", "status": "FUTURE"},
    {"id": "B-002", "task": "Add CI/CD pipeline", "effort": "4h", "status": "FUTURE"}
  ]
}
```

---

_Audit Version: 2.0 | Generated: 2025-09-29T22:00:00Z | Total Effort: 6.5h | ROI: HIGH_