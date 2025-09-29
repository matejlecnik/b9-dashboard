# System Logging Guide

┌─ LOGGING STATUS ────────────────────────────────────────┐
│ ● MANDATORY   │ ████████████████████ 100% ENFORCED     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "LOGGING_README.md",
  "related": [
    {"path": "../app/utils/system_logger.py", "desc": "Logger implementation", "status": "ACTIVE"},
    {"path": "../app/utils/supabase_logger.py", "desc": "DB logger", "status": "STABLE"},
    {"path": "MONITORING.md", "desc": "Monitoring guide", "status": "ACTIVE"}
  ]
}
```

## Critical Requirements

```json
{
  "mandatory": {
    "rule": "ALL logs MUST use system_logs table",
    "enforcement": "STRICT",
    "exceptions": "NONE",
    "table": "system_logs",
    "database": "Supabase"
  },
  "compliance": {
    "current": "100%",
    "scripts_using_system_logs": 45,
    "scripts_using_print": 0,
    "last_audit": "2024-01-29"
  }
}
```

## System Logs Table Structure

```json
{
  "table_name": "system_logs",
  "columns": {
    "id": {"type": "UUID", "primary": true},
    "timestamp": {"type": "TIMESTAMPTZ", "default": "NOW()"},
    "source": {"type": "VARCHAR", "required": true},
    "level": {"type": "VARCHAR", "enum": ["debug", "info", "warning", "error", "critical"]},
    "title": {"type": "VARCHAR", "required": true},
    "message": {"type": "TEXT", "nullable": true},
    "context": {"type": "JSONB", "nullable": true}
  },
  "indexes": [
    "timestamp",
    "source",
    "level",
    "source_timestamp"
  ]
}
```

## Logger Configuration

```json
{
  "implementation": "/api-render/app/utils/system_logger.py",
  "features": {
    "dual_output": true,
    "python_logging": true,
    "supabase_logging": true,
    "batch_insertion": true,
    "thread_safe": true,
    "auto_retry": true
  },
  "performance": {
    "batch_size": 100,
    "flush_interval": 5,
    "max_retries": 3,
    "retry_delay": 1
  }
}
```

## Source Naming Convention

```json
{
  "format": "module.function",
  "examples": {
    "api.main": "Main API application",
    "reddit_scraper.continuous": "Reddit continuous scraper",
    "instagram_scraper.fetch": "Instagram fetch operation",
    "categorization.analyze": "AI categorization",
    "database.batch_writer": "Batch write operations"
  },
  "rules": [
    "Use dot notation for hierarchy",
    "Keep names under 50 characters",
    "Be specific but concise",
    "Use lowercase with underscores"
  ]
}
```

## Usage Examples

```python
# Import the system logger
from app.utils.system_logger import system_logger

# Basic logging
system_logger.info(
    "Scraper started",
    source="reddit_scraper.main"
)

# With context
system_logger.error(
    "API rate limit exceeded",
    source="instagram_scraper.api",
    context={
        "endpoint": "/user_posts",
        "status_code": 429,
        "retry_after": 300
    }
)

# Batch operations
system_logger.info("Processing batch", source="batch.processor")
# ... multiple operations ...
system_logger.flush()  # Force flush to database
```

## Log Levels

```json
{
  "levels": {
    "DEBUG": {
      "when": "Development only",
      "example": "Variable values, function entry/exit"
    },
    "INFO": {
      "when": "Normal operations",
      "example": "Scraper started, batch completed"
    },
    "WARNING": {
      "when": "Potential issues",
      "example": "Rate limit approaching, memory high"
    },
    "ERROR": {
      "when": "Recoverable failures",
      "example": "API timeout, retry needed"
    },
    "CRITICAL": {
      "when": "System failures",
      "example": "Database down, out of memory"
    }
  }
}
```

## Migration Checklist

```json
{
  "steps": [
    {"step": 1, "action": "Import system_logger", "status": "COMPLETE"},
    {"step": 2, "action": "Replace all print() statements", "status": "COMPLETE"},
    {"step": 3, "action": "Add source parameter", "status": "COMPLETE"},
    {"step": 4, "action": "Add context where helpful", "status": "COMPLETE"},
    {"step": 5, "action": "Test log output", "status": "COMPLETE"},
    {"step": 6, "action": "Verify in system_logs table", "status": "COMPLETE"}
  ],
  "validation": {
    "no_print_statements": true,
    "all_using_system_logger": true,
    "logs_appearing_in_database": true
  }
}
```

## Best Practices

```json
{
  "do": [
    "Log at appropriate levels",
    "Include relevant context",
    "Use consistent source names",
    "Log errors with full details",
    "Batch logs when possible"
  ],
  "dont": [
    "Use print() statements",
    "Log sensitive data (passwords, keys)",
    "Over-log in production",
    "Ignore errors",
    "Create custom loggers"
  ],
  "performance": [
    "Use batch insertion for bulk operations",
    "Avoid logging in tight loops",
    "Use DEBUG level sparingly",
    "Flush manually when needed"
  ]
}
```

## Monitoring Queries

```sql
-- Recent errors
SELECT * FROM system_logs
WHERE level = 'error'
  AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Scraper activity
SELECT source, COUNT(*) as log_count, MAX(timestamp) as last_activity
FROM system_logs
WHERE source LIKE '%scraper%'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY source;

-- System health
SELECT level, COUNT(*) as count
FROM system_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY level;
```

---

_Logging Version: 2.0.0 | Status: Mandatory | Updated: 2024-01-29_
_Navigate: [← docs/](README.md) | [→ MONITORING.md](MONITORING.md)_