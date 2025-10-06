-- Migration: Fix category_text Column References
-- Date: 2025-10-06
-- Description: Update database functions to use primary_category instead of deleted category_text column
-- Issue: Functions were referencing category_text which was removed in 2025_01_reddit_fields_cleanup.sql

-- =============================================
-- STEP 1: Fix get_top_categories_for_posts function
-- =============================================
-- This function was referencing s.category_text which no longer exists in reddit_subreddits

CREATE OR REPLACE FUNCTION public.get_top_categories_for_posts(limit_count integer DEFAULT 3)
RETURNS TABLE(category text, count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    s.primary_category::text AS category,
    COUNT(*)::bigint AS count
  FROM public.reddit_posts p
  JOIN public.reddit_subreddits s
    ON p.subreddit_name = s.name
  WHERE s.review = 'Ok'
    AND s.primary_category IS NOT NULL
    AND s.primary_category <> ''
  GROUP BY s.primary_category
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
$function$;

-- =============================================
-- STEP 2: Fix populate_post_subreddit_fields trigger function
-- =============================================
-- This trigger function was trying to SELECT category_text from reddit_subreddits
-- and INSERT into sub_category_text in reddit_posts (both deprecated)

CREATE OR REPLACE FUNCTION public.populate_post_subreddit_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Populate fields from the subreddit table using current column names
  SELECT primary_category, tags, over18
  INTO NEW.sub_primary_category, NEW.sub_tags, NEW.sub_over18
  FROM reddit_subreddits
  WHERE name = NEW.subreddit_name;

  RETURN NEW;
END;
$function$;

-- =============================================
-- STEP 3: Fix filter_subreddits_for_posting function
-- =============================================
-- This function was returning category_text in its result set
-- Note: We're removing many deprecated columns from the return signature

CREATE OR REPLACE FUNCTION public.filter_subreddits_for_posting(
  tag_array text[] DEFAULT NULL::text[],
  search_term text DEFAULT NULL::text,
  sfw_only boolean DEFAULT false,
  verified_only boolean DEFAULT false,
  sort_by text DEFAULT 'avg_upvotes'::text,
  sort_order text DEFAULT 'desc'::text,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id integer,
  name text,
  display_name_prefixed text,
  title text,
  public_description text,
  description text,
  community_icon text,
  subscribers integer,
  accounts_active integer,
  over18 boolean,
  allow_images boolean,
  allow_videos boolean,
  allow_polls boolean,
  subreddit_type text,
  icon_img text,
  banner_img text,
  header_img text,
  avg_upvotes_per_post double precision,
  avg_comments_per_post double precision,
  best_posting_day text,
  best_posting_hour integer,
  top_content_type text,
  image_post_avg_score double precision,
  video_post_avg_score double precision,
  text_post_avg_score double precision,
  link_post_avg_score double precision,
  review text,
  verification_required boolean,
  min_post_karma integer,
  min_comment_karma integer,
  min_account_age_days integer,
  requirement_sample_size integer,
  requirements_last_updated timestamp without time zone,
  last_scraped_at timestamp without time zone,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  created_utc timestamp without time zone,
  primary_category text,
  rules_data jsonb,
  tags jsonb,
  tags_updated_at timestamp without time zone,
  tags_updated_by text,
  engagement double precision,
  subreddit_score double precision
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rs.id::integer,
    rs.name::text,
    rs.display_name_prefixed::text,
    rs.title::text,
    rs.public_description::text,
    rs.description::text,
    rs.community_icon::text,
    rs.subscribers::integer,
    rs.accounts_active::integer,
    rs.over18::boolean,
    rs.allow_images::boolean,
    rs.allow_videos::boolean,
    rs.allow_polls::boolean,
    rs.subreddit_type::text,
    rs.icon_img::text,
    rs.banner_img::text,
    rs.header_img::text,
    rs.avg_upvotes_per_post::double precision,
    rs.avg_comments_per_post::double precision,
    rs.best_posting_day::text,
    rs.best_posting_hour::integer,
    rs.top_content_type::text,
    rs.image_post_avg_score::double precision,
    rs.video_post_avg_score::double precision,
    rs.text_post_avg_score::double precision,
    rs.link_post_avg_score::double precision,
    rs.review::text,
    rs.verification_required::boolean,
    rs.min_post_karma::integer,
    rs.min_comment_karma::integer,
    rs.min_account_age_days::integer,
    rs.requirement_sample_size::integer,
    rs.requirements_last_updated::timestamp without time zone,
    rs.last_scraped_at::timestamp without time zone,
    rs.created_at::timestamp without time zone,
    rs.updated_at::timestamp without time zone,
    rs.created_utc::timestamp without time zone,
    rs.primary_category::text,
    rs.rules_data::jsonb,
    rs.tags::jsonb,
    rs.tags_updated_at::timestamp without time zone,
    rs.tags_updated_by::text,
    rs.engagement::double precision,
    rs.subreddit_score::double precision
  FROM reddit_subreddits rs
  WHERE
    -- Only show 'Ok' reviewed subreddits
    rs.review = 'Ok'
    -- Exclude user profiles
    AND rs.name NOT ILIKE 'u_%'
    -- SFW filter
    AND (NOT sfw_only OR rs.over18 = false)
    -- Verification filter
    AND (NOT verified_only OR rs.verification_required = true)
    -- Search filter
    AND (search_term IS NULL OR search_term = '' OR
         rs.name ILIKE '%' || search_term || '%' OR
         rs.title ILIKE '%' || search_term || '%')
    -- Tag filter
    AND (tag_array IS NULL OR tag_array = ARRAY[]::text[] OR rs.tags ?| tag_array)
  ORDER BY
    CASE
      WHEN sort_by = 'avg_upvotes' AND sort_order = 'desc' THEN rs.avg_upvotes_per_post
      WHEN sort_by = 'min_post_karma' AND sort_order = 'desc' THEN rs.min_post_karma::double precision
      WHEN sort_by = 'engagement' AND sort_order = 'desc' THEN rs.engagement
      WHEN sort_by = 'subreddit_score' AND sort_order = 'desc' THEN rs.subreddit_score
    END DESC NULLS LAST,
    CASE
      WHEN sort_by = 'avg_upvotes' AND sort_order = 'asc' THEN rs.avg_upvotes_per_post
      WHEN sort_by = 'min_post_karma' AND sort_order = 'asc' THEN rs.min_post_karma::double precision
      WHEN sort_by = 'engagement' AND sort_order = 'asc' THEN rs.engagement
      WHEN sort_by = 'subreddit_score' AND sort_order = 'asc' THEN rs.subreddit_score
    END ASC NULLS LAST,
    rs.subscribers DESC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;

-- =============================================
-- Migration complete
-- =============================================
-- Fixed 3 functions:
--   1. get_top_categories_for_posts: category_text → primary_category
--   2. populate_post_subreddit_fields: category_text → primary_category, sub_category_text → sub_primary_category
--   3. filter_subreddits_for_posting: Removed category_text from return, cleaned up deprecated columns
