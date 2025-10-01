# Supabase Database Functions & Procedures

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● ACTIVE    │ █████████████░░░░░░░ 65% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "docs/database/SUPABASE_FUNCTIONS.md",
  "parent": "docs/INDEX.md"
}
```

## Overview

┌─ STORED PROCEDURES ─────────────────────────────────────┐
│ ● OPERATIONAL │ 28 FUNCTIONS │ 3 VIEWS │ 0 TRIGGERS    │
└─────────────────────────────────────────────────────────┘

## Function Categories

```
┌─────────────────────────────────────────────────────────┐
│                  FUNCTION OVERVIEW                       │
├───────────────┬─────────────────────────────────────────┤
│ Category      │ Count │ Purpose                         │
├───────────────┼───────┼─────────────────────────────────┤
│ Analytics     │   9   │ Data analysis & metrics         │
│ Maintenance   │   3   │ Cleanup & system maintenance    │
│ Permissions   │   4   │ Access control & rate limiting  │
│ Filters       │   4   │ Content filtering & selection   │
│ Updates       │   5   │ Data updates & triggers         │
│ Utilities     │   3   │ Helper functions                │
└───────────────┴───────┴─────────────────────────────────┘
```

## 🧹 Maintenance Functions

### `cleanup_old_logs()`
```sql
-- ⚠️ CRITICAL: Deletes logs older than 2 days
-- Runs: Must be called externally (no pg_cron)
-- Impact: Keeps system_logs table manageable (currently 1.8GB)

FUNCTION cleanup_old_logs() RETURNS void
{
  "behavior": "Deletes logs > 2 days old",
  "frequency": "Should run daily",
  "batch_mode": "All at once (not batched)",
  "self_documenting": true,
  "creates_log_entry": {
    "deleted_rows": "count",
    "cleanup_threshold": "2 days"
  }
}

