import { useState, useRef, useEffect } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, X,
  UserPlus, MessageSquare, Target, AlertTriangle,
  Calendar, TrendingUp, Phone, Mail,
} from 'lucide-react';
import { useStore, type AppNotification } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS: Record<AppNotification['type'], { icon: React.ElementType; color: string; bg: string }> = {
  'lead-assigned': { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  'status-change': { icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  'deal-closed': { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  'task-assigned': { icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  'task-due': { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  'mention': { icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  'call-recorded': { icon: Phone, color: 'text-green-400', bg: 'bg-green-500/15' },
  'team-join': { icon: UserPlus, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  'message': { icon: Mail, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  'system': { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/15' },
};

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } = useStore();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors"
        style={{ color: 'var(--t-text-secondary)' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1"
            style={{ background: 'var(--t-primary)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-12 w-96 max-h-[32rem] rounded-xl border shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{
            background: 'var(--t-surface)',
            borderColor: 'var(--t-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--t-border)' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: 'var(--t-primary)' }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="p-1.5 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors"
                  style={{ color: 'var(--t-text-muted)' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={clearAllNotifications}
                className="p-1.5 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
                title="Clear all"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--t-surface-hover)] transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell size={32} className="mb-3" style={{ color: 'var(--t-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                  No notifications
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = NOTIF_ICONS[notif.type];
                const Icon = config.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => { if (!notif.read) markNotificationRead(notif.id); }}
                    className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-[var(--t-surface-hover)] ${
                      !notif.read ? 'bg-[var(--t-primary-dim)]' : ''
                    }`}
                    style={{ borderColor: 'var(--t-border)' }}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center mt-0.5`}>
                      <Icon size={16} className={config.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: 'var(--t-text)' }}>
                        <span className="font-medium">{notif.title}</span>
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--t-text-secondary)' }}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--t-text-muted)' }}>
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Read indicator */}
                    {!notif.read && (
                      <div className="shrink-0 mt-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--t-primary)' }} />
                      </div>
                    )}
                    {notif.read && (
                      <div className="shrink-0 mt-2">
                        <Check size={14} style={{ color: 'var(--t-text-muted)' }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 border-t text-center shrink-0"
              style={{ borderColor: 'var(--t-border)' }}
            >
              <button
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--t-primary-text)' }}
                onClick={() => setOpen(false)}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
