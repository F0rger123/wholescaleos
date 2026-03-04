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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '256px' : '80px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e293b',
        borderRight: '1px solid #334155',
        transition: 'width 0.3s',
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', borderBottom: '1px solid #334155' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0
          }}>
            <Building2 size={22} />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>WholeScale</h1>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#60a5fa' }}>OS</p>
            </div>
          )}
        </div>

        {/* Team Switcher */}
        {sidebarOpen && (
          <div style={{ margin: '12px', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden', backgroundColor: '#0f172a' }}>
            <button
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                textAlign: 'left',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                color: 'white'
              }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#2563eb20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={13} color="#60a5fa" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: 'white' }}>{teamConfig.name || 'My Team'}</p>
                <p style={{ fontSize: '10px', margin: 0, color: '#94a3b8' }}>{team.length} member{team.length !== 1 ? 's' : ''}</p>
              </div>
              <ChevronDown size={14} style={{ color: '#94a3b8', transform: showTeamDropdown ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showTeamDropdown && (
              <div style={{ borderTop: '1px solid #334155' }}>
                {userTeams.length > 1 && (
                  <div style={{ padding: '6px' }}>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', padding: '4px 8px', color: '#94a3b8', margin: 0 }}>Switch Team</p>
                    {userTeams.map(t => (
                      <button
                        key={t.teamId}
                        onClick={() => {
                          if (!t.isCurrent) switchToTeam(t.teamId);
                          setShowTeamDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.isCurrent ? '#34d399' : '#64748b' }} />
                        <span style={{ fontSize: '12px', flex: 1, color: t.isCurrent ? '#60a5fa' : '#cbd5e1' }}>{t.teamName}</span>
                        {t.isCurrent && <span style={{ fontSize: '9px', color: '#34d399' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ padding: '6px', borderTop: userTeams.length > 1 ? '1px solid #334155' : 'none' }}>
                  <button
                    onClick={() => { setShowJoinModal(true); setShowTeamDropdown(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', color: '#cbd5e1', fontSize: '12px' }}
                  >
                    <ArrowRightLeft size={12} /> Join Team
                  </button>
                  <button
                    onClick={() => { setShowCreateModal(true); setShowTeamDropdown(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', color: '#cbd5e1', fontSize: '12px', marginTop: '2px' }}
                  >
                    <Plus size={12} /> Create Team
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', marginTop: '8px' }}>
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
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  backgroundColor: isActive ? '#2563eb20' : 'transparent',
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  position: 'relative'
                })}
              >
                <Icon size={20} />
                {sidebarOpen && <span style={{ flex: 1 }}>{label}</span>}
                {sidebarOpen && badge > 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    minWidth: '20px',
                    textAlign: 'center',
                    backgroundColor: label === 'Tasks' ? '#f59e0b' : label === 'Chat' ? '#2563eb' : '#10b981'
                  }}>
                    {badge}
                  </span>
                )}
                {!sidebarOpen && badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: label === 'Tasks' ? '#f59e0b' : label === 'Chat' ? '#2563eb' : '#10b981'
                  }} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Online Team Members */}
        {sidebarOpen && (
          <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px', color: '#94a3b8' }}>Online Now</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {team
                .filter(m => m.presenceStatus !== 'offline')
                .slice(0, 4)
                .map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563eb, #9333ea)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {m.avatar}
                      </div>
                      <span style={{ position: 'absolute', bottom: '-2px', right: '-2px' }}>
                        <StatusIndicator status={m.presenceStatus} size="sm" />
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', margin: 0, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              {team.filter(m => m.presenceStatus !== 'offline').length === 0 && (
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>No one online</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid #334155',
          backgroundColor: '#1e293b',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleSidebar}
              style={{
                padding: '8px',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
                background: 'none',
                border: 'none'
              }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search leads, tasks, team..."
                style={{
                  width: '288px',
                  padding: '8px 12px 8px 36px',
                  fontSize: '14px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationPanel />
            <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }} />
            <UserMenu />
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px', backgroundColor: '#0f172a' }}>
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}