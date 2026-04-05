import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { UserMenu } from './UserMenu';
import { NotificationPanel } from './NotificationPanel';
import { ThemeSwitcher } from './ThemeSwitcher';
import { JoinTeamModal } from './JoinTeamModal';
import { CreateTeamModal } from './CreateTeamModal';
import { switchToTeam } from '../lib/team-utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  LayoutDashboard, Users, 
  Settings, Search,
  Indent, AlignLeft,
  Bot, Smartphone, StickyNote,
  CheckCircle, Mail, CloudCheck, Shield, Workflow,
  Undo2, Redo2, Download, UserCog, Map,
  Building2, ChevronDown, ArrowRightLeft, Plus
} from 'lucide-react';
import { AIBotWidget } from './AIBotWidget';
import { QuickNotes } from './QuickNotes';
import { LeadFormModal } from './LeadFormModal';
import { Logo } from './Logo';

interface UserTeam {
  teamId: string;
  teamName: string;
  role: string;
  isCurrent: boolean;
}

export function Layout() {
  const { 
    sidebarOpen, toggleSidebar, team, tasks, unreadCounts, 
    teamConfig, currentUser,
    shortcutsEnabled,
    currentTheme, setTheme,
    showQuickNotes,
    isQuickNotesOpen, setQuickNotesOpen,
    setNotesDocked,
    showFloatingAIWidget,
    searchResults, performSearch,
    aiName, setAiDocked,
    isAiOpen, setAiOpen,
    activeLeadModalId,
    setActiveLeadModalId,
    undo, redo, history, future,
    manualSave, saveStatus, isSyncing
  } = useStore();

  // Auto-save loop (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      manualSave();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [manualSave]);

  const isAdmin = useMemo(() => {
    return currentUser?.email?.toLowerCase() === 'drummerforger@gmail.com' || 
           currentUser?.id === '9e5845b7-b4af-4a12-9d9e-5eb2f9b88f3d';
  }, [currentUser]);

  const navSections = useMemo(() => {
    const sections: Record<string, { to: string; label: string; icon: any }[]> = {
      MAIN: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/leads', label: 'Leads', icon: Users },
        { to: '/tasks', label: 'Tasks', icon: CheckCircle },
        { to: '/map', label: 'Map', icon: Map },
      ],
      AI: [
        { to: '/ai-test', label: aiName || 'OS Bot', icon: Bot },
        { to: '/automations', label: 'Automations Hub', icon: Workflow },
      ],
      COMMUNICATIONS: [
        { to: '/email', label: 'Email', icon: Mail },
        { to: '/sms', label: 'Text (SMS)', icon: Smartphone },
        { to: '/calendar', label: 'Calendar', icon: Map },
      ],
      TEAM: [
        { to: '/team', label: 'Team Dashboard', icon: UserCog },
        { to: '/settings', label: 'Settings', icon: Settings },
      ],
    };

    if (isAdmin) {
      sections.ADMIN = [
        { to: '/admin', label: 'Admin Panel', icon: Shield }
      ];
    }

    return sections;
  }, [isAdmin, aiName]);

  const onlineCount = (team || []).filter(m => m.presenceStatus === 'online').length;
  const pendingTaskCount = (tasks || []).filter(t => t.status === 'todo' || t.status === 'in-progress').length;
  const totalUnread = Object.values(unreadCounts || {}).reduce((sum, c) => sum + (Number(c) || 0), 0);

  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);

  const [userShortcuts, setUserShortcuts] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Quick Notes drag state
  const [notesPos, setNotesPos] = useState(() => {
    const saved = localStorage.getItem('quick_notes_position');
    return saved ? JSON.parse(saved) : { x: -1, y: -1 };
  });
  const [isNotesDragging, setIsNotesDragging] = useState(false);
  const notesDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Load Preferences
  useEffect(() => {
    async function loadPrefs() {
      if (!currentUser?.id) return;
      
      if (isSupabaseConfigured && supabase) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (profile?.settings?.show_floating_widget !== undefined) {
          useStore.getState().setShowFloatingAIWidget(profile.settings.show_floating_widget);
        }
        
        if (profile?.settings?.shortcuts) {
          setUserShortcuts(profile.settings.shortcuts);
        }
      } else {
        const localShowWidget = localStorage.getItem('user_show_floating_widget');
        if (localShowWidget) {
          useStore.getState().setShowFloatingAIWidget(localShowWidget === 'true');
        }
        
        const localShortcuts = localStorage.getItem('user_shortcuts');
        if (localShortcuts) setUserShortcuts(JSON.parse(localShortcuts));
      }
    }
    loadPrefs();
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentTheme) {
      setTheme(currentTheme);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ai_usage_map' && e.newValue) {
        try {
          const newUsage = JSON.parse(e.newValue);
          useStore.setState({ aiUsage: newUsage });
        } catch {}
      }
      if (e.key === 'wholescale-shortcuts-enabled') {
        useStore.getState().setShortcutsEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync Quick Notes Setting to Visibility - REMOVED AUTO-OPEN
  useEffect(() => {
    if (showQuickNotes === false) {
      setQuickNotesOpen(false);
    }
  }, [showQuickNotes]);


  useEffect(() => {
    if (!isNotesDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const newX = notesDragStart.current.posX + (e.clientX - notesDragStart.current.x);
      const newY = notesDragStart.current.posY + (e.clientY - notesDragStart.current.y);
      setNotesPos({
        x: Math.max(0, Math.min(window.innerWidth - 460, newX)),
        y: Math.max(0, Math.min(window.innerHeight - 560, newY))
      });
    };
    const onMouseUp = () => {
      setIsNotesDragging(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isNotesDragging]);

  // Persist notes position
  useEffect(() => {
    if (!isNotesDragging && notesPos.x !== -1) {
      localStorage.setItem('quick_notes_position', JSON.stringify(notesPos));
    }
  }, [isNotesDragging, notesPos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shortcutsEnabled) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable]')
      ) return;

      let combo = [];
      if (e.ctrlKey || e.metaKey) combo.push('mod');
      if (e.altKey) combo.push('alt');
      if (e.shiftKey) combo.push('shift');
      
      const key = e.key.toLowerCase();
      if (!['control', 'meta', 'alt', 'shift'].includes(key)) combo.push(key);
      const comboStr = combo.join('+');

      if (comboStr === 'mod+k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => {
          const searchInput = searchRef.current?.querySelector('input') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
        return;
      }

      const matched = userShortcuts.find(s => s.keys === comboStr);
      if (matched) {
        e.preventDefault();
        switch (matched.id) {
          case 'new_lead': navigate('/leads'); break;
          case 'new_task': navigate('/tasks'); break;
          case 'open_ai': window.dispatchEvent(new CustomEvent('toggle-ai-widget')); break;
          case 'send_sms': navigate('/sms'); break;
          case 'view_calendar': navigate('/calendar'); break;
          case 'settings': navigate('/settings'); break;
          case 'dashboard': navigate('/'); break;
          case 'toggle_dark': window.dispatchEvent(new CustomEvent('toggle-theme')); break;
          case 'save': window.dispatchEvent(new CustomEvent('global-save')); break;
          case 'clear_chat': window.dispatchEvent(new CustomEvent('clear-ai-chat')); break;
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickNotesOpen(!isQuickNotesOpen);
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        if (searchQuery === '') setIsSearchExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userShortcuts, navigate, shortcutsEnabled, searchQuery, showQuickNotes]);

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
      } catch {}
    }
    fetchTeams();
  }, [currentUser?.id]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--t-bg)] text-[var(--t-text)] theme-transition">
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-24'} flex flex-col border-r transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 astral-glass border-[var(--t-sidebar-border)] relative z-[var(--z-sidebar)]`}
      >

        <Link
          to="/"
          className="flex items-center gap-4 px-6 py-8 border-b border-[var(--t-sidebar-border)] hover:bg-[var(--t-sidebar-hover)] transition-all group overflow-hidden"
        >
          <Logo size={48} showText={sidebarOpen} />
        </Link>

        <div
          className={`mx-4 mt-6 rounded-[2rem] border overflow-visible relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 h-0 mt-0 border-none overflow-hidden'}`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <button
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--t-surface-hover)]"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--t-primary-dim)' }}
            >
              <Building2 size={13} style={{ color: 'var(--t-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest truncate italic" style={{ color: 'var(--t-text)' }}>
                {teamConfig.name || 'Core Network'}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#6d758c]">
                {(team || []).length} Nodes Active
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`}
              style={{ color: 'var(--t-text-muted)' }}
            />
          </button>

          {showTeamDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTeamDropdown(false)} />
              <div
                className="absolute left-0 right-0 mt-1 z-50 rounded-xl border shadow-lg max-h-[320px] overflow-y-auto scroll-smooth"
                style={{
                  background: 'var(--t-sidebar-bg)',
                  borderColor: 'var(--t-sidebar-border)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                }}
              >
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
                    <div className="max-h-[180px] overflow-y-auto pt-1">
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
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: t.isCurrent ? 'var(--t-success)' : 'var(--t-text-muted)' }}
                          />
                          <span className="text-xs truncate flex-1" style={{
                            color: t.isCurrent ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                          }}>{t.teamName}</span>
                          {t.isCurrent && <span className="text-[9px]" style={{ color: 'var(--t-success)' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-2 space-y-1 sticky bottom-0" style={{ borderTop: '1px solid var(--t-sidebar-border)', background: 'var(--t-sidebar-bg)' }}>
                  <button onClick={() => { setShowJoinModal(true); setShowTeamDropdown(false); }} className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left text-xs transition-colors hover:bg-white/5" style={{ color: 'var(--t-text-secondary)' }}>
                    <ArrowRightLeft size={14} /> Join Team
                  </button>
                  <button onClick={() => { setShowCreateModal(true); setShowTeamDropdown(false); }} className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left text-xs transition-colors hover:bg-white/5" style={{ color: 'var(--t-text-secondary)' }}>
                    <Plus size={14} /> Create Team
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-8 select-none custom-scrollbar">
          {Object.entries(navSections).map(([section, items]) => (
            <div key={section} className="space-y-4">
              <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] italic" style={{ color: 'var(--t-text-muted)' }}>{section}</p>
              </div>
              <div className="flex flex-col gap-1">
                {items.map(({ to, label, icon: Icon }) => {
                  const badge = (label === 'Tasks' || label === 'Tasks') ? pendingTaskCount : label === 'Team Dashboard' ? onlineCount : label === 'Team Chat' ? totalUnread : 0;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-3 text-[13px] font-bold transition-all duration-300 group relative ${isActive ? 'active-nav-item' : 'inactive-nav-item hover:translate-x-1.5'}`}
                      style={({ isActive }) => ({
                        borderRadius: '1rem',
                        background: isActive ? 'var(--t-primary-dim)' : 'transparent',
                        color: isActive ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                        border: isActive ? '1px solid var(--t-primary-dim)' : '1px solid transparent',
                        boxShadow: isActive ? '0 10px 20px -10px var(--t-primary-dim)' : 'none',
                      })}
                    >
                      <Icon size={18} className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'group-hover:scale-110' : 'mx-auto group-hover:scale-125'}`} />
                      <span className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden whitespace-nowrap ${sidebarOpen ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>{label}</span>
                      <div className={`absolute left-0 w-1 h-5 bg-[var(--t-primary)] rounded-r-full transition-all duration-300 ${location.pathname === to ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} />
                      {badge > 0 && sidebarOpen && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg min-w-[20px] text-center" style={{ background: label === 'Tasks' ? 'var(--t-warning)' : label === 'Team Chat' ? 'var(--t-primary)' : 'var(--t-success)', color: 'var(--t-on-primary)' }}>{badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-8 py-6 border-b shrink-0 astral-glass border-[var(--t-sidebar-border)] relative" style={{ zIndex: (isUserMenuOpen || showSearchResults) ? 200 : 100 }}>
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle */}
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-xl hover:bg-[var(--t-surface-hover)] transition-all hover:scale-105 active:scale-95 group relative" 
              style={{ color: 'var(--t-text-secondary)' }}
              id="sidebar-toggle"
            >
              {sidebarOpen ? (
                <Indent size={20} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-text)]" />
              ) : (
                <AlignLeft size={20} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]" />
              )}
            </button>
            <div className="relative flex items-center" ref={searchRef}>
              <button
                onClick={() => {
                  setIsSearchExpanded(!isSearchExpanded);
                  if (!isSearchExpanded) setTimeout(() => searchRef.current?.querySelector('input')?.focus(), 100);
                }}
                className="p-2 rounded-lg hover:bg-[var(--t-surface-hover)]"
                style={{ color: 'var(--t-text-muted)' }}
              ><Search size={20} /></button>
              <div className={`overflow-hidden transition-all duration-300 flex items-center ${isSearchExpanded ? 'w-72 opacity-100 ml-2' : 'w-0 opacity-0'}`}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); performSearch(e.target.value); setShowSearchResults(true); }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Search leads, tasks..."
                  className="w-full px-4 py-2 text-sm focus:outline-none focus:ring-2 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(var(--t-primary-rgb),0.1)]"
                  style={{ background: 'var(--t-input-bg)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)' }}
                />
              </div>

              {showSearchResults && searchQuery && (
                <div className="absolute top-full left-0 mt-2 w-96 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="max-h-[min(500px,70vh)] overflow-y-auto p-2 space-y-4">
                    {searchResults.leads.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] px-3 mb-1">Leads</p>
                        {searchResults.leads.map(lead => (
                          <button key={lead.id} onClick={() => { setActiveLeadModalId(lead.id); setShowSearchResults(false); }} className="w-full flex items-center gap-3 p-2 hover:bg-[var(--t-surface-hover)] rounded-lg text-left">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-primary-dim)] text-[var(--t-primary)] font-bold text-xs uppercase">{lead.name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--t-text)] truncate">{lead.name}</p>
                              <p className="text-[10px] text-[var(--t-text-muted)] truncate">{lead.propertyAddress}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.tasks.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] px-3 mb-1">Tasks</p>
                        {searchResults.tasks.map(task => (
                          <button key={task.id} onClick={() => { navigate(`/tasks?id=${task.id}`); setShowSearchResults(false); }} className="w-full flex items-center gap-3 p-2 hover:bg-[var(--t-surface-hover)] rounded-lg text-left">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)]"><CheckCircle size={14} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--t-text)] truncate">{task.title}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.leads.length === 0 && searchResults.tasks.length === 0 && (
                      <div className="p-8 text-center text-sm text-[var(--t-text-muted)]">No results</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--t-primary-dim)] border border-[var(--t-primary-dim)]">
                <CloudCheck size={14} className="text-[var(--t-primary)] animate-pulse" />
                <span className="text-[10px] font-black text-[var(--t-primary)] uppercase tracking-wider">Syncing</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-[var(--t-surface-subtle)] p-1 rounded-xl border border-[var(--t-border)] shadow-sm">
              {/* Unified Header Cluster */}
              
              {/* OS Bot Toggle */}
              {showFloatingAIWidget && (
                <>
                  <button
                    onClick={() => {
                      if (isAiOpen) {
                        setAiDocked(true);
                        setAiOpen(false);
                      } else {
                        setAiDocked(false);
                        setAiOpen(true);
                      }
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                      isAiOpen 
                        ? 'bg-[var(--t-primary)] text-white shadow-lg px-3' 
                        : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface-hover)]'
                    }`}
                    title={isAiOpen ? "Close OS Bot" : "Open OS Bot"}
                  >
                    <Bot size={18} />
                    {isAiOpen && <span className="text-[10px] font-black uppercase tracking-widest">Close</span>}
                  </button>
                  <div className="w-[1px] h-3 bg-[var(--t-border)] mx-0.5 opacity-50" />
                </>
              )}

              {/* Quick Notes Toggle */}
              {showQuickNotes && (
                <>
                  <button
                    onClick={() => {
                      if (isQuickNotesOpen) {
                        setNotesDocked(true);
                        setQuickNotesOpen(false);
                      } else {
                        setNotesDocked(false);
                        setQuickNotesOpen(true);
                      }
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                      isQuickNotesOpen 
                        ? 'bg-[var(--t-primary)] text-white shadow-lg px-3' 
                        : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)] hover:bg-[var(--t-surface-hover)]'
                    }`}
                    title={isQuickNotesOpen ? "Close Quick Notes" : "Open Quick Notes"}
                  >
                    <StickyNote size={18} />
                    {isQuickNotesOpen && <span className="text-[10px] font-black uppercase tracking-widest">Close</span>}
                  </button>
                  <div className="w-[1px] h-3 bg-[var(--t-border)] mx-0.5 opacity-50" />
                </>
              )}

              {/* Theme & Notifications */}
              <div className="hover:scale-110 transition-transform"><ThemeSwitcher /></div>
              <div className="w-[1px] h-4 bg-[var(--t-border)] mx-1" />
              <div className="hover:scale-110 transition-transform"><NotificationPanel /></div>
            </div>
            <div className="hover:scale-105 active:scale-95 transition-all">
              <UserMenu onOpenChange={setIsUserMenuOpen} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {!(location.pathname.startsWith('/settings') || location.pathname.startsWith('/admin')) && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 z-[var(--z-popover)] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-1 p-1 rounded-2xl astral-glass border border-white/10 shadow-2xl">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all text-[var(--t-text-muted)] hover:text-white"
              title="Undo (Ctrl+Z)"
            ><Undo2 size={18} /></button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all text-[var(--t-text-muted)] hover:text-white"
              title="Redo (Ctrl+Y)"
            ><Redo2 size={18} /></button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button
              onClick={() => manualSave()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${saveStatus === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/10 hover:bg-white/10 text-[var(--t-text)] hover:text-white backdrop-blur-md'}`}
            >
              {saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : saveStatus === 'success' ? <CloudCheck size={16} /> : <Download size={16} className="rotate-180" />}
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">{saveStatus === 'saving' ? 'Saving' : saveStatus === 'success' ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      )}

      <AIBotWidget />
      
      {activeLeadModalId && (
        <LeadFormModal leadId={activeLeadModalId} isOpen={!!activeLeadModalId} onClose={() => setActiveLeadModalId(null)} />
      )}
      {showJoinModal && <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />}
      {showCreateModal && <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />}

      <QuickNotes />
    </div>
  );
}