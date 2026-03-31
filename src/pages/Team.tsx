import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Award, DollarSign, TrendingUp, Plus, X, Check,
  Shield, Eye, Crown, Copy, RefreshCw, UserMinus, ChevronDown,
  ListTodo, CheckCircle2, AlertTriangle, Users, Building2, ArrowRightLeft,
  Target, CalendarDays, BarChart2, PieChart as PieChartIcon
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
import {
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';
import { toast } from 'react-hot-toast';

const ROLE_ICONS: Record<TeamRole, React.ElementType> = { admin: Crown, member: Shield, viewer: Eye };

interface UserTeam {
  teamId: string;
  teamName: string;
  role: string;
  isCurrent: boolean;
}

export default function Team() {
  const {
    team, leads, tasks, teamConfig, currentUser,
    updateMemberStatus, setCustomStatus, updateMemberRole,
    addTeamMember, removeTeamMember,
    regenerateInviteCode, updateTeamConfig,
    canAddMember
  } = useStore();

  const navigate = useNavigate();
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

  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: 'leads' as 'leads' | 'deals' | 'revenue',
    target: 0,
    deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // Mocked goals (stored in teams.settings.goals eventually)
  const defaultGoals = [
    { type: 'leads', target: 50, current: leads.length, label: 'Lead Generation' },
    { type: 'deals', target: 10, current: leads.filter(l => l.status === 'closed-won').length, label: 'Closed Deals' },
    { type: 'revenue', target: 500000, current: leads.filter(l => l.status === 'closed-won').reduce((s, l) => s + (l.offerAmount || 0), 0), label: 'Revenue Target' }
  ];

  const [teamGoals, setTeamGoals] = useState(defaultGoals);

  const handleAddGoal = () => {
    if (newGoal.target <= 0) return;
    const current = newGoal.type === 'leads' ? leads.length : 
                  newGoal.type === 'deals' ? leads.filter(l => l.status === 'closed-won').length :
                  leads.filter(l => l.status === 'closed-won').reduce((s, l) => s + (l.offerAmount || 0), 0);
    
    setTeamGoals(prev => [...prev, { 
      type: newGoal.type, 
      target: newGoal.target, 
      current, 
      label: `${newGoal.type.charAt(0).toUpperCase() + newGoal.type.slice(1)} Goal` 
    }]);
    setShowAddGoal(false);
    toast.success('Team goal added!');
  };

  const totalRevenue = leads
    .filter(l => l.status === 'closed-won')
    .reduce((sum, l) => sum + (l.offerAmount || 0), 0);
  
  const totalDeals = leads.filter(l => l.status === 'closed-won').length;
  const onlineCount = team.filter(t => t.presenceStatus === 'online').length;

  // Performance Trend Data (Mocking for 30 days)
  const performanceTrend = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (11 - i) * 3);
    const revAtDate = leads.filter(l => l.status === 'closed-won' && new Date(l.updatedAt) <= date).reduce((s, l) => s + (l.offerAmount || 0), 0);
    return {
      name: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      revenue: Math.max(0, revAtDate - (Math.random() * 50000)), // Distribute historical
      cumulative: revAtDate
    };
  });

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
    const { can, reason } = canAddMember();
    if (!can) {
      alert(reason);
      if (reason?.includes('upgrade')) {
        navigate('/billing');
      }
      return;
    }

    if (!newMember.name.trim() || !newMember.email.trim()) return;
    const initials = (newMember.name || 'Member').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    addTeamMember({
      name: newMember.name.trim(),
      role: newMember.role || 'Team Member',
      email: newMember.email.trim(),
      phone: newMember.phone,
      avatar: initials,
      dealsCount: 0,
      revenue: 0,
      presenceStatus: 'offline',
      customStatus: '',
      lastSeen: new Date().toISOString(),
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
            onClick={() => { 
              const { can, reason } = canAddMember();
              if (!can) {
                if (window.confirm(`${reason}\n\nWould you like to upgrade your plan or add an extra seat?`)) {
                  navigate('/billing');
                }
                return;
              }
              setShowAddMember(true); 
            }}
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

      {/* Team Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[2rem] border p-8 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Active Team Goals</h3>
              <p className="text-xs text-[var(--t-text-muted)]">Track collective targets and milestone progress.</p>
            </div>
            <button 
              onClick={() => setShowAddGoal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--t-primary-dim)] text-[var(--t-primary)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--t-primary)] hover:text-white transition-all active:scale-95"
            >
              <Target size={14} /> Set New Goal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamGoals.map((goal, i) => {
              const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
              const isRevenue = goal.type === 'revenue';
              const format = (v: number) => isRevenue ? `$${(v/1000).toFixed(0)}k` : v;
              
              return (
                <div key={i} className="p-5 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] space-y-4 hover:border-purple-500/30 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{goal.label}</div>
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${progress >= 100 ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {progress}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="text-2xl font-black text-[var(--t-text)]">{format(goal.current)}</div>
                      <div className="text-[10px] font-bold text-[var(--t-text-muted)]">Target: {format(goal.target)}</div>
                    </div>
                    <div className="h-2 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Completion Statistics */}
        <div className="rounded-[2rem] border p-8 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Task Velocity</h3>
              <p className="text-xs text-[var(--t-text-muted)]">Overall completion rate vs pending load.</p>
            </div>
            <PieChartIcon size={20} className="text-[var(--t-primary)] opacity-40 shrink-0" />
          </div>
          
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: tasks.filter(t => t.status === 'done').length, color: '#22c55e' },
                    { name: 'Pending', value: tasks.filter(t => t.status === 'todo').length, color: '#3b82f6' },
                    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#a855f7' }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[0,1,2].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#a855f7'][index]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px' }}
                   itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-2xl font-black text-[var(--t-text)]">
                 {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%
               </span>
               <span className="text-[8px] font-black uppercase text-[var(--t-text-muted)]">Success</span>
            </div>
          </div>

          <div className="space-y-3">
             {[
               { label: 'Done', count: tasks.filter(t => t.status === 'done').length, color: 'bg-green-500' },
               { label: 'Todo', count: tasks.filter(t => t.status === 'todo').length, color: 'bg-blue-500' },
               { label: 'Ongoing', count: tasks.filter(t => t.status === 'in-progress').length, color: 'bg-purple-500' }
             ].map((item, i) => (
               <div key={i} className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${item.color}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{item.label}</span>
                 </div>
                 <span className="text-xs font-black text-[var(--t-text)]">{item.count}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Performance Trends with Switcher */}
      <div className="rounded-[2.5rem] border p-8 space-y-8 bg-[var(--t-surface)] border-[var(--t-border)] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Team Performance Trend</h3>
            <p className="text-xs text-[var(--t-text-muted)] flex items-center gap-2">
               <CalendarDays size={12} className="text-[var(--t-primary)]" />
               Revenue growth trajectory over the last 30 days
            </p>
          </div>

          <div className="flex p-1.5 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
             {(['area', 'bar', 'line'] as const).map(type => (
               <button
                 key={type}
                 onClick={() => setChartType(type)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chartType === type ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
               >
                 {type}
               </button>
             ))}
          </div>
        </div>

        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={performanceTrend}>
                <defs>
                  <linearGradient id="teamRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--t-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--t-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
                  itemStyle={{ color: 'var(--t-primary)', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(val: any) => [`$${(val || 0).toLocaleString()}`, 'Cumulative Revenue']}
                />
                <Area type="monotone" dataKey="cumulative" stroke="var(--t-primary)" fillOpacity={1} fill="url(#teamRev)" strokeWidth={4} />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '16px' }}
                  cursor={{ fill: 'var(--t-primary-dim)' }}
                />
                <Bar dataKey="revenue" fill="var(--t-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '16px' }} />
                <Line type="monotone" dataKey="cumulative" stroke="var(--t-primary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--t-primary)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-2xl relative">
            <button 
              onClick={() => setShowAddGoal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                 <Target size={24} />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-[var(--t-text)]">New Team Goal</h3>
                 <p className="text-xs text-[var(--t-text-muted)]">Set a target for the crew to aim for.</p>
               </div>
            </div>

            <div className="space-y-6">
               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Goal Type</label>
                 <div className="grid grid-cols-3 gap-3">
                   {(['leads', 'deals', 'revenue'] as const).map(type => (
                     <button
                       key={type}
                       onClick={() => setNewGoal(prev => ({ ...prev, type }))}
                       className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${newGoal.type === type ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-[var(--t-bg)] border-[var(--t-border)] text-[var(--t-text-muted)] hover:border-purple-500/50'}`}
                     >
                       {type}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Target Value</label>
                 <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] font-bold">
                     {newGoal.type === 'revenue' ? '$' : '#'}
                   </div>
                   <input
                     type="number"
                     value={newGoal.target || ''}
                     onChange={(e) => setNewGoal(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                     className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-[var(--t-text)] font-black outline-none focus:ring-2 focus:ring-purple-500/50"
                     placeholder="e.g. 100000"
                   />
                 </div>
               </div>

               <div className="pt-4">
                 <button 
                  onClick={handleAddGoal}
                  className="w-full py-4 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/20 active:scale-95"
                 >
                   Launch Goal
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Comparison Chart */}
        <div className="rounded-[2rem] border p-8 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl relative overflow-hidden">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Agent Performance</h3>
                <p className="text-xs text-[var(--t-text-muted)]">Individual revenue contribution.</p>
              </div>
              <BarChart2 size={24} className="text-[var(--t-primary)] opacity-20" />
           </div>

           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={team.map(m => {
                  const mLeads = leads.filter(l => l.assignedTo === m.id && l.status === 'closed-won');
                  return {
                    name: m.name.split(' ')[0],
                    revenue: mLeads.reduce((s, l) => s + (l.offerAmount || 0), 0)
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--t-primary)', fontSize: '10px' }}
                    formatter={(v: any) => [`$${v.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="var(--t-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Task Efficiency Leaderboard */}
        <div className="rounded-[2rem] border p-8 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl relative overflow-hidden">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Task Masters</h3>
                <p className="text-xs text-[var(--t-text-muted)]">Top performers by volume.</p>
              </div>
              <CheckCircle2 size={24} className="text-[var(--t-success)] opacity-20" />
           </div>

           <div className="space-y-4">
              {team.map(m => {
                const mTasks = tasks.filter(t => t.assignedTo === m.id);
                const done = mTasks.filter(t => t.status === 'done').length;
                const total = mTasks.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                
                return (
                  <div key={m.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
                      {m.avatar}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span style={{ color: 'var(--t-text)' }}>{m.name}</span>
                        <span style={{ color: 'var(--t-text-muted)' }}>{done}/{total} done</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden">
                         <div className="h-full bg-[var(--t-success)] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-xs font-black text-[var(--t-success)] w-8 text-right">{pct}%</div>
                  </div>
                );
              }).sort((a,b) => (b.props.children[2].props.children.props.children.props.children - a.props.children[2].props.children.props.children.props.children))}
           </div>
        </div>
      </div>

      {/* Team Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Leaderboard */}
        <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              <Award className="text-yellow-500" size={20} />
              Revenue Leaders
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">All Time</span>
          </div>
          <div className="space-y-3">
            {[...team]
              .sort((a, b) => {
                const aRev = leads.filter(l => l.assignedTo === a.id && l.status === 'closed-won').reduce((sum, l) => sum + (l.offerAmount || 0), 0);
                const bRev = leads.filter(l => l.assignedTo === b.id && l.status === 'closed-won').reduce((sum, l) => sum + (l.offerAmount || 0), 0);
                return bRev - aRev;
              })
              .slice(0, 5)
              .map((m, index) => {
                const rev = leads.filter(l => l.assignedTo === m.id && l.status === 'closed-won').reduce((sum, l) => sum + (l.offerAmount || 0), 0);
                return (
                  <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: index === 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)', color: index === 0 ? '#EAB308' : 'var(--t-text-muted)' }}>
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{m.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{m.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-green-500">${(rev / 1000).toFixed(1)}k</p>
                      <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{leads.filter(l => l.assignedTo === m.id && l.status === 'closed-won').length} deals</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Activity & Streaks */}
        <div className="rounded-2xl border p-6 space-y-4" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              <TrendingUp className="text-blue-500" size={20} />
              Performance Streaks
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Activity Level</span>
          </div>
          <StreakLeaderboard
            members={team.map(m => ({
              id: m.id,
              name: m.name,
              avatar: m.avatar,
              loginStreak: useStore.getState().memberStreaks[m.id]?.login || 0,
              taskStreak: useStore.getState().memberStreaks[m.id]?.task || 0,
            }))}
          />
        </div>
      </div>

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
          const memberLeads = leads.filter((l) => l.assignedTo === member.id);
          const closedLeads = memberLeads.filter(l => l.status === 'closed-won');
          const memberRevenue = closedLeads.reduce((sum, l) => sum + (l.offerAmount || 0), 0);
          const memberDeals = closedLeads.length;
          
          const activeLeads = memberLeads.filter((l) => !l.status?.startsWith('closed')).length;
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

                    {/* Agent Metrics Grid */}
                    <div className="flex items-center gap-6 mt-4 p-3 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border-subtle)] w-fit">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-tight">Revenue</span>
                        <span className="text-sm font-black text-[var(--t-success)]">${(memberRevenue/1000).toFixed(1)}k</span>
                      </div>
                      <div className="w-px h-6 bg-[var(--t-border-subtle)]" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-tight">Deals</span>
                        <span className="text-sm font-black text-[var(--t-on-surface)]">{memberDeals}</span>
                      </div>
                      <div className="w-px h-6 bg-[var(--t-border-subtle)]" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-tight">Tasks</span>
                        <span className={`text-sm font-black ${overdueTasks.length > 0 ? 'text-[var(--t-error)]' : 'text-[var(--t-primary)]'}`}>
                          {pendingTasks.length}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-[var(--t-border-subtle)]" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-tight">Conversion</span>
                        <span className="text-sm font-black text-[var(--t-on-surface)]">
                          {memberLeads.length > 0 ? Math.round((memberDeals / memberLeads.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>

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
                    <p className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>{memberDeals}</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Deals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--t-success)' }}>${(memberRevenue / 1000).toFixed(0)}k</p>
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
                    <span>{totalRevenue > 0 ? Math.round((memberRevenue / totalRevenue) * 100) : 0}% of total</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--t-input-bg)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${totalRevenue > 0 ? (memberRevenue / totalRevenue) * 100 : 0}%`,
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
                    <span style={{ color: 'var(--t-warning)' }}>({todayTasks.length} due today)</span>
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