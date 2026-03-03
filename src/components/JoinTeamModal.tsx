import { useState } from 'react';
import { X, Users, Loader2, Check, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { switchToTeam } from '../lib/team-utils';
interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinTeamModal({ isOpen, onClose }: JoinTeamModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teamName, setTeamName] = useState('');

  if (!isOpen) return null;

  const handleCodeChange = (val: string) => {
    // Auto-uppercase, strip whitespace
    let cleaned = val.toUpperCase().trim();
    // Auto-add WS- prefix if user types without it
    if (cleaned.length >= 2 && !cleaned.startsWith('WS-') && !cleaned.startsWith('WS')) {
      cleaned = 'WS-' + cleaned;
    }
    setCode(cleaned);
    setError('');
  };

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter an invite code');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Team joining requires a database connection.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get real Supabase auth UID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError('Not authenticated. Please sign in again.');
        setLoading(false);
        return;
      }

      // 1. Find team by invite code
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, invite_code')
        .eq('invite_code', trimmed)
        .single();

      if (teamErr || !teamData) {
        setError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }

      // 2. Check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamData.id)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existing) {
        setError('You are already a member of this team.');
        setLoading(false);
        return;
      }

      // 3. Insert into team_members
      const { error: insertErr } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: authUser.id,
          role: 'member',
          status: 'online',
          last_seen: new Date().toISOString(),
        });

      if (insertErr) {
        console.error('Insert error:', insertErr);
        setError('Failed to join team. Please try again.');
        setLoading(false);
        return;
      }

      // 4. Find and join #general channel
      const { data: generalChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('team_id', teamData.id)
        .eq('name', '#general')
        .maybeSingle();

      if (generalChannel) {
        await supabase
          .from('channel_members')
          .insert({
            channel_id: generalChannel.id,
            user_id: authUser.id,
          })
          .select()
          .maybeSingle();
      }

      // 5. Success — switch to new team
      setTeamName(teamData.name || 'New Team');
      setSuccess(`Successfully joined "${teamData.name}"!`);

      // Auto-switch after 1.5s
      setTimeout(() => {
        switchToTeam(teamData.id);
      }, 1500);

    } catch (err) {
      console.error('Join team error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!success) {
      setCode('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
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
              <Users size={20} style={{ color: 'var(--t-primary, #3b82f6)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--t-text, #fff)' }}>
                Join a Team
              </h2>
              <p className="text-xs" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
                Enter the invite code shared by your team
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
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-emerald-400 mb-1">{success}</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
              Switching to {teamName}...
            </p>
            <div className="flex items-center justify-center gap-2 mt-3" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading team data</span>
            </div>
          </div>
        ) : (
          <>
            {/* Invite code input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t-text-secondary, #cbd5e1)' }}>
                Invite Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="WS-XXXXXX"
                className="w-full px-4 py-3 text-lg font-mono tracking-widest text-center rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--t-input-bg, #0f172a)',
                  borderColor: error ? 'var(--t-error, #ef4444)' : 'var(--t-input-border, #334155)',
                  color: 'var(--t-text, #fff)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--t-primary, #3b82f6)',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleJoin(); }}
                autoFocus
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--t-text-muted, #94a3b8)' }}>
                Ask your team admin for the invite code (format: WS-XXXXXX)
              </p>
            </div>

            {/* Error */}
            {error && (
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
                onClick={handleJoin}
                disabled={loading || !code.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--t-primary, #3b82f6)' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Team
                    <ArrowRight size={16} />
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
