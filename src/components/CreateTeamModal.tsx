import { useState } from 'react';
import { X, Plus, Loader2, Check, Building2, Copy, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { switchToTeam } from '../lib/team-utils';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RLS_FIX_SQL = `-- Fix RLS errors: Run this in Supabase SQL Editor
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
END LOOP; END $$;

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
ALTER TABLE IF EXISTS access_codes DISABLE ROW LEVEL SECURITY;`;

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'WS-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRlsError, setIsRlsError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);

  const inviteCode = generateInviteCode();

  if (!isOpen) return null;

  const isRlsPolicyError = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    return lower.includes('row-level security') || 
           lower.includes('row level security') || 
           lower.includes('rls') ||
           lower.includes('policy') ||
           lower.includes('permission denied') ||
           lower.includes('not authorized');
  };

  const copyFixSql = async () => {
    try {
      await navigator.clipboard.writeText(RLS_FIX_SQL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = RLS_FIX_SQL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 3000);
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a team name');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Team name must be at least 2 characters');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Team creation requires a database connection.');
      return;
    }

    setLoading(true);
    setError('');
    setIsRlsError(false);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError('Not authenticated. Please sign in again.');
        setLoading(false);
        return;
      }

      const newCode = inviteCode;

      // 1. Create the team
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .insert({
          name: trimmedName,
          invite_code: newCode,
          owner_id: authUser.id,
        })
        .select()
        .single();

      if (teamErr || !teamData) {
        console.error('Create team error:', teamErr);
        const msg = teamErr?.message || 'Unknown error';
        if (isRlsPolicyError(msg)) {
          setError(msg);
          setIsRlsError(true);
        } else {
          setError(`Failed to create team: ${msg}`);
        }
        setLoading(false);
        return;
      }

      const teamId = teamData.id;

      // 2. Add creator as admin
      const { error: memberErr } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: authUser.id,
          role: 'admin',
          status: 'online',
          last_seen: new Date().toISOString(),
        });

      if (memberErr) {
        console.error('Add member error:', memberErr);
        if (isRlsPolicyError(memberErr.message)) {
          setError(memberErr.message);
          setIsRlsError(true);
          // Try to clean up the team
          await supabase.from('teams').delete().eq('id', teamId);
          setLoading(false);
          return;
        }
      }

      // 3. Create #general channel
      const { data: channelData } = await supabase
        .from('channels')
        .insert({
          team_id: teamId,
          name: 'general',
          type: 'group',
          description: 'General team discussion',
          created_by: authUser.id,
        })
        .select()
        .single();

      if (channelData) {
        // 4. Add creator to #general channel
        await supabase
          .from('channel_members')
          .insert({
            channel_id: channelData.id,
            user_id: authUser.id,
          });
      }

      // Success!
      setCreatedCode(newCode);
      setSuccess(true);
    } catch (err) {
      console.error('Create team error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (isRlsPolicyError(msg)) {
        setError(msg);
        setIsRlsError(true);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToTeam = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('teams')
      .select('id')
      .eq('invite_code', createdCode)
      .single();
    if (data) {
      switchToTeam(data.id);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClose = () => {
    if (!success) {
      setName('');
      setError('');
      setIsRlsError(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--t-surface, #1e293b)',
          borderColor: 'var(--t-border, #334155)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--t-primary-dim, rgba(59,130,246,0.15))' }}
            >
              <Building2 size={20} style={{ color: 'var(--t-primary, #3b82f6)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--t-text, #fff)' }}>
                Create New Team
              </h2>
              <p className="text-xs" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
                Start a new workspace for your team
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--t-text-muted, #94a3b8)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-emerald-400 mb-1">
                Team Created! 🎉
              </h3>
              <p className="text-sm" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
                "{name.trim()}" is ready. Share the invite code to add members.
              </p>
            </div>

            {/* Invite code display */}
            <div
              className="p-4 rounded-xl border text-center"
              style={{
                background: 'var(--t-input-bg, #0f172a)',
                borderColor: 'var(--t-border, #334155)',
              }}
            >
              <p className="text-xs mb-2" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
                Your Team Invite Code
              </p>
              <p
                className="text-2xl font-mono font-bold tracking-widest mb-3"
                style={{ color: 'var(--t-primary, #3b82f6)' }}
              >
                {createdCode}
              </p>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: copiedCode ? 'rgba(16,185,129,0.15)' : 'var(--t-primary-dim, rgba(59,130,246,0.15))',
                  color: copiedCode ? '#10b981' : 'var(--t-primary, #3b82f6)',
                }}
              >
                {copiedCode ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Code</>}
              </button>
            </div>

            <button
              onClick={handleSwitchToTeam}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: 'var(--t-primary, #3b82f6)' }}
            >
              Switch to {name.trim()}
              <Building2 size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Team name input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t-text-secondary, #cbd5e1)' }}>
                Team Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); setIsRlsError(false); }}
                placeholder="e.g. Dallas Office, Investment Group..."
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{
                  background: 'var(--t-input-bg, #0f172a)',
                  borderColor: error ? 'var(--t-error, #ef4444)' : 'var(--t-input-border, #334155)',
                  color: 'var(--t-text, #fff)',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleCreate(); }}
                autoFocus
              />
            </div>

            {/* Preview invite code */}
            <div
              className="mb-4 p-3 rounded-xl border"
              style={{
                background: 'var(--t-input-bg, #0f172a)',
                borderColor: 'var(--t-border, #334155)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
                  Auto-generated invite code:
                </span>
                <span
                  className="text-sm font-mono font-bold tracking-wider"
                  style={{ color: 'var(--t-primary, #3b82f6)' }}
                >
                  {inviteCode}
                </span>
              </div>
            </div>

            {/* RLS Error - Show specific fix */}
            {isRlsError && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <h4 className="text-sm font-bold text-red-400">Security Policy Error</h4>
                </div>
                <p className="text-xs text-red-300/80 mb-3">
                  Your database has Row Level Security policies blocking this action. Quick fix:
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-white font-medium">
                    1. Open your <a
                      href="https://supabase.com/dashboard/project/jdneeubmkgefhrfcurji/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-300"
                    >Supabase SQL Editor</a>
                  </p>
                  <p className="text-xs text-white font-medium">2. Paste the fix SQL and click Run:</p>
                  <button
                    onClick={copyFixSql}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full justify-center"
                    style={{
                      background: copiedFix ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      color: copiedFix ? '#10b981' : '#f87171',
                      border: copiedFix ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    {copiedFix ? <><Check size={14} /> Copied! Paste in SQL Editor → Run</> : <><Copy size={14} /> Copy Fix SQL</>}
                  </button>
                  <p className="text-xs text-white font-medium">3. Come back and try again</p>
                </div>
              </div>
            )}

            {/* Regular error (non-RLS) */}
            {error && !isRlsError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-white/5"
                style={{
                  borderColor: 'var(--t-border, #334155)',
                  color: 'var(--t-text-secondary, #cbd5e1)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--t-primary, #3b82f6)' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Team
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
