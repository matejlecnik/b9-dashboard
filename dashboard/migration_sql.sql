-- ============================================
-- MIGRATION SCRIPT: Single Supabase with Namespaced Tables
-- ============================================
-- This script renames existing tables to use reddit_ prefix
-- and creates new Instagram tables for the unified dashboard

-- ============================================
-- STEP 1: Rename existing Reddit tables
-- ============================================

-- Rename main tables
ALTER TABLE IF EXISTS subreddits RENAME TO reddit_subreddits;
ALTER TABLE IF EXISTS posts RENAME TO reddit_posts;
ALTER TABLE IF EXISTS users RENAME TO reddit_users;
ALTER TABLE IF EXISTS categories RENAME TO reddit_categories;
ALTER TABLE IF EXISTS filters RENAME TO reddit_filters;
ALTER TABLE IF EXISTS scraper_logs RENAME TO reddit_scraper_logs;

-- ============================================
-- STEP 2: Update foreign key constraints
-- ============================================

-- You may need to update foreign key constraints after renaming
-- Check existing constraints with:
-- SELECT conname FROM pg_constraint WHERE contype = 'f';

-- ============================================
-- STEP 3: Create Instagram tables
-- ============================================

-- Instagram accounts table
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL,
  is_verified BOOLEAN DEFAULT false,
  is_business BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Instagram posts table
CREATE TABLE IF NOT EXISTS instagram_posts (
  id SERIAL PRIMARY KEY,
  instagram_id TEXT UNIQUE NOT NULL,
  account_id INTEGER REFERENCES instagram_accounts(id),
  caption TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  post_type TEXT, -- 'photo', 'video', 'reel', 'carousel'
  posted_at TIMESTAMP,
  hashtags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Instagram stories table
CREATE TABLE IF NOT EXISTS instagram_stories (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES instagram_accounts(id),
  story_id TEXT UNIQUE NOT NULL,
  views_count INTEGER,
  replies_count INTEGER,
  posted_at TIMESTAMP,
  expired_at TIMESTAMP
);

-- ============================================
-- STEP 4: Create shared tables
-- ============================================

-- Team members table (for authentication across all dashboards)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Platform metrics table (for cross-platform analytics)
CREATE TABLE IF NOT EXISTS platform_metrics (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================

-- Reddit indexes
CREATE INDEX IF NOT EXISTS idx_reddit_posts_author ON reddit_posts(author_username);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON reddit_posts(subreddit_name);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_created ON reddit_posts(created_utc);
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_review ON reddit_subreddits(review);
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_category ON reddit_subreddits(category_text);

-- Instagram indexes
CREATE INDEX IF NOT EXISTS idx_instagram_posts_account ON instagram_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_posted ON instagram_posts(posted_at);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_username ON instagram_accounts(username);

-- ============================================
-- STEP 6: Update RLS policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- Create basic read policies (adjust as needed)
CREATE POLICY "Enable read access for all users" ON instagram_accounts
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON instagram_posts
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON instagram_stories
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON team_members
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON platform_metrics
  FOR SELECT USING (true);

-- ============================================
-- STEP 7: Grant permissions
-- ============================================

-- Grant usage on all tables to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this script:
-- 1. Update your application code to use reddit_ prefixed tables
-- 2. Test all Reddit dashboard functionality
-- 3. Begin implementing Instagram dashboard features