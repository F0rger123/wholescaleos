import { useState } from 'react';
import { X, Users, Loader2, Check, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { switchToTeam } from '../lib/team-utils';
import { useStore } from '../store/useStore';

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinTeamModal({ isOpen, onClose }: JoinTeamModalProps) {
  const { currentUser } = useStore();
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

    // Use the user from the store instead of Supabase auth
    if (!currentUser?.id) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
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
        .eq('user_id', currentUser.id)
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
          user_id: currentUser.id,
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
            user_id: currentUser.id,
          });
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
          backgroundColor: 'var(--t-surface)',
          borderColor: 'var(--t-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--t-primary-dim)' }}
            >
              <Users size={20} style={{ color: 'var(--t-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>
                Join a Team
              </h2>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                Enter the invite code shared by your team
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--t-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--t-success-dim)' }}>
              <Check size={32} style={{ color: 'var(--t-success)' }} />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--t-success)' }}>{success}</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
              Switching to {teamName}...
            </p>
            <div className="flex items-center justify-center gap-2 mt-3" style={{ color: 'var(--t-text-muted)' }}>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading team data</span>
            </div>
          </div>
        ) : (
          <>
            {/* Invite code input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--t-text-secondary)' }}>
                Invite Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="WS-XXXXXX"
                className="w-full px-4 py-3 text-lg font-mono tracking-widest text-center rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  borderColor: error ? 'var(--t-error)' : 'var(--t-input-border)',
                  color: 'var(--t-text)',
                  '--tw-ring-color': 'var(--t-primary)',
                } as React.CSSProperties}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleJoin(); }}
                autoFocus
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--t-text-muted)' }}>
                Ask your team admin for the invite code (format: WS-XXXXXX)
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl" style={{ 
                backgroundColor: 'var(--t-error-dim)',
                borderColor: 'var(--t-error)',
                color: 'var(--t-error)',
                border: '1px solid'
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text-secondary)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || !code.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--t-primary)',
                  color: 'var(--t-on-primary)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                    e.currentTarget.style.color = 'var(--t-primary-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                    e.currentTarget.style.color = 'var(--t-on-primary)';
                  }
                }}
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