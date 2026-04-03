import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { GoogleCalendarService } from '../lib/google-calendar';
import { Calendar, LogOut, RefreshCw, ChevronDown, Check } from 'lucide-react';

export function GoogleCalendarConnect() {
  const { currentUser } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
                  { name: 'Calendar', status: 'Active', color: 'text-blue-400' },
                  { name: 'Gmail', status: 'Active', color: 'text-red-400' },
                  { name: 'Tasks', status: 'Active', color: 'text-indigo-400' }
                ].map(service => (
                  <div key={service.name} className="flex flex-col items-center p-2 rounded-lg bg-[var(--t-background)]/50 border border-[var(--t-border)]">
                    <span className="text-[9px] font-black uppercase tracking-tighter mb-1 opacity-60" style={{ color: 'var(--t-text)' }}>{service.name}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-success)] animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-[var(--t-success)]">{service.status}</span>
                    </div>
                  </div>
                ))}
              </div>
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