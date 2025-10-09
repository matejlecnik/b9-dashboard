# Monitoring Guide

┌─ MONITORING STATUS ─────────────────────────────────────┐
│ ● ACTIVE      │ ████████████████████ 100% OPERATIONAL  │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "docs/MONITORING.md",
  "siblings": [
    {"path": "API_ENDPOINTS.md", "desc": "Endpoint reference", "status": "REFERENCE"},
    {"path": "DEPLOYMENT.md", "desc": "Deploy guide", "status": "GUIDE"},
    {"path": "PERFORMANCE.md", "desc": "Optimization", "status": "GUIDE"}
  ]
}
```

## Health Endpoints

```json
{
  "hetzner": {
    "/health": {
      "url": "http://91.98.91.129:10000/health",
      "type": "Basic health check",
      "response_time": "< 10ms",
      "checks": ["API running", "Port accessible"],
      "frequency": "30s"
    },
    "/health/detailed": {
      "url": "http://91.98.91.129:10000/health/detailed",
      "type": "Comprehensive check",
      "response_time": "< 100ms",
      "checks": [
        "Database connection",
        "Redis queue status",
        "Worker connectivity",
        "Memory usage across 3 servers"
      ],
      "frequency": "60s"
    }
  }
}
```

## Hetzner-Specific Monitoring

```bash
## Docker Status (on all 3 servers)
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129 "docker compose ps"
ssh -i ~/.ssh/hetzner_b9 root@188.245.232.203 "docker compose ps"
ssh -i ~/.ssh/hetzner_b9 root@91.98.92.192 "docker compose ps"

## Docker Logs (API server)
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129 "docker compose logs --tail=50"

## Redis Queue Monitoring (API server)
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129 "redis-cli -a B9Dashboard2025SecureRedis! LLEN instagram_scraper_queue"

## System Resources (API server)
ssh -i ~/.ssh/hetzner_b9 root@91.98.91.129 "docker stats --no-stream"
```

## System Metrics

```json
{
  "current_status": {
    "uptime": "30d 14h 23m",
    "requests_today": 234567,
    "error_rate": "0.02%",
    "avg_response_time": "89ms",
    "memory_usage": "450MB / 512MB",
    "cpu_usage": "40%"
  },
  "thresholds": {
    "response_time_warning": "500ms",
    "response_time_critical": "1000ms",
    "error_rate_warning": "1%",
    "error_rate_critical": "5%",
    "memory_warning": "400MB",
    "memory_critical": "480MB"
  }
}
```

## Scraper Monitoring

```json
{
  "reddit_scraper": {
    "version": "v3.4.5",
    "status": "RUNNING",
    "architecture": "reddit_controller.py + reddit_scraper.py",
    "last_heartbeat": "10s ago",
    "performance": "8-10s per subreddit",
    "error_rate": "<2%",
    "features": ["Immediate discovery", "Proxy rotation", "AsyncIO"]
  },
  "instagram_scraper": {
    "status": "IDLE",
    "last_run": "2024-01-29T08:00:00Z",
    "next_scheduled": "2024-01-29T12:00:00Z",
    "creators_processed": 1247,
    "api_calls_remaining": 8500
  }
}
```

## Database Health

```json
{
  "connection_pool": {
    "active": 12,
    "idle": 8,
    "total": 20,
    "waiting_requests": 0
  },
  "performance": {
    "avg_query_time": "45ms",
    "slow_queries_today": 23,
    "deadlocks": 0,
    "rollbacks": 2
  },
  "storage": {
    "used": "8.4GB",
    "limit": "10GB",
    "growth_rate": "100MB/day",
    "days_until_full": 16
  }
}
```

## Alert Configuration

```json
{
  "alerts": {
    "high_memory_usage": {
      "threshold": "85%",
      "action": "Notify + Auto-scale",
      "cooldown": "5min"
    },
    "high_error_rate": {
      "threshold": "5%",
      "action": "Notify + Investigate",
      "cooldown": "10min"
    },
    "database_connection_failed": {
      "threshold": "3 failures",
      "action": "Notify + Restart",
      "cooldown": "2min"
    },
    "scraper_stalled": {
      "threshold": "No heartbeat for 5min",
      "action": "Restart scraper",
      "cooldown": "10min"
    }
  }
}
```

## Logging

```json
{
  "configuration": {
    "level": "INFO",
    "destination": "system_logs table",
    "retention": "30 days",
    "batch_size": 100,
    "flush_interval": "5s"
  },
  "statistics": {
    "logs_today": 456789,
    "errors_today": 234,
    "warnings_today": 1234,
    "info_today": 455321
  }
}
```

## Performance Tracking

```json
{
  "endpoints": {
    "/api/stats": {
      "p50": "45ms",
      "p95": "89ms",
      "p99": "124ms",
      "requests": 234567
    },
    "/api/categorization": {
      "p50": "1200ms",
      "p95": "2100ms",
      "p99": "3400ms",
      "requests": 12345
    },
    "/api/subreddits": {
      "p50": "67ms",
      "p95": "134ms",
      "p99": "289ms",
      "requests": 45678
    }
  }
}
```

---

_Monitoring Version: 2.0.0 | Status: Active | Updated: 2024-01-29_
_Navigate: [← docs/](README.md) | [→ PERFORMANCE.md](PERFORMANCE.md)_