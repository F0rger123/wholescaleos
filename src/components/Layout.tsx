import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { UserMenu } from './UserMenu';
import { NotificationPanel } from './NotificationPanel';
import { ThemeSwitcher } from './ThemeSwitcher';
import { StatusIndicator } from './StatusIndicator';
import { JoinTeamModal } from './JoinTeamModal';
import { CreateTeamModal } from './CreateTeamModal';
import { switchToTeam } from '../lib/team-utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  LayoutDashboard, Users, Map, UserCog, Settings, Menu, X, Building2, Search,
  ListTodo, MessageSquare, Download, ChevronDown, Plus, ArrowRightLeft,
  Calculator, Calendar,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/imports', label: 'Imports', icon: Download },
  { to: '/calendar', label: 'Calendar', icon: Calendar }, // Calendar view for team events
  { to: '/calculators', label: 'Calculators', icon: Calculator },
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
    <div className="flex h-full" style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col border-r transition-all duration-300 shrink-0`}
        style={{
          background: 'var(--t-sidebar-bg)',
          borderColor: 'var(--t-sidebar-border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b"
          style={{ borderColor: 'var(--t-sidebar-border)' }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0"
            style={{ background: 'var(--t-primary)' }}
          >
            <Building2 size={22} />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold leading-tight tracking-tight" style={{ color: 'var(--t-text)' }}>
                WholeScale
              </h1>
              <p
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: 'var(--t-primary-text)' }}
              >
                OS
              </p>
            </div>
          )}
        </div>

        {/* Team Switcher - Fixed with smooth scrolling dropdown */}
        {sidebarOpen && (
          <div
            className="mx-3 mt-3 rounded-xl border overflow-visible relative"
            style={{
              background: 'var(--t-input-bg, rgba(0,0,0,0.2))',
              borderColor: 'var(--t-sidebar-border)',
            }}
          >
            <button
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--t-primary-dim, rgba(59,130,246,0.15))' }}
              >
                <Building2 size={13} style={{ color: 'var(--t-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--t-text)' }}>
                  {teamConfig.name || 'My Team'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>
                  {team.length} member{team.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`}
                style={{ color: 'var(--t-text-muted)' }}
              />
            </button>

            {/* Dropdown Menu - Fixed with smooth scrolling */}
            {showTeamDropdown && (
              <>
                {/* Backdrop to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowTeamDropdown(false)}
                />
                
                {/* Dropdown menu - positioned absolutely with smooth scroll */}
                <div
                  className="absolute left-0 right-0 mt-1 z-50 rounded-xl border shadow-lg max-h-[320px] overflow-y-auto scroll-smooth"
                  style={{
                    background: 'var(--t-sidebar-bg)',
                    borderColor: 'var(--t-sidebar-border)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Team list */}
                  {userTeams.length > 1 && (
                    <div className="p-2">
                      <p className="text-[9px] uppercase tracking-wider font-semibold px-2 py-1.5 sticky top-0 z-10"
                        style={{ 
                          color: 'var(--t-text-muted)',
                          background: 'var(--t-sidebar-bg)',
                          borderBottom: '1px solid var(--t-sidebar-border)',
                        }}
                      >
                        Switch Team
                      </p>
                      <div className="max-h-[180px] overflow-y-auto scroll-smooth pt-1">
                        {userTeams.map(t => (
                          <button
                            key={t.teamId}
                            onClick={() => {
                              if (!t.isCurrent) switchToTeam(t.teamId);
                              setShowTeamDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5"
                          >
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${t.isCurrent ? 'bg-emerald-400' : ''}`}
                              style={{ background: t.isCurrent ? undefined : 'var(--t-text-muted)' }}
                            />
                            <span className="text-xs truncate flex-1" style={{
                              color: t.isCurrent ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                            }}>
                              {t.teamName}
                            </span>
                            {t.isCurrent && (
                              <span className="text-[9px] text-emerald-400">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-2 space-y-1 sticky bottom-0" 
                    style={{ 
                      borderTop: `1px solid var(--t-sidebar-border)`,
                      background: 'var(--t-sidebar-bg)',
                    }}
                  >
                    <button
                      onClick={() => { setShowJoinModal(true); setShowTeamDropdown(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left text-xs transition-colors hover:bg-white/5"
                      style={{ color: 'var(--t-text-secondary)' }}
                    >
                      <ArrowRightLeft size={14} /> Join Team
                    </button>
                    <button
                      onClick={() => { setShowCreateModal(true); setShowTeamDropdown(false); }}
                      className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left text-xs transition-colors hover:bg-white/5"
                      style={{ color: 'var(--t-text-secondary)' }}
                    >
                      <Plus size={14} /> Create Team
                    </button>
                  </div>
                </div>
              </>
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
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${
                    isActive ? 'active-nav-item' : 'inactive-nav-item'
                  }`
                }
                style={({ isActive }) => ({
                  borderRadius: 'var(--t-radius)',
                  background: isActive ? 'var(--t-primary-dim)' : 'transparent',
                  color: isActive ? 'var(--t-primary-text)' : 'var(--t-text-muted)',
                  boxShadow: isActive ? 'var(--t-glow-shadow)' : 'none',
                })}
              >
                <Icon size={20} className="shrink-0" />
                {sidebarOpen && <span className="flex-1">{label}</span>}
                {sidebarOpen && badge > 0 && (
                  <span
                    className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{
                      background: label === 'Tasks' ? 'var(--t-warning)' :
                                  label === 'Chat' ? 'var(--t-primary)' :
                                  'var(--t-success)',
                    }}
                  >
                    {badge}
                  </span>
                )}
                {!sidebarOpen && badge > 0 && (
                  <span
                    className="absolute right-2 w-2 h-2 rounded-full"
                    style={{
                      background: label === 'Tasks' ? 'var(--t-warning)' :
                                  label === 'Chat' ? 'var(--t-primary)' :
                                  'var(--t-success)',
                    }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Online Team Members */}
        {sidebarOpen && (
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'var(--t-sidebar-border)' }}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--t-text-muted)' }}>
              Online Now
            </p>
            <div className="space-y-1.5">
              {team
                .filter(m => m.presenceStatus !== 'offline')
                .slice(0, 4)
                .map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="relative">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, var(--t-avatar-from), var(--t-avatar-to))` }}
                      >
                        {m.avatar}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <StatusIndicator status={m.presenceStatus} size="sm" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'var(--t-text-secondary)' }}>
                        {m.name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              {team.filter(m => m.presenceStatus !== 'offline').length === 0 && (
                <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>No one online</p>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b shrink-0 backdrop-blur-sm"
          style={{
            background: 'color-mix(in srgb, var(--t-sidebar-bg) 80%, transparent)',
            borderColor: 'var(--t-border)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--t-surface-hover)]"
              style={{ color: 'var(--t-text-secondary)' }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
              <input
                type="text"
                placeholder="Search leads, tasks, team..."
                className="w-72 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  borderRadius: 'var(--t-radius)',
                  background: 'var(--t-input-bg)',
                  border: '1px solid var(--t-input-border)',
                  color: 'var(--t-text)',
                  // @ts-expect-error CSS custom property
                  '--tw-ring-color': 'var(--t-input-focus)',
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <div className="w-px h-6" style={{ background: 'var(--t-border)' }} />
            <NotificationPanel />
            <div className="w-px h-6" style={{ background: 'var(--t-border)' }} />
            <UserMenu />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}