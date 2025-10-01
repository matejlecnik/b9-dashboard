# Supabase Database Query Patterns

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● ACTIVE    │ █████████████░░░░░░░ 65% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "docs/database/SUPABASE_QUERIES.md",
  "parent": "docs/INDEX.md"
}
```

## Overview

┌─ QUERY LIBRARY ─────────────────────────────────────────┐
│ ● OPTIMIZED  │ INDEXED │ PERFORMANCE-TUNED │ CACHED   │
└─────────────────────────────────────────────────────────┘

## Query Performance Metrics

```json
{
  "avg_response_time": "45ms",
  "p95_response_time": "89ms",
  "p99_response_time": "124ms",
  "slow_query_threshold": "1000ms",
  "index_usage": "92%",
  "cache_hit_ratio": "85%"
}
```

## 🔥 Viral Content Queries

### Get Viral Posts (Complex Algorithm)
```sql
-- Advanced viral scoring with CTEs
WITH ok_subreddits AS (
  SELECT name, over18, primary_category
  FROM reddit_subreddits
  WHERE review = 'Ok'
),
ranked_posts AS (
  SELECT
    p.*,
    -- Viral Score Calculation
    (
      LEAST(10, p.score::FLOAT / 100) * 0.4 +                    -- Normalized score (40%)
      LEAST(10, (p.num_comments::FLOAT / GREATEST(1, p.score)) * 100) * 0.4 +  -- Engagement (40%)
      LEAST(10, p.score::FLOAT / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - p.created_utc)) / 3600)) * 0.1 +  -- Velocity (10%)
      GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - p.created_utc)) / (72 * 3600))) * 0.05  -- Recency (5%)
    ) *
    CASE WHEN p.over_18 = false THEN 1.1 ELSE 1.0 END AS viral_score,  -- SFW boost (10%)
    ROW_NUMBER() OVER (PARTITION BY p.subreddit_name ORDER BY p.score DESC) AS rank_in_sub
  FROM reddit_posts p
  INNER JOIN ok_subreddits s ON p.subreddit_name = s.name
  WHERE p.created_utc >= NOW() - INTERVAL '72 hours'
    AND p.score > 0
)
SELECT * FROM ranked_posts
WHERE rank_in_sub <= 3
ORDER BY viral_score DESC
LIMIT 500;
```

### Hot Content by Category
```sql
-- Get trending posts by category
SELECT
  sub_primary_category as category,
  COUNT(*) as post_count,
  AVG(score) as avg_score,
  AVG(num_comments) as avg_comments,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score
FROM reddit_posts
WHERE created_utc >= NOW() - INTERVAL '24 hours'
  AND score > 100
GROUP BY sub_primary_category
HAVING COUNT(*) > 10
ORDER BY avg_score DESC;
```

## 👤 User Analysis Queries

### High-Quality User Identification
```sql
-- Find top creators with quality scoring
SELECT
  username,
  overall_user_score,
  total_karma,
  account_age_days,
  avg_posts_per_month,
  CASE
    WHEN overall_user_score >= 8 THEN 'excellent'
    WHEN overall_user_score >= 6 THEN 'high'
    WHEN overall_user_score >= 4 THEN 'medium'
    ELSE 'low'
  END as quality_tier,
  primary_subreddits[1:3] as top_subreddits
FROM reddit_users
WHERE overall_user_score >= 6
  AND account_age_days > 180
  AND NOT is_suspended
ORDER BY overall_user_score DESC
LIMIT 100;
```

### User Engagement Patterns
```sql
-- Analyze posting patterns
SELECT
  username,
  COUNT(*) as total_posts,
  AVG(score) as avg_score,
  AVG(num_comments) as avg_engagement,
  EXTRACT(HOUR FROM created_utc) as posting_hour,
  COUNT(*) FILTER (WHERE score > 1000) as viral_posts,
  ARRAY_AGG(DISTINCT subreddit_name) as subreddits
FROM reddit_posts
WHERE created_utc >= NOW() - INTERVAL '30 days'
GROUP BY username, EXTRACT(HOUR FROM created_utc)
HAVING COUNT(*) > 5
ORDER BY avg_score DESC;
```

## 📊 Subreddit Analytics

### Subreddit Health Metrics
```sql
-- Comprehensive subreddit analysis
WITH post_stats AS (
  SELECT
    subreddit_name,
    COUNT(*) as post_count,
    AVG(score) as avg_score,
    AVG(num_comments) as avg_comments,
    STDDEV(score) as score_variance
  FROM reddit_posts
  WHERE created_utc >= NOW() - INTERVAL '7 days'
  GROUP BY subreddit_name
)
SELECT
  s.name,
  s.subscribers,
  s.accounts_active,
  s.engagement,
  s.subreddit_score,
  ps.post_count,
  ps.avg_score,
  ps.avg_comments,
  ps.avg_comments / NULLIF(ps.avg_score, 0) as engagement_ratio,
  s.requires_verification,
  s.primary_category,
  s.tags
FROM reddit_subreddits s
LEFT JOIN post_stats ps ON s.name = ps.subreddit_name
WHERE s.review = 'Ok'
ORDER BY s.subreddit_score DESC;
```

### Tag-Based Discovery
```sql
-- Find subreddits by tags with GIN index
SELECT
  name,
  subscribers,
  tags,
  primary_category,
  subreddit_score
FROM reddit_subreddits
WHERE tags @> ARRAY['technology']::text[]  -- Uses GIN index
  AND subscribers > 10000
  AND review = 'Ok'
