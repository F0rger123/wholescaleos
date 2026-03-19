-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/sql/new

-- Create custom_fields table
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT DEFAULT 'text' CHECK (field_type IN ('text', 'number')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, field_key)
);

-- Disable RLS for simplicity (or create policies if needed)
ALTER TABLE custom_fields DISABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_fields_team ON custom_fields(team_id);
