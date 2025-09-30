-- Migration: v3.4.0 - Reduce Proxy Threads to 1 per proxy
-- Date: 2025-09-30
-- Purpose: Performance optimization - reduce concurrent threads to prevent rate limiting

-- Update all active proxy configurations to use 1 thread each
UPDATE reddit_proxies
SET max_threads = 1,
    updated_at = NOW()
WHERE is_active = true;

-- Update system control config to reflect thread reduction
UPDATE system_control
SET config = jsonb_set(
    COALESCE(config, '{}')::jsonb,
    '{max_threads}',
    '1'
),
updated_at = NOW()
WHERE script_name = 'reddit_scraper';

-- Verify the changes
SELECT id, display_name, max_threads, is_active, updated_at
FROM reddit_proxies
WHERE is_active = true
ORDER BY priority DESC;

-- Expected result: All active proxies should have max_threads = 1