-- Usage:
SELECT cleanup_old_logs();
```

### `cleanup_old_rate_limits()`
```sql
FUNCTION cleanup_old_rate_limits() RETURNS void
{
  "purpose": "Remove expired rate limit records",
  "target_table": "api_rate_limits",
  "cleanup_criteria": "timestamp-based"
}
```

### `reset_daily_request_counts()`
```sql
FUNCTION reset_daily_request_counts() RETURNS void
{
  "purpose": "Reset daily API quotas",
  "target": "system_control.requests_today",
  "frequency": "Daily at midnight",
  "condition": "DATE(last_request_reset) < CURRENT_DATE"
}
```

## 📊 Analytics Functions

### `get_viral_posts()`
```sql
FUNCTION get_viral_posts(
  time_range_hours INTEGER DEFAULT 72,
  posts_per_subreddit INTEGER DEFAULT 3,
  total_limit INTEGER DEFAULT 500
) RETURNS TABLE
{
  "purpose": "Advanced viral content algorithm",
  "scoring_algorithm": {
    "normalized_score": "40% weight",
    "engagement_rate": "40% weight",
    "velocity": "10% weight",
    "recency": "5% weight",
    "sfw_boost": "10% for non-NSFW"
  },
  "filters": {
    "only_ok_subreddits": true,
    "time_window": "configurable",
    "top_per_subreddit": "configurable"
  },
  "returns": "Posts ranked by viral_score"
}
```

### `get_post_analytics_metrics()`
```sql
FUNCTION get_post_analytics_metrics() RETURNS TABLE
{
  "metrics": [
    "engagement_rate",
    "comment_to_upvote_ratio",
    "velocity_score",
    "time_decay_factor"
  ]
}
```

### `get_user_stats()`
```sql
FUNCTION get_user_stats() RETURNS TABLE
{
  "aggregates": [
    "total_karma",
    "avg_post_score",
    "posting_frequency",
    "quality_scores"
  ]
}
```

### `get_subreddit_tag_stats()`
```sql
FUNCTION get_subreddit_tag_stats() RETURNS TABLE
{
  "purpose": "Tag distribution analysis",
  "returns": "Tag counts and percentages"
}
```

### `get_unique_tags()`
```sql
FUNCTION get_unique_tags() RETURNS TABLE
{
  "purpose": "Extract all unique tags",
  "source": "reddit_subreddits.tags array"
}
```

### `get_top_categories_for_posts()`
```sql
FUNCTION get_top_categories_for_posts() RETURNS TABLE
{
  "purpose": "Category performance analysis",
  "metrics": "Posts per category with engagement"
}
```

### `get_filter_status_stats()`
```sql
FUNCTION get_filter_status_stats() RETURNS TABLE
{
  "purpose": "Filter effectiveness metrics",
  "tracks": "Filtered vs approved content"
}
```

### `get_posting_page_counts()`
```sql
FUNCTION get_posting_page_counts() RETURNS TABLE
{
  "purpose": "Pagination helper for posting UI"
}
```

### `get_viral_posts_paginated()`
```sql
FUNCTION get_viral_posts_paginated(
  page INTEGER,
  per_page INTEGER
) RETURNS TABLE
{
  "wrapper_for": "get_viral_posts()",
  "adds": "Pagination support"
}
```

## 🔒 Permission & Access Functions

### `check_dashboard_access()`
```sql
FUNCTION check_dashboard_access(
  user_id INTEGER,
  dashboard_id INTEGER
) RETURNS BOOLEAN
{
  "purpose": "Verify dashboard access rights",
  "checks": "user_permissions table"
}
```

### `check_permission_level()`
```sql
FUNCTION check_permission_level(
  user_id INTEGER,
  required_level VARCHAR
) RETURNS BOOLEAN
{
  "levels": ["read", "write", "admin"],
  "cascade": "admin > write > read"
}
```

### `get_user_permissions()`
```sql
FUNCTION get_user_permissions(user_id INTEGER)
RETURNS JSONB
{
  "returns": {
    "dashboards": ["list of accessible dashboards"],
    "permissions": ["array of permission levels"],
    "features": ["enabled features"]
  }
}
```

### `check_rate_limit()`
```sql
FUNCTION check_rate_limit(
  identifier VARCHAR,
  limit_type VARCHAR
) RETURNS RECORD
{
  "checks": "api_rate_limits table",
  "returns": {
    "allowed": "boolean",
    "remaining": "integer",
    "reset_at": "timestamp"
  }
}
```

## 🎯 Filter Functions

### `filter_subreddits_for_posting()`
```sql
FUNCTION filter_subreddits_for_posting() RETURNS TABLE
{
  "purpose": "Get postable subreddits",
  "filters": [
    "review = 'Ok'",
    "enabled = true",
    "subscriber_threshold",
    "activity_level"
  ]
}
```

### `filter_subreddits_by_tags()`
```sql
FUNCTION filter_subreddits_by_tags(
  tags TEXT[]
) RETURNS TABLE
{
  "purpose": "Tag-based filtering",
  "supports": "Multiple tag matching"
}
```

### `filter_subreddits_by_tags_jsonb()`
```sql
FUNCTION filter_subreddits_by_tags_jsonb(
  filter JSONB
) RETURNS TABLE
{
  "enhanced_version": true,
  "supports": {
    "include_tags": [],
    "exclude_tags": [],
    "match_mode": "any|all"
  }
}
```

### `calculate_proxy_success_rate()`
```sql
FUNCTION calculate_proxy_success_rate(
  proxy_id INTEGER
) RETURNS NUMERIC
{
  "calculation": "successful_requests / total_requests",
  "time_window": "Last 24 hours"
}
```

## 🔄 Update Functions

### `update_all_instagram_creator_stats()`
```sql
FUNCTION update_all_instagram_creator_stats() RETURNS void
{
  "purpose": "Batch update Instagram metrics",
  "updates": {
    "reels_count": "from instagram_creator_reel_stats",
    "total_views": "aggregated",
    "avg_engagement": "calculated",
    "last_rollup_at": "NOW()"
  },
  "frequency": "Should run hourly"
}
```

### `update_instagram_creator_stats()`
```sql
FUNCTION update_instagram_creator_stats(
  creator_id INTEGER
) RETURNS void
{
  "purpose": "Single creator stat update",
  "triggered_by": "New content or manual"
}
```

### `populate_post_subreddit_fields()`
```sql
FUNCTION populate_post_subreddit_fields()
RETURNS TRIGGER
{
  "purpose": "Denormalize subreddit data",
  "copies": [
    "sub_over18",
    "sub_tags",
    "sub_primary_category"
  ],
  "note": "Not active (no triggers found)"
}
```

### `update_updated_at_column()`
```sql
FUNCTION update_updated_at_column()
RETURNS TRIGGER
{
  "purpose": "Auto-update timestamps",
  "sets": "updated_at = NOW()",
  "note": "Generic trigger function (unused)"
}
```

### `update_reddit_proxies_updated_at()`
```sql
FUNCTION update_reddit_proxies_updated_at()
RETURNS TRIGGER
{
  "specific_to": "reddit_proxies table",
  "note": "No active trigger found"
}
```

## 🛠️ Utility Functions

### `is_script_healthy()`
```sql
FUNCTION is_script_healthy(
  script_name VARCHAR
) RETURNS BOOLEAN
{
  "checks": [
    "last_heartbeat < 5 minutes",
    "status = 'running'",
    "consecutive_errors < 10"
  ],
  "used_for": "Monitoring script health"
}
```

### `get_user_dashboards()`
```sql
FUNCTION get_user_dashboards(
  user_id INTEGER
) RETURNS TABLE
{
  "returns": "Accessible dashboards",
  "joins": [
    "dashboard_registry",
    "user_permissions"
  ]
}
```

### `update_ai_categorization_updated_at()`
```sql
FUNCTION update_ai_categorization_updated_at()
RETURNS TRIGGER
{
  "purpose": "Track AI categorization updates",
  "note": "Trigger function (unused)"
}
```

## 📈 Database Views

### `reddit_high_quality_users`
```sql
VIEW reddit_high_quality_users AS
SELECT users WHERE overall_user_score >= 6
{
  "quality_tiers": {
    "excellent": ">= 8",
    "high": ">= 6",
    "medium": ">= 4",
    "low": "< 4"
  },
  "use_case": "Quick access to quality creators"
}
```

### `instagram_creator_reel_stats`
```sql
VIEW instagram_creator_reel_stats AS
SELECT aggregated reel statistics per creator
{
  "aggregates": [
    "total_reels",
    "total_views",
    "avg_views_per_reel",
    "avg_engagement"
  ],
  "updated_by": "update_all_instagram_creator_stats()"
}
```

### `active_proxy_summary`
```sql
VIEW active_proxy_summary AS
SELECT proxy performance metrics
{
  "shows": [
    "active_proxies",
    "success_rates",
    "last_used",
    "request_counts"
  ]
}
```

## 🚀 Usage Examples

```sql
-- Daily maintenance (should be scheduled externally)
SELECT cleanup_old_logs();
SELECT cleanup_old_rate_limits();
SELECT reset_daily_request_counts();

