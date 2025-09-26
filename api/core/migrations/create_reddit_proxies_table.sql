-- Create reddit_proxies table for dynamic proxy management
-- This table stores proxy configurations that the scraper will load dynamically

CREATE TABLE IF NOT EXISTS reddit_proxies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name VARCHAR(100) UNIQUE NOT NULL,
  proxy_url VARCHAR(255) NOT NULL,  -- Proxy URL without authentication
  proxy_username VARCHAR(100),      -- Username for proxy authentication
  proxy_password VARCHAR(100),      -- Password for proxy authentication (should be encrypted in production)
  display_name VARCHAR(100),         -- Display name for logging (e.g., "BeyondProxy")
  is_active BOOLEAN DEFAULT true,   -- Enable/disable proxy without deleting
  max_threads INTEGER DEFAULT 3,    -- Number of threads to spawn for this proxy
  priority INTEGER DEFAULT 100,     -- Higher priority = preferred for load balancing

  -- Statistics tracking
  success_count INTEGER DEFAULT 0,  -- Successful requests through this proxy
  error_count INTEGER DEFAULT 0,    -- Failed requests through this proxy
  total_requests INTEGER DEFAULT 0, -- Total requests attempted
  avg_response_time_ms INTEGER,     -- Average response time in milliseconds

  -- Error tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  last_error_message TEXT,
  consecutive_errors INTEGER DEFAULT 0,  -- Reset on success

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active proxy queries
CREATE INDEX idx_reddit_proxies_active ON reddit_proxies(is_active, priority DESC);

-- Create index for statistics queries
CREATE INDEX idx_reddit_proxies_stats ON reddit_proxies(success_count, error_count);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reddit_proxies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER reddit_proxies_updated_at
BEFORE UPDATE ON reddit_proxies
FOR EACH ROW
EXECUTE FUNCTION update_reddit_proxies_updated_at();

-- Create function to calculate success rate
CREATE OR REPLACE FUNCTION calculate_proxy_success_rate(p_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  success_rate DECIMAL;
BEGIN
  SELECT
    CASE
      WHEN total_requests = 0 THEN 0
      ELSE (success_count::DECIMAL / total_requests::DECIMAL) * 100
    END INTO success_rate
  FROM reddit_proxies
  WHERE id = p_id;

  RETURN COALESCE(success_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Insert initial proxy configurations
-- Note: Replace these with actual credentials from environment variables
INSERT INTO reddit_proxies (
  service_name,
  proxy_url,
  proxy_username,
  proxy_password,
  display_name,
  max_threads,
  priority
) VALUES
  (
    'beyondproxy',
    'proxy.beyondproxy.io:12321',
    '9b1a4c15700a',  -- Move to environment variable
    '654fa0b97850',  -- Move to environment variable
    'BeyondProxy',
    3,
    100
  ),
  (
    'nyronproxy',
    'residential-ww.nyronproxies.com:16666',
    'uxJNWsLXw3XnJE-zone-resi',  -- Move to environment variable
    'cjB3tG2ij',                   -- Move to environment variable
    'NyronProxy',
    3,
    100
  ),
  (
    'rapidproxy',
    'eu.rapidproxy.io:5001',
    'admin123-residential-GLOBAL',  -- Move to environment variable
    'admin123',                      -- Move to environment variable
    'RapidProxy',
    3,
    100
  )
ON CONFLICT (service_name) DO UPDATE
SET
  proxy_url = EXCLUDED.proxy_url,
  display_name = EXCLUDED.display_name,
  max_threads = EXCLUDED.max_threads,
  updated_at = NOW();

-- Create view for active proxy summary
CREATE OR REPLACE VIEW active_proxy_summary AS
SELECT
  service_name,
  display_name,
  max_threads,
  priority,
  CASE
    WHEN total_requests = 0 THEN 0
    ELSE ROUND((success_count::DECIMAL / total_requests::DECIMAL) * 100, 2)
  END as success_rate,
  total_requests,
  last_used_at,
  last_error_at,
  consecutive_errors
FROM reddit_proxies
WHERE is_active = true
ORDER BY priority DESC, success_rate DESC;