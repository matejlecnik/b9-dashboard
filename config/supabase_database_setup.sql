-- =====================================================
-- REDDIT SCRAPER DATABASE SETUP FOR SUPABASE
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Project: Reddit (OnlyFans Agency Scraper)

-- =====================================================
-- 1. SUBREDDITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subreddits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name_prefixed VARCHAR(255),
    title TEXT,
    public_description TEXT,
    description TEXT,
    rules TEXT, -- Subreddit rules and posting guidelines
    subscribers INTEGER,
    accounts_active INTEGER,
    created_utc TIMESTAMP,
    over18 BOOLEAN DEFAULT FALSE,
    allow_images BOOLEAN DEFAULT TRUE,
    allow_videos BOOLEAN DEFAULT TRUE,
    allow_polls BOOLEAN DEFAULT TRUE,
    subreddit_type VARCHAR(50),
    
    -- Dashboard management & icons
    category TEXT,
    icon_img TEXT,
    community_icon TEXT,
    
    -- Engagement Metrics
    total_upvotes_last_30 INTEGER DEFAULT 0,
    total_posts_last_30 INTEGER DEFAULT 0,
    avg_upvotes_per_post DECIMAL(10,2) DEFAULT 0,
    avg_comments_per_post DECIMAL(10,2) DEFAULT 0,
    subscriber_engagement_ratio DECIMAL(10,4) DEFAULT 0, -- active engagement vs subscribers
    comment_to_upvote_ratio DECIMAL(10,6) DEFAULT 0,
    
    -- Content Analysis
    best_posting_day VARCHAR(20), -- Monday, Tuesday, etc.
    best_posting_hour INTEGER, -- 0-23
    top_content_type VARCHAR(50), -- image, video, text, link, gallery
    image_post_avg_score DECIMAL(10,2) DEFAULT 0,
    video_post_avg_score DECIMAL(10,2) DEFAULT 0,
    text_post_avg_score DECIMAL(10,2) DEFAULT 0,
    link_post_avg_score DECIMAL(10,2) DEFAULT 0,
    
    -- Quality Indicators
    avg_engagement_velocity DECIMAL(10,4) DEFAULT 0, -- avg upvotes per hour
    moderator_activity_score DECIMAL(5,2) DEFAULT 0,
    community_health_score DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    last_scraped_at TIMESTAMP DEFAULT NOW(),
    last_analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MIGRATION: Add rules field to existing tables
-- =====================================================
-- If you already have the subreddits table, run this to add the rules field:
-- ALTER TABLE subreddits ADD COLUMN IF NOT EXISTS rules TEXT;

-- =====================================================
-- 2. USERS TABLE  
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    reddit_id VARCHAR(50),
    
    -- Basic Reddit Info
    created_utc TIMESTAMP,
    account_age_days INTEGER,
    comment_karma INTEGER DEFAULT 0,
    link_karma INTEGER DEFAULT 0,
    total_karma INTEGER DEFAULT 0,
    awardee_karma INTEGER DEFAULT 0,
    awarder_karma INTEGER DEFAULT 0,
    
    -- Account Status Flags
    is_employee BOOLEAN DEFAULT FALSE,
    is_mod BOOLEAN DEFAULT FALSE,
    is_gold BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    has_verified_email BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    
    -- Calculated Quality Scores (0-10 scale)
    username_quality_score DECIMAL(5,2) DEFAULT 0, -- based on length, patterns
    age_quality_score DECIMAL(5,2) DEFAULT 0, -- sweet spot 1-3 years
    karma_quality_score DECIMAL(5,2) DEFAULT 0, -- balanced comment/post ratio
    overall_user_score DECIMAL(5,2) DEFAULT 0, -- weighted combination
    
    -- Activity Patterns
    avg_posts_per_month DECIMAL(8,2) DEFAULT 0,
    primary_subreddits TEXT[], -- array of main subreddits they post to
    posting_frequency_score DECIMAL(5,2) DEFAULT 0, -- consistency metric
    cross_subreddit_activity INTEGER DEFAULT 0, -- number of different subreddits
    
    -- Engagement Patterns
    avg_post_score DECIMAL(8,2) DEFAULT 0,
    avg_comment_score DECIMAL(8,2) DEFAULT 0,
    engagement_consistency_score DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    last_scraped_at TIMESTAMP DEFAULT NOW(),
    last_post_analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    reddit_id VARCHAR(50) UNIQUE NOT NULL,
    title TEXT,
    selftext TEXT,
    url TEXT,
    
    -- Author & Subreddit
    author_username VARCHAR(255),
    subreddit_name VARCHAR(255),
    
    -- Basic Engagement Data
    score INTEGER DEFAULT 0,
    upvote_ratio DECIMAL(5,4),
    num_comments INTEGER DEFAULT 0,
    comment_to_upvote_ratio DECIMAL(10,6),
    
    -- Post Metadata
    created_utc TIMESTAMP,
    is_self BOOLEAN DEFAULT FALSE,
    is_video BOOLEAN DEFAULT FALSE,
    over_18 BOOLEAN DEFAULT FALSE,
    spoiler BOOLEAN DEFAULT FALSE,
    stickied BOOLEAN DEFAULT FALSE,
    locked BOOLEAN DEFAULT FALSE,
    gilded INTEGER DEFAULT 0,
    distinguished VARCHAR(50), -- moderator, admin, etc.
    
    -- Content Analysis
    content_type VARCHAR(50), -- image, video, text, link, gallery
    post_length INTEGER, -- character count for text posts
    has_thumbnail BOOLEAN DEFAULT FALSE,
    
    -- Performance Tracking
    engagement_velocity DECIMAL(10,4), -- upvotes per hour in first 24h
    peak_engagement_hour INTEGER, -- hour when most engagement occurred
    posting_day_of_week VARCHAR(20), -- Monday, Tuesday, etc.
    posting_hour INTEGER, -- 0-23
    
    -- Quality Indicators
    organic_engagement_score DECIMAL(5,2) DEFAULT 0, -- calculated quality metric
    suspected_bot_activity BOOLEAN DEFAULT FALSE,
    
    -- Foreign Key Relationships
    FOREIGN KEY (author_username) REFERENCES users(username) ON DELETE SET NULL,
    FOREIGN KEY (subreddit_name) REFERENCES subreddits(name) ON DELETE CASCADE,
    
    -- Timestamps
    scraped_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);


