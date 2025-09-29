-- Migration: Allow anonymous read access to system_logs
-- Created: 2025-09-29
-- Purpose: Enable dashboard log viewer to display system logs
--
-- Context:
-- The dashboard uses NEXT_PUBLIC_SUPABASE_ANON_KEY (anon role) to query logs.
-- The system_logs table has RLS enabled with only authenticated/service_role access.
-- This migration adds read-only (SELECT) access for the anon role.
--
-- Safety:
-- - Only SELECT permission (read-only, no write/update/delete)
-- - Logs are operational data, not sensitive user information
-- - Backend scraper uses service_role/authenticated for writes
-- - This is standard practice for public operational dashboards

-- Add read-only policy for anonymous users
CREATE POLICY "Allow anon read access to system_logs"
ON system_logs
FOR SELECT
TO anon
USING (true);

-- Verify policy was created
-- Query to check: SELECT * FROM pg_policies WHERE tablename = 'system_logs';