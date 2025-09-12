-- Supabase Logging Tables Schema
-- Run this SQL in your Supabase SQL editor to create the new logging tables

-- AI Review Logs - Track all AI review operations
CREATE TABLE IF NOT EXISTS ai_review_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    review_type VARCHAR(50) NOT NULL, -- 'no_seller' or 'unreviewed'
    subreddit_name VARCHAR(255) NOT NULL,
    subreddit_id INTEGER REFERENCES subreddits(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    ai_model VARCHAR(50) DEFAULT 'gpt-4-turbo-preview',
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.00,
    dry_run BOOLEAN DEFAULT FALSE,
    batch_number INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    context JSONB, -- Additional metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorization Logs - Track AI categorization operations
CREATE TABLE IF NOT EXISTS categorization_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    subreddit_name VARCHAR(255) NOT NULL,
    subreddit_id INTEGER REFERENCES subreddits(id),
    category_assigned VARCHAR(100),
    ai_model VARCHAR(50) DEFAULT 'gpt-4-turbo-preview',
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.00,
    confidence_score DECIMAL(3,2), -- AI confidence in classification
    batch_number INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    context JSONB, -- Prompt details, subreddit info, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Discovery Logs - Track user discovery and analysis
CREATE TABLE IF NOT EXISTS user_discovery_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    username VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    source_subreddit VARCHAR(255),
    source_operation VARCHAR(50), -- 'scraper', 'manual_add', 'bulk_import'
    discovered_subreddits INTEGER DEFAULT 0,
    is_creator BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    account_used VARCHAR(50), -- Which Reddit account was used
    proxy_used VARCHAR(100), -- Which proxy was used
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    context JSONB, -- User details, karma, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraper Operation Logs - Track scraping sessions and performance
CREATE TABLE IF NOT EXISTS scraper_operation_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operation_type VARCHAR(50) NOT NULL, -- 'subreddit_analysis', 'user_discovery', 'post_analysis'
    target_name VARCHAR(255) NOT NULL, -- subreddit or username
    account_used VARCHAR(50),
    proxy_used VARCHAR(100),
    requests_made INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    data_points_collected INTEGER DEFAULT 0, -- posts, users, subreddits discovered
    rate_limited BOOLEAN DEFAULT FALSE,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    context JSONB, -- Performance metrics, proxy stats, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- General API Logs - Track all API operations and performance
CREATE TABLE IF NOT EXISTS api_operation_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, etc.
    user_agent TEXT,
    ip_address INET,
    request_body JSONB,
    response_status INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    context JSONB, -- Request headers, response size, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_review_logs_timestamp ON ai_review_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_review_logs_subreddit ON ai_review_logs(subreddit_name);
CREATE INDEX IF NOT EXISTS idx_ai_review_logs_type ON ai_review_logs(review_type);

CREATE INDEX IF NOT EXISTS idx_categorization_logs_timestamp ON categorization_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_categorization_logs_subreddit ON categorization_logs(subreddit_name);

CREATE INDEX IF NOT EXISTS idx_user_discovery_logs_timestamp ON user_discovery_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_discovery_logs_username ON user_discovery_logs(username);

CREATE INDEX IF NOT EXISTS idx_scraper_logs_timestamp ON scraper_operation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_operation ON scraper_operation_logs(operation_type);

CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_operation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_operation_logs(endpoint);

-- Enable Row Level Security (optional - for production security)
-- ALTER TABLE ai_review_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categorization_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_discovery_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scraper_operation_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE api_operation_logs ENABLE ROW LEVEL SECURITY;

-- Create a view for aggregated logging statistics
CREATE OR REPLACE VIEW logging_stats AS
SELECT 
    'ai_review' as log_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    SUM(cost) as total_cost,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MAX(timestamp) as last_entry
FROM ai_review_logs
UNION ALL
SELECT 
    'categorization' as log_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    SUM(cost) as total_cost,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MAX(timestamp) as last_entry
FROM categorization_logs
UNION ALL
SELECT 
    'user_discovery' as log_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    0 as total_cost,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MAX(timestamp) as last_entry
FROM user_discovery_logs
UNION ALL
SELECT 
    'scraper_operations' as log_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    0 as total_cost,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MAX(timestamp) as last_entry
FROM scraper_operation_logs
UNION ALL
SELECT 
    'api_operations' as log_type,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    0 as total_cost,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MAX(timestamp) as last_entry
FROM api_operation_logs;