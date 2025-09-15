-- Fix Logging Tables and Remove Redundancy
-- This script optimizes the reddit_scraper_logs table and removes redundant tables

-- 1. Add indexes to reddit_scraper_logs for better performance
CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_timestamp
ON reddit_scraper_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_source
ON reddit_scraper_logs(source);

CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_level
ON reddit_scraper_logs(level);

CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_source_timestamp
ON reddit_scraper_logs(source, timestamp DESC);

-- Composite index for the monitor page query
CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_monitor
ON reddit_scraper_logs(source, timestamp DESC)
WHERE source IN ('scraper', 'scraper_operation', 'continuous_scraper', 'api_control');

-- 2. Clean up old logs (keep last 30 days)
DELETE FROM reddit_scraper_logs
WHERE timestamp < NOW() - INTERVAL '30 days';

-- 3. Migrate any important data from reddit_categorization_logs to main table
-- First, check if there's any recent data worth keeping
INSERT INTO reddit_scraper_logs (timestamp, level, message, source, context)
SELECT
    timestamp,
    CASE WHEN success THEN 'success' ELSE 'error' END as level,
    'Categorized r/' || subreddit_name || ' as ' || category_assigned as message,
    'categorization' as source,
    jsonb_build_object(
        'subreddit', subreddit_name,
        'category', category_assigned,
        'success', success
    ) as context
FROM reddit_categorization_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
ON CONFLICT DO NOTHING;

-- 4. Add a partial index for categorization logs
CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_categorization
ON reddit_scraper_logs(timestamp DESC)
WHERE source = 'categorization';

-- 5. Add a partial index for user tracking logs
CREATE INDEX IF NOT EXISTS idx_reddit_scraper_logs_user_tracking
ON reddit_scraper_logs(timestamp DESC)
WHERE source = 'user_tracking';

-- 6. Analyze the table to update statistics for query planner
ANALYZE reddit_scraper_logs;

-- 7. Drop the redundant table (uncomment when ready)
-- DROP TABLE IF EXISTS reddit_categorization_logs;

-- 8. Show table statistics
SELECT
    'reddit_scraper_logs' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT source) as unique_sources,
    MIN(timestamp) as oldest_log,
    MAX(timestamp) as newest_log,
    pg_size_pretty(pg_total_relation_size('reddit_scraper_logs')) as table_size
FROM reddit_scraper_logs;