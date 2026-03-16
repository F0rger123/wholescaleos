import { useState, useEffect } from 'react';
import {
  Mail, Phone, Award, DollarSign, TrendingUp, Plus, X, Check,
  Shield, Eye, Crown, Copy, RefreshCw, UserMinus, ChevronDown,
  ListTodo, CheckCircle2, AlertTriangle, Users, Building2, ArrowRightLeft,
} from 'lucide-react';
import { formatDistanceToNow, isPast, parseISO, isToday } from 'date-fns';
import {
  useStore, type TeamRole, type PresenceStatus,
  PRESENCE_LABELS, PRIORITY_COLORS,
} from '../store/useStore';
import { StatusIndicator, StatusBadge } from '../components/StatusIndicator';
import { StreakLeaderboard } from '../components/StreakBadge';
import { JoinTeamModal } from '../components/JoinTeamModal';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { switchToTeam } from '../lib/team-utils';

const ROLE_ICONS: Record<TeamRole, React.ElementType> = { admin: Crown, member: Shield, viewer: Eye };

interface UserTeam {
  teamId: string;
  teamName: string;
  role: string;
  isCurrent: boolean;
}

export function Team() {
  const {
    team, leads, tasks, teamConfig, currentUser,
    updateMemberStatus, setCustomStatus, updateMemberRole,
    addTeamMember, removeTeamMember,
    regenerateInviteCode, updateTeamConfig,
  } = useStore();

  const [showInvite, setShowInvite] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [teamName, setTeamName] = useState(teamConfig.name);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);

  const [newMember, setNewMember] = useState({
    name: '', role: '', email: '', phone: '',
    teamRole: 'member' as TeamRole,
  });

  const totalRevenue = team.reduce((s, t) => s + t.revenue, 0);
  const totalDeals = team.reduce((s, t) => s + t.dealsCount, 0);
  const onlineCount = team.filter(t => t.presenceStatus === 'online').length;

  // Fetch all teams user belongs to
  useEffect(() => {
    async function fetchUserTeams() {
      if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;
      try {
        const { data } = await supabase
          .from('team_members')
          .select('team_id, role, teams(name)')
          .eq('user_id', currentUser.id);

        if (data) {
          const currentTeamId = useStore.getState().teamId;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const teams: UserTeam[] = data.map((row: any) => ({
            teamId: row.team_id,
            teamName: row.teams?.name || 'Unnamed Team',
            role: row.role || 'member',
            isCurrent: row.team_id === currentTeamId,
          }));
          setUserTeams(teams);
        }
      } catch (err) {
        console.error('Failed to fetch user teams:', err);
      }
    }
    fetchUserTeams();
  }, [currentUser?.id]);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(teamConfig.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    const initials = newMember.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    addTeamMember({
      name: newMember.name.trim(),
      role: newMember.role || 'Team Member',
      email: newMember.email.trim(),
      phone: newMember.phone,
      avatar: initials,
      dealsCount: 0,
      revenue: 0,
      presenceStatus: 'offline',
      lastSeen: new Date().toISOString(),
      customStatus: '',
      teamRole: newMember.teamRole,
    });
    setNewMember({ name: '', role: '', email: '', phone: '', teamRole: 'member' });
    setShowAddMember(false);
  };

  const handleSaveCustomStatus = (memberId: string) => {
    setCustomStatus(memberId, customMsg);
    setEditingStatus(null);
    setCustomMsg('');
  };

  return (
    <div className="space-y-6" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Team Header — Current Team + Switcher */}
      <div
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: 'var(--t-surface)',
          borderColor: 'var(--t-border)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--t-primary-dim)' }}
            >
              <Building2 size={24} style={{ color: 'var(--t-primary)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>
                  {teamConfig.name}
                </h2>
                {userTeams.length > 1 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--t-primary-dim)',
                      color: 'var(--t-primary)',
                    }}
                  >
                    {userTeams.length} teams
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                {team.length} member{team.length !== 1 ? 's' : ''} · {onlineCount} online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Switch Teams (only if multiple) */}
            {userTeams.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors"
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
                  <ArrowRightLeft size={14} /> Switch Team
                </button>

                {showTeamSwitcher && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTeamSwitcher(false)} />
                    <div
                      className="absolute right-0 top-full mt-2 w-64 rounded-xl border shadow-xl z-20 overflow-hidden"
                      style={{
                        backgroundColor: 'var(--t-surface)',
                        borderColor: 'var(--t-border)',
                      }}
                    >
                      <div className="p-2">
                        <p className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1.5"
                          style={{ color: 'var(--t-text-muted)' }}>
                          Your Teams
                        </p>
                        {userTeams.map(t => (
                          <button
                            key={t.teamId}
                            onClick={() => {
                              if (!t.isCurrent) switchToTeam(t.teamId);
                              setShowTeamSwitcher(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
                            style={{
                              backgroundColor: 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: t.isCurrent
                                  ? 'var(--t-primary-dim)'
                                  : 'var(--t-surface)',
                              }}
                            >
                              <Building2 size={14} style={{
                                color: t.isCurrent ? 'var(--t-primary)' : 'var(--t-text-muted)'
                              }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{
                                color: t.isCurrent ? 'var(--t-primary)' : 'var(--t-text)'
                              }}>
                                {t.teamName}
                              </p>
                              <p className="text-[10px] capitalize" style={{ color: 'var(--t-text-muted)' }}>
                                {t.role}
                              </p>
                            </div>
                            {t.isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                                backgroundColor: 'var(--t-success-dim)',
                                color: 'var(--t-success)',
                              }}>
                                Active
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Join Team */}
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors"
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
              <Users size={14} /> Join Team
            </button>

            {/* Create Team */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: 'var(--t-primary)',
                color: 'var(--t-on-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                e.currentTarget.style.color = 'var(--t-primary-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                e.currentTarget.style.color = 'var(--t-on-primary)';
              }}
            >
              <Plus size={14} /> Create Team
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t-text)' }}>
            Team Members
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
            Manage roles, presence, and collaboration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors"
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
            <Copy size={14} /> Invite Code
          </button>
          <button
            onClick={() => { setShowAddMember(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{
              backgroundColor: 'var(--t-primary)',
              color: 'var(--t-on-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
              e.currentTarget.style.color = 'var(--t-primary-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--t-primary)';
              e.currentTarget.style.color = 'var(--t-on-primary)';
            }}
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Invite Code Panel */}
      {showInvite && (
        <div
          className="rounded-2xl border p-5"
          style={{
            backgroundColor: 'var(--t-surface)',
            borderColor: 'var(--t-border)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
              Team Invite Code
            </h3>
            <button onClick={() => setShowInvite(false)} style={{ color: 'var(--t-text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Team Name</label>
              <div className="flex gap-2">
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl flex-1"
                  style={{
                    backgroundColor: 'var(--t-input-bg)',
                    borderColor: 'var(--t-input-border)',
                    color: 'var(--t-text)',
                    border: '1px solid',
                  }}
                />
                <button
                  onClick={() => updateTeamConfig({ name: teamName })}
                  className="px-3 py-2 text-sm rounded-xl transition-colors"
                  style={{
                    backgroundColor: 'var(--t-primary)',
                    color: 'var(--t-on-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                    e.currentTarget.style.color = 'var(--t-primary-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                    e.currentTarget.style.color = 'var(--t-on-primary)';
                  }}
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Invite Code</label>
              <div className="flex gap-2">
                <div
                  className="px-4 py-2.5 border rounded-xl text-sm font-mono tracking-wider select-all"
                  style={{
                    backgroundColor: 'var(--t-input-bg)',
                    borderColor: 'var(--t-input-border)',
                    color: 'var(--t-primary)',
                    border: '1px solid',
                  }}
                >
                  {teamConfig.inviteCode}
                </div>
                <button
                  onClick={copyInviteCode}
                  className="px-3 py-2 rounded-xl border transition-colors"
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
                  {copiedCode ? <Check size={14} style={{ color: 'var(--t-success)' }} /> : <Copy size={14} />}
                </button>
                <button
                  onClick={regenerateInviteCode}
                  className="px-3 py-2 rounded-xl border transition-colors"
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
                  title="Regenerate code"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </div>
          <div
            className="mt-3 p-3 rounded-xl border"
            style={{
              backgroundColor: 'var(--t-primary-dim)',
              borderColor: 'var(--t-primary)',
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--t-primary)' }}>
              📋 How to invite teammates:
            </p>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--t-text-muted)' }}>
              <li>Copy the invite code above</li>
              <li>Share it with your teammate</li>
              <li>They can enter it when <strong>signing up</strong> (in the invite code field)</li>
              <li>Or click <strong>"Join Team"</strong> if they already have an account</li>
              <li>They'll automatically join your team and see all shared data</li>
            </ol>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddMember && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{
            backgroundColor: 'var(--t-surface)',
            borderColor: 'var(--t-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>Add Team Member</h3>
            <button onClick={() => setShowAddMember(false)} style={{ color: 'var(--t-text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Name *</label>
              <input
                value={newMember.name}
                onChange={(e) => setNewMember(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  borderColor: 'var(--t-input-border)',
                  color: 'var(--t-text)',
                  border: '1px solid',
                }}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Job Title</label>
              <input
                value={newMember.role}
                onChange={(e) => setNewMember(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  borderColor: 'var(--t-input-border)',
                  color: 'var(--t-text)',
                  border: '1px solid',
                }}
                placeholder="e.g. Acquisitions Manager"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Email *</label>
              <input
                value={newMember.email}
                onChange={(e) => setNewMember(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  borderColor: 'var(--t-input-border)',
                  color: 'var(--t-text)',
                  border: '1px solid',
                }}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Phone</label>
              <input
                value={newMember.phone}
                onChange={(e) => setNewMember(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  borderColor: 'var(--t-input-border)',
                  color: 'var(--t-text)',
                  border: '1px solid',
                }}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Team Role</label>
              <div className="flex gap-2">
                {(['admin', 'member', 'viewer'] as TeamRole[]).map(r => {
                  const Icon = ROLE_ICONS[r];
                  return (
                    <button
                      key={r}
                      onClick={() => setNewMember(f => ({ ...f, teamRole: r }))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs rounded-xl border font-medium transition-colors"
                      style={{
                        backgroundColor: newMember.teamRole === r ? 'var(--t-primary-dim)' : 'var(--t-surface)',
                        borderColor: newMember.teamRole === r ? 'var(--t-primary)' : 'var(--t-border)',
                        color: newMember.teamRole === r ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                      }}
                    >
                      <Icon size={13} /> {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddMember}
              className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: 'var(--t-primary)',
                color: 'var(--t-on-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                e.currentTarget.style.color = 'var(--t-primary-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                e.currentTarget.style.color = 'var(--t-on-primary)';
              }}
            >
              <Plus size={14} /> Add Member
            </button>
            <button
              onClick={() => setShowAddMember(false)}
              className="px-4 py-2 text-sm rounded-xl border transition-colors"
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
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Award, value: team.length, label: 'Members' },
          { icon: Users, value: onlineCount, label: 'Online' },
          { icon: DollarSign, value: `$${(totalRevenue / 1_000_000).toFixed(1)}M`, label: 'Revenue' },
          { icon: TrendingUp, value: totalDeals, label: 'Deals' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-2xl border p-5 text-center"
            style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
              style={{ backgroundColor: 'var(--t-primary-dim)' }}
            >
              <Icon size={22} style={{ color: 'var(--t-primary)' }} />
            </div>
            <p className="text-2xl font-bold" style={{
              color: label === 'Online' ? 'var(--t-success)' : 'var(--t-text)'
            }}>
              {value}
            </p>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Streak Leaderboard */}
      <StreakLeaderboard
        members={team.map(m => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          loginStreak: useStore.getState().memberStreaks[m.id]?.login || 0,
          taskStreak: useStore.getState().memberStreaks[m.id]?.task || 0,
        }))}
      />

      {/* Team Cards */}
      <div className="space-y-4">
        {team.length === 0 && (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
            }}
          >
            <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--t-text-muted)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--t-text)' }}>No team members yet</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--t-text-muted)' }}>
              Share your invite code or add members manually to get started.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowInvite(true)}
                className="px-4 py-2 text-sm rounded-xl border transition-colors"
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
                <Copy size={14} className="inline mr-1.5" /> Show Invite Code
              </button>
              <button
                onClick={() => setShowAddMember(true)}
                className="px-4 py-2 text-sm rounded-xl font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--t-primary)',
                  color: 'var(--t-on-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                  e.currentTarget.style.color = 'var(--t-primary-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                  e.currentTarget.style.color = 'var(--t-on-primary)';
                }}
              >
                <Plus size={14} className="inline mr-1.5" /> Add Member
              </button>
            </div>
          </div>
        )}

        {team.map((member) => {
          const memberLeads = leads.filter((l) => l.assignedTo === member.name);
          const activeLeads = memberLeads.filter((l) => !l.status.startsWith('closed')).length;
          const memberTasks = tasks.filter(t => t.assignedTo === member.id);
          const pendingTasks = memberTasks.filter(t => t.status === 'todo' || t.status === 'in-progress');
          const overdueTasks = pendingTasks.filter(t => isPast(parseISO(t.dueDate)));
          const todayTasks = pendingTasks.filter(t => isToday(parseISO(t.dueDate)));
          const isExpanded = expandedMember === member.id;
          const RoleIcon = ROLE_ICONS[member.teamRole];

          return (
            <div
              key={member.id}
              className="rounded-2xl border transition-colors overflow-hidden"
              style={{
                backgroundColor: 'var(--t-surface)',
                borderColor: 'var(--t-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--t-border-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--t-border)';
              }}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar with status */}
                  <div className="relative shrink-0">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                      style={{
                        background: 'linear-gradient(135deg, var(--t-avatar-from), var(--t-avatar-to))',
                        color: 'var(--t-on-primary)',
                      }}
                    >
                      {member.avatar}
                    </div>
                    <span className="absolute -bottom-1 -right-1">
                      <StatusIndicator status={member.presenceStatus} size="md" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>{member.name}</h3>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: 'var(--t-primary-dim)',
                          borderColor: 'var(--t-primary)',
                          color: 'var(--t-primary)',
                        }}
                      >
                        <RoleIcon size={10} />
                        {member.teamRole.charAt(0).toUpperCase() + member.teamRole.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--t-primary)' }}>{member.role}</p>

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <StatusBadge status={member.presenceStatus} customStatus={member.customStatus} />
                      {member.presenceStatus === 'offline' && (
                        <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                          Last seen {formatDistanceToNow(new Date(member.lastSeen), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 mt-3">
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t-text-muted)' }}>
                        <Mail size={14} /> {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--t-text-muted)' }}>
                        <Phone size={14} /> {member.phone}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={member.presenceStatus}
                      onChange={(e) => updateMemberStatus(member.id, e.target.value as PresenceStatus)}
                      className="text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--t-input-bg)',
                        borderColor: 'var(--t-input-border)',
                        color: 'var(--t-text-secondary)',
                        border: '1px solid',
                      }}
                    >
                      {Object.entries(PRESENCE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>

                    <select
                      value={member.teamRole}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as TeamRole)}
                      className="text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--t-input-bg)',
                        borderColor: 'var(--t-input-border)',
                        color: 'var(--t-text-secondary)',
                        border: '1px solid',
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5" style={{ borderTop: '1px solid var(--t-border)' }}>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>{member.dealsCount}</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Deals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--t-success)' }}>${(member.revenue / 1000).toFixed(0)}k</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--t-primary)' }}>{activeLeads}</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Active Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--t-warning)' }}>{pendingTasks.length}</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold`} style={{
                      color: overdueTasks.length > 0 ? 'var(--t-error)' : 'var(--t-text-muted)'
                    }}>
                      {overdueTasks.length}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Overdue</p>
                  </div>
                </div>

                {/* Pipeline progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--t-text-muted)' }}>
                    <span>Pipeline progress</span>
                    <span>{totalRevenue > 0 ? Math.round((member.revenue / totalRevenue) * 100) : 0}% of total</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--t-input-bg)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${totalRevenue > 0 ? (member.revenue / totalRevenue) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, var(--t-primary), var(--t-accent))',
                      }}
                    />
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  className="flex items-center gap-1 mt-3 text-xs transition-colors hover:opacity-80"
                  style={{ color: 'var(--t-text-muted)' }}
                >
                  <ListTodo size={13} />
                  {pendingTasks.length} pending task{pendingTasks.length !== 1 ? 's' : ''}
                  {todayTasks.length > 0 && (
                    <span className="text-amber-400">({todayTasks.length} due today)</span>
                  )}
                  <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expanded: Tasks & Status */}
              {isExpanded && (
                <div className="p-5 space-y-4" style={{
                  borderTop: '1px solid var(--t-border)',
                  backgroundColor: 'var(--t-bg)',
                }}>
                  {/* Custom status editor */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--t-text-muted)' }}>Custom Status</h4>
                    {editingStatus === member.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={customMsg}
                          onChange={(e) => setCustomMsg(e.target.value)}
                          placeholder="What are you working on?"
                          className="flex-1 px-3 py-2 text-sm rounded-xl"
                          style={{
                            backgroundColor: 'var(--t-input-bg)',
                            borderColor: 'var(--t-input-border)',
                            color: 'var(--t-text)',
                            border: '1px solid',
                          }}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomStatus(member.id); }}
                        />
                        <button
                          onClick={() => handleSaveCustomStatus(member.id)}
                          className="px-2 py-2 rounded-lg transition-colors"
                          style={{ color: 'var(--t-success)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => { setEditingStatus(null); setCustomMsg(''); }}
                          className="px-2 py-2 rounded-lg transition-colors"
                          style={{ color: 'var(--t-text-muted)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingStatus(member.id); setCustomMsg(member.customStatus); }}
                        className="text-sm transition-colors hover:opacity-80"
                        style={{ color: 'var(--t-text-muted)' }}
                      >
                        {member.customStatus || 'Set a status...'}
                      </button>
                    )}
                  </div>

                  {/* Tasks list */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--t-text-muted)' }}>Assigned Tasks</h4>
                    {pendingTasks.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No pending tasks</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingTasks.map(task => {
                          const pc = PRIORITY_COLORS[task.priority];
                          const isOverdue = isPast(parseISO(task.dueDate));
                          const leadName = task.leadId ? leads.find(l => l.id === task.leadId)?.name : undefined;
                          return (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border"
                              style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pc.dot }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--t-text)' }}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-bold" style={{ color: pc.text }}>{task.priority.toUpperCase()}</span>
                                  <span className="text-[10px]" style={{
                                    color: isOverdue ? 'var(--t-error)' : 'var(--t-text-muted)'
                                  }}>
                                    Due {formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}
                                  </span>
                                  {isOverdue && <AlertTriangle size={10} style={{ color: 'var(--t-error)' }} />}
                                  {leadName && (
                                    <span className="text-[10px]" style={{ color: 'var(--t-primary)' }}>
                                      🔗 {leadName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: task.status === 'in-progress' ? 'var(--t-primary-dim)' : 'var(--t-surface)',
                                  color: task.status === 'in-progress' ? 'var(--t-primary)' : 'var(--t-text-muted)',
                                }}
                              >
                                {task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {memberTasks.filter(t => t.status === 'done').length > 0 && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: 'var(--t-success)' }}>
                        <CheckCircle2 size={13} />
                        {memberTasks.filter(t => t.status === 'done').length} task{memberTasks.filter(t => t.status === 'done').length !== 1 ? 's' : ''} completed
                      </div>
                    )}
                  </div>

                  {/* Remove member */}
                  <div className="pt-3" style={{ borderTop: '1px solid var(--t-border)' }}>
                    <button
                      onClick={() => { if (confirm(`Remove ${member.name} from the team?`)) removeTeamMember(member.id); }}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                      style={{ color: 'var(--t-error)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--t-error-dim)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--t-error)';
                      }}
                    >
                      <UserMinus size={13} /> Remove from team
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}