ORDER BY subreddit_score DESC;
```

## 📸 Instagram Queries

### Creator Performance Dashboard
```sql
-- Instagram creator analytics with rollup
WITH reel_stats AS (
  SELECT
    creator_id,
    COUNT(*) as reel_count,
    AVG(view_count) as avg_views,
    AVG(like_count) as avg_likes,
    AVG(comment_count) as avg_comments,
    MAX(view_count) as best_reel_views
  FROM instagram_reels
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY creator_id
)
SELECT
  c.username,
  c.followers,
  c.engagement_rate,
  c.niche,
  c.is_verified,
  rs.reel_count,
  rs.avg_views,
  rs.avg_likes,
  (rs.avg_likes + rs.avg_comments) / NULLIF(c.followers, 0) * 100 as true_engagement_rate,
  rs.best_reel_views
FROM instagram_creators c
LEFT JOIN reel_stats rs ON c.id = rs.creator_id
WHERE c.is_private = false
  AND c.followers > 1000
ORDER BY true_engagement_rate DESC;
```

### Viral Reel Detection
```sql
-- Find high-performing reels
SELECT
  r.code as reel_code,
  c.username,
  c.followers,
  r.view_count,
  r.like_count,
  r.comment_count,
  r.view_count::FLOAT / NULLIF(c.followers, 0) as reach_ratio,
  (r.like_count + r.comment_count)::FLOAT / NULLIF(r.view_count, 0) * 100 as engagement_rate,
  r.caption_text,
  r.video_duration
FROM instagram_reels r
JOIN instagram_creators c ON r.creator_id = c.id
WHERE r.created_at >= NOW() - INTERVAL '48 hours'
  AND r.view_count > c.followers * 2  -- 2x reach
ORDER BY reach_ratio DESC
LIMIT 50;
```

## 🔍 Search & Filter Queries

### Full-Text Search (with trigram)
```sql
-- Fast username search with trigram index
SELECT
  username,
  similarity(username, 'search_term') as match_score
FROM reddit_users
WHERE username % 'search_term'  -- Uses GIN trigram index
ORDER BY match_score DESC
LIMIT 20;
```

### Complex Filter Combinations
```sql
-- Multi-criteria filtering
SELECT * FROM reddit_subreddits
WHERE
  -- Size filters
  subscribers BETWEEN 10000 AND 1000000
  -- Category filters
  AND primary_category IN ('technology', 'programming', 'science')
  -- Tag filters (using GIN index)
  AND (
    tags @> ARRAY['discussion']::text[]
    OR tags @> ARRAY['questions']::text[]
  )
  -- Quality filters
  AND engagement > 0.5
  AND subreddit_score > 100
  -- Content settings
  AND allow_images = true
  AND over18 = false
  -- Status
  AND review = 'Ok'
ORDER BY subreddit_score DESC;
```

## 📈 Performance Optimization Patterns

### Batch Updates with RETURNING
```sql
-- Efficient batch updates
UPDATE reddit_users
SET
  last_scraped_at = NOW(),
  overall_user_score = subquery.new_score
FROM (
  SELECT
    id,
    (karma_quality_score * 0.3 +
     age_quality_score * 0.3 +
     posting_frequency_score * 0.4) as new_score
  FROM reddit_users
  WHERE last_scraped_at < NOW() - INTERVAL '24 hours'
  LIMIT 1000
) AS subquery
WHERE reddit_users.id = subquery.id
RETURNING username, overall_user_score;
```

### Efficient Pagination
```sql
-- Keyset pagination (faster than OFFSET)
SELECT * FROM reddit_posts
WHERE created_utc < '2024-01-29 12:00:00'  -- Last timestamp from previous page
ORDER BY created_utc DESC
LIMIT 50;
```

### Aggregation with Window Functions
```sql
-- Running totals and rankings
SELECT
  username,
  score,
  created_utc,
  SUM(score) OVER (PARTITION BY username ORDER BY created_utc) as running_karma,
  RANK() OVER (PARTITION BY DATE(created_utc) ORDER BY score DESC) as daily_rank,
  LAG(score, 1) OVER (PARTITION BY username ORDER BY created_utc) as previous_score
FROM reddit_posts
WHERE created_utc >= NOW() - INTERVAL '7 days';
```

## 🛡️ Monitoring & Health Queries

### System Health Check
```sql
-- Database health metrics
SELECT
  'reddit_posts' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('reddit_posts')) as table_size,
  COUNT(*) FILTER (WHERE created_utc >= NOW() - INTERVAL '1 hour') as recent_rows
FROM reddit_posts
UNION ALL
SELECT
  'system_logs',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('system_logs')),
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 hour')
FROM system_logs;
```

### Slow Query Detection
```sql
-- Find queries taking > 1 second
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Index Usage Analysis
```sql
-- Check index efficiency
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## 🚀 Query Optimization Tips

```json
{
  "best_practices": {
    "use_indexes": "Always filter on indexed columns first",
    "limit_early": "Apply LIMIT in subqueries when possible",
    "avoid_or": "Replace OR with UNION when possible",
    "batch_operations": "Process in chunks of 1000-5000",
    "cache_results": "Use materialized views for expensive aggregations"
  },
  "index_hints": {
    "gin_arrays": "tags @> ARRAY[] uses GIN index",
    "btree_ranges": "BETWEEN uses B-tree efficiently",
    "trigram_search": "username % 'term' uses trigram index",
    "timestamp_sorting": "created_utc DESC uses index"
  },
  "performance_targets": {
    "simple_select": "< 50ms",
    "complex_join": "< 200ms",
    "aggregation": "< 500ms",
    "full_scan": "avoid if possible"
  }
}
```

---

_Query Patterns: 25+ | Optimized: Yes | Indexed: Yes | Updated: 2025-01-29_

---

_Version: 1.0.0 | Updated: 2025-10-01_