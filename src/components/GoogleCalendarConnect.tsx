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
    const authUrl = service.getAuthUrl();
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
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          isConnected 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20' 
            : 'bg-brand-500 text-white hover:bg-brand-600'
        }`}
      >
        <Calendar size={18} />
        <span className="text-sm font-medium">
          {isConnected ? 'Calendar Connected' : 'Connect Google Calendar'}
        </span>
        {isConnected && <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />}
      </button>

      {showDropdown && isConnected && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div 
            className="absolute right-0 mt-2 w-80 z-50 rounded-xl border shadow-2xl overflow-hidden"
            style={{
              background: 'var(--t-sidebar-bg)',
              borderColor: 'var(--t-sidebar-border)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--t-sidebar-border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--t-text)' }}>Google Calendar</h3>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
                >
                  <LogOut size={12} />
                  Disconnect
                </button>
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
                      selectedCalendar === cal.id ? 'bg-brand-500' : 'border'
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
                className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600"
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