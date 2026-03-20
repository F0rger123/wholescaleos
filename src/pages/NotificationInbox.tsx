import { useState, useMemo } from 'react';
import { 
  Bell, Check, CheckCheck, Trash2, Search, 
  UserPlus, MessageSquare, Target, AlertTriangle, 
  Calendar, TrendingUp, Phone, Mail, Clock, ArrowLeft,
  FilterX
} from 'lucide-react';
import { useStore, type AppNotification } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NOTIF_ICONS: Record<AppNotification['type'], { icon: React.ElementType, color: string, bg: string }> = {
  'lead-assigned': { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'status-change': { icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'deal-closed': { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  'task-assigned': { icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'task-due': { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  'mention': { icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  'call-recorded': { icon: Phone, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  'team-join': { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'message': { icon: Mail, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  'system': { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-500/10' },
};

export function NotificationInbox() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications, deleteNotification } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<AppNotification['type'] | 'all'>('all');
  const [showRead, setShowRead] = useState<boolean | 'all'>('all');

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           n.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeType === 'all' || n.type === activeType;
      const matchesRead = showRead === 'all' || (showRead ? n.read : !n.read);
      return matchesSearch && matchesType && matchesRead;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, searchQuery, activeType, showRead]);

  const stats = useMemo(() => {
    const unread = notifications.filter(n => !n.read).length;
    return { unread, total: notifications.length };
  }, [notifications]);

  const types = Object.keys(NOTIF_ICONS) as Array<AppNotification['type']>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-[var(--t-surface-hover)] transition-colors"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Notification Inbox
              {stats.unread > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--t-primary)] text-white">
                  {stats.unread} Unread
                </span>
              )}
            </h1>
            <p className="text-sm text-[var(--t-text-muted)]">Stay up to date with your team and leads</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllNotificationsRead}
            disabled={stats.unread === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all hover:bg-[var(--t-surface-hover)] disabled:opacity-50"
            style={{ color: 'var(--t-text-secondary)', borderColor: 'var(--t-border)', background: 'var(--t-surface)' }}
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
          <button 
            onClick={() => {
              if (confirm('Clear all notifications? This cannot be undone.')) {
                clearAllNotifications();
              }
            }}
            disabled={stats.total === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all hover:bg-[var(--t-error-dim)] disabled:opacity-50"
            style={{ color: 'var(--t-error)', borderColor: 'var(--t-error-border)', background: 'var(--t-surface)' }}
          >
            <Trash2 size={16} /> Clear all
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl border" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none transition-all focus:ring-2"
            style={{ 
              background: 'var(--t-input-bg)', 
              borderColor: 'var(--t-border)', 
              color: 'var(--t-text)',
              '--tw-ring-color': 'var(--t-primary-dim)'
            } as any}
          />
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={showRead === 'all' ? 'all' : showRead ? 'read' : 'unread'}
            onChange={(e) => {
              const val = e.target.value;
              setShowRead(val === 'all' ? 'all' : val === 'read');
            }}
            className="px-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
          >
            <option value="all">All Status</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </div>

      {/* Type Tags */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setActiveType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeType === 'all' ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)]' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border-[var(--t-border)] hover:border-[var(--t-text-muted)]'}`}
        >
          All
        </button>
        {types.map(type => (
          <button 
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${activeType === type ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)]' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border-[var(--t-border)] hover:border-[var(--t-text-muted)]'}`}
          >
            {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Main List */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--t-surface-hover)] flex items-center justify-center mb-4">
              <FilterX size={32} className="text-[var(--t-text-muted)]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No matching notifications</h3>
            <p className="text-[var(--t-text-muted)] max-w-sm">Try adjusting your search query or filters to find what you're looking for.</p>
            {(searchQuery || activeType !== 'all' || showRead !== 'all') && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setActiveType('all');
                  setShowRead('all');
                }}
                className="mt-6 text-sm font-semibold text-[var(--t-primary)] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
            {filtered.map(notif => {
              const info = NOTIF_ICONS[notif.type];
              const Icon = info.icon;
              
              return (
                <div 
                  key={notif.id}
                  className={`group flex items-start gap-4 p-5 transition-colors cursor-pointer ${!notif.read ? 'bg-[var(--t-primary-dim)]/30' : 'hover:bg-[var(--t-surface-hover)]'}`}
                  onClick={() => {
                    if (!notif.read) markNotificationRead(notif.id);
                  }}
                >
                  <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${info.bg} ${info.color}`}>
                    <Icon size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-base font-semibold leading-none ${!notif.read ? 'text-white' : 'text-[var(--t-text-secondary)]'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-[var(--t-text-muted)] flex items-center gap-1">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--t-text-muted)] leading-relaxed line-clamp-2 mb-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] bg-[var(--t-surface-subtle)] px-2 py-0.5 rounded">
                        {notif.type}
                      </span>
                      {!notif.read && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--t-primary)]">
                          <Check size={10} /> New
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(notif.id);
                        }}
                        className="p-2 rounded-lg hover:bg-[var(--t-primary-dim)] text-[var(--t-primary)] transition-all"
                        title="Mark as read"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this notification?')) {
                          deleteNotification(notif.id);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-[var(--t-error-dim)] text-[var(--t-error)] transition-all"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
