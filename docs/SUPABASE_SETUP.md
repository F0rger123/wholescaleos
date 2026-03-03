# WholeScale OS — Complete Supabase Setup Guide

## Table of Contents
1. [Create Supabase Account & Project](#1-create-supabase-account--project)
2. [Get API Keys](#2-get-api-keys)
3. [Configure Environment](#3-configure-environment)
4. [Run Database Schema](#4-run-database-schema)
5. [Set Up Storage Buckets](#5-set-up-storage-buckets)
6. [Enable Realtime](#6-enable-realtime)
7. [Test Connection](#7-test-connection)

---

## 1. Create Supabase Account & Project

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up with GitHub (recommended) or email
3. Click **New project**
4. Choose:
   - **Organization**: Your org (or create one)
   - **Project name**: `wholescale-os`
   - **Database password**: Save this! You'll need it for direct DB access
   - **Region**: Choose closest to your users (e.g., `US East` for East Coast)
   - **Plan**: Free tier works for development
5. Click **Create new project** — wait ~2 minutes for provisioning

## 2. Get API Keys

1. In your Supabase dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **API** under Configuration
3. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co` — copy this
   - **Project API keys**:
     - `anon` / `public`: Copy this (safe for frontend)
     - `service_role`: **NEVER** put this in frontend code
4. Also note your **Project ID** (in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`)

## 3. Configure Environment

Create a `.env` file in your project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
```

**Important**: The `.env` file is gitignored — never commit API keys.

## 4. Run Database Schema

Go to **SQL Editor** in your Supabase dashboard (left sidebar), click **New query**, and run the following SQL in order:

### Part 1: Extensions & Core Tables

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- WholeScale OS — Complete Database Schema
-- Run this in Supabase SQL Editor (Settings > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles (extends auth.users) ──────────────────────────────────────────

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  streak INTEGER DEFAULT 0,
  task_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login DATE,
  referral_code TEXT UNIQUE DEFAULT ('WS-' || upper(substr(md5(random()::text), 1, 6))),
  referred_by UUID REFERENCES profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Teams ───────────────────────────────────────────────────────────────────

CREATE TABLE teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT ('WS-' || upper(substr(md5(random()::text), 1, 6))),
  owner_id UUID REFERENCES profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Team Members ────────────────────────────────────────────────────────────

CREATE TABLE team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'dnd')),
  custom_status TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- ─── Leads ───────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  assigned_to TEXT, -- Can be team member name or UUID
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
  property_type TEXT CHECK (property_type IN ('single-family', 'multi-family', 'commercial', 'land', 'condo')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost')),
  source TEXT CHECK (source IN ('website', 'referral', 'cold-call', 'social-media', 'mailer', 'other')),
  import_source TEXT,
  probability INTEGER DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  engagement_level INTEGER DEFAULT 3 CHECK (engagement_level BETWEEN 1 AND 5),
  timeline_urgency INTEGER DEFAULT 3 CHECK (timeline_urgency BETWEEN 1 AND 5),
  competition_level INTEGER DEFAULT 3 CHECK (competition_level BETWEEN 1 AND 5),
  deal_score INTEGER,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  last_contact DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at
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

-- ─── Timeline Entries ────────────────────────────────────────────────────────

CREATE TABLE timeline_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('call', 'email', 'note', 'status-change', 'meeting', 'task')),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Status History ──────────────────────────────────────────────────────────

CREATE TABLE status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT, -- Can be user UUID or name
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Part 2: Chat, Notifications, & Supporting Tables

```sql
-- ─── Chat Channels ───────────────────────────────────────────────────────────

CREATE TABLE channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'group' CHECK (type IN ('group', 'direct')),
  description TEXT DEFAULT '',
  avatar TEXT DEFAULT '💬',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Channel Members ────────────────────────────────────────────────────────

CREATE TABLE channel_members (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- ─── Messages ────────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'voice', 'video', 'system')),
  mentions UUID[] DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  attachments JSONB[] DEFAULT '{}',
  edited BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ─── Message Reactions ───────────────────────────────────────────────────────

CREATE TABLE message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- ─── Message Read Receipts ───────────────────────────────────────────────────

CREATE TABLE message_read_receipts (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- ─── Notifications ───────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('lead-assigned', 'status-change', 'deal-closed', 'task-assigned', 'task-due', 'mention', 'call-recorded', 'team-join', 'message', 'system')),
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Import History ──────────────────────────────────────────────────────────

CREATE TABLE import_history (
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

-- ─── Coverage Areas ──────────────────────────────────────────────────────────

CREATE TABLE coverage_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT,
  coordinates DECIMAL[][] DEFAULT '{}',
  color TEXT DEFAULT '#3b82f6',
  opacity DECIMAL DEFAULT 0.2,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Buyers ──────────────────────────────────────────────────────────────────

CREATE TABLE buyers (
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

-- ─── Call Recordings ─────────────────────────────────────────────────────────

CREATE TABLE call_recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  duration INTEGER, -- seconds
  audio_url TEXT,
  transcription JSONB, -- { text, sentiment, objections[], nextSteps[], keyPoints[], summary }
  analyzed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Referral Earnings ───────────────────────────────────────────────────────

CREATE TABLE referral_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Access Codes ────────────────────────────────────────────────────────────

CREATE TABLE access_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Part 3: Row Level Security (RLS) Policies

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Enable on all tables
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get user's team IDs ────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(team_id), '{}')
  FROM team_members
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Profiles Policies ──────────────────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view team members profiles"
  ON profiles FOR SELECT
  USING (id IN (
    SELECT user_id FROM team_members
    WHERE team_id = ANY(get_user_team_ids())
  ));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── Teams Policies ─────────────────────────────────────────────────────────

CREATE POLICY "Team members can view their team"
  ON teams FOR SELECT
  USING (id = ANY(get_user_team_ids()));

CREATE POLICY "Anyone can create a team"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owner can update team"
  ON teams FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Team owner can delete team"
  ON teams FOR DELETE
  USING (auth.uid() = owner_id);

-- ─── Team Members Policies ──────────────────────────────────────────────────

CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Admins can manage team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

CREATE POLICY "Users can update own membership"
  ON team_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can join teams"
  ON team_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── Leads Policies (team-scoped) ───────────────────────────────────────────

CREATE POLICY "Team members can view team leads"
  ON leads FOR SELECT
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team members can create leads"
  ON leads FOR INSERT
  WITH CHECK (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team members can update leads"
  ON leads FOR UPDATE
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team admins can delete leads"
  ON leads FOR DELETE
  USING (
    team_id = ANY(get_user_team_ids())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = leads.team_id
        AND user_id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- ─── Timeline Entries Policies ──────────────────────────────────────────────

CREATE POLICY "Team members can view timeline"
  ON timeline_entries FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE team_id = ANY(get_user_team_ids())));

CREATE POLICY "Team members can add timeline entries"
  ON timeline_entries FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE team_id = ANY(get_user_team_ids())));

-- ─── Status History Policies ────────────────────────────────────────────────

CREATE POLICY "Team members can view status history"
  ON status_history FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE team_id = ANY(get_user_team_ids())));

CREATE POLICY "Team members can add status history"
  ON status_history FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE team_id = ANY(get_user_team_ids())));

-- ─── Tasks Policies ─────────────────────────────────────────────────────────

CREATE POLICY "Team members can view team tasks"
  ON tasks FOR SELECT
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team members can update tasks"
  ON tasks FOR UPDATE
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Task creators and admins can delete"
  ON tasks FOR DELETE
  USING (created_by = auth.uid() OR team_id = ANY(get_user_team_ids()));

-- ─── Chat Policies ──────────────────────────────────────────────────────────

CREATE POLICY "Channel members can view channels"
  ON channels FOR SELECT
  USING (id IN (SELECT channel_id FROM channel_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can create channels"
  ON channels FOR INSERT
  WITH CHECK (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Channel members can view membership"
  ON channel_members FOR SELECT
  USING (user_id = auth.uid() OR channel_id IN (
    SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Channel members can join"
  ON channel_members FOR INSERT
  WITH CHECK (TRUE); -- Controlled by app logic

CREATE POLICY "Channel members can view messages"
  ON messages FOR SELECT
  USING (channel_id IN (SELECT channel_id FROM channel_members WHERE user_id = auth.uid()));

CREATE POLICY "Channel members can send messages"
  ON messages FOR INSERT
  WITH CHECK (channel_id IN (SELECT channel_id FROM channel_members WHERE user_id = auth.uid()));

CREATE POLICY "Message authors can edit"
  ON messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage reactions"
  ON message_reactions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view reactions"
  ON message_reactions FOR SELECT
  USING (message_id IN (
    SELECT id FROM messages WHERE channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage read receipts"
  ON message_read_receipts FOR ALL
  USING (user_id = auth.uid());

-- ─── Notifications Policies ─────────────────────────────────────────────────

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE); -- Controlled by app/triggers

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ─── Import History Policies ────────────────────────────────────────────────

CREATE POLICY "Team members can view import history"
  ON import_history FOR SELECT
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team members can create import records"
  ON import_history FOR INSERT
  WITH CHECK (team_id = ANY(get_user_team_ids()));

-- ─── Coverage Areas & Buyers Policies ───────────────────────────────────────

CREATE POLICY "Team members can manage coverage areas"
  ON coverage_areas FOR ALL
  USING (team_id = ANY(get_user_team_ids()));

CREATE POLICY "Team members can manage buyers"
  ON buyers FOR ALL
  USING (team_id = ANY(get_user_team_ids()));

-- ─── Call Recordings Policies ───────────────────────────────────────────────

CREATE POLICY "Team members can view recordings"
  ON call_recordings FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE team_id = ANY(get_user_team_ids())));

CREATE POLICY "Team members can create recordings"
  ON call_recordings FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE team_id = ANY(get_user_team_ids())));

CREATE POLICY "Recording owner can update"
  ON call_recordings FOR UPDATE
  USING (user_id = auth.uid());

-- ─── Referral Earnings Policies ─────────────────────────────────────────────

CREATE POLICY "Users can view own referral earnings"
  ON referral_earnings FOR SELECT
  USING (user_id = auth.uid());

-- ─── Access Codes Policies ──────────────────────────────────────────────────

CREATE POLICY "Anyone can validate access codes"
  ON access_codes FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can create access codes"
  ON access_codes FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "System can update access code uses"
  ON access_codes FOR UPDATE
  USING (TRUE);
```

### Part 4: Indexes for Performance

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES — Optimize common queries
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_leads_team_id ON leads(team_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_updated_at ON leads(updated_at DESC);
CREATE INDEX idx_leads_deal_score ON leads(deal_score DESC);

CREATE INDEX idx_timeline_lead_id ON timeline_entries(lead_id);
CREATE INDEX idx_timeline_created_at ON timeline_entries(created_at DESC);

CREATE INDEX idx_status_history_lead_id ON status_history(lead_id);

CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_user_id ON messages(user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);

CREATE INDEX idx_call_recordings_lead_id ON call_recordings(lead_id);

CREATE INDEX idx_buyers_team_id ON buyers(team_id);
CREATE INDEX idx_coverage_areas_team_id ON coverage_areas(team_id);
```

### Part 5: Database Functions

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS — Server-side logic
-- ═══════════════════════════════════════════════════════════════════════════════

-- Dashboard stats for a team
CREATE OR REPLACE FUNCTION get_team_dashboard_stats(p_team_id UUID)
RETURNS TABLE (
  total_leads BIGINT,
  active_leads BIGINT,
  pipeline_value DECIMAL,
  closed_won BIGINT,
  closed_lost BIGINT,
  avg_deal_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_leads,
    COUNT(*) FILTER (WHERE status NOT IN ('closed-won', 'closed-lost'))::BIGINT AS active_leads,
    COALESCE(SUM(property_value) FILTER (WHERE status NOT IN ('closed-won', 'closed-lost')), 0) AS pipeline_value,
    COUNT(*) FILTER (WHERE status = 'closed-won')::BIGINT AS closed_won,
    COUNT(*) FILTER (WHERE status = 'closed-lost')::BIGINT AS closed_lost,
    COALESCE(AVG(deal_score), 0) AS avg_deal_score
  FROM leads
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lead activity summary
CREATE OR REPLACE FUNCTION get_lead_activity_summary(p_lead_id UUID)
RETURNS TABLE (
  total_calls BIGINT,
  total_emails BIGINT,
  total_meetings BIGINT,
  total_notes BIGINT,
  last_contact TIMESTAMP WITH TIME ZONE,
  days_since_contact INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE type = 'call')::BIGINT,
    COUNT(*) FILTER (WHERE type = 'email')::BIGINT,
    COUNT(*) FILTER (WHERE type = 'meeting')::BIGINT,
    COUNT(*) FILTER (WHERE type = 'note')::BIGINT,
    MAX(created_at),
    EXTRACT(DAY FROM NOW() - MAX(created_at))::INTEGER
  FROM timeline_entries
  WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate deal score on lead insert/update
CREATE OR REPLACE FUNCTION calculate_deal_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER;
  v_value_score DECIMAL;
  v_prob_score DECIMAL;
  v_engage_score DECIMAL;
  v_urgency_score DECIMAL;
  v_comp_score DECIMAL;
BEGIN
  v_value_score := LEAST(COALESCE(NEW.property_value, 0) / 500000.0, 1) * 100;
  v_prob_score := COALESCE(NEW.probability, 50);
  v_engage_score := ((COALESCE(NEW.engagement_level, 3) - 1) / 4.0) * 100;
  v_urgency_score := ((COALESCE(NEW.timeline_urgency, 3) - 1) / 4.0) * 100;
  v_comp_score := ((5 - COALESCE(NEW.competition_level, 3)) / 4.0) * 100;

  v_score := ROUND(
    v_value_score * 0.30 +
    v_prob_score * 0.25 +
    v_engage_score * 0.20 +
    v_urgency_score * 0.15 +
    v_comp_score * 0.10
  );

  NEW.deal_score := GREATEST(0, LEAST(100, v_score));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_calculate_score
  BEFORE INSERT OR UPDATE OF property_value, probability, engagement_level, timeline_urgency, competition_level
  ON leads
  FOR EACH ROW EXECUTE FUNCTION calculate_deal_score();
```

## 5. Set Up Storage Buckets

In your Supabase dashboard, go to **Storage** and create these buckets:

1. **`avatars`** — User profile photos
   - Public: Yes
   - File size limit: 2MB
   - Allowed types: image/*

2. **`lead-photos`** — Property photos
   - Public: Yes
   - File size limit: 10MB
   - Allowed types: image/*

3. **`chat-attachments`** — Chat file uploads
   - Public: No (authenticated access)
   - File size limit: 50MB
   - Allowed types: *

4. **`call-recordings`** — Audio recordings
   - Public: No
   - File size limit: 100MB
   - Allowed types: audio/*

5. **`import-files`** — PDF/CSV uploads
   - Public: No
   - File size limit: 25MB
   - Allowed types: application/pdf, text/csv, application/vnd.ms-excel

### Storage Policies (run in SQL Editor)

```sql
-- Avatar policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Lead photos policies
CREATE POLICY "Team members can view lead photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'lead-photos');

CREATE POLICY "Team members can upload lead photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lead-photos' AND auth.uid() IS NOT NULL);

-- Chat attachments policies
CREATE POLICY "Authenticated users can view chat files" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);
```

## 6. Enable Realtime

In your Supabase dashboard, go to **Database > Replication** and enable realtime for:

- ✅ `messages` — Real-time chat
- ✅ `team_members` — Presence/status updates
- ✅ `notifications` — Push notifications
- ✅ `leads` — Lead updates across team
- ✅ `tasks` — Task assignments

Or run this SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

## 7. Test Connection

After setting up your `.env` file with real credentials, start the dev server:

```bash
npm run dev
```

Open the browser console — you should see:
- No Supabase errors
- Auth state changes logging

To verify the connection in-app, go to **Settings > Data** tab. The connection status indicator will show:
- 🟢 **Connected** — Supabase is working
- 🟡 **Demo Mode** — No Supabase configured (using local state)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Invalid API key` | Double-check your anon key in `.env` |
| `relation does not exist` | Run all SQL parts in order |
| `RLS policy violation` | Check that the user is authenticated and is a team member |
| `CORS error` | Your Supabase URL might be wrong |
| `realtime not working` | Enable the table in Database > Replication |

## Regenerating TypeScript Types

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Generate types from your project
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```
