-- Migration: Increase proxy threads from 3 to 5
-- Created: 2025-09-29
-- Purpose: Increase concurrency for Reddit scraper
--
-- Context:
-- Previously each proxy had 3 threads (9 total)
-- Increasing to 5 threads per proxy (15 total)
-- This allows the scraper to process 15 subreddits concurrently

-- Update all active proxies to use 5 threads
UPDATE reddit_proxies
SET max_threads = 5,
    updated_at = NOW()
WHERE is_active = true;

-- Verify the update
SELECT service_name, display_name, max_threads, is_active
FROM reddit_proxies
ORDER BY priority DESC;