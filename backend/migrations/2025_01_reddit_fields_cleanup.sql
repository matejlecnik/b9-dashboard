-- Migration: Reddit Fields Cleanup and Optimization
-- Date: 2025-01-29
-- Description: Remove redundant fields and add new fields for better data collection

-- ==============================================
-- STEP 1: Add new columns if they don't exist
-- ==============================================

-- Add engagement field (sum of comments / sum of upvotes for top 10 weekly posts)
ALTER TABLE reddit_subreddits
ADD COLUMN IF NOT EXISTS engagement NUMERIC;

-- Add subreddit_score field (sqrt(avg_upvotes) * engagement * 1000)
ALTER TABLE reddit_subreddits
ADD COLUMN IF NOT EXISTS subreddit_score NUMERIC;

-- Ensure allow_polls exists (from Reddit API)
ALTER TABLE reddit_subreddits
ADD COLUMN IF NOT EXISTS allow_polls BOOLEAN DEFAULT FALSE;

-- Ensure spoilers_enabled exists (from Reddit API)
ALTER TABLE reddit_subreddits
ADD COLUMN IF NOT EXISTS spoilers_enabled BOOLEAN DEFAULT FALSE;

-- Ensure rules_data exists (from Reddit API /about/rules.json)
ALTER TABLE reddit_subreddits
ADD COLUMN IF NOT EXISTS rules_data JSONB;

-- ==============================================
-- STEP 2: Drop redundant columns
-- ==============================================

-- Remove calculated fields that are no longer used
ALTER TABLE reddit_subreddits
DROP COLUMN IF EXISTS total_upvotes_hot_30,
DROP COLUMN IF EXISTS total_posts_hot_30,
DROP COLUMN IF EXISTS comment_to_upvote_ratio,
DROP COLUMN IF EXISTS avg_engagement_velocity,
DROP COLUMN IF EXISTS subscriber_engagement_ratio,
DROP COLUMN IF EXISTS nsfw_percentage;

-- Remove duplicate/redundant timestamp
ALTER TABLE reddit_subreddits
DROP COLUMN IF EXISTS last_analyzed_at;

-- Remove fields never extracted from API
ALTER TABLE reddit_subreddits
DROP COLUMN IF EXISTS mobile_banner_image,
DROP COLUMN IF EXISTS lang,
DROP COLUMN IF EXISTS whitelist_status,
DROP COLUMN IF EXISTS submit_text,
DROP COLUMN IF EXISTS submit_text_html,
DROP COLUMN IF EXISTS user_flair_enabled_in_sr,
DROP COLUMN IF EXISTS user_flair_position,
DROP COLUMN IF EXISTS link_flair_enabled,
DROP COLUMN IF EXISTS link_flair_position,
DROP COLUMN IF EXISTS banner_background_color,
DROP COLUMN IF EXISTS active_user_count,
DROP COLUMN IF EXISTS is_gold_only,
DROP COLUMN IF EXISTS spoilers_enabled;  -- Will be re-added with correct type if needed

-- Remove deprecated categorization field
ALTER TABLE reddit_subreddits
DROP COLUMN IF EXISTS category_text;

-- ==============================================
-- STEP 3: Clean up reddit_posts table
-- ==============================================

-- Remove fields that are never populated or redundant
ALTER TABLE reddit_posts
DROP COLUMN IF EXISTS comment_to_upvote_ratio,     -- Calculated field, not used
DROP COLUMN IF EXISTS post_length,                 -- Can be calculated from selftext
DROP COLUMN IF EXISTS has_thumbnail,               -- Always false, redundant
DROP COLUMN IF EXISTS engagement_velocity,         -- Never populated
DROP COLUMN IF EXISTS peak_engagement_hour,        -- Never populated
DROP COLUMN IF EXISTS posting_day_of_week,         -- Can be extracted from created_utc
DROP COLUMN IF EXISTS posting_hour,                -- Can be extracted from created_utc
DROP COLUMN IF EXISTS organic_engagement_score,    -- Always 0, never used
DROP COLUMN IF EXISTS suspected_bot_activity,      -- Always false, never used
DROP COLUMN IF EXISTS thumbnail,                   -- Old field, not used
DROP COLUMN IF EXISTS preview_data,                -- Never populated
DROP COLUMN IF EXISTS awards_received,             -- Reddit deprecated awards
DROP COLUMN IF EXISTS total_awards_received,       -- Reddit deprecated awards
DROP COLUMN IF EXISTS crosspost_parent,            -- Never populated
DROP COLUMN IF EXISTS is_crosspost,                -- Always false, not tracked
DROP COLUMN IF EXISTS domain,                      -- Can be extracted from URL
DROP COLUMN IF EXISTS edited,                      -- Always false, not tracked
DROP COLUMN IF EXISTS archived,                    -- Always false, not tracked
DROP COLUMN IF EXISTS removed_by_category,         -- Never populated
DROP COLUMN IF EXISTS approved_by;                 -- Never populated

