-- ═══════════════════════════════════════════════════════════════════════════
-- WholeScale OS — Quick Database Setup
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project (jdneeubmkgefhrfcurji)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New query"
-- 5. Paste this ENTIRE file
-- 6. Click "Run"
-- 7. Go back to WholeScale OS and sign up!
--
-- This creates ALL tables, triggers, security policies, and indexes
-- needed for the full WholeScale OS application.
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 0: Clean up any failed previous attempts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
DROP TRIGGER IF EXISTS leads_calculate_score ON leads;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_deal_score() CASCADE;
DROP FUNCTION IF EXISTS get_user_team_ids() CASCADE;
DROP FUNCTION IF EXISTS get_team_dashboard_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_lead_activity_summary(UUID) CASCADE;

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  streak INTEGER DEFAULT 0,
  task_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login DATE,
  referral_code TEXT UNIQUE DEFAULT ('WS-' || upper(substr(md5(random()::text), 1, 6))),
  referred_by UUID REFERENCES profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Team',
  invite_code TEXT UNIQUE DEFAULT ('WS-' || upper(substr(md5(random()::text), 1, 6))),
  owner_id UUID REFERENCES profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'online',
  custom_status TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  assigned_to TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  property_value DECIMAL(12, 2),
  offer_amount DECIMAL(12, 2),
  property_type TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  import_source TEXT,
  probability INTEGER DEFAULT 50,
  engagement_level INTEGER DEFAULT 3,
  timeline_urgency INTEGER DEFAULT 3,
  competition_level INTEGER DEFAULT 3,
  deal_score INTEGER,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  last_contact DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Entries
CREATE TABLE IF NOT EXISTS timeline_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  type TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status History
CREATE TABLE IF NOT EXISTS status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  assigned_to_name TEXT,
  created_by UUID REFERENCES profiles(id),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  lead_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'group',
  description TEXT DEFAULT '',
  avatar TEXT DEFAULT '💬',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Members
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  sender_name TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  mentions UUID[] DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]',
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import History
CREATE TABLE IF NOT EXISTS import_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  source TEXT,
  filename TEXT,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  rows_duplicated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coverage Areas (map zones)
CREATE TABLE IF NOT EXISTS coverage_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT,
  coordinates JSONB DEFAULT '[]',
  color TEXT DEFAULT '#3b82f6',
  opacity DECIMAL DEFAULT 0.2,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyers
CREATE TABLE IF NOT EXISTS buyers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),
  active BOOLEAN DEFAULT TRUE,
  deal_score INTEGER,
  notes TEXT,
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Recordings
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  duration INTEGER,
  audio_url TEXT,
  transcription JSONB,
  analyzed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Earnings
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Messages
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access Codes
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail signup if profile creation has issues
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate deal score on leads
CREATE OR REPLACE FUNCTION calculate_deal_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER;
BEGIN
  v_score := ROUND(
    LEAST(COALESCE(NEW.property_value, 0) / 500000.0, 1) * 100 * 0.30 +
    COALESCE(NEW.probability, 50) * 0.25 +
    ((COALESCE(NEW.engagement_level, 3) - 1) / 4.0) * 100 * 0.20 +
    ((COALESCE(NEW.timeline_urgency, 3) - 1) / 4.0) * 100 * 0.15 +
    ((5 - COALESCE(NEW.competition_level, 3)) / 4.0) * 100 * 0.10
  );
  NEW.deal_score := GREATEST(0, LEAST(100, v_score));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_calculate_score
  BEFORE INSERT OR UPDATE OF property_value, probability, engagement_level, timeline_urgency, competition_level
  ON leads
  FOR EACH ROW EXECUTE FUNCTION calculate_deal_score();

-- Helper: get user's team IDs (for RLS)
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(team_id), '{}')
  FROM team_members
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create team for new users
CREATE OR REPLACE FUNCTION auto_create_team()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Create a personal team
  INSERT INTO teams (name, owner_id)
  VALUES (COALESCE(NEW.full_name, 'My') || '''s Team', NEW.id)
  RETURNING id INTO v_team_id;

  -- Add user as admin
  INSERT INTO team_members (team_id, user_id, role, status)
  VALUES (v_team_id, NEW.id, 'admin', 'online');

  -- Create default #general channel
  INSERT INTO channels (team_id, name, type, description, avatar, created_by)
  VALUES (v_team_id, 'general', 'group', 'General team discussion', '💬', NEW.id);

  -- Add user to channel
  INSERT INTO channel_members (channel_id, user_id)
  VALUES ((SELECT id FROM channels WHERE team_id = v_team_id AND name = 'general'), NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_create_team();


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — DISABLED FOR DEVELOPMENT
-- ═══════════════════════════════════════════════════════════════════════════
-- RLS is disabled during development for simplicity.
-- Enable RLS + add policies when deploying to production.
-- ═══════════════════════════════════════════════════════════════════════════

-- First drop ALL existing policies that might be conflicting
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
END LOOP; END $$;

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages DISABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_leads_team ON leads(team_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_lead ON timeline_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_tm_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_user ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_buyers_team ON buyers(team_id);
CREATE INDEX IF NOT EXISTS idx_ca_team ON coverage_areas(team_id);
CREATE INDEX IF NOT EXISTS idx_sms_user ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_messages(phone_number);


-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════════

-- Safely remove from realtime first, then re-add
-- Using DROP TABLE (not DROP TABLE IF EXISTS — that syntax doesn't exist for ALTER PUBLICATION)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE leads; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Now re-add them
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Your WholeScale OS database is ready.
-- Go back to the app and sign up!
-- ═══════════════════════════════════════════════════════════════════════════
