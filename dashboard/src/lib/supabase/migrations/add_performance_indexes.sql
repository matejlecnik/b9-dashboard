-- Performance Optimization Indexes
-- These indexes are designed to improve query performance for common operations

-- ============================================================================
-- REDDIT SUBREDDITS TABLE INDEXES
-- ============================================================================

-- Index for review filtering (used in subreddit-review page)
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_review
ON reddit_subreddits(review)
WHERE review IS NOT NULL;

-- Index for unreviewed subreddits (most common filter)
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_unreviewed
ON reddit_subreddits(id)
WHERE review IS NULL;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_category_id
ON reddit_subreddits(category_id);

-- Index for sorting by subscribers (common sort)
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_subscribers
ON reddit_subreddits(subscribers DESC NULLS LAST);

-- Index for sorting by engagement
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_engagement
ON reddit_subreddits(engagement DESC NULLS LAST);

-- Index for created_at (for new today queries)
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_created_at
ON reddit_subreddits(created_at DESC);

-- Composite index for review + subscribers (common filter + sort combo)
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_review_subscribers
ON reddit_subreddits(review, subscribers DESC NULLS LAST);

-- Index for text search on name, title, and public_description
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_search
ON reddit_subreddits
USING gin(to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(title, '') || ' ' ||
    COALESCE(public_description, '')
));

-- Index for over18 filtering (SFW/NSFW)
CREATE INDEX IF NOT EXISTS idx_reddit_subreddits_over18
ON reddit_subreddits(over18);

-- ============================================================================
-- INSTAGRAM CREATORS TABLE INDEXES
-- ============================================================================

-- Index for review status filtering
CREATE INDEX IF NOT EXISTS idx_instagram_creators_review
ON instagram_creators(review)
WHERE review IS NOT NULL;

-- Index for unreviewed creators
CREATE INDEX IF NOT EXISTS idx_instagram_creators_unreviewed
ON instagram_creators(id)
WHERE review IS NULL;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_instagram_creators_category_id
ON instagram_creators(category_id);

-- Index for follower_count sorting (very common)
CREATE INDEX IF NOT EXISTS idx_instagram_creators_follower_count
ON instagram_creators(follower_count DESC NULLS LAST);

-- Index for verification status
CREATE INDEX IF NOT EXISTS idx_instagram_creators_is_verified
ON instagram_creators(is_verified);

-- Index for created_at
CREATE INDEX IF NOT EXISTS idx_instagram_creators_created_at
ON instagram_creators(created_at DESC);

-- Composite index for pending review sorted by followers
CREATE INDEX IF NOT EXISTS idx_instagram_creators_pending_followers
ON instagram_creators(follower_count DESC NULLS LAST)
WHERE review = 'pending' OR review IS NULL;

-- Text search index
CREATE INDEX IF NOT EXISTS idx_instagram_creators_search
ON instagram_creators
USING gin(to_tsvector('english',
    COALESCE(username, '') || ' ' ||
    COALESCE(full_name, '') || ' ' ||
    COALESCE(biography, '')
));

-- ============================================================================
-- MODELS TABLE INDEXES (if exists)
-- ============================================================================

-- Check if models table exists before creating indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'models') THEN
        -- Index for review status
        CREATE INDEX IF NOT EXISTS idx_models_review_status
        ON models(review_status);

        -- Index for platform
        CREATE INDEX IF NOT EXISTS idx_models_platform
        ON models(platform);

        -- Index for created_at
        CREATE INDEX IF NOT EXISTS idx_models_created_at
        ON models(created_at DESC);

        -- Index for follower_count
        CREATE INDEX IF NOT EXISTS idx_models_follower_count
        ON models(follower_count DESC NULLS LAST);

        -- Text search index
        CREATE INDEX IF NOT EXISTS idx_models_search
        ON models
        USING gin(to_tsvector('english',
            COALESCE(username, '') || ' ' ||
            COALESCE(name, '') || ' ' ||
            COALESCE(bio, '')
        ));
    END IF;
END $$;

-- ============================================================================
-- REDDIT POSTS TABLE INDEXES
-- ============================================================================

-- Index for subreddit_id (foreign key lookups)
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit_id
ON reddit_posts(subreddit_id);

-- Index for created_utc (for recent posts queries)
CREATE INDEX IF NOT EXISTS idx_reddit_posts_created_utc
ON reddit_posts(created_utc DESC);

-- Composite index for subreddit_id + created_utc (common query pattern)
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit_created
ON reddit_posts(subreddit_id, created_utc DESC);

-- Index for score (for top posts)
CREATE INDEX IF NOT EXISTS idx_reddit_posts_score
ON reddit_posts(score DESC);

-- ============================================================================
-- CATEGORIES TABLE INDEXES
-- ============================================================================

-- Index for name uniqueness and lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name
ON categories(name);

-- Index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_categories_created_at
ON categories(created_at DESC);

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- After creating indexes, analyze tables to update statistics
ANALYZE reddit_subreddits;
ANALYZE instagram_creators;
ANALYZE reddit_posts;
ANALYZE categories;

-- Analyze models table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'models') THEN
        ANALYZE models;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- You can run these queries to verify indexes are being used:
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM reddit_subreddits WHERE review IS NULL LIMIT 50;
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM instagram_creators ORDER BY follower_count DESC LIMIT 50;
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM reddit_subreddits WHERE review = 'Ok' ORDER BY subscribers DESC LIMIT 50;