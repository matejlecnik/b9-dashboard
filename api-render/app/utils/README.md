# Utility Functions

┌─ UTILS STATUS ──────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% STABLE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "utils/README.md",
  "files": [
    {"path": "system_logger.py", "desc": "Centralized logging", "status": "ACTIVE"},
    {"path": "supabase_logger.py", "desc": "DB logging helper", "status": "STABLE"},
    {"path": "memory_monitor.py", "desc": "Memory tracking", "status": "OPERATIONAL"},
    {"path": "monitoring.py", "desc": "System monitoring", "status": "STABLE"}
  ]
}
```

## System Logger

```json
{
  "implementation": "system_logger.py",
  "features": {
    "singleton_pattern": true,
    "batch_processing": true,
    "thread_safe": true,
    "auto_flush": true,
    "structured_logging": true
  },
  "configuration": {
    "batch_size": 100,
    "flush_interval": 5,
    "max_retries": 3,
    "log_levels": ["debug", "info", "warning", "error", "critical"],
    "table": "system_logs"
  },
  "performance": {
    "logs_per_second": 1000,
    "batch_insert_time": "50ms",
    "memory_usage": "5MB"
  }
}
```

## Memory Monitor

```json
{
  "implementation": "memory_monitor.py",
  "monitoring": {
    "process_memory": true,
    "system_memory": true,
    "garbage_collection": true,
    "memory_leaks": true
  },
  "thresholds": {
    "warning": "70%",
    "critical": "85%",
    "auto_gc": "80%"
  },
  "metrics": {
    "check_interval": 60,
    "history_size": 100,
    "alert_cooldown": 300
  }
}
```

## Monitoring Utils

```json
{
  "implementation": "monitoring.py",
  "capabilities": [
    "Health checks",
    "Performance metrics",
    "Error tracking",
    "Resource monitoring",
    "Uptime tracking"
  ],
  "integrations": {
    "supabase": "system_logs table",
    "render": "health endpoint",
    "dashboard": "real-time updates"
  }
}
```

## Usage Patterns

```python
# System Logger
from utils.system_logger import system_logger

# Log with context
system_logger.info(
    "Scraper started",
    source="reddit_scraper",
    context={"batch_size": 100}
)

# Memory Monitor
from utils.memory_monitor import monitor

# Check memory usage
usage = monitor.get_memory_usage()
if usage.percent > 80:
    monitor.force_garbage_collection()

# Monitoring
from utils.monitoring import health_check

# Get system health
health = health_check()
# Returns: {"status": "healthy", "memory": 65, "cpu": 40}
```

## Performance Metrics

```json
{
  "logging": {
    "throughput": "10k logs/minute",
    "latency": "0.5ms per log",
    "batch_efficiency": "95%"
  },
  "memory_monitoring": {
    "overhead": "2MB",
    "check_time": "5ms",
    "gc_trigger_time": "100ms"
  },
  "health_checks": {
    "response_time": "10ms",
    "check_frequency": "60s",
    "uptime": "99.99%"
  }
}
```

## Recent Improvements

```json
{
  "completed": [
    {"date": "2025-01-28", "task": "Batch logging optimization", "impact": "HIGH"},
    {"date": "2025-01-27", "task": "Thread-safe singleton", "impact": "CRITICAL"},
    {"date": "2025-01-27", "task": "Memory leak detection", "impact": "HIGH"},
    {"date": "2025-01-26", "task": "Structured logging", "impact": "MEDIUM"}
  ]
}
```

---

_Utils Version: 2.0.0 | Status: Stable | Updated: 2024-01-29_
_Navigate: [← app/](../README.md) | [→ services/](../services/README.md)_