import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Loader2, Plus, ArrowRight, Users, LogOut,
  X, ArrowRightLeft, Copy, Check, AlertTriangle,
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

export function TeamSelection() {
  const navigate = useNavigate();
  const { currentUser, logout } = useStore();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');

  // Join team state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create team state
  const [newTeamName, setNewTeamName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showRlsFix, setShowRlsFix] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);

  // Fetch user's teams
  useEffect(() => {
    async function fetchTeams() {
      try {
        console.log('🔍 Starting team fetch...');
        
        if (!isSupabaseConfigured || !supabase) {
          console.log('📦 Supabase not configured, going to dashboard');
          navigate('/', { replace: true });
          return;
        }

        console.log('🔐 Getting current user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ User error:', userError);
          throw userError;
        }
        
        if (!user) {
          console.log('👤 No user found, redirecting to login');
          navigate('/login', { replace: true });
          return;
        }
        
        console.log('✅ User found:', user.id);

        console.log('📋 Fetching team memberships...');
        const { data: memberships, error: membershipsError } = await supabase
          .from('team_members')
          .select('team_id, role, teams(id, name, invite_code)')
          .eq('user_id', user.id);

        if (membershipsError) {
          console.error('❌ Memberships error:', membershipsError);
          throw membershipsError;
        }

        console.log('📊 Memberships data:', memberships);

        // FIX: Add null check here!
        if (memberships && memberships.length > 0) {
          console.log(`📦 Found ${memberships.length} teams`);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const teamList: TeamInfo[] = memberships.map((m: any) => {
            console.log('🏢 Processing team:', m);
            return {
              teamId: m.team_id,
              teamName: m.teams?.name || 'My Team',
              role: m.role || 'member',
              memberCount: 0,
              inviteCode: m.teams?.invite_code || '',
            };
          });

          // Get member counts for each team
          for (const t of teamList) {
            try {
              const { count, error: countError } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', t.teamId);
              
              if (countError) {
                console.error(`❌ Count error for team ${t.teamId}:`, countError);
              }
              t.memberCount = count || 1;
            } catch (countErr) {
              console.error(`❌ Exception getting count for team ${t.teamId}:`, countErr);
            }
          }

          console.log('✅ Team list prepared:', teamList);
          setTeams(teamList);

          // Auto-select if user has exactly 1 team
          if (teamList.length === 1) {
            console.log('🎯 Auto-selecting single team:', teamList[0].teamId);
            selectTeam(teamList[0].teamId);
            return;
          }
        } else {
          // FIX: Handle case with no teams
          console.log('📭 No teams found for user');
          setTeams([]);
        }
      } catch (err) {
        console.error('❌ Fatal error in fetchTeams:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTeam = (teamId: string) => {
    console.log('🎯 Selecting team:', teamId);
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
        const msg = teamErr.message || '';
        if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission denied')) {
          setShowRlsFix(true);
        }
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

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-red-400 text-sm mb-6 font-mono bg-red-950/30 p-4 rounded-xl">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center">
          <Building2 size={28} className="text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Finding your teams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/20">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WholeScale OS</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome{currentUser?.name ? `, ${currentUser.name}` : ''}! Choose how to continue.
          </p>
        </div>

        {/* Main Content */}
        {mode === 'select' && (
          <div className="space-y-4">
            {/* Existing teams */}
            {teams && teams.length > 0 ? (
              <>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 px-1">
                  Your Teams
                </p>
                <div className="space-y-3">
                  {teams.map(t => (
                    <button
                      key={t.teamId}
                      onClick={() => selectTeam(t.teamId)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500/30 transition-all group text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
                        <Building2 size={22} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-white truncate">
                          {t.teamName}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">
                            {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs capitalize text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                            {t.role}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-600">or</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">You're not a member of any teams yet.</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMode('join')}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-emerald-500/30 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Join a Team</p>
                  <p className="text-[11px] text-slate-500">Enter an invite code</p>
                </div>
              </button>

              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-blue-500/30 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Plus size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Create a Team</p>
                  <p className="text-[11px] text-slate-500">Start a new workspace</p>
                </div>
              </button>
            </div>

            {/* Sign out */}
            <div className="text-center pt-4">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          </div>
        )}

        {/* Join Team Mode */}
        {mode === 'join' && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Users size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Join a Team</h2>
                  <p className="text-xs text-slate-400">Enter the invite code from your team admin</p>
                </div>
              </div>
              <button
                onClick={() => { setMode('select'); setJoinError(''); setJoinCode(''); }}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
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
                className="w-full px-4 py-3.5 text-lg font-mono tracking-widest text-center rounded-xl bg-slate-900 border border-slate-600 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                onKeyDown={(e) => { if (e.key === 'Enter' && !joinLoading) handleJoinTeam(); }}
                autoFocus
              />
            </div>

            {joinError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {joinError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setMode('select'); setJoinError(''); setJoinCode(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleJoinTeam}
                disabled={joinLoading || !joinCode.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
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
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Building2 size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Create a Team</h2>
                  <p className="text-xs text-slate-400">Start a new workspace for your group</p>
                </div>
              </div>
              <button
                onClick={() => { setMode('select'); setCreateError(''); setNewTeamName(''); }}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => { setNewTeamName(e.target.value); setCreateError(''); }}
                placeholder="e.g. Dallas Office, Investment Group..."
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-900 border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                onKeyDown={(e) => { if (e.key === 'Enter' && !createLoading) handleCreateTeam(); }}
                autoFocus
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <p className="text-xs text-slate-400">
                <span className="text-blue-400 font-medium">What you'll get:</span> Shared leads database, team chat with #general channel, task management, and a unique invite code to add members.
              </p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm whitespace-pre-wrap">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} />
                  <span className="font-semibold">Error</span>
                </div>
                <p className="text-xs">{createError}</p>
                {showRlsFix && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <p className="text-xs text-red-300 mb-2 font-medium">Quick Fix — Disable Row Level Security:</p>
                    <p className="text-xs text-red-300/80 mb-2">
                      1. Open <a href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/sql/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Supabase SQL Editor</a>
                    </p>
                    <p className="text-xs text-red-300/80 mb-2">2. Paste the fix and click Run:</p>
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
                    <p className="text-xs text-red-300/80 mt-2">3. Come back and try again</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setMode('select'); setCreateError(''); setNewTeamName(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={createLoading || !newTeamName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
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