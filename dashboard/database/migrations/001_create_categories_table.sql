-- Migration: Create categories table and migrate existing data
-- This migration creates a proper categories table and migrates existing category_text values

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table with proper structure
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#FF8395',
  icon VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_normalized_name ON categories(normalized_name);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_usage_count ON categories(usage_count DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- Function to normalize category names (case-insensitive, whitespace-normalized)
CREATE OR REPLACE FUNCTION normalize_category_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(input_name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add category_id column to subreddits table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subreddits' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE subreddits ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    CREATE INDEX idx_subreddits_category_id ON subreddits(category_id);
  END IF;
END $$;

-- Migrate existing category_text data to categories table
-- This will create categories from existing unique category_text values
INSERT INTO categories (name, normalized_name, usage_count, sort_order)
SELECT 
  TRIM(category_text) as name,
  normalize_category_name(category_text) as normalized_name,
  COUNT(*) as usage_count,
  -- Assign sort_order based on usage (most used first)
  ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) - 1 as sort_order
FROM subreddits 
WHERE category_text IS NOT NULL 
  AND TRIM(category_text) != ''
  AND review = 'Ok'  -- Only migrate from approved subreddits
GROUP BY TRIM(category_text)
ON CONFLICT (normalized_name) DO UPDATE SET
  usage_count = EXCLUDED.usage_count,
  sort_order = EXCLUDED.sort_order;

-- Update subreddits table to reference the new categories
UPDATE subreddits s
SET category_id = c.id
FROM categories c
WHERE normalize_category_name(s.category_text) = c.normalized_name
  AND s.category_text IS NOT NULL
  AND TRIM(s.category_text) != '';

-- Add some predefined category colors for common categories
UPDATE categories SET color = '#FF69B4' WHERE normalize_category_name(name) = normalize_category_name('Ass & Booty');
UPDATE categories SET color = '#FF1493' WHERE normalize_category_name(name) = normalize_category_name('Boobs & Chest');
UPDATE categories SET color = '#FF6347' WHERE normalize_category_name(name) = normalize_category_name('Lingerie & Underwear');
UPDATE categories SET color = '#DA70D6' WHERE normalize_category_name(name) = normalize_category_name('Cosplay & Fantasy');
UPDATE categories SET color = '#32CD32' WHERE normalize_category_name(name) = normalize_category_name('Gym & Fitness');
UPDATE categories SET color = '#87CEEB' WHERE normalize_category_name(name) = normalize_category_name('Selfie & Amateur');
UPDATE categories SET color = '#FF4500' WHERE normalize_category_name(name) = normalize_category_name('OnlyFans Promotion');
UPDATE categories SET color = '#2F4F4F' WHERE normalize_category_name(name) = normalize_category_name('Goth & Alternative');
UPDATE categories SET color = '#DDA0DD' WHERE normalize_category_name(name) = normalize_category_name('Body Types & Features');
UPDATE categories SET color = '#20B2AA' WHERE normalize_category_name(name) = normalize_category_name('Age Demographics');
UPDATE categories SET color = '#CD853F' WHERE normalize_category_name(name) = normalize_category_name('Ethnic & Cultural');
UPDATE categories SET color = '#4169E1' WHERE normalize_category_name(name) = normalize_category_name('Clothed & Dressed');
UPDATE categories SET color = '#FF8C00' WHERE normalize_category_name(name) = normalize_category_name('Interactive & Personalized');
UPDATE categories SET color = '#9370DB' WHERE normalize_category_name(name) = normalize_category_name('Lifestyle & Themes');
UPDATE categories SET color = '#DC143C' WHERE normalize_category_name(name) = normalize_category_name('Full Body & Nude');
UPDATE categories SET color = '#B22222' WHERE normalize_category_name(name) = normalize_category_name('Specific Body Parts');
UPDATE categories SET color = '#8B4513' WHERE normalize_category_name(name) = normalize_category_name('Feet & Foot Fetish');

-- Create function to automatically update usage_count when subreddits are updated
CREATE OR REPLACE FUNCTION update_category_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If category_id changed, update both old and new categories
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    -- Decrease count for old category
    IF OLD.category_id IS NOT NULL THEN
      UPDATE categories 
      SET usage_count = GREATEST(0, usage_count - 1)
      WHERE id = OLD.category_id;
    END IF;
    
    -- Increase count for new category
    IF NEW.category_id IS NOT NULL THEN
      UPDATE categories 
      SET usage_count = usage_count + 1
      WHERE id = NEW.category_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain usage_count accuracy
CREATE TRIGGER subreddits_category_usage_update
  AFTER UPDATE OF category_id ON subreddits
  FOR EACH ROW
  EXECUTE FUNCTION update_category_usage_count();

-- Create function to recalculate all usage counts (can be called manually if needed)
CREATE OR REPLACE FUNCTION recalculate_category_usage_counts()
RETURNS void AS $$
BEGIN
  UPDATE categories SET usage_count = (
    SELECT COUNT(*)
    FROM subreddits s
    WHERE s.category_id = categories.id
      AND s.review = 'Ok'
  );
END;
$$ LANGUAGE plpgsql;

-- Add some useful views for analytics
CREATE OR REPLACE VIEW category_analytics AS
SELECT 
  c.id,
  c.name,
  c.usage_count,
  c.color,
  COALESCE(AVG(s.subscribers), 0) as avg_subscribers,
  COALESCE(AVG(s.avg_upvotes_per_post), 0) as avg_engagement,
  COUNT(s.id) as total_subreddits,
  COUNT(CASE WHEN s.updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_updates
FROM categories c
LEFT JOIN subreddits s ON c.id = s.category_id AND s.review = 'Ok'
GROUP BY c.id, c.name, c.usage_count, c.color
ORDER BY c.usage_count DESC;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO your_app_user;

-- Commit the migration
COMMIT;