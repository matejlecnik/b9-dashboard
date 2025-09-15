-- Create scraper_control table for controlling the scraper
CREATE TABLE IF NOT EXISTS scraper_control (
    id INTEGER PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT FALSE,
    batch_size INTEGER DEFAULT 10,
    delay_between_batches INTEGER DEFAULT 30,
    max_daily_requests INTEGER DEFAULT 10000,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT DEFAULT 'system',
    CONSTRAINT single_row CHECK (id = 1)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_scraper_control_enabled ON scraper_control(enabled);

-- Insert default record
INSERT INTO scraper_control (id, enabled, batch_size, delay_between_batches, max_daily_requests)
VALUES (1, FALSE, 10, 30, 10000)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (adjust based on your Supabase setup)
GRANT SELECT, UPDATE ON scraper_control TO authenticated;
GRANT SELECT, UPDATE ON scraper_control TO service_role;