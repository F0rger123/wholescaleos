import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  Calculator, Calendar, Bot,
  Smartphone, Bell, StickyNote, Maximize2, Minimize2, FileText, Bot as BookshelfIcon,
  Layout as LayoutIcon, CheckCircle, Mail, Undo2, Redo2, CloudCheck,
  Trophy, Shield
} from 'lucide-react';
import { AIBotWidget } from './AIBotWidget';
import { LeadFormModal } from './LeadFormModal';
import { toast } from 'react-hot-toast';

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
    searchResults, performSearch,
    aiName,
    activeLeadModalId,
    setActiveLeadModalId,
    undo, redo, history, future,
    manualSave, saveStatus, isSyncing
  } = useStore();

  // Auto-save loop (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      manualSave();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [manualSave]);

  const isAdmin = useMemo(() => {
    return currentUser?.email?.toLowerCase() === 'drummerforger@gmail.com' || 
           currentUser?.id === '9e5845b7-b4af-4a12-9d9e-5eb2f9b88f3d';
  }, [currentUser]);

  const navSections = useMemo(() => {
    const sections: Record<string, { to: string; label: string; icon: any }[]> = {
      Core: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/map', label: 'Map', icon: Map },
        { to: '/leads', label: 'Leads', icon: Users },
        { to: '/tasks', label: 'Tasks', icon: ListTodo },
        { to: '/calendar', label: 'Calendar', icon: Calendar },
      ],
      Messages: [
        { to: '/notifications', label: 'Notification Inbox', icon: Bell },
        { to: '/sms', label: 'SMS', icon: Smartphone },
        { to: '/email', label: 'Email', icon: Mail },
        { to: '/chat', label: 'Team Chat', icon: MessageSquare },
        { to: '/ai-test', label: aiName || 'OS Bot', icon: Bot },
      ],
      Tools: [
        { to: '/imports', label: 'Imports', icon: Download },
        { to: '/contracts', label: 'Contracts', icon: FileText },
        { to: '/calculators', label: 'Calculators', icon: Calculator },
        { to: '/settings', label: 'Settings', icon: Settings },
      ],
      Team: [
        { to: '/team', label: 'Team Dashboard', icon: UserCog },
        { to: '/team-analytics', label: 'Team Analytics', icon: Trophy },
        { to: '/team-calendar', label: 'Team Calendar', icon: Calendar },
      ],
    };

    if (isAdmin) {
      sections.Tools.push({ to: '/admin', label: 'Admin', icon: Shield });
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

  // LocalStorage for collapsed sidebar sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('wholescale-nav-collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showNotes, setShowNotes] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [notesDragStart, setNotesDragStart] = useState<{ x: number; y: number } | null>(null);
  const { quickNotes, setQuickNotes } = useStore();

  const [userShortcuts, setUserShortcuts] = useState<any[]>([]);
  const [aiDocked, setAiDocked] = useState(() => localStorage.getItem('ai_widget_docked') === 'true');
  const [notesDocked, setNotesDocked] = useState(() => localStorage.getItem('quick_notes_docked') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
        
        // Floating widget visibility sync
        if (profile?.settings?.show_floating_widget !== undefined) {
          useStore.getState().setShowFloatingAIWidget(profile.settings.show_floating_widget);
        }
        
        if (profile?.settings?.shortcuts) {
          setUserShortcuts(profile.settings.shortcuts);
        }
      } else {
        // LocalStorage fallback sync
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

  // Apply theme colors on mount
  useEffect(() => {
    if (currentTheme) {
      setTheme(currentTheme);
    }
  }, []);

  // Cross-tab Synchronization for AI Usage
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if shortcuts are disabled
      if (!shortcutsEnabled) return;

      // Robust check for typing in any input/editable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable]')
      ) return;

      // Normalize key combo
      let combo = [];
      if (e.ctrlKey || e.metaKey) combo.push('mod');
      if (e.altKey) combo.push('alt');
      if (e.shiftKey) combo.push('shift');
      
      const key = e.key.toLowerCase();
      if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
        combo.push(key);
      }
      const comboStr = combo.join('+');

      // Default/Fallback shortcuts
      if (comboStr === 'mod+k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => {
          const searchInput = searchRef.current?.querySelector('input') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
        return;
      }

      // Check User Shortcuts
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
          case 'toggle_dark': 
            // Simplified theme toggle
            window.dispatchEvent(new CustomEvent('toggle-theme'));
            break;
          case 'save': window.dispatchEvent(new CustomEvent('global-save')); break;
          case 'clear_chat': window.dispatchEvent(new CustomEvent('clear-ai-chat')); break;
        }
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowNotes(prev => !prev);
      }

      // Undo / Redo Shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      }
    };

    const handleAIDock = () => setAiDocked(true);
    const handleAIUndock = () => setAiDocked(false);
    const handleNotesDock = () => setNotesDocked(true);
    const handleNotesUndock = () => setNotesDocked(false);

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        if (searchQuery === '') setIsSearchExpanded(false);
      }
    };

    window.addEventListener('dock-ai-widget', handleAIDock);
    window.addEventListener('undock-ai-widget', handleAIUndock);
    window.addEventListener('dock-notes', handleNotesDock);
    window.addEventListener('undock-notes', handleNotesUndock);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('dock-ai-widget', handleAIDock);
      window.removeEventListener('undock-ai-widget', handleAIUndock);
      window.removeEventListener('dock-notes', handleNotesDock);
      window.removeEventListener('undock-notes', handleNotesUndock);
    };
  }, [userShortcuts, navigate, shortcutsEnabled, searchQuery]);

  const toggleSection = (section: string) => {
    const nextState = { ...collapsedSections, [section]: !collapsedSections[section] };
    setCollapsedSections(nextState);
    try {
      localStorage.setItem('wholescale-nav-collapsed', JSON.stringify(nextState));
    } catch { /* ignore */ }
  };

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
    <div className="flex h-full bg-[var(--t-bg)] text-[var(--t-text)] theme-transition">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-24'} flex flex-col border-r transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 astral-glass border-[var(--t-sidebar-border)] relative z-50`}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-4 px-6 py-8 border-b border-[var(--t-sidebar-border)] hover:bg-[var(--t-sidebar-hover)] transition-all group overflow-hidden"
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-[1.25rem] text-white shrink-0 group-hover:scale-110 transition-transform bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-600/30"
          >
            <Building2 size={24} />
          </div>
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOpen ? 'max-w-[150px] opacity-100 ml-0' : 'max-w-0 opacity-0 ml-0'}`}>
            <h1 className="text-xl font-black leading-tight tracking-[-0.05em] whitespace-nowrap italic uppercase">
              WholeScale
            </h1>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Operating System
            </p>
          </div>
        </Link>

        {/* Team Switcher - Fixed with smooth scrolling dropdown */}
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
              style={{ background: 'var(--t-primary-dim, rgba(59,130,246,0.15))' }}
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
          {/* Dropdown Menu - rest omitted for brevity in replacement but kept in file */}

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
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: t.isCurrent ? 'var(--t-success)' : 'var(--t-text-muted)' }}
                            />
                            <span className="text-xs truncate flex-1" style={{
                              color: t.isCurrent ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                            }}>
                              {t.teamName}
                            </span>
                            {t.isCurrent && (
                              <span className="text-[9px]" style={{ color: 'var(--t-success)' }}>✓</span>
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
        {/* Nav */}        <nav className="flex-1 flex flex-col p-4 mt-2 overflow-y-auto scrollbar-hide">
          {Object.entries(navSections).map(([sectionName, items], sectionIndex) => {
            const isCollapsed = collapsedSections[sectionName];

            return (
              <div key={sectionName} className={sectionIndex > 0 ? "pt-6 space-y-1" : "space-y-1"}>
                <button
                  onClick={() => toggleSection(sectionName)}
                  className="w-full flex items-center justify-between px-3 py-2.5 group hover:bg-[var(--t-surface-dim)] rounded-xl transition-all duration-300"
                >
                  <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOpen ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                    <span 
                      className="text-[10px] uppercase tracking-[0.3em] font-black italic transition-colors group-hover:text-[var(--t-primary)] whitespace-nowrap"
                      style={{ color: 'var(--t-text-muted)' }}
                    >
                      {sectionName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sectionName === 'Team' && sidebarOpen && (
                      <Plus 
                        size={12} 
                        className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--t-primary)]" 
                        style={{ color: 'var(--t-text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowJoinModal(true);
                        }}
                      />
                    )}
                    <ChevronDown
                      size={12}
                      className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:text-[var(--t-primary)] ${isCollapsed ? '-rotate-90' : ''} ${!sidebarOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
                      style={{ color: 'var(--t-text-muted)' }}
                    />
                  </div>
                </button>
                
                {(!isCollapsed || !sidebarOpen) && (
                  <div className="flex flex-col gap-1 pl-1">
                    {(items as { to: string; label: string; icon: any }[]).map(({ to, label, icon: Icon }) => {
                      const badge =
                        label === 'Tasks' ? pendingTaskCount :
                        label === 'Team Dashboard' ? onlineCount :
                        label === 'Team Chat' ? totalUnread : 
                        0; 

                      return (
                        <NavLink
                          key={to}
                          to={to}
                          end={to === '/'}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 text-[13px] font-bold transition-all duration-300 group relative ${
                              isActive ? 'active-nav-item' : 'inactive-nav-item hover:translate-x-1.5'
                            }`
                          }
                          style={({ isActive }) => ({
                            borderRadius: '1rem',
                            background: isActive ? 'var(--t-primary-dim)' : 'transparent',
                            color: isActive ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                            border: isActive ? '1px solid var(--t-primary-dim)' : '1px solid transparent',
                            boxShadow: isActive ? '0 10px 20px -10px var(--t-primary-dim)' : 'none',
                          })}
                        >
                          <Icon size={18} className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'group-hover:scale-110' : 'mx-auto group-hover:scale-125'}`} />
                          <span className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden whitespace-nowrap ${sidebarOpen ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                            {label}
                          </span>
                          
                          {/* Active Indicator Dot */}
                          <div
                             className={`absolute left-0 w-1 h-5 bg-[var(--t-primary)] rounded-r-full transition-all duration-300 ${location.pathname === to ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                          />

                          {badge > 0 && sidebarOpen && (
                            <span
                              className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-lg min-w-[20px] text-center shadow-lg animate-in zoom-in-50 duration-500"
                              style={{
                                background: label === 'Tasks' ? 'var(--t-warning)' :
                                            label === 'Team Chat' ? 'var(--t-primary)' :
                                            'var(--t-success)',
                              }}
                            >
                              {badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Online Team Members */}
        <div
          className={`px-6 py-4 border-t transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${sidebarOpen ? 'max-h-[250px] opacity-100' : 'max-h-0 opacity-0 py-0 border-none'}`}
          style={{ borderColor: 'var(--t-sidebar-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.25em] font-black italic whitespace-nowrap" style={{ color: 'var(--t-text-muted)' }}>
              Online Now
            </p>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-success)] animate-pulse" />
          </div>
          <div className="space-y-1.5">
            {(team || [])
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
            {(team || []).filter(m => m.presenceStatus !== 'offline').length === 0 && (
              <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>No one online</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-8 py-6 border-b shrink-0 astral-glass border-[var(--t-sidebar-border)] animate-astral-nav"
          style={{
            zIndex: 2000,
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
            <div className="relative flex items-center" ref={searchRef}>
              <button
                onClick={() => {
                  setIsSearchExpanded(!isSearchExpanded);
                  if (!isSearchExpanded) {
                    setTimeout(() => {
                      const input = searchRef.current?.querySelector('input');
                      input?.focus();
                    }, 100);
                  }
                }}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--t-surface-hover)]"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <Search size={20} />
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
                  isSearchExpanded ? 'w-72 opacity-100 ml-2' : 'w-0 opacity-0'
                }`}
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    performSearch(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Search leads, tasks, threads..."
                  className="w-full px-4 py-2 text-sm focus:outline-none focus:ring-2"
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

              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery && (
                <div className="absolute top-full left-0 mt-2 w-96 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-2xl overflow-hidden z-[6000]">
                  <div className="max-h-[min(500px,70vh)] overflow-y-auto p-2 space-y-4">
                    {/* Leads Results */}
                    {searchResults.leads.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] px-3 mb-1">Leads</p>
                        {searchResults.leads.map(lead => (
                          <button
                            key={lead.id}
                            onClick={() => {
                              setActiveLeadModalId(lead.id);
                              setShowSearchResults(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-[var(--t-surface-hover)] rounded-lg transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-primary-dim)] text-[var(--t-primary)] font-bold text-xs uppercase">
                              {lead.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                              <p className="text-[10px] text-[var(--t-text-muted)] truncate">{lead.propertyAddress}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tasks Results */}
                    {searchResults.tasks.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] px-3 mb-1">Tasks</p>
                        {searchResults.tasks.map(task => (
                          <button
                            key={task.id}
                            onClick={() => {
                              navigate(`/tasks?id=${task.id}`);
                              setShowSearchResults(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-[var(--t-surface-hover)] rounded-lg transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)]">
                              <CheckCircle size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{task.title}</p>
                              <p className="text-[10px] text-[var(--t-text-muted)] truncate">{task.description || 'No description'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SMS Results */}
                    {searchResults.sms.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] px-3 mb-1">Messages</p>
                        {searchResults.sms.map(msg => (
                          <button
                            key={msg.id}
                            onClick={() => {
                              navigate(`/sms?phone=${msg.phone_number}`);
                              setShowSearchResults(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-[var(--t-surface-hover)] rounded-lg transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-success-dim)] text-[var(--t-success)]">
                              <MessageSquare size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{msg.content}</p>
                              <p className="text-[10px] text-[var(--t-text-muted)] truncate">{msg.phone_number}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.leads.length === 0 && searchResults.tasks.length === 0 && searchResults.sms.length === 0 && (
                      <div className="p-8 text-center">
                        <p className="text-sm text-[var(--t-text-muted)]">No results found for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Cloud Sync Indicator */}
            {isSyncing && (
              <div 
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--t-primary-dim)] border border-[var(--t-primary-dim)] animate-in fade-in zoom-in duration-300"
                title="Background sync in progress"
              >
                <CloudCheck size={14} className="text-[var(--t-primary)] animate-pulse" />
                <span className="text-[10px] font-bold text-[var(--t-primary)] uppercase tracking-tight hidden sm:inline">Syncing</span>
              </div>
            )}

            {/* Undo / Redo */}
            <div className="flex items-center gap-1 mr-2 px-2 py-1 rounded-lg bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
              <button
                onClick={undo}
                disabled={history.length === 0}
                className="p-1.5 rounded-md transition-all hover:bg-[var(--t-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: 'var(--t-text-muted)' }}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                className="p-1.5 rounded-md transition-all hover:bg-[var(--t-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: 'var(--t-text-muted)' }}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={16} />
              </button>
            </div>

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await manualSave();
                  toast.success('Your session is fully synced to cloud', {
                    icon: '☁️',
                    style: {
                      background: 'var(--t-surface)',
                      color: 'var(--t-text)',
                      border: '1px solid var(--t-border)',
                      borderRadius: '1rem',
                      fontSize: '13px',
                      fontWeight: '700'
                    }
                  });
                } catch (err) {
                  toast.error('Sync failed. Please check connection.');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ${saveStatus === 'success' ? 'bg-[var(--t-success-dim)]' : 'hover:bg-[var(--t-surface-hover)]'}`}
              style={{ 
                border: `1px solid ${saveStatus === 'success' ? 'var(--t-success)' : 'var(--t-border)'}`,
                color: saveStatus === 'success' ? 'var(--t-success)' : 'var(--t-text)'
              }}
              title="Manual Save"
            >
              {saveStatus === 'saving' ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : saveStatus === 'success' ? (
                <CloudCheck size={14} />
              ) : (
                <Download size={14} className="rotate-180" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save'}
              </span>
            </button>

            <div className="w-px h-6 mx-1" style={{ background: 'var(--t-border)' }} />

            {/* Bookshelf Docked Buttons */}
            <div className="flex items-center gap-1">
              {aiDocked && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('undock-ai-widget'))}
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--t-surface-hover)]"
                  style={{ color: 'var(--t-primary)' }}
                  title="Undock AI Widget"
                >
                  <BookshelfIcon size={20} />
                </button>
              )}
              {notesDocked && (
                <button
                  onClick={() => {
                    setNotesDocked(false);
                    localStorage.setItem('quick_notes_docked', 'false');
                    setShowNotes(true);
                    window.dispatchEvent(new CustomEvent('undock-notes'));
                  }}
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--t-surface-hover)]"
                  style={{ color: 'var(--t-warning)' }}
                  title="Undock Quick Notes"
                >
                  <StickyNote size={20} />
                </button>
              )}
            </div>
            {(aiDocked || notesDocked) && <div className="w-px h-6 mx-1" style={{ background: 'var(--t-border)' }} />}
            <ThemeSwitcher />
            <div className="w-px h-6" style={{ background: 'var(--t-border)' }} />
            <NotificationPanel />
            <div className="w-px h-6" style={{ background: 'var(--t-border)' }} />
            <UserMenu />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto p-6 relative">
          <div key={location.pathname} className="animate-page-fade-in h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Bot Floating Widget */}
      {!location.pathname.includes('/ai-test') && <AIBotWidget />}

      {/* Modals */}
      <JoinTeamModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateTeamModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <LeadFormModal 
        isOpen={activeLeadModalId !== null} 
        leadId={activeLeadModalId} 
        onClose={() => setActiveLeadModalId(null)} 
      />

      {/* Global Quick Notes Floating Notepad */}
      {showQuickNotes && !notesDocked && (
        <div className={`fixed bottom-6 right-6 z-[8000] flex flex-col items-end gap-3 transition-all duration-300 ${showNotes ? 'w-80 md:w-96' : 'w-12 h-12'}`}>
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="w-12 h-12 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
              style={{ background: 'var(--t-gradient)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <StickyNote size={20} />
            </button>
          ) : (
            <div
              className={`w-full flex flex-col rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-5 duration-300`} 
              style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', height: isNotesExpanded ? '500px' : '300px' }}
            >
              <div 
                className="px-4 py-3 border-b flex items-center justify-between cursor-move select-none" 
                style={{ borderColor: 'var(--t-border)', background: 'rgba(var(--t-surface-rgb), 0.5)' }}
                onMouseDown={(e) => setNotesDragStart({ x: e.clientX, y: e.clientY })}
                onMouseUp={(e) => {
                  if (notesDragStart && Math.abs(e.clientY - notesDragStart.y) > 20 && e.clientY < 80) {
                    setNotesDocked(true);
                    setShowNotes(false);
                    localStorage.setItem('quick_notes_docked', 'true');
                    window.dispatchEvent(new CustomEvent('dock-notes'));
                  }
                  setNotesDragStart(null);
                }}
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: 'var(--t-primary)' }} />
                  <span className="text-sm font-semibold text-white">Quick Notes</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setNotesDocked(true);
                      localStorage.setItem('quick_notes_docked', 'true');
                      window.dispatchEvent(new CustomEvent('dock-notes'));
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors group"
                    title="Dock to side"
                  >
                    <LayoutIcon size={14} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-warning)]" />
                  </button>
                  <button 
                    onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    className="p-1.5 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors"
                    style={{ color: 'var(--t-text-muted)' }}
                  >
                    {isNotesExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button 
                    onClick={() => setShowNotes(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors text-[var(--t-error)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              
              <textarea
                value={quickNotes}
                onChange={(e) => {
                  setQuickNotes(e.target.value);
                }}
                placeholder="Jot down quick thoughts..."
                className="flex-1 w-full p-4 text-sm bg-transparent outline-none resize-none hide-scrollbar text-white"
                style={{ lineHeight: '1.6' }}
              />
              
              <div className="px-4 py-2 border-t flex justify-between items-center bg-[var(--t-background)]" style={{ borderColor: 'var(--t-border)' }}>
                <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Auto-saves to cloud</span>
                <button 
                  onClick={() => {
                    if (confirm('Clear all notes?')) {
                      setQuickNotes('');
                    }
                  }}
                  className="text-[10px] hover:text-[var(--t-error)] transition-colors"
                  style={{ color: 'var(--t-text-muted)' }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}