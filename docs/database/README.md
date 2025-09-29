# Database Documentation

┌─ DATABASE STATUS ───────────────────────────────────────┐
│ ● PRODUCTION  │ ████████████████████ 100% OPERATIONAL  │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "database/README.md",
  "files": [
    {"path": "initial-schema.sql", "desc": "Original database schema", "status": "ARCHIVED"},
    {"path": "migrations/", "desc": "Migration scripts", "status": "PLANNED"}
  ]
}
```

## Database Overview

```json
{
  "provider": "Supabase",
  "type": "PostgreSQL",
  "version": "15.x",
  "size": "6.2GB",
  "tables": 15,
  "status": "PRODUCTION",
  "location": "US East",
  "backup": "Daily automated"
}
```

## Schema Structure

```json
{
  "core_tables": {
    "reddit": {
      "subreddits": "5,847 records",
      "reddit_users": "298,456 records",
      "reddit_posts": "2.3M records",
      "reddit_comments": "890K records"
    },
    "instagram": {
      "instagram_creators": "1,247 records",
      "instagram_posts": "145K records",
      "instagram_analytics": "Daily metrics"
    },
    "system": {
      "scraper_accounts": "Multi-account config",
      "system_logs": "Application logging",
      "tag_categories": "Content categorization"
    }
  }
}
```

## Connection Configuration

```json
{
  "environment_variables": {
    "SUPABASE_URL": {
      "required": true,
      "format": "https://[project].supabase.co",
      "location": ".env file"
    },
    "SUPABASE_KEY": {
      "required": true,
      "format": "eyJ... (JWT token)",
      "location": ".env file"
    },
    "SUPABASE_SERVICE_KEY": {
      "required": false,
      "format": "eyJ... (JWT token)",
      "usage": "Admin operations only"
    }
  },
  "connection_pooling": {
    "max_connections": 100,
    "timeout": 30,
    "retry_attempts": 3
  }
}
```

## Table Relationships

```json
{
  "foreign_keys": {
    "reddit_posts": {
      "subreddit_id": "references subreddits(id)",
      "author_id": "references reddit_users(id)"
    },
    "reddit_comments": {
      "post_id": "references reddit_posts(id)",
      "author_id": "references reddit_users(id)"
    },
    "instagram_posts": {
      "creator_id": "references instagram_creators(id)"
    }
  },
  "indexes": {
    "performance": [
      "reddit_posts(created_utc)",
      "reddit_posts(score)",
      "subreddits(category)",
      "instagram_creators(username)"
    ],
    "unique": [
      "subreddits(name)",
      "reddit_users(username)",
      "instagram_creators(username)"
    ]
  }
}
```

## Migration History

```json
{
  "migrations": [
    {
      "version": "001",
      "date": "2024-01-15",
      "description": "Initial schema creation",
      "file": "initial-schema.sql"
    },
    {
      "version": "002",
      "date": "2024-01-20",
      "description": "Added Instagram tables",
      "status": "APPLIED"
    },
    {
      "version": "003",
      "date": "2024-01-25",
      "description": "Added system_logs table",
      "status": "APPLIED"
    }
  ],
  "pending_migrations": []
}
```

## Performance Metrics

```json
{
  "query_performance": {
    "avg_response_time": "45ms",
    "p95_response_time": "120ms",
    "slow_queries": 3,
    "cache_hit_rate": "92%"
  },
  "storage": {
    "total_size": "6.2GB",
    "reddit_data": "4.8GB",
    "instagram_data": "1.2GB",
    "system_data": "200MB",
    "growth_rate": "50MB/day"
  },
  "connections": {
    "active": 45,
    "idle": 20,
    "max_allowed": 100,
    "avg_per_second": 150
  }
}
```

## Backup Strategy

```json
{
  "automated_backups": {
    "frequency": "Daily at 2:00 AM UTC",
    "retention": "30 days",
    "type": "Point-in-time recovery"
  },
  "manual_backups": {
    "trigger": "Before major updates",
    "storage": "Supabase managed",
    "restoration_time": "< 5 minutes"
  }
}
```

## Security Configuration

```json
{
  "row_level_security": {
    "enabled": true,
    "policies": [
      "Users can only read their own data",
      "Admin role has full access",
      "Scraper role has write access to specific tables"
    ]
  },
  "encryption": {
    "at_rest": "AES-256",
    "in_transit": "TLS 1.3",
    "key_management": "Supabase managed"
  },
  "access_control": {
    "authentication": "JWT tokens",
    "authorization": "Role-based (RLS)",
    "api_keys": "Environment variables only"
  }
}
```

## Maintenance Windows

```json
{
  "scheduled": {
    "day": "Sunday",
    "time": "03:00-04:00 AM UTC",
    "frequency": "Monthly",
    "notifications": "24 hours in advance"
  },
  "operations": [
    "Index optimization",
    "Vacuum operations",
    "Statistics update",
    "Cache clearing"
  ]
}
```

## Monitoring

```json
{
  "health_checks": {
    "endpoint": "/health/database",
    "frequency": "Every 30 seconds",
    "alerts": "Slack webhook on failure"
  },
  "metrics_tracked": [
    "Query latency",
    "Connection pool status",
    "Storage usage",
    "Error rates",
    "Slow query log"
  ],
  "dashboards": {
    "supabase": "Built-in monitoring",
    "custom": "Grafana dashboard (planned)"
  }
}
```

---

_Database Version: 15.x | Status: Production | Updated: 2024-01-29_
_Navigate: [← docs/](../README.md) | [→ initial-schema.sql](initial-schema.sql)_