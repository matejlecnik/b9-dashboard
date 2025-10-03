-- =====================================================
-- Reddit Dashboard Pagination Optimization
-- Date: 2025-10-03
-- Purpose: Fix performance issues with infinite scroll
-- Author: Development Team
-- Ticket: REDDIT-001
-- =====================================================

-- Index 1: Subreddit Review page (all review statuses)
-- Supports: ORDER BY subscribers DESC NULLS LAST, id ASC with review filter
-- Query pattern: WHERE review = 'Ok' (or NULL) ORDER BY subscribers DESC NULLS LAST, id ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_subscribers_id
ON reddit_subreddits(review, subscribers DESC NULLS LAST, id ASC)
WHERE review IS NOT NULL OR review IS NULL;

-- Index 2: Categorization page (Ok review only)
-- Supports: ORDER BY subscribers DESC NULLS LAST, id ASC for Ok items
-- Query pattern: WHERE review = 'Ok' ORDER BY subscribers DESC NULLS LAST, id ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ok_subscribers_id
ON reddit_subreddits(subscribers DESC NULLS LAST, id ASC)
WHERE review = 'Ok';

-- Index 3: "Added Today" queries
-- Supports: WHERE created_at >= today ORDER BY created_at DESC
-- Query pattern: WHERE created_at >= '2025-10-03'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_created_at_desc
ON reddit_subreddits(created_at DESC)
WHERE review IS NOT NULL OR review IS NULL;

-- Index 4: Categorization with tag filtering (untagged items)
-- Supports: WHERE review = 'Ok' AND (tags IS NULL OR tags = '[]')
-- Query pattern: For showing untagged items in categorization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ok_untagged_subscribers
ON reddit_subreddits(review, subscribers DESC NULLS LAST, id ASC)
WHERE review = 'Ok' AND (tags IS NULL OR tags = '[]');

-- =====================================================
-- Expected Performance Improvements:
-- - Page 1 queries: 100ms → 50ms (2x faster)
-- - Page 10 queries: 1700ms → 100ms (17x faster)
-- - Index creation: ~30 seconds (CONCURRENTLY = zero downtime)
-- - Disk space: ~50MB per index (4 indexes = 200MB total)
-- =====================================================

-- Validation queries to check if indexes are being used:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM reddit_subreddits
-- WHERE review IS NULL
-- ORDER BY subscribers DESC NULLS LAST, id ASC
-- LIMIT 50;
--
-- Expected: "Index Scan using idx_review_subscribers_id"
-- =====================================================