-- Get viral content
SELECT * FROM get_viral_posts(
  time_range_hours := 48,
  posts_per_subreddit := 5,
  total_limit := 100
);

-- Update Instagram stats
SELECT update_all_instagram_creator_stats();

-- Check rate limits
SELECT * FROM check_rate_limit('api_key_123', 'hourly');

-- Filter subreddits
SELECT * FROM filter_subreddits_by_tags(
  ARRAY['technology', 'programming']
);
```

## ⚠️ Important Notes

```json
{
  "critical": {
    "log_retention": "2 DAYS ONLY - cleanup_old_logs() DELETES permanently",
    "no_cron": "No pg_cron extension - schedule externally",
    "no_triggers": "Trigger functions exist but NOT attached",
    "manual_execution": "All maintenance must be called manually/via API"
  },
  "recommendations": {
    "schedule_cleanup": "Run cleanup_old_logs() daily at 3 AM",
    "monitor_logs": "1.8GB current size - grows ~50MB/day",
    "batch_deletes": "Consider batching for large deletions",
    "add_indexes": "Consider indexes on timestamp columns"
  }
}
```

---

_Functions: 28 | Views: 3 | Triggers: 0 | Last Updated: 2025-01-29_

---

_Version: 1.0.0 | Updated: 2025-10-01_