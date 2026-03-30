import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff, Database, ExternalLink, Copy, Check, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendWelcomeEmail } from '../lib/email';
import { referralService } from '../lib/referral-service';

type AuthMode = 'login' | 'signup' | 'forgot' | 'mfa';

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

export default function Login() {
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
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [partialUser, setPartialUser] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    referralCode: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true') {
      setMode('signup');
    }
  }, []);

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

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow team members to manage events" ON public.calendar_events;
CREATE POLICY "Allow team members to manage events"
    ON public.calendar_events
    FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = calendar_events.team_id
    ));

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
    const avatar = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    
    // updateProfile just sets basic info, we need fetchProfile to get the role, etc.
    store.updateProfile({
      id: user.id,
      email: user.email || form.email,
      name: displayName,
      avatar,
    });

    // CRITICAL: Fetch the full profile from Supabase to get user.role and other DB fields
    console.log('[Auth] Fetching full profile for:', user.id);
    await store.fetchProfile(user.id);
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

  const handleVerifyMfa = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!mfaFactorId || !mfaCode || !partialUser) return;
    
    setLoading(true);
    setError(null);
    try {
      if (!supabase) throw new Error('Supabase not configured');
      console.log('[Auth] MFA Challenge initiated...', { factorId: mfaFactorId });
      
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) {
        console.error('[Auth] MFA Challenge Error:', challengeError);
        throw challengeError;
      }
      
      console.log('[Auth] MFA Challenge success, verifying code...', { challengeId: challenge.id });
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode
      });
      
      if (verifyError) {
        console.error('[Auth] MFA Verify Error:', verifyError);
        throw verifyError;
      }
      
      console.log('[Auth] MFA verified successfully:', verifyData);
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        await finalizeLogin(sessionData.session.user);
      } else {
        await finalizeLogin(partialUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA code');
      setLoading(false);
    }
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
            console.log('[Auth] User signed in, checking MFA level...');
            const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalError) {
               console.error('[Auth] MFA AAL Check Error:', aalError);
            }
            
            console.log('[Auth] AAL Data:', aalData);

            if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
              console.log('[Auth] MFA required (aal2 next)');
              const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
              if (factorsError) {
                 console.error('[Auth] List Factors Error:', factorsError);
              }
              
              console.log('[Auth] All factors:', factors);
              const totpFactor = factors?.totp?.[0] || factors?.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');
              
              if (totpFactor) {
                console.log('[Auth] Found verified TOTP factor:', totpFactor.id);
                setMfaFactorId(totpFactor.id);
                setPartialUser(data.user);
                setMode('mfa');
                setLoading(false);
                return;
              } else {
                console.warn('[Auth] MFA required but no verified TOTP factors found. Check enrolment status.');
              }
            }
            
            console.log('[Auth] Proceeding to final login (aal1 or no MFA)');
            await finalizeLogin(data.user);
          }
        } else if (mode === 'signup') {
          const { data, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: { 
                full_name: form.name.trim(),
                referral_code: referralService.generateCode(form.name.trim())
              },
            },
          });

          // Check for referral code validation
          if (form.referralCode.trim() && data.user) {
            const referrerId = await referralService.validateCode(form.referralCode);
            if (referrerId) {
              await referralService.recordReferral(referrerId, data.user.id, form.referralCode);
            }
          }

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

  const inputClass = 'w-full pl-10 pr-4 py-3 text-sm rounded-xl border transition-colors outline-none';
  const inputStyle = {
    background: 'var(--t-input-bg)',
    borderColor: 'var(--t-border)',
    color: 'var(--t-text)',
    '--tw-ring-color': 'var(--t-primary-dim)'
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--t-background)' }}>
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(to bottom right, var(--t-primary-dim), rgba(15, 23, 42, 0.9))'
        }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMyAxLjM0MyAzIDN2MThsLTMgM0gxOGwtMy0zVjIxYzAtMS42NTcgMS4zNDMtMyAzLTNoMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--t-primary)' }}
            >
              <Building2 size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">WholeScale</h1>
              <p className="text-[11px] uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--t-primary)' }}>OS</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--t-text-muted)' }}>
            The complete real estate CRM for wholesalers. Track leads, manage deals,
            map coverage areas, and close faster — all in one platform.
          </p>
        </div>

        <div className="relative space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--t-success-dim)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--t-success)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Smart Lead Scoring</p>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>AI-powered deal scores from 0-100</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(var(--t-accent-rgb, 139, 92, 246), 0.2)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--t-accent, #a78bfa)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Team Collaboration</p>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Real-time chat, tasks & assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--t-primary-dim)' }}
            >
              <CheckCircle2 size={20} style={{ color: 'var(--t-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Interactive Maps</p>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Coverage areas, buyer pins, and more</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            {isSupabaseConfigured ? (
              <><Wifi size={12} style={{ color: 'var(--t-success)' }} /><span className="text-xs" style={{ color: 'var(--t-success)' }}>Connected to Supabase</span></>
            ) : (
              <><WifiOff size={12} style={{ color: 'var(--t-warning)' }} /><span className="text-xs" style={{ color: 'var(--t-warning)' }}>Demo Mode</span></>
            )}
          </div>
          <p className="text-xs opacity-40" style={{ color: 'var(--t-text)' }}>© 2026 WholeScale OS. All rights reserved.</p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--t-primary)' }}
            >
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">WholeScale</h1>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--t-primary)' }}>OS</p>
            </div>
          </div>

          {/* Connection status on mobile */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            {isSupabaseConfigured ? (
              <><Wifi size={12} style={{ color: 'var(--t-success)' }} /><span className="text-xs" style={{ color: 'var(--t-success)' }}>Connected to Supabase</span></>
            ) : (
              <><WifiOff size={12} style={{ color: 'var(--t-warning)' }} /><span className="text-xs" style={{ color: 'var(--t-warning)' }}>Demo Mode — data resets on refresh</span></>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
              {mode === 'login'
                ? 'Sign in to access your WholeScale dashboard'
                : mode === 'signup'
                ? 'Start managing deals in minutes'
                : 'We\'ll send you a reset link'}
            </p>
          </div>

          {/* ═══ DATABASE SETUP ERROR ═══ */}
          {showDbSetup && (
            <div className="mb-6 p-4 rounded-2xl border" style={{ 
              backgroundColor: 'var(--t-warning-dim)',
              borderColor: 'var(--t-warning-border)'
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Database size={18} style={{ color: 'var(--t-warning)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-warning)' }}>Database Setup Required</h3>
              </div>
              <p className="text-xs mb-4" style={{ color: 'color-mix(in srgb, var(--t-warning) 80%, black)' }}>
                Your Supabase project is connected but has no tables yet. Follow these 3 steps:
              </p>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--t-warning) 20%, transparent)', color: 'var(--t-warning)' }}
                  >1</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Open Supabase SQL Editor</p>
                    <a
                      href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs hover:opacity-80 mt-1"
                      style={{ color: 'var(--t-primary)' }}
                    >
                      Open SQL Editor <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--t-warning-dim)', color: 'var(--t-warning)' }}>2</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium mb-1.5">Copy & paste this SQL, then click "Run"</p>
                    <button
                      onClick={copySqlUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
                      style={{ background: 'var(--t-primary)' }}
                    >
                      {sqlCopied ? <><Check size={12} />Copied!</> : <><Copy size={12} />Copy Setup SQL</>}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--t-warning-dim)', color: 'var(--t-warning)' }}>3</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Come back here and sign up again!</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'color-mix(in srgb, var(--t-warning) 20%, transparent)' }}>
                <p className="text-[10px]" style={{ color: 'color-mix(in srgb, var(--t-warning) 50%, black)' }}>
                  💡 The SQL creates all tables, triggers, security policies, and a default team for you automatically.
                </p>
              </div>
            </div>
          )}

          {/* ═══ EMAIL FIX INSTRUCTIONS ═══ */}
          {showEmailFix && (
            <div className="mb-6 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--t-warning-dim)', borderColor: 'var(--t-warning-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={18} style={{ color: 'var(--t-warning)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-warning)' }}>Fix: Disable Email Confirmation</h3>
              </div>
              <p className="text-xs mb-4" style={{ color: 'rgba(var(--t-text-rgb), 0.7)' }}>
                Supabase's free email service has a strict rate limit (~3 emails/hour). 
                The quickest fix is to disable email confirmation so you can sign up instantly:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--t-warning-dim)', color: 'var(--t-warning)' }}>1</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Open Supabase Auth Settings</p>
                    <a
                      href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/auth/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs hover:opacity-80 mt-1"
                      style={{ color: 'var(--t-primary)' }}
                    >
                      Open Auth Settings <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--t-warning) 20%, transparent)', color: 'var(--t-warning)' }}
                  >2</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Click "Email" provider → Toggle OFF "Confirm email"</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'color-mix(in srgb, var(--t-warning) 60%, black)' }}>
                      This lets users sign up and log in immediately without needing to click a verification link.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--t-warning) 20%, transparent)', color: 'var(--t-warning)' }}
                  >3</span>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Click "Save" → Come back and try again</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t space-y-2" style={{ borderColor: 'color-mix(in srgb, var(--t-warning) 20%, transparent)' }}>
                <p className="text-[10px]" style={{ color: 'color-mix(in srgb, var(--t-warning) 50%, black)' }}>
                  💡 You can re-enable email confirmation later after setting up a custom SMTP (like Resend — 3,000 emails/mo free).
                </p>
                <button
                  onClick={() => { setShowEmailFix(false); setError(null); }}
                  className="text-xs hover:opacity-80 font-medium"
                  style={{ color: 'var(--t-primary)' }}
                >
                  Dismiss & try again →
                </button>
              </div>
            </div>
          )}

          {/* Regular error */}
          {error && !showDbSetup && !showEmailFix && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl border" style={{ 
              backgroundColor: 'var(--t-error-dim)',
              borderColor: 'var(--t-error-border)'
            }}>
              <AlertCircle size={16} className="shrink-0" style={{ color: 'var(--t-error)' }} />
              <p className="text-sm" style={{ color: 'var(--t-error)' }}>{error}</p>
            </div>
          )}

          {info && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl border"
              style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}
            >
              <CheckCircle2 size={16} className="shrink-0" style={{ color: 'var(--t-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--t-primary)' }}>{info}</p>
            </div>
          )}

          {forgotSent && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-xl border" style={{ 
              backgroundColor: 'var(--t-success-dim)',
              borderColor: 'var(--t-success-border)'
            }}>
              <CheckCircle2 size={16} className="shrink-0" style={{ color: 'var(--t-success)' }} />
              <p className="text-sm" style={{ color: 'var(--t-success)' }}>Password reset link sent to {form.email}</p>
            </div>
          )}

          {mode === 'mfa' ? (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Authenticator Code</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className={inputClass}
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.25em' }}
                    disabled={loading}
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || mfaCode.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--t-primary)' }}
              >
                {loading ? <><Loader2 size={16} className="animate-spin" />Verifying...</> : 'Verify & Sign In'}
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                  <input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className={inputClass}
                    style={inputStyle}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <Users size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="WHOLESCALE-AGENT-1234"
                      value={form.referralCode}
                      onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 ml-1">Enter a code to get 1 month free and 20% off certifications!</p>
                </div>
                {fieldErrors.name && <p className="text-xs mt-1" style={{ color: 'var(--t-error)' }}>{fieldErrors.name}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className={inputClass}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && <p className="text-xs mt-1" style={{ color: 'var(--t-error)' }}>{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10`}
                    style={inputStyle}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors"
                    style={{ color: 'var(--t-text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-xs mt-1" style={{ color: 'var(--t-error)' }}>{fieldErrors.password}</p>}
              </div>
            )}

            {/* Confirm password (signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={inputClass}
                    style={inputStyle}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.confirmPassword && <p className="text-xs mt-1" style={{ color: 'var(--t-error)' }}>{fieldErrors.confirmPassword}</p>}
              </div>
            )}

            {/* Invite code (signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--t-text-muted)' }}>Team Invite Code <span style={{ color: 'var(--t-text-muted)' }}>(optional — join an existing team)</span></label>
                <input
                  value={form.inviteCode}
                  onChange={(e) => setForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                  placeholder="WS-XXXXXX"
                  className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none focus:ring-2 font-mono tracking-wider"
                  style={{ 
                    backgroundColor: 'var(--t-surface)',
                    border: '1px solid var(--t-border)',
                    color: 'var(--t-text)',
                    '--tw-ring-color': 'var(--t-primary-dim)' 
                  } as any}
                  disabled={loading}
                />
                {form.inviteCode.trim() && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--t-primary)' }}>
                    ✨ You'll be added to the team after creating your account
                  </p>
                )}
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => switchMode('forgot')} 
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--t-primary)' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'var(--t-primary)',
                '--tw-shadow-color': 'var(--t-primary-dim)'
              } as any}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />Processing...</>
              ) : (
                <>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}<ArrowRight size={16} /></>
              )}
            </button>
          </form>
          )}

          {/* Demo login button */}
          <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--t-border-subtle)' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3" style={{ background: 'var(--t-background)', color: 'var(--t-text-muted)' }}>Or continue with demo</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all mt-6"
              style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--t-warning-dim)' }}>
                <Database size={14} style={{ color: 'var(--t-warning)' }} />
              </div>
              Try with Demo Account
            </button>

          {/* Mode switcher */}
          <p className="mt-8 text-center text-sm" style={{ color: 'var(--t-text-muted)' }}>
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold hover:underline"
                    style={{ color: 'var(--t-primary)' }}
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold hover:underline"
                    style={{ color: 'var(--t-primary)' }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
        </div>
      </div>
    </div>
  );
}
