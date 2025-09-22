-- Migration: Add characteristics, multi-niche support, and logging tables
-- Date: 2025-01-16

-- ============================================
-- 1. Update instagram_creators table
-- ============================================
ALTER TABLE instagram_creators
ADD COLUMN IF NOT EXISTS characteristics TEXT[],
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avg_views_per_reel_cached NUMERIC;

-- ============================================
-- 2. Create junction table for many-to-many creator-niche relationship
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_creator_niches (
    creator_id TEXT REFERENCES instagram_creators(ig_user_id) ON DELETE CASCADE,
    niche_id UUID REFERENCES instagram_niche_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by TEXT,
    PRIMARY KEY (creator_id, niche_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_niches_creator ON instagram_creator_niches(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_niches_niche ON instagram_creator_niches(niche_id);

-- ============================================
-- 3. Create instagram_highlights table
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_highlights (
    id SERIAL PRIMARY KEY,
    highlight_id TEXT UNIQUE NOT NULL,
    highlight_title TEXT,
    creator_id TEXT NOT NULL REFERENCES instagram_creators(ig_user_id),
    creator_username TEXT,
    creator_niche_id UUID REFERENCES instagram_niche_groups(id),
    cover_media_url TEXT,
    media_count INTEGER DEFAULT 0,
    is_pinned_highlight BOOLEAN DEFAULT false,
    created_at_timestamp BIGINT,
    latest_reel_media JSONB,
    items JSONB,  -- Array of all story items in the highlight
    raw_highlight_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_highlights_creator ON instagram_highlights(creator_id);
CREATE INDEX IF NOT EXISTS idx_highlights_created ON instagram_highlights(created_at DESC);

-- ============================================
-- 4. Create scraper logs table
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_scraper_logs (
    id SERIAL PRIMARY KEY,
    script_name TEXT NOT NULL,
    action TEXT NOT NULL,
    username TEXT,
    creator_id TEXT,
    success BOOLEAN DEFAULT false,
    items_fetched INTEGER,
    items_saved INTEGER,
    api_calls_made INTEGER,
    details JSONB,
    error_message TEXT,
    duration_seconds NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for log queries
CREATE INDEX IF NOT EXISTS idx_scraper_logs_script ON instagram_scraper_logs(script_name);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_created ON instagram_scraper_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_success ON instagram_scraper_logs(success);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_username ON instagram_scraper_logs(username);

-- ============================================
-- 5. Add viral tracking fields to content tables
-- ============================================
ALTER TABLE instagram_reels
ADD COLUMN IF NOT EXISTS is_viral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS viral_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viral_multiplier NUMERIC;

ALTER TABLE instagram_posts
ADD COLUMN IF NOT EXISTS is_viral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS viral_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viral_multiplier NUMERIC;

-- ============================================
-- 6. Add comments for documentation
-- ============================================
COMMENT ON COLUMN instagram_creators.characteristics IS 'Physical and visual traits for AI training (tall, petite, curvy, athletic, blonde, etc.)';
COMMENT ON COLUMN instagram_creators.ai_analyzed_at IS 'When AI last analyzed this creator for characteristics';
COMMENT ON COLUMN instagram_creators.avg_views_per_reel_cached IS 'Cached average views for viral detection (5x multiplier rule)';

COMMENT ON TABLE instagram_creator_niches IS 'Many-to-many relationship allowing creators to belong to multiple niches';
COMMENT ON TABLE instagram_highlights IS 'Instagram highlights (permanent story collections) from tracked creators';
COMMENT ON TABLE instagram_scraper_logs IS 'Detailed logs from all Instagram scraping scripts for monitoring and debugging';

COMMENT ON COLUMN instagram_reels.is_viral IS 'True if reel has 50k+ views AND 5x creator average';
COMMENT ON COLUMN instagram_reels.viral_multiplier IS 'How many times above creator average (e.g., 5.2x)';

-- ============================================
-- 7. Create function to detect viral content
-- ============================================
CREATE OR REPLACE FUNCTION detect_viral_content()
RETURNS void AS $$
BEGIN
    -- Update viral status for reels
    UPDATE instagram_reels r
    SET
        is_viral = CASE
            WHEN r.play_count >= 50000
                AND c.avg_views_per_reel_cached > 0
                AND r.play_count >= (c.avg_views_per_reel_cached * 5)
            THEN true
            ELSE false
        END,
        viral_detected_at = CASE
            WHEN r.play_count >= 50000
                AND c.avg_views_per_reel_cached > 0
                AND r.play_count >= (c.avg_views_per_reel_cached * 5)
                AND r.is_viral IS NOT true
            THEN NOW()
            ELSE r.viral_detected_at
        END,
        viral_multiplier = CASE
            WHEN c.avg_views_per_reel_cached > 0
            THEN ROUND(r.play_count::numeric / c.avg_views_per_reel_cached, 2)
            ELSE NULL
        END
    FROM instagram_creators c
    WHERE r.creator_id = c.ig_user_id;

    -- Update viral status for posts
    UPDATE instagram_posts p
    SET
        is_viral = CASE
            WHEN (p.like_count + p.comment_count) >= 50000
                AND c.avg_views_per_reel_cached > 0
                AND (p.like_count + p.comment_count) >= (c.avg_views_per_reel_cached * 5)
            THEN true
            ELSE false
        END,
        viral_detected_at = CASE
            WHEN (p.like_count + p.comment_count) >= 50000
                AND c.avg_views_per_reel_cached > 0
                AND (p.like_count + p.comment_count) >= (c.avg_views_per_reel_cached * 5)
                AND p.is_viral IS NOT true
            THEN NOW()
            ELSE p.viral_detected_at
        END,
        viral_multiplier = CASE
            WHEN c.avg_views_per_reel_cached > 0
            THEN ROUND((p.like_count + p.comment_count)::numeric / c.avg_views_per_reel_cached, 2)
            ELSE NULL
        END
    FROM instagram_creators c
    WHERE p.creator_id = c.ig_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_viral_content() IS 'Detects viral content based on 50k+ views AND 5x creator average rule';

-- ============================================
-- 8. Create function to update creator average views
-- ============================================
CREATE OR REPLACE FUNCTION update_creator_avg_views()
RETURNS void AS $$
BEGIN
    UPDATE instagram_creators c
    SET avg_views_per_reel_cached = (
        SELECT AVG(play_count)
        FROM instagram_reels r
        WHERE r.creator_id = c.ig_user_id
        AND r.play_count > 0
    )
    WHERE c.review_status = 'ok';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_creator_avg_views() IS 'Updates cached average views per reel for viral detection';