# Supabase Database Schema Documentation

┌─ DATABASE SCHEMA ───────────────────────────────────────┐
│ ● PRODUCTION  │ ████████████████████ 100% DOCUMENTED   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../INDEX.md",
  "current": "database/SUPABASE_SCHEMA.md",
  "siblings": [
    {"path": "SUPABASE_QUERIES.md", "desc": "Query patterns", "status": "ACTIVE"},
    {"path": "SUPABASE_FUNCTIONS.md", "desc": "Database functions", "status": "ACTIVE"},
    {"path": "BACKGROUND_JOBS.md", "desc": "Scheduled tasks", "status": "ACTIVE"}
  ]
}
```

## System Overview

```json
{
  "provider": "Supabase PostgreSQL",
  "version": "15.x",
  "total_tables": 26,
  "total_size": "~6.5GB",
  "last_updated": "2025-10-05",
  "connection": "REST API (no direct SQL)",
  "environment": {
    "SUPABASE_URL": "Required",
    "SUPABASE_SERVICE_ROLE_KEY": "Required"
  }
}
```

## Database Statistics

```json
{
  "data_volume": {
    "reddit_posts": 1833991,
    "reddit_users": 309608,
    "reddit_subreddits": 34682,
    "instagram_creators": 220,
    "instagram_posts": 1668,
    "instagram_reels": 8693,
    "system_logs": 51218
  },
  "storage_breakdown": {
    "system_logs": "1.8GB",
    "reddit_data": "~4.2GB",
    "instagram_data": "~500MB",
    "control_tables": "~200MB"
  },
  "growth_metrics": {
    "daily_posts": "~5000",
    "daily_logs": "~1500",
    "avg_growth": "50MB/day"
  }
}
```

## Table Categories

```
┌─────────────────────────────────────────────────────────┐
│                    TABLE STRUCTURE                       │
├───────────────┬─────────────────────────────────────────┤
│ Category      │ Tables                                  │
├───────────────┼─────────────────────────────────────────┤
│ Reddit (7)    │ reddit_users, reddit_subreddits,       │
│               │ reddit_posts, reddit_proxies,          │
│               │ reddit_filter_settings,                │
│               │ reddit_subreddit_whitelist,            │
│               │ reddit_high_quality_users              │
├───────────────┼─────────────────────────────────────────┤
│ Instagram (8) │ instagram_creators, instagram_posts,   │
│               │ instagram_reels, instagram_stories,    │
│               │ instagram_follower_history,            │
│               │ instagram_discovery_queue,             │
│               │ instagram_niche_groups,                │
│               │ instagram_creator_reel_stats           │
├───────────────┼─────────────────────────────────────────┤
│ System (7)    │ system_control, system_logs,           │
│               │ scraper_control, scraper_accounts,     │
│               │ script_jobs, api_rate_limits,          │
│               │ instagram_scraper_control              │
├───────────────┼─────────────────────────────────────────┤
│ Other (4)     │ models, user_permissions,              │
│               │ dashboard_registry,                    │
│               │ active_proxy_summary                   │
└───────────────┴─────────────────────────────────────────┘
```

## Core Tables Schema

### 🔴 Reddit Tables

#### `reddit_users` (45 columns, ~310K rows)
```json
{
  "purpose": "Stores Reddit user profiles and quality metrics",
  "key_columns": {
    "id": "INTEGER PRIMARY KEY",
    "username": "VARCHAR UNIQUE NOT NULL",
    "reddit_id": "VARCHAR",
    "account_age_days": "INTEGER (calculated by scraper)",
    "total_karma": "INTEGER",
    "overall_user_score": "NUMERIC (quality metric)",
    "our_creator": "BOOLEAN (tracked creator flag)",
    "model_id": "INTEGER (link to models table)",
    "status": "VARCHAR DEFAULT 'inactive'"
  },
  "activity_metrics": {
    "avg_posts_per_month": "NUMERIC",
    "avg_post_score": "NUMERIC",
    "avg_comment_score": "NUMERIC",
    "cross_subreddit_activity": "INTEGER",
    "primary_subreddits": "ARRAY"
  },
  "timestamps": {
    "created_utc": "Account creation date",
    "last_scraped_at": "Last profile update",
    "last_post_analyzed_at": "Last content analysis"
  }
}
```

#### `reddit_subreddits` (70 columns, ~34.7K rows)
```json
{
  "purpose": "Subreddit profiles with engagement metrics",
  "key_columns": {
    "id": "INTEGER PRIMARY KEY",
    "name": "VARCHAR UNIQUE NOT NULL",
    "display_name_prefixed": "VARCHAR (r/subreddit)",
    "subscribers": "INTEGER",
    "accounts_active": "INTEGER",
    "over18": "BOOLEAN",
    "subreddit_type": "VARCHAR (public/private/restricted)"
  },
  "engagement_metrics": {
    "engagement": "NUMERIC (from top 10 weekly posts)",
    "subreddit_score": "NUMERIC (sqrt(avg_upvotes) * engagement * 1000)",
    "avg_upvotes_per_post": "NUMERIC",
    "avg_comments_per_post": "NUMERIC",
    "comment_to_upvote_ratio": "NUMERIC"
  },
  "content_settings": {
    "allow_images": "BOOLEAN",
    "allow_videos": "BOOLEAN",
    "allow_polls": "BOOLEAN",
    "spoilers_enabled": "BOOLEAN",
    "rules_data": "JSON (subreddit rules)"
  },
  "categorization": {
    "primary_category": "VARCHAR",
    "secondary_category": "VARCHAR",
    "tags": "ARRAY",
    "content_types": "ARRAY"
  },
  "verification": {
    "requires_verification": "BOOLEAN (from desc/rules)",
    "verification_phrases": "ARRAY",
    "verification_settings": "JSON"
  }
}
```

#### `reddit_posts` (48 columns, ~1.76M rows)
```json
{
  "purpose": "Reddit post data with denormalized fields",
  "key_columns": {
    "id": "INTEGER PRIMARY KEY",
    "reddit_id": "VARCHAR UNIQUE",
    "author_username": "VARCHAR INDEXED",
    "subreddit_name": "VARCHAR",
    "title": "TEXT",
    "selftext": "TEXT (post body)",
    "url": "TEXT",
    "score": "INTEGER",
    "num_comments": "INTEGER"
  },
  "denormalized_fields": {
    "sub_over18": "BOOLEAN (from subreddit)",
    "sub_tags": "ARRAY (from subreddit)",
    "sub_primary_category": "VARCHAR (from subreddit)",
    "note": "Denormalized for query performance"
  },
  "content_analysis": {
    "content_type": "VARCHAR INDEXED",
    "is_video": "BOOLEAN",
    "is_self": "BOOLEAN",
    "link_flair_text": "VARCHAR",
    "media_metadata": "JSON"
  },
  "engagement": {
    "upvote_ratio": "NUMERIC",
    "comment_karma": "INTEGER",
    "link_karma": "INTEGER",
    "total_awards_received": "INTEGER"
  },
  "indexes": [
    "idx_posts_author (author_username)",
    "idx_posts_content_type (content_type)",
    "idx_post_tags GIN (sub_tags)",
    "idx_posts_author_username_trgm GIN"
  ]
}
```

### 📸 Instagram Tables

#### `instagram_creators` (72 columns, 220 rows)
```json
{
  "purpose": "Instagram creator profiles and metrics",
  "key_columns": {
    "id": "INTEGER PRIMARY KEY",
    "ig_user_id": "TEXT UNIQUE NOT NULL",
    "username": "TEXT UNIQUE NOT NULL INDEXED",
    "full_name": "TEXT",
    "biography": "TEXT",
    "external_url": "TEXT",
    "followers": "INTEGER INDEXED",
    "following": "INTEGER",
    "posts_count": "INTEGER"
  },
  "account_status": {
    "is_private": "BOOLEAN INDEXED",
    "is_verified": "BOOLEAN",
    "is_business_account": "BOOLEAN",
    "is_professional_account": "BOOLEAN",
    "review_status": "VARCHAR INDEXED",
    "niche": "VARCHAR INDEXED"
  },
  "engagement_metrics": {
    "engagement_rate": "NUMERIC",
    "avg_likes": "NUMERIC",
    "avg_comments": "NUMERIC",
    "avg_views": "NUMERIC",
    "follower_growth_rate": "NUMERIC",
    "quality_score": "NUMERIC"
  },
  "content_metrics": {
    "posts_per_week": "NUMERIC",
    "reels_percentage": "NUMERIC",
    "stories_per_day": "NUMERIC",
    "igtv_count": "INTEGER",
    "total_reels": "INTEGER"
  },
  "indexes": [
    "idx_instagram_creators_username",
    "idx_instagram_creators_followers DESC",
    "idx_instagram_creators_niche",
    "idx_instagram_creators_review_status",
    "idx_instagram_creators_is_private"
  ]
}
```

#### `instagram_posts` (51 columns, 1,668 rows)
```json
{
  "purpose": "Instagram feed posts data",
  "key_columns": {
    "id": "INTEGER PRIMARY KEY",
    "media_pk": "TEXT UNIQUE",
    "media_id": "TEXT",
    "code": "TEXT (shortcode)",
    "creator_id": "INTEGER INDEXED",
    "creator_username": "TEXT",
    "caption_text": "TEXT"
  },
  "engagement": {
    "like_count": "INTEGER INDEXED",
    "comment_count": "INTEGER",
    "view_count": "INTEGER",
    "play_count": "INTEGER",
    "engagement_rate": "NUMERIC INDEXED"
  },
  "media_info": {
    "media_type": "INTEGER",
    "product_type": "TEXT",
    "thumbnail_url": "TEXT",
    "video_url": "TEXT",
    "video_duration": "NUMERIC"
  },
  "indexes": [
    "idx_instagram_posts_creator",
    "idx_instagram_posts_like_count DESC",
    "idx_instagram_posts_engagement DESC",
    "idx_instagram_posts_taken_at DESC"
  ]
}
```

#### `instagram_reels` (48 columns, 8,693 rows)
```json
{
  "purpose": "Instagram Reels content and metrics",
  "similar_to": "instagram_posts",
  "additional_fields": {
    "clips_metadata": "JSON",
    "audio_info": "JSON",
    "effects": "ARRAY"
  }
}
```

### ⚙️ System Control Tables

#### `system_control` (23 columns, control flags)
```json
{
  "purpose": "Global system configuration and feature flags",
  "key_columns": {
    "id": "INTEGER",
    "feature_name": "VARCHAR",
    "enabled": "BOOLEAN",
    "config_json": "JSON",
    "last_updated": "TIMESTAMP"
  },
  "features": [
    "reddit_scraping_enabled",
    "instagram_scraping_enabled",
    "rate_limiting_active",
    "maintenance_mode",
    "api_throttling"
  ]
}
```

#### `scraper_control` (9 columns, scraper state)
```json
{
  "purpose": "Reddit scraper configuration",
  "columns": {
    "scraper_name": "VARCHAR",
    "is_active": "BOOLEAN",
    "last_run": "TIMESTAMP",
    "next_run": "TIMESTAMP",
    "config": "JSON"
  }
}
```

#### `system_logs` (13 columns, ~51K rows, 1.8GB)
```json
{
  "purpose": "Application and scraper logs",
  "columns": {
    "id": "BIGSERIAL",
    "timestamp": "TIMESTAMP",
    "level": "VARCHAR (INFO/WARN/ERROR)",
    "source": "VARCHAR",
    "message": "TEXT",
    "context": "JSON",
    "user_id": "INTEGER",
    "ip_address": "INET"
  },
  "storage_note": "Largest table by size (1.8GB)"
}
```

## Data Relationships

```
┌──────────────────────────────────────────────────────────┐
│                  LOGICAL RELATIONSHIPS                    │
│         (No FK constraints, managed in application)       │
└──────────────────────────────────────────────────────────┘

