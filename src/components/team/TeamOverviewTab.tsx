import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, DollarSign, TrendingUp, Plus, X, Check,
  Shield, Eye, Crown, Copy, UserMinus, ChevronDown,
  ListTodo, Users, Building2, ArrowRightLeft,
  Target
} from 'lucide-react';
import {
  useStore, type TeamRole,
} from '../../store/useStore';
import { StatusIndicator, StatusBadge } from '../StatusIndicator';
import { JoinTeamModal } from '../JoinTeamModal';
import { CreateTeamModal } from '../CreateTeamModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { switchToTeam } from '../../lib/team-utils';
import {
  ResponsiveContainer,
  Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'react-hot-toast';

const ROLE_ICONS: Record<TeamRole, React.ElementType> = { admin: Crown, member: Shield, viewer: Eye };

interface UserTeam {
  teamId: string;
  teamName: string;
  role: string;
  isCurrent: boolean;
}

export function TeamOverviewTab() {
  const {
    team, leads, tasks, teamConfig, currentUser,
    addTeamMember, removeTeamMember,
    updateTeamConfig,
    canAddMember
  } = useStore();

  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [teamName, setTeamName] = useState(teamConfig.name);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);

  const [newMember, setNewMember] = useState({
    name: '', role: '', email: '', phone: '',
    teamRole: 'member' as TeamRole,
  });

  const totalRevenue = leads
    .filter(l => l.status === 'closed-won')
    .reduce((sum, l) => sum + (l.offerAmount || 0), 0);
  
  const totalDeals = leads.filter(l => l.status === 'closed-won').length;
  const onlineCount = team.filter(t => t.presenceStatus === 'online').length;

  const teamGoals = [
    { type: 'leads', target: 50, current: leads.length, label: 'Lead Generation' },
    { type: 'deals', target: 10, current: totalDeals, label: 'Closed Deals' },
    { type: 'revenue', target: 500000, current: totalRevenue, label: 'Revenue Target' }
  ];

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
    const res = canAddMember();
    if (!res.can) {
      alert(res.reason);
      if (res.reason?.includes('upgrade')) {
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



  return (
    <div className="space-y-6">
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
                        {userTeams.map(t => (
                          <button
                            key={t.teamId}
                            onClick={() => {
                              if (!t.isCurrent) switchToTeam(t.teamId);
                              setShowTeamSwitcher(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left hover:bg-[var(--t-surface-hover)]"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--t-primary-dim)]">
                              <Building2 size={14} style={{ color: 'var(--t-primary)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: t.isCurrent ? 'var(--t-primary)' : 'var(--t-text)' }}>
                                {t.teamName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-[var(--t-border)] text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] transition-colors"
            >
              <Users size={14} /> Join Team
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl font-medium bg-[var(--t-primary)] text-[var(--t-on-primary)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary-text)] transition-colors"
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
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-[var(--t-border)] text-[var(--t-text-secondary)] hover:bg-[var(--t-surface-hover)] transition-colors"
          >
            <Copy size={14} /> Invite Code
          </button>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl bg-[var(--t-primary)] text-[var(--t-on-primary)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary-text)] transition-colors"
          >
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Invite Code Panel */}
      {showInvite && (
        <div className="rounded-2xl border p-5 bg-[var(--t-surface)] border-[var(--t-border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>Team Invite Code</h3>
            <button onClick={() => setShowInvite(false)}><X size={16} /></button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] text-[var(--t-text)]"
                />
                <button
                  onClick={() => updateTeamConfig({ name: teamName })}
                  className="px-3 py-2 text-sm rounded-xl bg-[var(--t-primary)] text-white"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="px-4 py-2 border rounded-xl text-sm font-mono tracking-wider bg-[var(--t-input-bg)] border-[var(--t-input-border)] text-[var(--t-primary)]">
                {teamConfig.inviteCode}
              </div>
              <button onClick={copyInviteCode} className="px-3 py-2 rounded-xl border border-[var(--t-border)]">
                {copiedCode ? <Check size={14} className="text-[var(--t-success)]" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddMember && (
         <div className="rounded-2xl border p-5 space-y-4 bg-[var(--t-surface)] border-[var(--t-border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add Team Member</h3>
              <button onClick={() => setShowAddMember(false)}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                placeholder="Name *" 
                value={newMember.name} 
                onChange={e => setNewMember(f => ({ ...f, name: e.target.value }))}
                className="px-3 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)]"
              />
              <input 
                placeholder="Email *" 
                value={newMember.email} 
                onChange={e => setNewMember(f => ({ ...f, email: e.target.value }))}
                className="px-3 py-2.5 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)]"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddMember} className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl">Add Member</button>
              <button onClick={() => setShowAddMember(false)} className="px-4 py-2 border border-[var(--t-border)] rounded-xl">Cancel</button>
            </div>
         </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Award, value: team.length, label: 'Members' },
          { icon: Users, value: onlineCount, label: 'Online' },
          { icon: DollarSign, value: `$${(totalRevenue / 1_000_000).toFixed(1)}M`, label: 'Revenue' },
          { icon: TrendingUp, value: totalDeals, label: 'Deals' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-2xl border p-5 text-center bg-[var(--t-surface)] border-[var(--t-border)]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 bg-[var(--t-primary-dim)]">
              <Icon size={22} style={{ color: 'var(--t-primary)' }} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-[var(--t-text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Team Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[2rem] border p-8 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Active Team Goals</h3>
            <button onClick={() => toast.error('Goal management pending backend update')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--t-primary-dim)] text-[var(--t-primary)] text-xs font-bold uppercase tracking-widest">
              <Target size={14} /> New Goal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamGoals.map((goal, i) => {
              const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={i} className="p-5 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{goal.label}</div>
                  <div className="text-2xl font-black">{goal.type === 'revenue' ? `$${(goal.current/1000).toFixed(0)}k` : goal.current}</div>
                  <div className="h-2 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--t-primary)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border p-8 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl">
           <h3 className="text-xl font-black italic uppercase tracking-tighter">Task Velocity</h3>
           <div className="h-[180px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={[
                     { name: 'Done', value: tasks.filter(t => t.status === 'done').length },
                     { name: 'Pending', value: tasks.filter(t => t.status !== 'done').length }
                   ]}
                   innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                 >
                   <Cell fill="var(--t-success)" />
                   <Cell fill="var(--t-primary)" />
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-4">
        {team.map((member) => {
          const isExpanded = expandedMember === member.id;
          const RoleIcon = ROLE_ICONS[member.teamRole];

          return (
            <div key={member.id} className="rounded-2xl border bg-[var(--t-surface)] border-[var(--t-border)] overflow-hidden">
               <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                        {member.avatar}
                      </div>
                      <span className="absolute -bottom-1 -right-1">
                        <StatusIndicator status={member.presenceStatus} size="md" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                         <h3 className="text-lg font-semibold">{member.name}</h3>
                         <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--t-primary-dim)] text-[var(--t-primary)] flex items-center gap-1">
                           <RoleIcon size={10} /> {member.teamRole}
                         </span>
                       </div>
                       <p className="text-sm font-medium text-[var(--t-primary)]">{member.role}</p>
                       <div className="flex items-center gap-4 mt-2">
                         <StatusBadge status={member.presenceStatus} customStatus={member.customStatus} />
                       </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                    className="mt-4 flex items-center gap-2 text-xs text-[var(--t-text-muted)]"
                  >
                    <ListTodo size={14} /> View Member Details <ChevronDown size={14} className={isExpanded ? 'rotate-180' : ''} />
                  </button>
               </div>

               {isExpanded && (
                 <div className="p-6 bg-[var(--t-bg)] border-t border-[var(--t-border)]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                       <div className="p-4 rounded-xl bg-[var(--t-surface)]">
                          <p className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase">Revenue</p>
                          <p className="text-lg font-black">${(leads.filter(l => l.assignedTo === member.id && l.status === 'closed-won').reduce((s,l) => s + (l.offerAmount || 0), 0) / 1000).toFixed(1)}k</p>
                       </div>
                       <div className="p-4 rounded-xl bg-[var(--t-surface)]">
                          <p className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase">Deals</p>
                          <p className="text-lg font-black">{leads.filter(l => l.assignedTo === member.id && l.status === 'closed-won').length}</p>
                       </div>
                    </div>
                    {/* Simplified status editor */}
                    <div className="pt-4 border-t border-[var(--t-border)]">
                       <button 
                         onClick={() => { if (confirm(`Remove ${member.name}?`)) removeTeamMember(member.id); }}
                         className="text-xs text-[var(--t-error)] flex items-center gap-1"
                       >
                         <UserMinus size={14} /> Remove from team
                       </button>
                    </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
