-- ============================================================================
-- PAGINATED VIRAL POSTS RPC FUNCTION
-- Handles up to 10,000 posts by supporting pagination
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_viral_posts_paginated(INT, INT, INT, INT, INT);

-- Create the paginated viral posts function
CREATE OR REPLACE FUNCTION get_viral_posts_paginated(
  time_range_hours INT DEFAULT 72,
  posts_per_subreddit INT DEFAULT 3,
  page_limit INT DEFAULT 1000,
  page_offset INT DEFAULT 0,
  total_limit INT DEFAULT 10000
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
  viral_score FLOAT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_time TIMESTAMPTZ;
  actual_limit INT;
BEGIN
  -- Calculate cutoff time
  cutoff_time := NOW() - (time_range_hours || ' hours')::INTERVAL;

  -- Calculate actual limit (minimum of page_limit and remaining posts)
  actual_limit := LEAST(page_limit, total_limit - page_offset);

  -- Return empty if we've reached the total limit
  IF actual_limit <= 0 THEN
    RETURN;
  END IF;

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
      -- Calculate viral score with higher recency boost
      (
        -- Normalized score (35% weight, reduced to make room for recency)
        LEAST(10, p.score::FLOAT / 100) * 0.35 +
        -- Engagement rate (35% weight, reduced to make room for recency)
        LEAST(10, (p.num_comments::FLOAT / GREATEST(1, p.score)) * 100) * 0.35 +
        -- Velocity (10% weight, same)
        LEAST(10, p.score::FLOAT / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - p.created_utc)) / 3600)) * 0.1 +
        -- Recency (20% weight, increased from 5% for stronger recency boost)
        GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - p.created_utc)) / (time_range_hours * 3600))) * 0.2
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
  ),
  all_viral_posts AS (
    -- Get all posts sorted by viral score
    SELECT
      *,
      COUNT(*) OVER() AS total_count
    FROM top_posts_per_subreddit
    ORDER BY viral_score DESC
    LIMIT total_limit
  )
  -- Apply pagination
  SELECT
    ap.id,
    ap.reddit_id,
    ap.title,
    ap.score,
    ap.num_comments,
    ap.created_utc,
    ap.subreddit_name,
    ap.content_type,
    ap.upvote_ratio,
    ap.thumbnail,
    ap.url,
    ap.author_username,
    ap.preview_data,
    ap.domain,
    ap.is_video,
    ap.is_self,
    ap.over_18,
    ap.sub_primary_category,
    ap.sub_over18,
    ap.viral_score,
    ap.total_count
  FROM all_viral_posts ap
  ORDER BY ap.viral_score DESC
  OFFSET page_offset
  LIMIT actual_limit;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_viral_posts_paginated(INT, INT, INT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_viral_posts_paginated(INT, INT, INT, INT, INT) TO authenticated;

-- Test query to verify it works
-- SELECT * FROM get_viral_posts_paginated(72, 3, 1000, 0, 10000);