-- Improved Reddit Scraper Logs Table Structure
-- This migration adds new fields to better track scraper activity

-- Add new columns to existing reddit_scraper_logs table
ALTER TABLE reddit_scraper_logs
ADD COLUMN IF NOT EXISTS request_type VARCHAR(50),  -- 'subreddit', 'user', 'post', 'search'
ADD COLUMN IF NOT EXISTS http_status INTEGER,        -- 200, 404, 403, 429, etc.
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,   -- Response time in milliseconds
ADD COLUMN IF NOT EXISTS url VARCHAR(500),           -- The actual URL requested
ADD COLUMN IF NOT EXISTS subreddit VARCHAR(100),     -- Subreddit name if applicable
ADD COLUMN IF NOT EXISTS username VARCHAR(100),      -- Username if applicable
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT false, -- Was the request successful?
ADD COLUMN IF NOT EXISTS error_type VARCHAR(100),    -- 'rate_limit', 'not_found', 'connection', etc.
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0, -- Number of retries for this request
ADD COLUMN IF NOT EXISTS proxy_used VARCHAR(100),    -- Which proxy was used
ADD COLUMN IF NOT EXISTS account_used VARCHAR(100),  -- Which Reddit account was used
ADD COLUMN IF NOT EXISTS data_collected JSONB,       -- JSON data about what was collected
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);    -- To group requests by scraping session

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_timestamp_desc ON reddit_scraper_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_success ON reddit_scraper_logs(success);
CREATE INDEX IF NOT EXISTS idx_logs_http_status ON reddit_scraper_logs(http_status);
CREATE INDEX IF NOT EXISTS idx_logs_request_type ON reddit_scraper_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_logs_subreddit ON reddit_scraper_logs(subreddit);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON reddit_scraper_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_error_type ON reddit_scraper_logs(error_type);

-- Create a view for easy success rate calculation
CREATE OR REPLACE VIEW reddit_scraper_stats AS
SELECT
    DATE(timestamp) as date,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_requests,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_requests,
    COUNT(CASE WHEN http_status = 429 THEN 1 END) as rate_limited,
    COUNT(CASE WHEN http_status = 403 THEN 1 END) as blocked,
    COUNT(CASE WHEN http_status = 404 THEN 1 END) as not_found,
    COUNT(DISTINCT subreddit) as unique_subreddits,
    COUNT(DISTINCT username) as unique_users,
    AVG(response_time_ms) as avg_response_time_ms,
    MAX(response_time_ms) as max_response_time_ms,
    MIN(response_time_ms) as min_response_time_ms,
    ROUND(COUNT(CASE WHEN success = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as success_rate
FROM reddit_scraper_logs
WHERE url LIKE '%reddit.com%'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Create a view for hourly stats
CREATE OR REPLACE VIEW reddit_scraper_hourly_stats AS
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_requests,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_requests,
    COUNT(CASE WHEN http_status = 429 THEN 1 END) as rate_limited,
    COUNT(CASE WHEN http_status = 403 THEN 1 END) as blocked,
    AVG(response_time_ms) as avg_response_time_ms,
    ROUND(COUNT(CASE WHEN success = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as success_rate
FROM reddit_scraper_logs
WHERE url LIKE '%reddit.com%'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Create a function to clean old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION clean_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM reddit_scraper_logs
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Example of how the new log structure would be used:
-- INSERT INTO reddit_scraper_logs (
--     timestamp, level, message, source, context,
--     request_type, http_status, response_time_ms, url,
--     subreddit, username, success, error_type,
--     retry_count, proxy_used, account_used, data_collected, session_id
-- ) VALUES (
--     NOW(), 'info', 'Successfully fetched subreddit data', 'scraper', '{}',
--     'subreddit', 200, 234, 'https://www.reddit.com/r/example/top.json',
--     'example', NULL, true, NULL,
--     0, 'proxy1.example.com', 'account1', '{"posts": 100, "users": 45}'::jsonb, 'session_123'
-- );