import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff, Database, ExternalLink, Copy, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendWelcomeEmail } from '../lib/email';

type AuthMode = 'login' | 'signup' | 'forgot';

// Detect database setup errors
function isDatabaseSetupError(msg: string): boolean {
  const patterns = [
    'database error saving new user',
    'database error',
    'relation "public.profiles" does not exist',
    'relation "profiles" does not exist',
    'function public.handle_new_user',
    'could not find',
    'schema',
    '500',
  ];
  const lower = msg.toLowerCase();
  return patterns.some(p => lower.includes(p));
}

export function Login() {
  const navigate = useNavigate();
  const { login, signup, clearAuthError } = useStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [showEmailFix, setShowEmailFix] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setFieldErrors({});
    setError(null);
    setInfo(null);
    setShowDbSetup(false);
    setShowEmailFix(false);
    clearAuthError();
    setForgotSent(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (mode !== 'forgot') {
      if (form.password.length < 6) e.password = 'Minimum 6 characters';
    }
    if (mode === 'signup') {
      if (form.name.trim().length < 2) e.name = 'Enter your full name';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const copySqlUrl = async () => {
    const sql = `-- WholeScale OS Quick Setup
-- Paste this in Supabase SQL Editor → Run

-- Clean up any previous attempts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT, full_name TEXT, avatar_url TEXT, phone TEXT,
  role TEXT DEFAULT 'member', streak INTEGER DEFAULT 0,
  task_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,
  last_login DATE, referral_code TEXT UNIQUE DEFAULT ('WS-' || upper(substr(md5(random()::text), 1, 6))),
  referred_by UUID REFERENCES profiles(id), settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Team',
  invite_code TEXT UNIQUE DEFAULT ('WS-' || upper(substr(md5(random()::text), 1, 6))),
  owner_id UUID REFERENCES profiles(id), settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', status TEXT DEFAULT 'online',
  custom_status TEXT, last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id), assigned_to TEXT,
  name TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, state TEXT, zip TEXT,
  lat DECIMAL(10,6), lng DECIMAL(10,6), property_value DECIMAL(12,2), offer_amount DECIMAL(12,2),
  property_type TEXT, status TEXT DEFAULT 'new', source TEXT, import_source TEXT,
  probability INTEGER DEFAULT 50, engagement_level INTEGER DEFAULT 3,
  timeline_urgency INTEGER DEFAULT 3, competition_level INTEGER DEFAULT 3,
  deal_score INTEGER, notes TEXT, photos TEXT[] DEFAULT '{}', last_contact DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels, messages, tasks, notifications, etc.
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL, type TEXT DEFAULT 'group', description TEXT DEFAULT '',
  avatar TEXT DEFAULT '💬', created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (channel_id, user_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id), sender_name TEXT, content TEXT,
  type TEXT DEFAULT 'text', mentions UUID[] DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]', edited BOOLEAN DEFAULT FALSE, deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id), lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium', due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT, title TEXT, message TEXT, read BOOLEAN DEFAULT FALSE,
  link TEXT, data JSONB DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS timeline_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id), type TEXT, content TEXT,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT, to_status TEXT NOT NULL, changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS coverage_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT, coordinates JSONB DEFAULT '[]', color TEXT DEFAULT '#3b82f6',
  opacity DECIMAL DEFAULT 0.2, notes TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS buyers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT, lat DECIMAL(10,6), lng DECIMAL(10,6),
  budget_min DECIMAL(12,2), budget_max DECIMAL(12,2), active BOOLEAN DEFAULT TRUE,
  deal_score INTEGER, notes TEXT, criteria JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id), duration INTEGER, audio_url TEXT,
  transcription JSONB, analyzed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS import_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, user_id UUID REFERENCES profiles(id),
  source TEXT, filename TEXT, rows_imported INTEGER DEFAULT 0, rows_skipped INTEGER DEFAULT 0,
  rows_duplicated INTEGER DEFAULT 0, status TEXT DEFAULT 'pending', errors JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE, max_uses INTEGER, uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: auto-create team for new users
CREATE OR REPLACE FUNCTION auto_create_team() RETURNS TRIGGER AS $$
DECLARE v_team_id UUID;
BEGIN
  INSERT INTO teams (name, owner_id) VALUES (COALESCE(NEW.full_name, 'My') || '''s Team', NEW.id) RETURNING id INTO v_team_id;
  INSERT INTO team_members (team_id, user_id, role, status) VALUES (v_team_id, NEW.id, 'admin', 'online');
  INSERT INTO channels (team_id, name, type, description, created_by) VALUES (v_team_id, 'general', 'group', 'Team chat', NEW.id);
  INSERT INTO channel_members (channel_id, user_id) VALUES ((SELECT id FROM channels WHERE team_id = v_team_id LIMIT 1), NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_create_team();

-- RLS disabled for development (enable later for production)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes DISABLE ROW LEVEL SECURITY;

-- No RLS policies needed in development mode
-- RLS is disabled above, so all authenticated users have full access
-- Re-enable RLS + add policies when going to production

-- Realtime (safe: drop first ignoring errors, then re-add ignoring errors)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE leads; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;

    try {
      await navigator.clipboard.writeText(sql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = sql;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
    }
  };

  // Helper: join a team by invite code in Supabase
  const joinTeamByInviteCode = async (inviteCode: string, userId: string): Promise<{ success: boolean; teamName?: string }> => {
    if (!supabase || !inviteCode.trim()) return { success: false };
    
    try {
      // 1. Find the team by invite code
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name')
        .eq('invite_code', inviteCode.trim())
        .single();
      
      if (teamErr || !team) {
        console.warn('Invalid invite code:', inviteCode);
        return { success: false };
      }

      // 2. Check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Already a member — just set as preferred team
        localStorage.setItem('wholescale-preferred-team', team.id);
        return { success: true, teamName: team.name };
      }

      // 3. Insert user as a member of the invited team
      const { error: insertErr } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'member',
          status: 'online',
        });

      if (insertErr) {
        console.error('Error joining team:', insertErr);
        return { success: false };
      }

      // 4. Add them to the team's general channel
      const { data: generalChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('team_id', team.id)
        .eq('name', 'general')
        .maybeSingle();

      if (generalChannel) {
        await supabase
          .from('channel_members')
          .insert({
            channel_id: generalChannel.id,
            user_id: userId,
          })
          .then(() => {}); // ignore if already exists
      }

      // 5. Store preferred team so SupabaseSync loads the right one
      localStorage.setItem('wholescale-preferred-team', team.id);

      return { success: true, teamName: team.name };
    } catch (err) {
      console.error('joinTeamByInviteCode error:', err);
      return { success: false };
    }
  };

  // Helper: finalize login after successful auth
  const finalizeLogin = async (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }, name?: string) => {
    const displayName = name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User';
    const returnTo = new URLSearchParams(window.location.search).get('return_to');

    // If signup had an invite code, join that team BEFORE navigating
    if (form.inviteCode.trim() && supabase) {
      const result = await joinTeamByInviteCode(form.inviteCode.trim(), user.id);
      if (result.success) {
        console.log(`Joined team: ${result.teamName}`);
      }
    }

    login(user.email || form.email, form.password);
    const store = useStore.getState();
    store.updateProfile({
      id: user.id,
      email: user.email || form.email,
      name: displayName,
      avatar: displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    });
    sendWelcomeEmail(user.email || form.email, displayName).catch(() => {});
    
    // Redirect logic: return_to takes precedence, then team selection
    if (returnTo) {
      navigate(decodeURIComponent(returnTo));
    } else {
      // Go to team selection so user can pick/create/join a team
      navigate('/team-selection');
    }
  };

  // Helper: detect email-sending errors
  const isEmailSendError = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    return lower.includes('confirmation email') ||
      lower.includes('sending email') ||
      lower.includes('email not confirmed') ||
      lower.includes('email_not_confirmed') ||
      lower.includes('email send') ||
      lower.includes('smtp') ||
      lower.includes('rate limit') ||
      lower.includes('over_email_send_rate_limit');
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    setShowDbSetup(false);
    setShowEmailFix(false);

    try {
      if (isSupabaseConfigured && supabase) {
        if (mode === 'login') {
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });
          if (authError) {
            if (isDatabaseSetupError(authError.message)) {
              setError('Database tables not set up yet.');
              setShowDbSetup(true);
            } else if (authError.message.includes('Email not confirmed') || authError.message.includes('email_not_confirmed')) {
              // User exists but email not confirmed — show fix instructions
              setError('Email not confirmed yet.');
              setShowEmailFix(true);
            } else if (authError.message.includes('Invalid login') || authError.message.includes('invalid_credentials')) {
              setError('Invalid email or password. Check your credentials or create an account.');
            } else {
              setError(authError.message);
            }
            setLoading(false);
            return;
          }
          if (data.user) {
            await finalizeLogin(data.user);
          }
        } else if (mode === 'signup') {
          const { data, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: { full_name: form.name.trim() },
            },
          });

          // ─── Handle signup errors ───
          if (authError) {
            if (isDatabaseSetupError(authError.message)) {
              setError('Your Supabase database needs tables created first.');
              setShowDbSetup(true);
              setLoading(false);
              return;
            }

            // Email sending failed — but the user account WAS likely created.
            // Try signing them in immediately.
            if (isEmailSendError(authError.message)) {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
              });

              if (signInData?.user && !signInError) {
                // Success! Email confirmation is disabled or user was auto-confirmed
                await finalizeLogin(signInData.user, form.name.trim());
                return;
              }

              if (signInError && (signInError.message.includes('Email not confirmed') || signInError.message.includes('email_not_confirmed'))) {
                // User created but needs email confirmation which can't be sent
                setError('Account created but email verification is blocking login.');
                setShowEmailFix(true);
                setLoading(false);
                return;
              }

              // Some other sign-in error — show fix instructions
              setError('Account may have been created but email verification failed.');
              setShowEmailFix(true);
              setLoading(false);
              return;
            }

            setError(authError.message);
            setLoading(false);
            return;
          }

          // ─── Signup succeeded ───
          if (data.user) {
            if (data.user.identities && data.user.identities.length === 0) {
              // Duplicate user — try signing in instead
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
              });
              if (signInData?.user && !signInError) {
                await finalizeLogin(signInData.user, form.name.trim());
                return;
              }
              setError('An account with this email already exists. Try signing in instead.');
              setLoading(false);
              return;
            }

            // If we got a session, user is auto-confirmed (email confirmation disabled)
            if (data.session) {
              await finalizeLogin(data.user, form.name.trim());
              return;
            }

            // No session = needs email confirmation. Try signing in just in case.
            const { data: tryLogin, error: tryError } = await supabase.auth.signInWithPassword({
              email: form.email,
              password: form.password,
            });

            if (tryLogin?.user && !tryError) {
              await finalizeLogin(tryLogin.user, form.name.trim());
              return;
            }

            // Truly needs email confirmation
            if (tryError && (tryError.message.includes('Email not confirmed') || tryError.message.includes('email_not_confirmed'))) {
              setError('Account created but email verification is required.');
              setShowEmailFix(true);
              setLoading(false);
              return;
            }

            setInfo(`Account created! Check ${form.email} for a verification link.`);
            setMode('login');
            setLoading(false);
            return;
          }
        } else {
          // Forgot password
          const resetRedirect = window.location.origin + window.location.pathname + '#/email-confirmed';
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
            redirectTo: resetRedirect,
          });
          if (resetError) {
            if (isEmailSendError(resetError.message)) {
              setError('Failed to send reset email — email rate limit reached.');
              setShowEmailFix(true);
            } else {
              setError(resetError.message);
            }
          } else {
            setForgotSent(true);
          }
          setLoading(false);
          return;
        }
      } else {
        // Demo mode — always works
        if (mode === 'login') {
          login(form.email, form.password);
          navigate('/');
        } else if (mode === 'signup') {
          signup(form.name.trim(), form.email, form.password);
          navigate('/');
        } else {
          setForgotSent(true);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (isDatabaseSetupError(msg)) {
        setError('Database tables need to be created.');
        setShowDbSetup(true);
      } else if (isEmailSendError(msg)) {
        setError('Email sending failed.');
        setShowEmailFix(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    login('demo@wholescale.io', 'demo123');
    // Demo mode skips team selection — no Supabase
    navigate('/');
  };

  const inputClass = 'w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors';

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 bg-gradient-to-br from-brand-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMyAxLjM0MyAzIDN2MThsLTMgM0gxOGwtMy0zVjIxYzAtMS42NTcgMS4zNDMtMyAzLTNoMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center">
              <Building2 size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">WholeScale</h1>
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand-400 font-semibold">OS</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            The complete real estate CRM for wholesalers. Track leads, manage deals,
            map coverage areas, and close faster — all in one platform.
          </p>
        </div>

        <div className="relative space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Smart Lead Scoring</p>
              <p className="text-xs text-slate-500">AI-powered deal scores from 0-100</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Team Collaboration</p>
              <p className="text-xs text-slate-500">Real-time chat, tasks & assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Interactive Maps</p>
              <p className="text-xs text-slate-500">Coverage areas, buyer pins, and more</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            {isSupabaseConfigured ? (
              <><Wifi size={12} className="text-emerald-400" /><span className="text-xs text-emerald-400">Connected to Supabase</span></>
            ) : (
              <><WifiOff size={12} className="text-amber-400" /><span className="text-xs text-amber-400">Demo Mode</span></>
            )}
          </div>
          <p className="text-xs text-slate-600">© 2024 WholeScale OS. All rights reserved.</p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">WholeScale</h1>
              <p className="text-[10px] uppercase tracking-widest text-brand-400 font-semibold">OS</p>
            </div>
          </div>

          {/* Connection status on mobile */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            {isSupabaseConfigured ? (
              <><Wifi size={12} className="text-emerald-400" /><span className="text-xs text-emerald-400">Connected to Supabase</span></>
            ) : (
              <><WifiOff size={12} className="text-amber-400" /><span className="text-xs text-amber-400">Demo Mode — data resets on refresh</span></>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access your WholeScale dashboard'
                : mode === 'signup'
                ? 'Start managing deals in minutes'
                : 'We\'ll send you a reset link'}
            </p>
          </div>

          {/* ═══ DATABASE SETUP ERROR ═══ */}
          {showDbSetup && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Database size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-amber-300">Database Setup Required</h3>
              </div>
              <p className="text-xs text-amber-200/80 mb-4">
                Your Supabase project is connected but has no tables yet. Follow these 3 steps:
              </p>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">1</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Open Supabase SQL Editor</p>
                    <a
                      href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-1"
                    >
                      Open SQL Editor <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">2</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium mb-1.5">Copy & paste this SQL, then click "Run"</p>
                    <button
                      onClick={copySqlUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                    >
                      {sqlCopied ? <><Check size={12} />Copied!</> : <><Copy size={12} />Copy Setup SQL</>}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">3</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Come back here and sign up again!</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20">
                <p className="text-[10px] text-amber-200/50">
                  💡 The SQL creates all tables, triggers, security policies, and a default team for you automatically.
                </p>
              </div>
            </div>
          )}

          {/* ═══ EMAIL FIX INSTRUCTIONS ═══ */}
          {showEmailFix && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Mail size={18} className="text-orange-400" />
                <h3 className="text-sm font-bold text-orange-300">Fix: Disable Email Confirmation</h3>
              </div>
              <p className="text-xs text-orange-200/80 mb-4">
                Supabase's free email service has a strict rate limit (~3 emails/hour). 
                The quickest fix is to disable email confirmation so you can sign up instantly:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">1</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Open Supabase Auth Settings</p>
                    <a
                      href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/auth/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-1"
                    >
                      Open Auth Settings <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">2</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Click "Email" provider → Toggle OFF "Confirm email"</p>
                    <p className="text-[11px] text-orange-200/60 mt-0.5">
                      This lets users sign up and log in immediately without needing to click a verification link.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">3</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Click "Save" → Come back and try again</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-orange-500/20 space-y-2">
                <p className="text-[10px] text-orange-200/50">
                  💡 You can re-enable email confirmation later after setting up a custom SMTP (like Resend — 3,000 emails/mo free).
                </p>
                <button
                  onClick={() => { setShowEmailFix(false); setError(null); }}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium"
                >
                  Dismiss & try again →
                </button>
              </div>
            </div>
          )}

          {/* Regular error */}
          {error && !showDbSetup && !showEmailFix && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {info && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
              <p className="text-sm text-blue-400">{info}</p>
            </div>
          )}

          {forgotSent && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400">Password reset link sent to {form.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className={inputClass}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-xs text-red-400 mt-1">{fieldErrors.password}</p>}
              </div>
            )}

            {/* Confirm password (signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={inputClass}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.confirmPassword && <p className="text-xs text-red-400 mt-1">{fieldErrors.confirmPassword}</p>}
              </div>
            )}

            {/* Invite code (signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Team Invite Code <span className="text-slate-600">(optional — join an existing team)</span></label>
                <input
                  value={form.inviteCode}
                  onChange={(e) => setForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                  placeholder="WS-XXXXXX"
                  className="w-full px-4 py-3 text-sm rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-mono tracking-wider"
                  disabled={loading}
                />
                {form.inviteCode.trim() && (
                  <p className="text-[11px] text-brand-400/70 mt-1">
                    ✨ You'll be added to the team after creating your account
                  </p>
                )}
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-brand-400 hover:text-brand-300">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />Processing...</>
              ) : (
                <>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}<ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Demo login button */}
          <button
            onClick={handleDemoLogin}
            className="w-full mt-3 py-2.5 text-sm text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all"
          >
            🚀 Quick Demo Login (no account needed)
          </button>

          {/* Mode switcher */}
          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <button onClick={() => switchMode('signup')} className="text-brand-400 hover:text-brand-300 font-medium">
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="text-brand-400 hover:text-brand-300 font-medium">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
