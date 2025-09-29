# Instagram Services

┌─ SERVICES STATUS ───────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████░░░░ 90% ACTIVE        │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "services/README.md",
  "files": [
    {"path": "unified_scraper.py", "desc": "Main scraper logic", "status": "ACTIVE"},
    {"path": "instagram_config.py", "desc": "Configuration", "status": "STABLE"},
    {"path": "__init__.py", "desc": "Module init", "status": "OK"}
  ]
}
```

## Service Configuration

```json
{
  "unified_scraper": {
    "purpose": "Fetch creator content via RapidAPI",
    "batch_processing": true,
    "retry_mechanism": true,
    "proxy_rotation": false,
    "deduplication": true
  },
  "api_limits": {
    "requests_per_second": 60,
    "max_batch_size": 50,
    "timeout": 30,
    "max_retries": 3
  },
  "content_limits": {
    "posts_per_creator": 12,
    "reels_per_creator": 12,
    "max_caption_length": 2200,
    "media_types": ["image", "video", "carousel"]
  }
}
```

## Performance Optimization

```json
{
  "current_optimizations": {
    "batch_processing": {
      "status": "ENABLED",
      "batch_size": 50,
      "processing_time": "30s per batch",
      "efficiency": "95%"
    },
    "caching": {
      "status": "ENABLED",
      "ttl": 300,
      "hit_rate": "60%",
      "memory_saved": "200MB"
    },
    "connection_pooling": {
      "status": "ACTIVE",
      "pool_size": 10,
      "reuse_rate": "85%"
    },
    "deduplication": {
      "status": "ENABLED",
      "method": "shortcode",
      "duplicates_prevented": "15%"
    }
  }
}
```

## Error Statistics

```json
{
  "last_24h": {
    "total_requests": 8640,
    "successful": 8498,
    "failed": 142,
    "success_rate": "98.4%"
  },
  "error_types": {
    "rate_limit": 45,
    "timeout": 32,
    "not_found": 28,
    "api_error": 20,
    "network": 17
  },
  "recovery": {
    "auto_recovered": 125,
    "manual_intervention": 0,
    "permanent_failures": 17
  }
}
```

## Memory Management

```json
{
  "usage_patterns": {
    "idle": "150MB",
    "processing": "400MB",
    "peak": "600MB",
    "average": "350MB"
  },
  "optimization_triggers": {
    "gc_threshold": "500MB",
    "batch_reduction": "550MB",
    "emergency_flush": "600MB"
  },
  "current_status": {
    "memory_used": "340MB",
    "gc_runs_today": 12,
    "memory_leaks": 0
  }
}
```

## Content Processing

```json
{
  "processing_pipeline": [
    {"step": 1, "action": "Fetch creator list", "time": "100ms"},
    {"step": 2, "action": "Batch API requests", "time": "5s"},
    {"step": 3, "action": "Parse responses", "time": "2s"},
    {"step": 4, "action": "Deduplicate content", "time": "500ms"},
    {"step": 5, "action": "Format for database", "time": "1s"},
    {"step": 6, "action": "Batch insert", "time": "3s"}
  ],
  "total_processing_time": "11.6s per batch",
  "throughput": "260 items/minute"
}
```

## Recent Improvements

```json
{
  "completed": [
    {"date": "2025-01-28", "task": "Retry mechanism", "impact": "HIGH"},
    {"date": "2025-01-27", "task": "Batch optimization", "impact": "HIGH"},
    {"date": "2025-01-27", "task": "Deduplication logic", "impact": "MEDIUM"},
    {"date": "2025-01-26", "task": "Memory optimization", "impact": "CRITICAL"}
  ],
  "planned": [
    {"task": "Webhook notifications", "priority": "P2", "effort": "4h"},
    {"task": "Incremental scraping", "priority": "P1", "effort": "6h"},
    {"task": "Content quality scoring", "priority": "P3", "effort": "8h"},
    {"task": "Media backup", "priority": "P3", "effort": "12h"}
  ]
}
```

---

_Services Version: 2.0.0 | Status: Stable | Updated: 2024-01-29_
_Navigate: [← instagram/](../README.md) | [→ reddit/](../../reddit/README.md)_