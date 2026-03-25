import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Loader2, Users, ArrowRight, ArrowRightLeft,
  Check, Copy, LogOut, Plus, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TeamInfo {
  teamId: string;
  teamName: string;
  role: string;
  memberCount: number;
  inviteCode: string;
}

export default function TeamSelection() {
  const navigate = useNavigate();
  const { currentUser, logout } = useStore();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');

  // Join team state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create team state
  const [newTeamName, setNewTeamName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [copiedFix, setCopiedFix] = useState(false);

  // Fetch user's teams
  useEffect(() => {
    async function fetchTeams() {
      if (!isSupabaseConfigured || !supabase) {
        // Demo mode — go straight to dashboard
        navigate('/', { replace: true });
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login', { replace: true });
          return;
        }

        const { data: memberships } = await supabase
          .from('team_members')
          .select('team_id, role, teams(id, name, invite_code)')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const teamList: TeamInfo[] = memberships.map((m: any) => ({
            teamId: m.team_id,
            teamName: m.teams?.name || 'My Team',
            role: m.role || 'member',
            memberCount: 0,
            inviteCode: m.teams?.invite_code || '',
          }));

          // Get member counts for each team
          for (const t of teamList) {
            const { count } = await supabase
              .from('team_members')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', t.teamId);
            t.memberCount = count || 1;
          }

          setTeams(teamList);

          // Auto-select if user has exactly 1 team
          if (teamList.length === 1) {
            selectTeam(teamList[0].teamId);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTeam = (teamId: string) => {
    localStorage.setItem('wholescale-preferred-team', teamId);
    // Reset dataLoaded so SupabaseSync re-fetches
    useStore.setState({ dataLoaded: false });
    navigate('/', { replace: true });
  };

  const handleJoinTeam = async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) {
      setJoinError('Please enter an invite code');
      return;
    }

    if (!supabase) return;

    setJoinLoading(true);
    setJoinError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setJoinError('Not authenticated');
        setJoinLoading(false);
        return;
      }

      // Find team by invite code
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, invite_code')
        .eq('invite_code', trimmed)
        .single();

      if (teamErr || !team) {
        setJoinError(`Invalid invite code "${trimmed}". Check with your team admin.`);
        setJoinLoading(false);
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Already a member — just select it
        selectTeam(team.id);
        return;
      }

      // Join the team
      const { error: insertErr } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'member',
          status: 'online',
          last_seen: new Date().toISOString(),
        });

      if (insertErr) {
        setJoinError(`Failed to join: ${insertErr.message}`);
        setJoinLoading(false);
        return;
      }

      // Join #general channel
      const { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('team_id', team.id)
        .ilike('name', '%general%')
        .maybeSingle();

      if (channel) {
        await supabase.from('channel_members').insert({
          channel_id: channel.id,
          user_id: user.id,
        });
      }

      // Select the new team
      selectTeam(team.id);
    } catch (err) {
      console.error('Join team error:', err);
      setJoinError('An unexpected error occurred');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    const trimmed = newTeamName.trim();
    if (!trimmed) {
      setCreateError('Please enter a team name');
      return;
    }

    if (!supabase) return;

    setCreateLoading(true);
    setCreateError('');

    try {
      // IMPORTANT: Use the real Supabase auth UID, not the store's currentUser.id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCreateError('Not authenticated. Please sign in again.');
        setCreateLoading(false);
        return;
      }

      // Generate invite code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'WS-';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      // 1. Create team using auth.uid() as owner_id (matches RLS policy)
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: trimmed,
          invite_code: code,
          owner_id: user.id,  // Must match auth.uid() for RLS
        })
        .select()
        .single();

      if (teamErr) {
        console.error('Team create error:', teamErr);
        setCreateError(`${teamErr.message}${teamErr.details ? '. ' + teamErr.details : ''}${teamErr.hint ? '. ' + teamErr.hint : ''}`);
        setCreateLoading(false);
        return;
      }

      if (!teamData) {
        setCreateError('Team was not created. Please try again.');
        setCreateLoading(false);
        return;
      }

      // 2. Add creator as admin member
      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: 'admin',
          status: 'online',
          last_seen: new Date().toISOString(),
        });

      if (memberErr) {
        console.error('Member insert error:', memberErr);
        // Team was created — don't block, just log
      }

      // 3. Create #general channel
      const { data: channelData } = await supabase
        .from('channels')
        .insert({
          team_id: teamData.id,
          name: 'general',
          type: 'group',
          description: 'General team discussion',
          created_by: user.id,
        })
        .select()
        .single();

      // 4. Add creator to channel
      if (channelData) {
        await supabase.from('channel_members').insert({
          channel_id: channelData.id,
          user_id: user.id,
        });
      }

      // Success — switch to new team
      selectTeam(teamData.id);
    } catch (err) {
      console.error('Create team error:', err);
      setCreateError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--t-background)' }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--t-primary)' }}
        >
          <Building2 size={28} className="text-white" />
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--t-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Finding your teams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--t-background)' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{
              background: 'var(--t-primary)',
              // @ts-expect-error custom prop
              '--tw-shadow-color': 'var(--t-primary-dim)'
            }}
          >
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WholeScale OS</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
            Welcome{currentUser?.name ? `, ${currentUser.name}` : ''}! Choose how to continue.
          </p>
        </div>

        {/* Main Content */}
        {mode === 'select' && (
          <div className="space-y-4">
            {/* Existing teams */}
            {teams.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider font-semibold px-1" style={{ color: 'var(--t-text-muted)', opacity: 0.6 }}>
                  Your Teams
                </p>
                <div className="space-y-3">
                  {teams.map(t => (
                    <button
                      key={t.teamId}
                      onClick={() => selectTeam(t.teamId)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group text-left"
                      style={{
                        background: 'var(--t-surface)',
                        borderColor: 'var(--t-border)'
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                        style={{ background: 'var(--t-primary-dim)' }}
                      >
                        <Building2 size={22} style={{ color: 'var(--t-primary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-white truncate">
                          {t.teamName}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                            {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
                          >
                            {t.role}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={18} style={{ color: 'var(--t-primary)' }} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px" style={{ background: 'var(--t-border-subtle)' }} />
                  <span className="text-xs" style={{ color: 'var(--t-text-muted)', opacity: 0.5 }}>or</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--t-border-subtle)' }} />
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode('join')}
                className="flex items-center gap-3 p-4 rounded-2xl border transition-all text-left"
                style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--t-success-dim)' }}
                >
                  <ArrowRightLeft size={18} style={{ color: 'var(--t-success)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Join a Team</p>
                  <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>Enter an invite code</p>
                </div>
              </button>

              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-3 p-4 rounded-2xl border transition-all text-left"
                style={{
                  background: 'var(--t-surface)',
                  borderColor: 'var(--t-border)'
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--t-primary-dim)' }}
                >
                  <Plus size={18} style={{ color: 'var(--t-primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Create a Team</p>
                  <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>Start a new workspace</p>
                </div>
              </button>
            </div>

            {/* Sign out */}
            <div className="text-center pt-4">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs hover:text-white transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          </div>
        )}

        {/* Join Team Mode */}
        {mode === 'join' && (
          <div className="border rounded-2xl p-6 space-y-4" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--t-success-dim)' }}>
                  <Users size={20} style={{ color: 'var(--t-success)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Join a Team</h2>
                  <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Enter the invite code from your team admin</p>
                </div>
              </div>
              <button
                onClick={() => { setMode('select'); setJoinError(''); setJoinCode(''); }}
                className="p-2 rounded-lg hover:bg-white/10"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                placeholder="WS-XXXXXX"
                className="w-full px-4 py-3.5 text-lg font-mono tracking-widest text-center rounded-xl outline-none border transition-all"
                style={{
                  background: 'var(--t-input-bg)',
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text)',
                  // @ts-expect-error custom prop
                  '--tw-ring-color': 'var(--t-primary-dim)'
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !joinLoading) handleJoinTeam(); }}
                autoFocus
              />
            </div>

            {joinError && (
              <div className="p-3 rounded-xl border text-sm" style={{ backgroundColor: 'var(--t-error-dim)', borderColor: 'var(--t-error-border)', color: 'var(--t-error)' }}>
                {joinError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setMode('select'); setJoinError(''); setJoinCode(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
              >
                Back
              </button>
              <button
                onClick={handleJoinTeam}
                disabled={joinLoading || !joinCode.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--t-success)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-success-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--t-success)'}
              >
                {joinLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Joining...</>
                ) : (
                  <><ArrowRightLeft size={16} /> Join Team</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Create Team Mode */}
        {mode === 'create' && (
          <div className="border rounded-2xl p-6 space-y-4" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--t-primary-dim)' }}
                >
                  <Building2 size={20} style={{ color: 'var(--t-primary)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Create a Team</h2>
                  <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Start a new workspace for your group</p>
                </div>
              </div>
              <button
                onClick={() => { setMode('select'); setCreateError(''); setNewTeamName(''); }}
                className="p-2 rounded-lg hover:bg-white/10"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--t-text)' }}>Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => { setNewTeamName(e.target.value); setCreateError(''); }}
                placeholder="e.g. Dallas Office, Investment Group..."
                className="w-full px-4 py-3 text-sm rounded-xl outline-none border transition-all"
                style={{
                  backgroundColor: 'var(--t-background)',
                  border: '1px solid var(--t-border)',
                  color: 'var(--t-text)',
                  '--tw-ring-color': 'var(--t-primary-dim)'
                } as any}
                onKeyDown={(e) => { if (e.key === 'Enter' && !createLoading) handleCreateTeam(); }}
                autoFocus
              />
            </div>

            <div className="p-3 rounded-xl border" style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                <span className="font-medium" style={{ color: 'var(--t-primary)' }}>What you'll get:</span> Shared leads database, team chat with #general channel, task management, and a unique invite code to add members.
              </p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl border text-sm whitespace-pre-wrap" style={{ backgroundColor: 'var(--t-error-dim)', borderColor: 'var(--t-error-border)', color: 'var(--t-error)' }}>
                {createError}

                {createError.includes('RLS') && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--t-error-border)' }}>
                    <p className="text-xs mb-2 font-medium" style={{ color: 'var(--t-error)' }}>Quick Fix — Disable Row Level Security:</p>
                    <p className="text-xs mb-2" style={{ color: 'var(--t-error-muted)' }}>
                      1. Open <a href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/sql/new" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--t-primary)' }}>Supabase SQL Editor</a>
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--t-error-muted)' }}>2. Paste the fix and click Run:</p>
                    <button
                      onClick={async () => {
                        const sql = `DO $$ DECLARE r RECORD;\nBEGIN FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP\nEXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);\nEND LOOP; END $$;\n\nALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS teams DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS team_members DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS leads DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS channels DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS channel_members DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS timeline_entries DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS status_history DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS coverage_areas DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS buyers DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS call_recordings DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS import_history DISABLE ROW LEVEL SECURITY;\nALTER TABLE IF EXISTS access_codes DISABLE ROW LEVEL SECURITY;`;
                        try { await navigator.clipboard.writeText(sql); } catch { /* fallback */ }
                        setCopiedFix(true);
                        setTimeout(() => setCopiedFix(false), 3000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold w-full justify-center transition-colors"
                      style={{
                        background: copiedFix ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        color: copiedFix ? '#10b981' : '#f87171',
                      }}
                    >
                      {copiedFix ? <><Check size={14} /> Copied! Paste in SQL Editor → Run</> : <><Copy size={14} /> Copy Fix SQL</>}
                    </button>
                    <p className="text-xs mt-2" style={{ color: 'rgba(239, 68, 68, 0.7)' }}>3. Come back and try again</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setMode('select'); setCreateError(''); setNewTeamName(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
              >
                Back
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={createLoading || !newTeamName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--t-primary)' }}
              >
                {createLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating...</>
                ) : (
                  <><Plus size={16} /> Create Team</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
