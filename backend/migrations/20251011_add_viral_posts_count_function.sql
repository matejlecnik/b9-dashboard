-- Migration: Add get_viral_posts_count function
-- Date: 2025-10-11
-- Purpose: Fix Reddit post count showing 1k limit due to Supabase row cap
--
-- Context: The get_viral_posts() function returns up to 1,000 rows (Supabase limit),
-- but the frontend was using sourcePosts.length as the total count. This function
-- provides an accurate count of all viral posts matching the same criteria.

CREATE OR REPLACE FUNCTION public.get_viral_posts_count(
  time_range_hours integer DEFAULT 72,
  posts_per_subreddit integer DEFAULT 3
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_time TIMESTAMP;
  total_count bigint;
BEGIN
  -- Calculate cutoff time
  cutoff_time := NOW() - (time_range_hours || ' hours')::INTERVAL;

  -- Count posts matching the same criteria as get_viral_posts
  WITH ok_subreddits AS (
    -- Get only subreddits with 'Ok' review status
    SELECT rs.name
    FROM reddit_subreddits rs
    WHERE rs.review = 'Ok'
  ),
  ranked_posts AS (
    -- Get posts from Ok subreddits within time range
    SELECT
      p.subreddit_name,
      ROW_NUMBER() OVER (
        PARTITION BY p.subreddit_name
        ORDER BY p.score DESC
      ) AS subreddit_rank
    FROM reddit_posts p
    INNER JOIN ok_subreddits os ON p.subreddit_name = os.name
    WHERE
      p.created_utc >= cutoff_time
      AND p.score > 0
  )
  SELECT COUNT(*)
  INTO total_count
  FROM ranked_posts
  WHERE subreddit_rank <= posts_per_subreddit;

  RETURN total_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_viral_posts_count(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_viral_posts_count(integer, integer) TO anon;

-- Usage example:
-- SELECT get_viral_posts_count(72, 3);  -- Returns actual count, e.g., 5247
