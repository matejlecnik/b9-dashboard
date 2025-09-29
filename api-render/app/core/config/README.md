# Configuration Management

┌─ CONFIG STATUS ─────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% LOADED       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "config/README.md",
  "files": [
    {"path": "scraper_config.py", "desc": "Scraper settings", "status": "STABLE"},
    {"path": "proxy_manager.py", "desc": "Proxy configuration", "status": "DISABLED"},
    {"path": "__init__.py", "desc": "Module exports", "status": "OK"}
  ]
}
```

## System Configuration

```json
{
  "environment": {
    "mode": "PRODUCTION",
    "debug": false,
    "hot_reload": false,
    "config_source": "Environment variables",
    "validation": "PASSED"
  },
  "scraper_settings": {
    "reddit": {
      "batch_size": 100,
      "rate_limit": "60/min",
      "max_workers": 10,
      "retry_attempts": 3,
      "timeout": 30
    },
    "instagram": {
      "batch_size": 50,
      "rate_limit": "200/hour",
      "max_workers": 5,
      "retry_attempts": 3,
      "timeout": 30
    }
  }
}
```

## Proxy Configuration

```json
{
  "proxy_status": {
    "enabled": false,
    "reason": "Not required for current APIs",
    "available_proxies": 0,
    "rotation_strategy": "round_robin"
  },
  "future_implementation": {
    "providers": ["residential", "datacenter"],
    "health_check": true,
    "auto_rotation": true,
    "geo_targeting": true
  }
}
```

## Environment Variables

```json
{
  "loaded": {
    "SUPABASE_URL": "✓",
    "SUPABASE_KEY": "✓",
    "RAPIDAPI_KEY": "✓",
    "REDDIT_CLIENT_ID": "✓",
    "REDDIT_CLIENT_SECRET": "✓",
    "API_KEY": "✓"
  },
  "validation": {
    "all_required": true,
    "format_valid": true,
    "connections_tested": true
  }
}
```

## Performance Impact

```json
{
  "config_loading": {
    "load_time": "50ms",
    "memory_usage": "2MB",
    "cache_enabled": true,
    "hot_reload": false
  },
  "optimization": {
    "lazy_loading": true,
    "singleton_pattern": true,
    "thread_safe": true
  }
}
```

---

_Config Version: 2.0.0 | Status: Stable | Updated: 2024-01-29_
_Navigate: [← core/](../README.md) | [→ database/](../database/README.md)_