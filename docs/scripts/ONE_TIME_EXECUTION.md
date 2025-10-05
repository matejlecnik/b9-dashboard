# One-Time Execution Philosophy

┌─ EXECUTION MODEL ───────────────────────────────────────┐
│ ● OPTIMIZED   │ NO DAEMONS │ NO BACKGROUND PROCESSES    │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "ONE_TIME_EXECUTION.md",
  "related": [
    {"path": "automation/metrics-daemon.py", "desc": "Metrics collector"},
    {"path": "search/doc-search.py", "desc": "Search engine"},
    {"path": "../../lefthook.yml", "desc": "Git hooks config"}
  ]
}
```

## Core Principle

**All scripts run ONCE when triggered - no continuous monitoring, no background processes, no resource waste.**

## Execution Triggers

```json
{
  "automatic_triggers": {
    "pre_commit": {
      "when": "Before each git commit",
      "scripts": [
        "validate-docs.py (only staged .md files)",
        "metrics-daemon.py (only if >30 min old)",
        "doc-search.py (incremental, only if .md changed)"
      ],
      "total_time": "< 2 seconds"
    },
    "post_commit": {
      "when": "After successful commit",
      "scripts": [
        "session-logger.py (log commit)",
        "template-processor.py (update CLAUDE.md)"
      ],
      "total_time": "< 1 second"
    }
  },
  "manual_triggers": {
    "when_needed": [
      "python3 docs/scripts/search/doc-search.py 'query'",
      "python3 docs/scripts/automation/metrics-daemon.py",
      "lefthook run metrics-full"
    ]
  }
}
```

## Performance Optimizations

### 1. Smart Caching
```json
{
  "search_index": {
    "skip_if_age": "< 5 minutes",
    "incremental_if_age": "< 1 hour",
    "full_rebuild_if_age": "> 1 hour"
  },
  "metrics": {
    "skip_if_age": "< 30 minutes",
    "update_if_age": "> 30 minutes"
  }
}
```

### 2. Conditional Execution
```bash
## Only run if files changed
if [ modified_files > 0 ]; then
  run_script
fi

## Only run if cache is old
if [ cache_age > threshold ]; then
  update_cache
fi
```

### 3. Parallel Processing
```yaml
pre-commit:
  parallel: true  # All checks run simultaneously
```

## Why One-Time Execution?

```json
{
  "benefits": {
    "performance": "No CPU/memory usage when not working",
    "simplicity": "No daemon management needed",
    "reliability": "No processes to crash or restart",
    "predictability": "Scripts only run when YOU trigger them",
    "efficiency": "Updates only when actually needed"
  },
  "comparison": {
    "continuous_monitoring": {
      "cpu_usage": "5-10% constant",
      "memory": "100-200MB constant",
      "complexity": "HIGH",
      "maintenance": "Required"
    },
    "one_time_execution": {
      "cpu_usage": "0% idle, 1% when triggered",
      "memory": "0MB idle, 50MB when running",
      "complexity": "LOW",
      "maintenance": "None"
    }
  }
}
```

## Script Behavior

### metrics-daemon.py
```python
## DEFAULT: Run once and exit
python3 metrics-daemon.py

## NOT RECOMMENDED: Watch mode (requires confirmation)
python3 metrics-daemon.py --watch
> ⚠️  Watch mode is not recommended. Use git hooks for automatic updates.
> Continue with watch mode? (y/N): n
> Running once instead...
```

### doc-search.py
```python
## Build/update index only when needed
if index_age < 5_minutes:
    skip_rebuild()
elif index_age < 1_hour:
    incremental_update()  # Fast, only changed files
else:
    full_rebuild()  # Complete reindex
```

### Git Hooks
```bash
## Pre-commit: Only essentials
- Validate staged files only
- Update metrics if stale
- Incremental search index

## Post-commit: Quick logging
- Log session (< 500ms)
- Update templates (< 200ms)
```

## Manual Override

When you need fresh data immediately:

```bash
## Force update everything
lefthook run metrics-full

## Update specific component
python3 docs/scripts/automation/metrics-daemon.py
python3 docs/scripts/search/doc-search.py --rebuild

## Search interactively
lefthook run search-docs
```

## Resource Usage

```json
{
  "idle_state": {
    "cpu": "0%",
    "memory": "0MB",
    "disk_io": "0",
    "network": "0"
  },
  "during_commit": {
    "cpu": "1-5% for 2 seconds",
    "memory": "50MB peak",
    "disk_io": "minimal",
    "network": "1 API call"
  },
  "manual_run": {
    "cpu": "5% for 1 second",
    "memory": "30MB",
    "disk_io": "read/write index",
    "network": "optional"
  }
}
```

## Best Practices

```json
{
  "DO": [
    "Let git hooks handle automation",
    "Use manual commands only when needed",
    "Trust the caching logic",
    "Keep scripts fast (< 2 sec)"
  ],
  "DON'T": [
    "Run watch/daemon modes",
    "Force updates unnecessarily",
    "Disable git hooks",
    "Add slow operations to pre-commit"
  ]
}
```

---

_Execution Model Version: 1.0.0 | Updated: 2025-10-05 | Philosophy: ON-DEMAND_
_Navigate: [← README.md](README.md) | [→ automation/](automation/)_