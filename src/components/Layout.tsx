import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { UserMenu } from './UserMenu';
import { NotificationPanel } from './NotificationPanel';
import { StatusIndicator } from './StatusIndicator';
import { JoinTeamModal } from './JoinTeamModal';
import { CreateTeamModal } from './CreateTeamModal';
import { switchToTeam } from '../lib/team-utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  LayoutDashboard, Users, Map, UserCog, Settings, Menu, X, Building2, Search,
  ListTodo, MessageSquare, Download, ChevronDown, Plus, ArrowRightLeft,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/imports', label: 'Imports', icon: Download },
  { to: '/team', label: 'Team', icon: UserCog },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface UserTeam {
  teamId: string;
  teamName: string;
  role: string;
  isCurrent: boolean;
}

export function Layout() {
  const { sidebarOpen, toggleSidebar, team, tasks, unreadCounts, teamConfig, currentUser } = useStore();

  const onlineCount = team.filter(m => m.presenceStatus === 'online').length;
  const pendingTaskCount = tasks.filter(t => t.status === 'todo' || t.status === 'in-progress').length;
  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);

  // Fetch all teams user belongs to
  useEffect(() => {
    async function fetchTeams() {
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
      } catch { /* ignore */ }
    }
    fetchTeams();
  }, [currentUser?.id]);

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shrink-0">
            <Building2 size={22} />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold leading-tight tracking-tight text-white">
                WholeScale
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-blue-400">
                OS
              </p>
            </div>
          )}
        </div>

        {/* Team Switcher */}
        {sidebarOpen && (
          <div className="mx-3 mt-3 rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
            <button
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600/15 flex items-center justify-center shrink-0">
                <Building2 size={13} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white">
                  {teamConfig.name || 'My Team'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {team.length} member{team.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showTeamDropdown && (
              <div className="border-t border-slate-800">
                {/* Team list */}
                {userTeams.length > 1 && (
                  <div className="p-1.5">
                    <p className="text-[9px] uppercase tracking-wider font-semibold px-2 py-1 text-slate-400">
                      Switch Team
                    </p>
                    {userTeams.map(t => (
                      <button
                        key={t.teamId}
                        onClick={() => {
                          if (!t.isCurrent) switchToTeam(t.teamId);
                          setShowTeamDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${t.isCurrent ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className={`text-xs truncate flex-1 ${t.isCurrent ? 'text-blue-400' : 'text-slate-300'}`}>
                          {t.teamName}
                        </span>
                        {t.isCurrent && (
                          <span className="text-[9px] text-emerald-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className={`p-1.5 space-y-0.5 ${userTeams.length > 1 ? 'border-t border-slate-800' : ''}`}>
                  <button
                    onClick={() => { setShowJoinModal(true); setShowTeamDropdown(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <ArrowRightLeft size={12} /> Join Team
                  </button>
                  <button
                    onClick={() => { setShowCreateModal(true); setShowTeamDropdown(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <Plus size={12} /> Create Team
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 p-3 mt-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const badge =
              label === 'Tasks' ? pendingTaskCount :
              label === 'Team' ? onlineCount :
              label === 'Chat' ? totalUnread : 0;

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all group relative ${
                    isActive ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={20} className="shrink-0" />
                {sidebarOpen && <span className="flex-1">{label}</span>}
                {sidebarOpen && badge > 0 && (
                  <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    label === 'Tasks' ? 'bg-amber-500' :
                    label === 'Chat' ? 'bg-blue-500' :
                    'bg-emerald-500'
                  }`}>
                    {badge}
                  </span>
                )}
                {!sidebarOpen && badge > 0 && (
                  <span className={`absolute right-2 w-2 h-2 rounded-full ${
                    label === 'Tasks' ? 'bg-amber-500' :
                    label === 'Chat' ? 'bg-blue-500' :
                    'bg-emerald-500'
                  }`} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Online Team Members */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2 text-slate-400">
              Online Now
            </p>
            <div className="space-y-1.5">
              {team
                .filter(m => m.presenceStatus !== 'offline')
                .slice(0, 4)
                .map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                        {m.avatar}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <StatusIndicator status={m.presenceStatus} size="sm" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate text-slate-300">
                        {m.name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              {team.filter(m => m.presenceStatus !== 'offline').length === 0 && (
                <p className="text-xs text-slate-400">No one online</p>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search leads, tasks, team..."
                className="w-72 pl-9 pr-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationPanel />
            <div className="w-px h-6 bg-slate-700" />
            <UserMenu />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto p-6 bg-slate-950">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}