-- Migration: Add 'banned' status to reddit_users
-- Created: 2025-10-04
-- Purpose: Allow reddit_users.status to accept 'banned' value for disabled posting accounts
--
-- Context:
-- The posting page needs to mark accounts as banned while keeping them linked to models.
-- Current constraint only allows 'active' | 'inactive'
-- This migration adds 'banned' as a valid status value.
--
-- Safety:
-- - Backwards compatible: existing 'active'/'inactive' values remain valid
-- - No data migration needed: only updating the constraint
-- - Posting page already filters by status='active', so banned accounts are automatically excluded

-- Drop the existing check constraint
ALTER TABLE reddit_users
DROP CONSTRAINT IF EXISTS reddit_users_status_check;

-- Add new check constraint with 'banned' included
ALTER TABLE reddit_users
ADD CONSTRAINT reddit_users_status_check
CHECK (status IN ('active', 'inactive', 'banned'));

-- Verify constraint was created
-- Query to check:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'reddit_users'::regclass AND conname = 'reddit_users_status_check';
