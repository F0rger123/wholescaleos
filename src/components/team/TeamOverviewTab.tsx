import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Shield, Eye, Crown, Copy, UserMinus, ChevronDown,
  Users, Building2, Zap, MessageSquare, 
  Plus, Check, X
} from 'lucide-react';
import {
  useStore, type TeamRole,
} from '../../store/useStore';
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
    team, leads, teamConfig, milestones, currentUser,
    addTeamMember, removeTeamMember,
    updateMilestone, addMilestone, deleteMilestone, canAddMember
  } = useStore();

  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
 
  const [newMilestone, setNewMilestone] = useState({
    label: '',
    target: 0,
    type: 'leads' as any,
    current: 0
  });

  const [newMember, setNewMember] = useState({
    name: '', role: '', email: '', phone: '',
    teamRole: 'member' as TeamRole,
  });

  const totalRevenue = milestones.find(m => m.type === 'revenue')?.current || 0;
  const totalDeals = milestones.find(m => m.type === 'deals')?.current || 0;

  const formatTarget = (val: number, type: string) => {
    if (type !== 'revenue') return val;
    if (val >= 1000000) return `$${(val/1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val/1000).toFixed(0)}k`;
    return `$${val}`;
  };


  const contributionData = team.map(m => {
    const memberDeals = leads.filter(l => 
      (l.assignedTo === m.id || l.assignedTo === m.name) && 
      ['closed-won', 'contract-in', 'under-contract'].includes(l.status)
    );
    const memberRev = memberDeals.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
    return { name: m.name, id: m.id, value: memberRev || 0.01, rawRev: memberRev };
  }).sort((a, b) => b.value - a.value);

  const COLORS = ['var(--t-primary)', 'var(--t-accent)', 'var(--t-info)', 'var(--t-warning)', 'var(--t-error)'];

  const handleUpdateMilestone = (id: string) => {
    const newVal = prompt("Enter new current value:");
    if (newVal === null) return;
    const val = parseInt(newVal);
    if (isNaN(val)) return;
    
    updateMilestone(id, val);
    toast.success('Milestone updated');
  };
 
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.label || !newMilestone.target) {
      toast.error('Label and Target are required');
      return;
    }
    addMilestone(newMilestone);
    setNewMilestone({ label: '', target: 0, type: 'leads', current: 0 });
    setShowAddMilestone(false);
    toast.success('Strategic goal added');
  };
 
  const handleDeleteMilestone = (id: string) => {
    if (window.confirm('Decommission this objective?')) {
      deleteMilestone(id);
      toast.success('Strategic goal removed');
    }
  };

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
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const check = canAddMember();
    if (!check.can) {
      toast.error(check.reason || 'Team seat limit reached');
      return;
    }

    if (!newMember.name || !newMember.email) {
      toast.error('Name and Email are required');
      return;
    }

    addTeamMember({ 
      ...newMember, 
      presenceStatus: 'offline', 
      lastSeen: new Date().toISOString(),
      revenue: 0,
      avatar: '',
      dealsCount: 0,
      customStatus: ''
    });
    setNewMember({ name: '', role: '', email: '', phone: '', teamRole: 'member' });
    setShowAddMember(false);
    toast.success('Team member added');
  };

  const handleSwitchTeam = async (targetTeamId: string) => {
    try {
      switchToTeam(targetTeamId);
      toast.success('Switched team successfully');
      setShowTeamSwitcher(false);
    } catch (err) {
      toast.error('Failed to switch team');
    }
  };

  const handleCreateTeam = () => {
    setShowCreateModal(true);
    setShowTeamSwitcher(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Team Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[2rem] bg-[var(--t-primary)] flex items-center justify-center text-white shadow-2xl relative group">
            <Building2 size={36} />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)] flex items-center justify-center text-[var(--t-primary)]">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">{teamConfig.name}</h1>
              <button 
                onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
                className="p-1.5 rounded-lg hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] transition-colors"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
                <Users size={12} className="text-[var(--t-primary)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text)]">{team.length} / {teamConfig.maxSeats || 10} Seats</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvite(true)}
            className="px-6 py-3 bg-[var(--t-surface)] text-[var(--t-text)] font-black uppercase tracking-widest text-[10px] rounded-2xl border border-[var(--t-border)] hover:bg-[var(--t-surface-dim)] transition-all flex items-center gap-2"
          >
            <Users size={16} />
            Invite Member
          </button>
          <button
             onClick={() => navigate('/chat')}
             className="px-6 py-3 bg-[var(--t-primary)] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 shadow-xl shadow-[var(--t-primary-dim)] hover:translate-y-[-2px] active:translate-y-[0] transition-all flex items-center gap-2"
          >
            <MessageSquare size={16} />
            Team Chat
          </button>
        </div>
      </div>

      {/* Team Switcher Dropdown */}
      {showTeamSwitcher && (
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-4 shadow-2xl animate-in zoom-in-95 duration-200 origin-top-left max-w-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] px-3 mb-3">Your Teams</p>
          <div className="space-y-1">
            {userTeams.map((t) => (
              <button
                key={t.teamId}
                onClick={() => !t.isCurrent && handleSwitchTeam(t.teamId)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${t.isCurrent ? 'bg-[var(--t-primary)]/10 border border-[var(--t-primary)]' : 'hover:bg-[var(--t-surface-dim)] border border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${t.isCurrent ? 'bg-[var(--t-primary)] text-white' : 'bg-[var(--t-surface-dim)] text-[var(--t-text-muted)]'}`}>
                    {t.teamName[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-black ${t.isCurrent ? 'text-white' : 'text-[var(--t-text)]'}`}>{t.teamName}</p>
                    <p className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-widest font-bold">{t.role}</p>
                  </div>
                </div>
                {t.isCurrent && <Check size={16} className="text-[var(--t-primary)]" />}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--t-border)] grid grid-cols-2 gap-2">
            <button
               onClick={() => setShowJoinModal(true)}
               className="p-3 rounded-2xl bg-[var(--t-surface-dim)] text-[10px] font-black uppercase tracking-widest text-[var(--t-text)] hover:bg-[var(--t-surface-hover)] transition-all flex items-center justify-center gap-2"
            >
              <Zap size={14} className="text-[var(--t-primary)]" />
              Join
            </button>
            <button
               onClick={handleCreateTeam}
               className="p-3 rounded-2xl bg-[var(--t-surface-dim)] text-[10px] font-black uppercase tracking-widest text-[var(--t-text)] hover:bg-[var(--t-surface-hover)] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} className="text-[var(--t-primary)]" />
              Create
            </button>
          </div>
        </div>
      )}

      {/* KPI & Milestones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Milestones */}
        <div className="rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Performance Milestones</h3>
              <p className="text-xs text-[var(--t-text-muted)]">Active team development goals.</p>
            </div>
            <button 
              onClick={() => setShowAddMilestone(true)}
              className="p-2 rounded-xl bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/20 hover:bg-[var(--t-primary)] hover:text-white transition-all shadow-lg shadow-[var(--t-primary-dim)]"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Total Revenue</p>
                <p className="text-xl font-black text-emerald-500">${(totalRevenue/1000).toFixed(1)}k</p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Total Deals</p>
                <p className="text-xl font-black text-blue-500">{totalDeals}</p>
              </div>
            </div>
            {milestones.map((m) => {
              const progress = Math.min(100, (m.current / m.target) * 100);
              return (
                <div key={m.id} className="space-y-3 group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{m.label}</p>
                      <h4 className="text-lg font-black text-[var(--t-text)]">
                        {formatTarget(m.current, m.type)} 
                        <span className="text-[var(--t-text-muted)] font-medium mx-1">/</span> 
                        {formatTarget(m.target, m.type)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleUpdateMilestone(m.id)}
                        className="p-2 rounded-xl bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] opacity-0 group-hover:opacity-100 transition-all hover:text-[var(--t-primary)]"
                        title="Update Progress"
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="p-2 rounded-xl bg-[var(--t-surface-dim)] text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                        title="Decommission Objective"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden p-0.5 border border-[var(--t-border)]">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-accent)] rounded-full transition-all duration-1000 relative"
                      style={{ width: `${progress}%` }}
                    >
                      {progress > 5 && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Mix */}
        <div className="rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Member Contributions</h3>
                 <p className="text-xs text-[var(--t-text-muted)]">Relative performance split.</p>
              </div>
              <DollarSign size={24} className="text-emerald-500" />
           </div>

           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[200px] w-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={contributionData.slice(0, 5)}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                       >
                          {contributionData.slice(0, 5).map((_, i) => (
                             <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', color: 'var(--t-text)' }}
                         itemStyle={{ color: 'var(--t-text)', fontWeight: 'bold' }}
                       />
                    </PieChart>
                 </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-4">
                 {contributionData.slice(0, 5).map((member, i) => (
                    <div key={member.id} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-black text-[var(--t-text)]">{member.name}</span>
                       </div>
                       <span className="text-xs font-black text-emerald-500">${(member.rawRev/1000).toFixed(1)}k</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Team Roster */}
      <div className="rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Commanders & Operatives</h3>
            <p className="text-xs text-[var(--t-text-muted)]">Active roster management.</p>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            className="p-3 rounded-2xl bg-[var(--t-primary)]/10 text-[var(--t-primary)] border border-[var(--t-primary)]/20 hover:bg-[var(--t-primary)] hover:text-white transition-all shadow-lg shadow-[var(--t-primary-dim)]"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {team.map((member) => {
            const RoleIcon = ROLE_ICONS[member.teamRole] || Shield;
            const isExpanded = expandedMember === member.id;

            return (
              <div 
                key={member.id} 
                className={`p-6 rounded-[2rem] border transition-all duration-500 ${isExpanded ? 'bg-[var(--t-bg)] border-[var(--t-primary)] shadow-2xl scale-[1.02]' : 'bg-[var(--t-surface-dim)]/30 border-[var(--t-border)] hover:border-[var(--t-primary)]/30'}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] flex items-center justify-center text-xl font-black text-[var(--t-primary)] overflow-hidden shadow-xl">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name[0].toUpperCase()
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--t-surface)] ${member.presenceStatus === 'online' ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-[var(--t-text-muted)]'}`} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-[var(--t-text)] leading-tight">{member.name}</h4>
                      <div className="flex items-center gap-1.5">
                        <RoleIcon size={12} className="text-[var(--t-primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{member.teamRole}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                    className="p-2 rounded-xl hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] transition-colors"
                  >
                    <ChevronDown size={20} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[var(--t-surface)] p-3 rounded-2xl border border-[var(--t-border)]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Deals Won</p>
                    <p className="text-lg font-black text-[var(--t-text)]">{leads.filter(l => l.assignedTo === member.id && l.status === 'closed-won').length}</p>
                  </div>
                  <div className="bg-[var(--t-surface)] p-3 rounded-2xl border border-[var(--t-border)]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Revenue</p>
                    <p className="text-lg font-black text-emerald-500">${(leads.filter(l => l.assignedTo === member.id && ['closed-won', 'contract-in', 'under-contract'].includes(l.status)).reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0) / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-[var(--t-surface)] p-3 rounded-2xl border border-[var(--t-border)]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Open Leads</p>
                    <p className="text-lg font-black text-[var(--t-text)]">{leads.filter(l => l.assignedTo === member.id && !['closed-won', 'closed-lost'].includes(l.status)).length}</p>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2">
                       <div className="flex items-center gap-1.5 text-[10px] text-[var(--t-text-muted)] font-bold uppercase">
                          <Users size={12} />
                          <span>{member.role || 'Operative'}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-[10px] text-[var(--t-text-muted)] font-bold uppercase">
                          <Plus size={12} />
                          <span>Joined {new Date(member.lastSeen).toLocaleDateString()}</span>
                       </div>
                    </div>
                    {currentUser?.id !== member.id && (
                      <div className="pt-4 border-t border-[var(--t-border)]">
                         <button
                           onClick={() => removeTeamMember(member.id)}
                           className="w-full py-3 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
                         >
                           <UserMinus size={14} />
                           Release Member
                         </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--t-surface)] rounded-[2.5rem] border border-[var(--t-border)] p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Users size={120} />
             </div>
             
             <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Invite Allies</h3>
                  <p className="text-sm text-[var(--t-text-muted)]">Expand your tactical operations.</p>
                </div>
                <button 
                   onClick={() => setShowInvite(false)}
                   className="p-2 rounded-xl bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
             </div>

             <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-[var(--t-bg)] border-2 border-dashed border-[var(--t-border)] text-center space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Tactical Join Code</p>
                   <p className="text-4xl font-black text-[var(--t-primary)] tracking-[0.2em]">{teamConfig.inviteCode}</p>
                   <button
                     onClick={copyInviteCode}
                     className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--t-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:translate-y-[-2px] transition-all"
                   >
                     {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                     {copiedCode ? 'Copied!' : 'Copy Code'}
                   </button>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                   <p className="text-xs text-blue-400 leading-relaxed font-medium">
                      Members can use this code in their <strong>Team Settings</strong> to request access to join your roster.
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-[var(--t-surface)] rounded-[2.5rem] border border-[var(--t-border)] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Recruit Operative</h3>
                   <p className="text-sm text-[var(--t-text-muted)]">Direct enlistment into your team.</p>
                 </div>
                 <button 
                    onClick={() => setShowAddMember(false)}
                    className="p-2 rounded-xl bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">Full Name</label>
                       <input
                         type="text"
                         required
                         value={newMember.name}
                         onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                         className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                         placeholder="John Doe"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">Email Address</label>
                       <input
                         type="email"
                         required
                         value={newMember.email}
                         onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                         className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                         placeholder="john@example.com"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">Job Title</label>
                       <input
                         type="text"
                         value={newMember.role}
                         onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                         className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                         placeholder="Sales Ops"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">System Role</label>
                       <select
                         value={newMember.teamRole}
                         onChange={(e) => setNewMember({ ...newMember, teamRole: e.target.value as TeamRole })}
                         className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
                       >
                          <option value="member">Operative (Member)</option>
                          <option value="admin">Commander (Admin)</option>
                          <option value="viewer">Observer (Viewer)</option>
                       </select>
                    </div>
                 </div>

                 <button
                   type="submit"
                   className="w-full py-4 bg-[var(--t-primary)] text-white font-black uppercase tracking-widest text-[12px] rounded-2xl shadow-xl shadow-[var(--t-primary-dim)] hover:translate-y-[-2px] transition-all"
                 >
                    Confirm Recruitment
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-[var(--t-surface)] rounded-[2.5rem] border border-[var(--t-border)] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">New Objective</h3>
                   <p className="text-sm text-[var(--t-text-muted)]">Strategic goal for the command center.</p>
                 </div>
                 <button 
                    onClick={() => setShowAddMilestone(false)}
                    className="p-2 rounded-xl bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>
 
              <form onSubmit={handleAddMilestone} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">Objective Label</label>
                    <input
                      type="text"
                      required
                      value={newMilestone.label}
                      onChange={(e) => setNewMilestone({ ...newMilestone, label: e.target.value })}
                      className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                      placeholder="e.g. Monthly Revenue Goal"
                    />
                 </div>
 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">Target Value</label>
                       <input
                         type="number"
                         required
                         value={newMilestone.target}
                         onChange={(e) => setNewMilestone({ ...newMilestone, target: parseInt(e.target.value) })}
                         className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all"
                         placeholder="100000"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] ml-2">Metric Category</label>
                       <select
                         value={newMilestone.type}
                         onChange={(e) => setNewMilestone({ ...newMilestone, type: e.target.value as any })}
                         className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl py-3 px-4 text-[var(--t-text)] outline-none focus:border-[var(--t-primary)] transition-all appearance-none"
                       >
                          <option value="leads">Leads Generated</option>
                          <option value="deals">Deals Closed</option>
                          <option value="revenue">Total Revenue</option>
                          <option value="other">Other Tactical Metric</option>
                       </select>
                    </div>
                 </div>
 
                 <button
                   type="submit"
                   className="w-full py-4 bg-[var(--t-primary)] text-white font-black uppercase tracking-widest text-[12px] rounded-2xl shadow-xl shadow-[var(--t-primary-dim)] hover:translate-y-[-2px] transition-all"
                 >
                    Establish Objective
                 </button>
              </form>
           </div>
        </div>
      )}
 
      {/* Team Switcher & Creation Modals */}
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
