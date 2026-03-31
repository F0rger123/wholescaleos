import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, DollarSign, TrendingUp, Plus, X, Check,
  Shield, Eye, Crown, Copy, UserMinus, ChevronDown,
  ListTodo, Users, Building2, ArrowRightLeft,
  Target, Zap, MessageSquare, ArrowRight
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
import { TeamActivityFeed } from './TeamActivityFeed';
import { TeamChatPreview } from './TeamChatPreview';
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
         <div className="rounded-2xl border p-6 space-y-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add Team Member</h3>
                <p className="text-[10px] text-[var(--t-text-muted)] font-medium uppercase tracking-wider">Expand your organization</p>
              </div>
              <button 
                onClick={() => setShowAddMember(false)}
                className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest pl-1">Full Name</label>
                <input 
                  placeholder="e.g. John Doe" 
                  value={newMember.name} 
                  onChange={e => setNewMember(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest pl-1">Email Address</label>
                <input 
                  placeholder="e.g. john@example.com" 
                  value={newMember.email} 
                  onChange={e => setNewMember(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest pl-1">Position / Role</label>
                <input 
                  placeholder="e.g. Sales Director" 
                  value={newMember.role} 
                  onChange={e => setNewMember(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest pl-1">Platform Role</label>
                <select 
                  value={newMember.teamRole}
                  onChange={e => setNewMember(f => ({ ...f, teamRole: e.target.value as any }))}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-input-border)] focus:ring-2 focus:ring-[var(--t-primary)] outline-none transition-all"
                >
                  <option value="member">Member (Regular Access)</option>
                  <option value="admin">Admin (Full Control)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleAddMember} 
                className="flex-1 px-8 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--t-primary-dim)] transition-all"
              >
                Send Invite
              </button>
              <button 
                onClick={() => setShowAddMember(false)} 
                className="px-8 py-3 border border-[var(--t-border)] text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
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

      {/* Dashboard Section (Feed + Charts) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Stats Column */}
        <div className="xl:col-span-2 space-y-6">
           {/* Team Goals Section */}
           <div className="rounded-[2rem] border p-8 space-y-8 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl relative overflow-hidden group">
              {/* Background gradient hint */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--t-primary-dim)]/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
              
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Performance Milestones</h3>
                  <p className="text-[10px] text-[var(--t-text-muted)] font-black uppercase tracking-[0.2em] mt-1">Q2 2026 Strategic Objectives</p>
                </div>
                <button onClick={() => toast.success('Goal wizard launched')} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--t-primary)] text-[var(--t-on-primary)] text-xs font-black uppercase tracking-widest shadow-lg shadow-[var(--t-primary-dim)] hover:scale-105 active:scale-95 transition-all">
                  <Target size={16} /> Update Progress
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {teamGoals.map((goal, i) => {
                  const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
                  return (
                    <div key={i} className="p-6 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] shadow-sm hover:shadow-md transition-shadow group/card">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] group-hover/card:text-[var(--t-primary)] transition-colors">{goal.label}</div>
                        <div className="text-[10px] font-black text-[var(--t-primary)]">{progress}%</div>
                      </div>
                      <div className="text-3xl font-black italic mb-4">
                        {goal.type === 'revenue' ? `$${(goal.current/1000).toFixed(0)}k` : goal.current}
                        <span className="text-sm font-bold text-[var(--t-text-muted)] ml-2 not-italic">/ {goal.type === 'revenue' ? `$${(goal.target/1000).toFixed(0)}k` : goal.target}</span>
                      </div>
                      <div className="h-2.5 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-primary-dim)] rounded-full group-hover/card:brightness-110 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>

           {/* Task & Revenue Analysis Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-[2rem] border p-8 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl flex flex-col group">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Task Velocity</h3>
                    <div className="p-2 rounded-xl bg-[var(--t-primary-dim)] text-[var(--t-primary)]"><ListTodo size={18} /></div>
                 </div>
                 <div className="flex-1 flex items-center justify-center min-h-[220px]">
                    <div className="relative w-full h-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={[
                               { name: 'Completed', value: tasks.filter(t => t.status === 'done').length },
                               { name: 'Pending', value: tasks.filter(t => t.status !== 'done').length }
                             ]}
                             innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                             stroke="none"
                           >
                             <Cell fill="var(--t-primary)" />
                             <Cell fill="var(--t-surface-dim)" />
                           </Pie>
                           <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--t-surface)', 
                                borderColor: 'var(--t-border)',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                           />
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-3xl font-black italic">{Math.round((tasks.filter(t => t.status === 'done').length / Math.max(1, tasks.length)) * 100)}%</p>
                          <p className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-widest">Efficiency</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="rounded-[2rem] border p-8 bg-[var(--t-surface)] border-[var(--t-border)] shadow-xl flex flex-col group">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Revenue Split</h3>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><DollarSign size={18} /></div>
                  </div>
                  <div className="flex-1 space-y-6">
                     {team.slice(0, 3).map((m, i) => {
                        const mRev = leads.filter(l => l.assignedTo === m.id && l.status === 'closed-won').reduce((s,l) => s + (l.offerAmount || 0), 0);
                        const revPercent = Math.round((mRev / Math.max(1, totalRevenue)) * 100);
                        return (
                          <div key={m.id} className="space-y-2">
                             <div className="flex justify-between items-center text-[11px] font-bold">
                                <span>{m.name}</span>
                                <span className={i === 0 ? 'text-emerald-500' : 'text-[var(--t-text-muted)]'}>${(mRev/1000).toFixed(1)}k ({revPercent}%)</span>
                             </div>
                             <div className="h-1.5 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden">
                                <div className={`h-full ${i === 0 ? 'bg-emerald-500' : 'bg-[var(--t-primary)]'}`} style={{ width: `${revPercent}%` }} />
                             </div>
                          </div>
                        )
                     })}
                  </div>
              </div>
           </div>
        </div>

        {/* Live Activity Column */}
        <div className="space-y-6">
           <div className="rounded-[2rem] border p-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-lg flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                   <Zap size={18} className="text-amber-500" />
                   Team Pulse
                 </h3>
                 <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <TeamActivityFeed />
              </div>
           </div>

           <div className="rounded-[2rem] border p-6 bg-[var(--t-surface)] border-[var(--t-border)] shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                   <MessageSquare size={18} className="text-indigo-500" />
                   Chat Quickview
                 </h3>
                 <button onClick={() => navigate('/chat')} className="p-1.5 hover:bg-[var(--t-surface-hover)] rounded-lg transition-colors"><ArrowRight size={14} /></button>
              </div>
              <TeamChatPreview />
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
