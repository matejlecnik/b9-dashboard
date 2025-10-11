-- Migration: Add AI Tagging Fields to instagram_creators
-- Date: 2025-10-11
-- Purpose: Support AI-powered visual attribute tagging for Instagram creators

-- Add tagging columns
ALTER TABLE instagram_creators
  ADD COLUMN IF NOT EXISTS body_tags text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tag_confidence jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags_analyzed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS model_version text DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN instagram_creators.body_tags IS 'AI-generated visual attribute tags (e.g., body_type:curvy, hair_color:blonde)';
COMMENT ON COLUMN instagram_creators.tag_confidence IS 'Confidence scores for each tag category (0.0-1.0)';
COMMENT ON COLUMN instagram_creators.tags_analyzed_at IS 'Timestamp when AI tagging was performed';
COMMENT ON COLUMN instagram_creators.model_version IS 'AI model version used for tagging (e.g., gemini-2.5-flash)';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_instagram_creators_body_tags
  ON instagram_creators USING gin(body_tags);

CREATE INDEX IF NOT EXISTS idx_instagram_creators_tags_analyzed
  ON instagram_creators(tags_analyzed_at)
  WHERE tags_analyzed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instagram_creators_untagged
  ON instagram_creators(review_status)
  WHERE body_tags IS NULL AND review_status = 'ok';

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Tagging fields added to instagram_creators.';
  RAISE NOTICE 'Total creators with review_status=ok: %',
    (SELECT COUNT(*) FROM instagram_creators WHERE review_status = 'ok');
  RAISE NOTICE 'Untagged creators ready for AI processing: %',
    (SELECT COUNT(*) FROM instagram_creators WHERE review_status = 'ok' AND body_tags IS NULL);
END $$;
