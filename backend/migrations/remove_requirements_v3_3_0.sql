-- Migration: Remove requirements columns (v3.3.0)
-- Date: 2025-09-30
-- Reason: Requirements calculation removed, username-only user tracking

-- Drop requirements columns from reddit_subreddits
ALTER TABLE reddit_subreddits
DROP COLUMN IF EXISTS min_account_age_days,
DROP COLUMN IF EXISTS min_comment_karma,
DROP COLUMN IF EXISTS min_post_karma;

-- Verification query (run after migration)
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'reddit_subreddits'
-- AND column_name LIKE 'min_%';
-- (Should return 0 rows)
