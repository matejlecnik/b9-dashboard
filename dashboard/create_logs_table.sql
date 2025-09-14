-- Create scraper_logs table for real-time log streaming
CREATE TABLE IF NOT EXISTS scraper_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(20) DEFAULT 'info',
    message TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'scraper',
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_scraper_logs_timestamp ON scraper_logs(timestamp DESC);
CREATE INDEX idx_scraper_logs_level ON scraper_logs(level);
CREATE INDEX idx_scraper_logs_source ON scraper_logs(source);

-- Enable RLS
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading logs (anyone can read)
CREATE POLICY "Enable read access for all users" ON scraper_logs
    FOR SELECT USING (true);

-- Create policy for inserting logs (service role only)
CREATE POLICY "Enable insert for service role" ON scraper_logs
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE scraper_logs;

-- Add some sample logs for testing
INSERT INTO scraper_logs (level, message, source, context) VALUES
    ('success', 'Reddit scraper started - 5 accounts active, 3 proxies configured', 'scraper', '{"accounts": 5, "proxies": 3}'::jsonb),
    ('info', 'Starting scrape of r/technology', 'scraper', '{"subreddit": "technology"}'::jsonb),
    ('success', 'Successfully collected 45 posts from r/technology', 'scraper', '{"subreddit": "technology", "posts_collected": 45}'::jsonb),
    ('warning', 'Rate limit hit - waiting 60 seconds', 'scraper', '{"wait_time": 60}'::jsonb),
    ('error', 'Failed to scrape r/private_sub: Subreddit is private', 'scraper', '{"subreddit": "private_sub", "error": "403 Forbidden"}'::jsonb);