-- =====================================================
-- 5. ENGAGEMENT ANALYTICS TABLE (for trend tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS engagement_analytics (
    id SERIAL PRIMARY KEY,
    subreddit_name VARCHAR(255) NOT NULL,
    analysis_date DATE NOT NULL,
    
    -- Daily Metrics
    total_posts INTEGER DEFAULT 0,
    total_upvotes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    avg_score DECIMAL(8,2) DEFAULT 0,
    avg_comments DECIMAL(8,2) DEFAULT 0,
    
    -- Content Type Breakdown
    image_posts INTEGER DEFAULT 0,
    video_posts INTEGER DEFAULT 0,
    text_posts INTEGER DEFAULT 0,
    link_posts INTEGER DEFAULT 0,
    
    -- Time Analysis
    peak_activity_hour INTEGER,
    activity_distribution JSONB, -- hourly activity breakdown
    
    -- Quality Metrics
    avg_engagement_velocity DECIMAL(10,4) DEFAULT 0,
    suspected_bot_posts INTEGER DEFAULT 0,
    high_quality_posts INTEGER DEFAULT 0,
    
    UNIQUE(subreddit_name, analysis_date),
    FOREIGN KEY (subreddit_name) REFERENCES subreddits(name) ON DELETE CASCADE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================
-- Subreddits indexes
CREATE INDEX IF NOT EXISTS idx_subreddits_name ON subreddits(name);
CREATE INDEX IF NOT EXISTS idx_subreddits_last_scraped ON subreddits(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_subreddits_engagement_ratio ON subreddits(subscriber_engagement_ratio);
CREATE INDEX IF NOT EXISTS idx_subreddits_category ON subreddits(category);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_overall_score ON users(overall_user_score);
CREATE INDEX IF NOT EXISTS idx_users_last_scraped ON users(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_users_account_age ON users(account_age_days);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_reddit_id ON posts(reddit_id);
CREATE INDEX IF NOT EXISTS idx_posts_subreddit ON posts(subreddit_name);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_username);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_utc);
CREATE INDEX IF NOT EXISTS idx_posts_score ON posts(score);
CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type);
CREATE INDEX IF NOT EXISTS idx_posts_posting_hour ON posts(posting_hour);


-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_subreddit_date ON engagement_analytics(subreddit_name, analysis_date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON engagement_analytics(analysis_date);

-- =====================================================
-- 7. SEED DATA
-- =====================================================
-- Insert initial target subreddit
INSERT INTO subreddits (name, display_name_prefixed) 
VALUES ('SFWAmIHot', 'r/SFWAmIHot') 
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. FUNCTIONS FOR AUTOMATIC UPDATES
-- =====================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_subreddits_updated_at BEFORE UPDATE ON subreddits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. VIEWS FOR COMMON QUERIES
-- =====================================================
-- View for high-quality subreddits
CREATE OR REPLACE VIEW high_quality_subreddits AS
SELECT 
    name,
    subscribers,
    subscriber_engagement_ratio,
    avg_upvotes_per_post,
    comment_to_upvote_ratio,
    community_health_score,
    best_posting_day,
    best_posting_hour,
    top_content_type
FROM subreddits 
WHERE subscriber_engagement_ratio > 0.01 
  AND community_health_score > 6.0
ORDER BY subscriber_engagement_ratio DESC, community_health_score DESC;

-- View for high-quality users
CREATE OR REPLACE VIEW high_quality_users AS
SELECT 
    username,
    account_age_days,
    total_karma,
    overall_user_score,
    username_quality_score,
    age_quality_score,
    karma_quality_score,
    avg_post_score,
    cross_subreddit_activity
FROM users 
WHERE overall_user_score > 7.0 
  AND account_age_days BETWEEN 365 AND 1095
ORDER BY overall_user_score DESC;


-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- ✅ subreddits - Main subreddit data and engagement metrics
-- ✅ users - User profiles and quality scoring
-- ✅ posts - Individual post analysis and performance
-- ✅ engagement_analytics - Daily trend tracking
-- ✅ Indexes for performance optimization
-- ✅ Seed data with SFWAmIHot subreddit
-- ✅ Automatic timestamp updates
-- ✅ Helpful views for common queries

-- Next steps:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Verify all tables were created successfully
-- 3. Run the reddit_agency_scraper.py script
-- 4. Monitor the data collection and engagement analysis
