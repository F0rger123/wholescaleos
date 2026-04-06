import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Calendar, LogOut, RefreshCw, ChevronDown, Check } from 'lucide-react';

export function GoogleCalendarConnect() {
  const { currentUser } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    calendar: false,
    gmail: false,
    contacts: false,
    tasks: false,
    drive: false
  });

  const service = GoogleCalendarService.getInstance();

  useEffect(() => {
    if (currentUser?.id) {
      checkConnection();
    }
  }, [currentUser]);

  const checkConnection = async () => {
    if (!currentUser?.id) return;
    const connected = await service.isConnected(currentUser.id);
    setIsConnected(connected);
    if (connected) {
      const perms = await service.getDetailedPermissions(currentUser.id);
      setPermissions(perms);
      loadCalendars();
    }
  };

  const loadCalendars = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const items = await service.fetchCalendars(currentUser.id);
      setCalendars(items);
    } catch (err) {
      console.error('Failed to load calendars:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    const authUrl = service.getAuthUrl(window.location.pathname);
    window.location.href = authUrl;
  };

  const handleReconnectTasks = async () => {
    // Issue 1 Fix: Clear old Google tokens before re-authenticating with Tasks scope
    // This forces a full re-auth with the correct scopes, fixing the 403 error
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      try {
        toast.loading('Clearing old tokens...', { id: 'tasks-reconnect' });
        
        // Delete old Google connection to force fresh tokens
        await supabase
          .from('user_connections')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('provider', 'google');
        
        toast.success('Redirecting to Google for fresh authorization...', { id: 'tasks-reconnect' });
      } catch (err) {
        console.error('[Tasks Reconnect] Failed to clear tokens:', err);
        toast.error('Could not clear old tokens. Trying anyway...', { id: 'tasks-reconnect' });
      }
    }
    
    // Redirect with full scope including Tasks - prompt: 'consent' forces new token
    const authUrl = service.getTasksAuthUrl(window.location.pathname);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!currentUser?.id) return;
    await service.disconnect(currentUser.id);
    setIsConnected(false);
    setCalendars([]);
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={isConnected ? () => setShowDropdown(!showDropdown) : handleConnect}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border font-black uppercase tracking-wider text-[10px] ${
          isConnected 
            ? 'bg-[var(--t-surface)] border-[var(--t-success)]/40 text-[var(--t-success)] hover:brightness-110 shadow-lg shadow-[var(--t-success)]/10' 
            : 'bg-[var(--t-primary)] border-[var(--t-primary)] text-[var(--t-on-primary)] hover:opacity-90 shadow-lg shadow-[var(--t-primary)]/20'
        }`}
      >
        <div className="flex items-center gap-2">
          {isConnected ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <Calendar size={14} />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">
            {isConnected ? 'Workspace Connected' : 'Link Google Account'}
          </span>
        </div>
        {isConnected && <ChevronDown size={14} className={`transition-transform opacity-60 ${showDropdown ? 'rotate-180' : ''}`} />}
      </button>

      {showDropdown && isConnected && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div 
            className="absolute right-0 mt-2 w-80 z-50 rounded-xl border-[var(--t-border)] shadow-2xl overflow-hidden"
            style={{
              background: 'var(--t-sidebar-bg)',
              borderColor: 'var(--t-sidebar-border)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--t-sidebar-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-[10px] uppercase tracking-widest" style={{ color: 'var(--t-text)' }}>Active Services</h3>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-2 py-1 text-[9px] uppercase tracking-tighter bg-[var(--t-error)]/10 text-[var(--t-error)] rounded-md hover:bg-[var(--t-error)]/20 font-black transition-colors"
                >
                  <LogOut size={10} />
                  Disconnect
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'calendar', name: 'Calendar', status: permissions.calendar ? 'Active' : 'Missing', color: 'text-blue-400' },
                  { id: 'gmail', name: 'Gmail', status: permissions.gmail ? 'Active' : 'Missing', color: 'text-red-400' },
                  { id: 'tasks', name: 'Tasks', status: permissions.tasks ? 'Active' : 'Missing', color: 'text-indigo-400' }
                ].map(service => (
                  <div key={service.name} className="flex flex-col items-center p-2 rounded-lg bg-[var(--t-background)]/50 border border-[var(--t-border)]">
                    <span className="text-[9px] font-black uppercase tracking-tighter mb-1 opacity-60" style={{ color: 'var(--t-text)' }}>{service.name}</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'Active' ? 'bg-[var(--t-success)]' : 'bg-[var(--t-error)]'} ${service.status === 'Active' ? 'animate-pulse' : ''}`} />
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${service.status === 'Active' ? 'text-[var(--t-success)]' : 'text-[var(--t-error)]'}`}>{service.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {!permissions.tasks && isConnected && (
                <div className="mt-4 p-3 bg-[var(--t-error)]/5 rounded-xl border border-[var(--t-error)]/20">
                  <p className="text-[10px] text-[var(--t-error)] font-bold mb-2 uppercase tracking-tight">Tasks Sync Permission Missing</p>
                  <p className="text-[9px] text-[var(--t-text-muted)] mb-2">This will clear your old tokens and re-authenticate with fresh Tasks permissions.</p>
                  <button 
                    onClick={handleReconnectTasks}
                    className="w-full py-2 bg-[var(--t-error)]/10 hover:bg-[var(--t-error)]/20 text-[var(--t-error)] rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    🔄 Reconnect with Tasks
                  </button>
                </div>
              )}
            </div>

            <div className="p-3">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--t-text-muted)' }}>
                Select Calendar
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {calendars.map(cal => (
                  <button
                    key={cal.id}
                    onClick={() => {
                      setSelectedCalendar(cal.id);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${
                      selectedCalendar === cal.id ? 'bg-[var(--t-primary)]' : 'border'
                    }`} style={{ borderColor: 'var(--t-border)' }}>
                      {selectedCalendar === cal.id && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{cal.summary}</p>
                      <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{cal.description || cal.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t" style={{ borderColor: 'var(--t-sidebar-border)' }}>
              <button
                onClick={loadCalendars}
                className="flex items-center gap-2 text-sm text-[var(--t-primary)] hover:text-[var(--t-primary-hover)]"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Refresh calendars
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}