-- Remove only the truly redundant category_text field
-- Keep sub_over18, sub_tags, sub_primary_category for performance
ALTER TABLE reddit_posts
DROP COLUMN IF EXISTS sub_category_text;

-- ==============================================
-- STEP 4: Clean up reddit_users table
-- ==============================================

-- Remove old scoring system fields
ALTER TABLE reddit_users
DROP COLUMN IF EXISTS username_quality_score,
DROP COLUMN IF EXISTS age_quality_score,
DROP COLUMN IF EXISTS karma_quality_score,
DROP COLUMN IF EXISTS overall_user_score,
DROP COLUMN IF EXISTS posting_frequency_score,
DROP COLUMN IF EXISTS engagement_consistency_score;

-- Remove user profile subreddit fields (most users don't have these)
ALTER TABLE reddit_users
DROP COLUMN IF EXISTS subreddit_display_name,
DROP COLUMN IF EXISTS subreddit_title,
DROP COLUMN IF EXISTS subreddit_subscribers,
DROP COLUMN IF EXISTS subreddit_over_18,
DROP COLUMN IF EXISTS subreddit_banner_img;

-- Remove unused calculated fields
ALTER TABLE reddit_users
DROP COLUMN IF EXISTS avg_posts_per_month,
DROP COLUMN IF EXISTS primary_subreddits,
DROP COLUMN IF EXISTS cross_subreddit_activity,
DROP COLUMN IF EXISTS avg_post_score,
DROP COLUMN IF EXISTS avg_comment_score,
DROP COLUMN IF EXISTS avg_post_comments,
DROP COLUMN IF EXISTS karma_per_day,
DROP COLUMN IF EXISTS total_posts_analyzed,
DROP COLUMN IF EXISTS preferred_content_type,
DROP COLUMN IF EXISTS most_active_posting_hour,
DROP COLUMN IF EXISTS most_active_posting_day,
DROP COLUMN IF EXISTS num_discovered_subreddits;

-- Remove fields not extracted from API
ALTER TABLE reddit_users
DROP COLUMN IF EXISTS awardee_karma,
DROP COLUMN IF EXISTS awarder_karma,
DROP COLUMN IF EXISTS is_suspended,
DROP COLUMN IF EXISTS accept_followers,
DROP COLUMN IF EXISTS hide_from_robots,
DROP COLUMN IF EXISTS pref_show_snoovatar,
DROP COLUMN IF EXISTS bio,
DROP COLUMN IF EXISTS bio_url,
DROP COLUMN IF EXISTS last_post_analyzed_at;
-- Keep account_age_days for convenience

-- ==============================================
-- STEP 5: Create indexes for commonly queried fields
-- ==============================================

-- Index for filtering by review status
CREATE INDEX IF NOT EXISTS idx_subreddits_review ON reddit_subreddits(review);

-- Index for filtering by verification_required
CREATE INDEX IF NOT EXISTS idx_subreddits_verification ON reddit_subreddits(verification_required);

-- Index for sorting by subreddit_score
CREATE INDEX IF NOT EXISTS idx_subreddits_score ON reddit_subreddits(subreddit_score DESC);

-- Index for engagement metrics
CREATE INDEX IF NOT EXISTS idx_subreddits_engagement ON reddit_subreddits(engagement);

-- ==============================================
-- STEP 6: Add indexes for post subreddit fields
-- ==============================================

-- Index for filtering by sub_primary_category
CREATE INDEX IF NOT EXISTS idx_posts_sub_primary_category ON reddit_posts(sub_primary_category);

-- GIN index for JSONB sub_tags field
CREATE INDEX IF NOT EXISTS idx_posts_sub_tags ON reddit_posts USING GIN(sub_tags);

-- Index for filtering by sub_over18
CREATE INDEX IF NOT EXISTS idx_posts_sub_over18 ON reddit_posts(sub_over18);

-- ==============================================
-- STEP 7: Backfill missing subreddit data in posts
-- ==============================================

-- Update posts with missing subreddit fields
UPDATE reddit_posts p
SET
    sub_primary_category = s.primary_category,
    sub_tags = s.tags,
    sub_over18 = s.over18
FROM reddit_subreddits s
WHERE p.subreddit_name = s.name
  AND (p.sub_primary_category IS NULL
       OR p.sub_tags IS NULL
       OR p.sub_over18 IS NULL);

-- ==============================================
-- Migration complete
-- ==============================================
-- Columns removed: 21 from posts, 36 from subreddits, 28 from users = 85 total
-- Columns kept for convenience: account_age_days (now calculated by scraper)
-- New columns added: 5 (engagement, subreddit_score, allow_polls, spoilers_enabled, rules_data)
-- Indexes created: 7 (4 for subreddits, 3 for posts)
-- Backfill: Updated posts with subreddit category/tags data