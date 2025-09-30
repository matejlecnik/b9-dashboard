# System Logging

┌─ LOGGING STATUS ────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% ENFORCED     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "logging.md",
  "related": [
    {"path": "../app/core/utils/supabase_logger.py", "desc": "Logger implementation", "status": "ACTIVE"},
    {"path": "../app/core/logging_helper.py", "desc": "Helper functions", "status": "STABLE"},
    {"path": "MONITORING.md", "desc": "Monitoring guide", "status": "ACTIVE"}
  ]
}
```

## Mandatory Requirements

```json
{
  "enforcement": {
    "rule": "ALL logs MUST use system_logs table",
    "table": "system_logs",
    "database": "Supabase",
    "exceptions": "NONE",
    "compliance": "100%"
  },
  "structure": {
    "timestamp": "ISO 8601 with timezone",
    "source": "Service name (reddit_scraper, api, etc)",
    "script_name": "File or module name",
    "level": "info|warning|error|critical|success",
    "message": "Human-readable description",
    "context": "JSON object with additional data",
    "duration_ms": "Optional execution time"
  }
}
```

## Log Levels

```json
{
  "levels": {
    "info": {"use": "Normal operations", "emoji": "ℹ️"},
    "success": {"use": "Successful completions", "emoji": "✅"},
    "warning": {"use": "Potential issues", "emoji": "⚠️"},
    "error": {"use": "Failures that don't stop execution", "emoji": "❌"},
    "critical": {"use": "Fatal errors", "emoji": "🔴"}
  }
}
```

## Implementation

```python
from app.core.utils.supabase_logger import log_to_supabase
from app.core.database.supabase_client import get_supabase_client

# Standard logging
supabase = get_supabase_client()
supabase.table("system_logs").insert({
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "source": "reddit_scraper",
    "script_name": "simple_main",
    "level": "info",
    "message": "Processing batch",
    "context": {"batch_size": 50, "items": ["item1", "item2"]}
}).execute()

# With duration tracking
start_time = time.time()
# ... operation ...
duration_ms = int((time.time() - start_time) * 1000)

supabase.table("system_logs").insert({
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "source": "api",
    "script_name": "categorization_service",
    "level": "success",
    "message": "Batch processed",
    "context": {"processed": 100},
    "duration_ms": duration_ms
}).execute()
```

## Query Examples

```sql
-- Recent errors
SELECT * FROM system_logs
WHERE level IN ('error', 'critical')
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- Performance metrics
SELECT source, script_name,
       AVG(duration_ms) as avg_ms,
       MAX(duration_ms) as max_ms,
       COUNT(*) as executions
FROM system_logs
WHERE duration_ms IS NOT NULL
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY source, script_name;

-- Error rate by service
SELECT source,
       COUNT(*) FILTER (WHERE level IN ('error', 'critical')) as errors,
       COUNT(*) as total,
       ROUND(COUNT(*) FILTER (WHERE level IN ('error', 'critical'))::numeric / COUNT(*) * 100, 2) as error_rate
FROM system_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY error_rate DESC;
```

## Monitoring Dashboard

```json
{
  "key_metrics": {
    "error_rate": "SELECT query above",
    "avg_response_time": "SELECT AVG(duration_ms)",
    "logs_per_minute": "COUNT(*) / minutes",
    "critical_errors_24h": "COUNT WHERE level='critical'"
  },
  "alerts": {
    "high_error_rate": "> 2%",
    "slow_response": "p95 > 1000ms",
    "critical_error": "immediate",
    "no_logs": "> 5 minutes silence"
  }
}
```

## Compliance Check

```bash
# Find non-compliant print statements
grep -r "print(" app/ --include="*.py" | grep -v "__pycache__"

# Verify Supabase logging
psql $DATABASE_URL -c "
SELECT source, COUNT(*) as log_count
FROM system_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY source
ORDER BY log_count DESC;"
```

---

_Logging System v2.0 | Status: Enforced | Compliance: 100%_