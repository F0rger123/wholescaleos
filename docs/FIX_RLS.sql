-- =============================================
-- WholeScale OS — DISABLE RLS (Development Fix)
-- =============================================
-- Run this in Supabase SQL Editor to fix ALL 
-- "row-level security policy" errors.
--
-- This disables RLS on ALL tables so your app
-- works without permission issues during development.
--
-- You can re-enable RLS later for production.
-- =============================================

-- First: Drop ALL existing policies (they may be conflicting)
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Now disable RLS on every table
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timeline_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coverage_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS import_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS access_codes DISABLE ROW LEVEL SECURITY;

-- Verify: this should return 0 rows
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