reddit_posts.author_username ──→ reddit_users.username
reddit_posts.subreddit_name ──→ reddit_subreddits.name

instagram_posts.creator_id ──→ instagram_creators.id
instagram_reels.creator_id ──→ instagram_creators.id
instagram_stories.creator_id ──→ instagram_creators.id

reddit_users.model_id ──→ models.id
instagram_creators.niche_id ──→ instagram_niche_groups.id
```

## Index Strategy

```json
{
  "performance_indexes": {
    "reddit": [
      "author_username (BTREE)",
      "content_type (BTREE)",
      "sub_tags (GIN)",
      "created_utc (BTREE)",
      "score DESC (BTREE)"
    ],
    "instagram": [
      "creator_id (BTREE)",
      "like_count DESC (BTREE)",
      "engagement_rate DESC (BTREE)",
      "taken_at DESC (BTREE)",
      "followers DESC (BTREE)"
    ]
  },
  "unique_indexes": [
    "reddit_users.username",
    "reddit_subreddits.name",
    "instagram_creators.username",
    "instagram_creators.ig_user_id",
    "instagram_posts.media_pk"
  ],
  "text_search": [
    "reddit_posts.author_username (GIN trigram)"
  ]
}
```

## Recent Optimizations

### Database Cleanup (2025-10-05) - ✅ COMPLETED
```json
{
  "status": "EXECUTED",
  "date": "2025-10-05",
  "fields_removed": 9,
  "tables_affected": 2,
  "details": {
    "reddit_users": {
      "removed": [
        "username_quality_score",
        "age_quality_score",
        "karma_quality_score",
        "posting_frequency_score",
        "engagement_consistency_score",
        "awardee_karma",
        "awarder_karma"
      ],
      "count": 7
    },
    "reddit_subreddits": {
      "removed": ["avg_engagement_velocity", "category_text"],
      "count": 2
    }
  },
  "functions_fixed": [
    "get_filter_status_stats() - Fixed table name 'subreddits' → 'reddit_subreddits'",
    "get_user_stats() - Fixed table name 'users' → 'reddit_users'",
    "get_post_analytics_metrics() - Fixed table names in query"
  ],
  "migration_path": "category_text → primary_category",
  "data_coverage": {
    "category_text": "1,429 values (deprecated)",
    "primary_category": "2,678 values (better coverage)"
  },
  "code_updated": [
    "dashboard/src/hooks/queries/useAnalytics.ts",
    "dashboard/src/types/subreddit.ts",
    "dashboard/src/lib/supabase/reddit.ts",
    "dashboard/src/lib/supabase.ts",
    "dashboard/src/hooks/queries/useRedditCategorization.ts"
  ],
  "improvements": {
    "storage_saved": "~120MB",
    "redundant_fields_removed": 9,
    "broken_functions_fixed": 3,
    "code_quality": "Migrated from deprecated field to better data"
  }
}
```

## API Integration

```json
{
  "connection_method": "Supabase REST API",
  "authentication": "Service Role Key",
  "no_direct_sql": true,
  "endpoints": {
    "query": "POST /rest/v1/rpc",
    "insert": "POST /rest/v1/{table}",
    "update": "PATCH /rest/v1/{table}",
    "delete": "DELETE /rest/v1/{table}"
  },
  "rate_limits": {
    "requests_per_second": 100,
    "concurrent_connections": 50
  }
}
```

## Maintenance Notes

```json
{
  "backup": {
    "frequency": "Daily",
    "retention": "30 days",
    "type": "Point-in-time recovery"
  },
  "optimization": {
    "vacuum": "Weekly",
    "analyze": "Daily",
    "reindex": "Monthly"
  },
  "monitoring": {
    "slow_queries": "Logged if > 1s",
    "connection_pool": "Alert if > 80%",
    "storage": "Alert if > 90%"
  }
}
```

## Database Views

### `reddit_high_quality_users`
```sql
-- High-quality Reddit users (score >= 6)
VIEW reddit_high_quality_users AS
SELECT users WHERE overall_user_score >= 6
{
  "columns": ["id", "username", "overall_user_score", "our_creator", "quality_tier"],
  "quality_tiers": {
    "excellent": ">= 8",
    "high": ">= 6",
    "medium": ">= 4",
    "low": "< 4"
  }
}
```

### `instagram_creator_reel_stats`
```sql
-- Aggregated Instagram reel statistics
VIEW instagram_creator_reel_stats AS
SELECT aggregated metrics per creator
{
  "aggregates": ["total_reels", "total_views", "avg_views_per_reel", "avg_engagement"],
  "updated_by": "update_all_instagram_creator_stats() function"
}
```

### `active_proxy_summary`
```sql
-- Proxy performance summary
VIEW active_proxy_summary AS
SELECT proxy health and performance metrics
{
  "metrics": ["active_count", "success_rate", "last_used", "request_volume"]
}
```

## Stored Procedures & Functions

```json
{
  "total_functions": 28,
  "categories": {
    "analytics": 9,
    "maintenance": 3,
    "permissions": 4,
    "filters": 4,
    "updates": 5,
    "utilities": 3
  },
  "critical_functions": [
    "cleanup_old_logs() - DELETES logs > 2 days",
    "get_viral_posts() - Complex viral scoring",
    "update_all_instagram_creator_stats() - Rollup stats"
  ],
  "documentation": "See SUPABASE_FUNCTIONS.md for details"
}
```

## Background Jobs & Maintenance

```json
{
  "WARNING": "NO PG_CRON - External scheduling required",
  "log_retention": {
    "period": "2 DAYS ONLY",
    "function": "cleanup_old_logs()",
    "schedule": "MUST RUN DAILY",
    "current_size": "1.8GB"
  },
  "required_jobs": [
    "cleanup_old_logs() - Daily at 3 AM",
    "reset_daily_request_counts() - Daily at midnight",
    "update_all_instagram_creator_stats() - Hourly"
  ],
  "documentation": "See BACKGROUND_JOBS.md for setup"
}
```

## Query Patterns & Performance

```json
{
  "common_queries": {
    "viral_posts": "Complex CTE with scoring algorithm",
    "user_quality": "Multi-factor scoring system",
    "subreddit_filtering": "Tag-based with GIN indexes"
  },
  "performance": {
    "avg_response": "45ms",
    "p95_response": "89ms",
    "indexed_queries": "92%",
    "slow_threshold": "1000ms"
  },
  "documentation": "See SUPABASE_QUERIES.md for examples"
}
```

## Migration Strategy

```sql
-- Future migrations should follow this pattern:
-- 1. Create migration file in /migrations/
-- 2. Test in development branch
-- 3. Apply using Supabase dashboard
-- 4. Update this documentation

-- Example migration format:
BEGIN;
  -- Add new column
  ALTER TABLE reddit_posts
  ADD COLUMN IF NOT EXISTS new_field VARCHAR;

  -- Create index
  CREATE INDEX IF NOT EXISTS idx_new_field
  ON reddit_posts(new_field);
COMMIT;
```

## Related Documentation

- [`SUPABASE_FUNCTIONS.md`](./SUPABASE_FUNCTIONS.md) - All 28 stored procedures
- [`SUPABASE_QUERIES.md`](./SUPABASE_QUERIES.md) - Query patterns & optimization
- [`BACKGROUND_JOBS.md`](./BACKGROUND_JOBS.md) - Job scheduling & maintenance
- [`README.md`](./README.md) - Database overview

---

_Schema Version: 3.1 | Last Updated: 2025-10-05 | Total Tables: 26_
_Data Volume: 2.18M+ rows | Storage: ~8.4GB | Growth: 50MB/day_
_Functions: 28 | Views: 3 | Triggers: 0 | Log Retention: 2 DAYS_