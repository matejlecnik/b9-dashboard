-- ============================================================================
-- VIRAL POSTS RPC FUNCTION
-- Ultra-optimized function to fetch viral posts from Ok subreddits only
-- Processes everything server-side for maximum performance
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_viral_posts(INT, INT, INT);

-- Create the optimized viral posts function
CREATE OR REPLACE FUNCTION get_viral_posts(
  time_range_hours INT DEFAULT 72,
  posts_per_subreddit INT DEFAULT 3,
  total_limit INT DEFAULT 500
)
RETURNS TABLE (
  id BIGINT,
  reddit_id TEXT,
  title TEXT,
  score INT,
  num_comments INT,
  created_utc TIMESTAMPTZ,
  subreddit_name TEXT,
  content_type TEXT,
  upvote_ratio FLOAT,
  thumbnail TEXT,
  url TEXT,
  author_username TEXT,
  preview_data JSONB,
  domain TEXT,
  is_video BOOLEAN,
  is_self BOOLEAN,
  over_18 BOOLEAN,
  sub_primary_category TEXT,
  sub_over18 BOOLEAN,
  post_type TEXT,
  viral_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_time TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff time
  cutoff_time := NOW() - (time_range_hours || ' hours')::INTERVAL;

  RETURN QUERY
  WITH ok_subreddits AS (
    -- First, get only subreddits with 'Ok' review status
    SELECT rs.name, rs.over18, rs.primary_category
    FROM reddit_subreddits rs
    WHERE rs.review = 'Ok'
  ),
  ranked_posts AS (
    -- Get posts from Ok subreddits within time range
    SELECT
      p.id,
      p.reddit_id,
      p.title,
      p.score,
      p.num_comments,
      p.created_utc,
      p.subreddit_name,
      p.content_type,
      p.upvote_ratio,
      p.thumbnail,
      p.url,
      p.author_username,
      p.preview_data,
      p.domain,
      p.is_video,
      p.is_self,
      p.over_18,
      os.primary_category AS sub_primary_category,
      os.over18 AS sub_over18,
      p.post_type,
      -- Calculate viral score with increased engagement and SFW weights
      (
        -- Normalized score (40% weight, down from 50%)
        LEAST(10, p.score::FLOAT / 100) * 0.4 +
        -- Engagement rate (40% weight, up from 30%)
        LEAST(10, (p.num_comments::FLOAT / GREATEST(1, p.score)) * 100) * 0.4 +
        -- Velocity (10% weight, down from 15%)
        LEAST(10, p.score::FLOAT / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - p.created_utc)) / 3600)) * 0.1 +
        -- Recency (5% weight, same)
        GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - p.created_utc)) / (time_range_hours * 3600))) * 0.05
      ) *
      -- SFW boost (10% for SFW content, up from 5%)
      CASE
        WHEN p.over_18 = false AND os.over18 = false THEN 1.1
        ELSE 1.0
      END AS viral_score,
      -- Rank posts within each subreddit
      ROW_NUMBER() OVER (
        PARTITION BY p.subreddit_name
        ORDER BY p.score DESC
      ) AS subreddit_rank
    FROM reddit_posts p
    INNER JOIN ok_subreddits os ON p.subreddit_name = os.name
    WHERE
      p.created_utc >= cutoff_time
      AND p.score > 0
  ),
  top_posts_per_subreddit AS (
    -- Select only top N posts per subreddit
    SELECT *
    FROM ranked_posts
    WHERE subreddit_rank <= posts_per_subreddit
  )
  -- Final selection with spacing algorithm handled client-side for flexibility
  SELECT
    tp.id,
    tp.reddit_id,
    tp.title,
    tp.score,
    tp.num_comments,
    tp.created_utc,
    tp.subreddit_name,
    tp.content_type,
    tp.upvote_ratio,
    tp.thumbnail,
    tp.url,
    tp.author_username,
    tp.preview_data,
    tp.domain,
    tp.is_video,
    tp.is_self,
    tp.over_18,
    tp.sub_primary_category,
    tp.sub_over18,
    tp.post_type,
    tp.viral_score
  FROM top_posts_per_subreddit tp
  ORDER BY tp.viral_score DESC
  LIMIT total_limit;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_viral_posts(INT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_viral_posts(INT, INT, INT) TO authenticated;

-- ============================================================================
-- PERFORMANCE INDEXES FOR VIRAL POSTS QUERY
-- ============================================================================

-- Composite index for efficient viral posts query
CREATE INDEX IF NOT EXISTS idx_posts_viral_query
ON reddit_posts(created_utc DESC, score DESC)
WHERE score > 0;

-- Index for joining with subreddit names
CREATE INDEX IF NOT EXISTS idx_posts_subreddit_created
ON reddit_posts(subreddit_name, created_utc DESC);

-- Index for Ok subreddits filtering
CREATE INDEX IF NOT EXISTS idx_subreddits_review_ok
ON reddit_subreddits(name)
WHERE review = 'Ok';

-- Analyze tables to update statistics
ANALYZE reddit_posts;
ANALYZE reddit_subreddits;

-- ============================================================================
-- VERIFICATION QUERY
-- Test the function to ensure it works correctly
-- ============================================================================
-- SELECT * FROM get_viral_posts(72, 3, 100);