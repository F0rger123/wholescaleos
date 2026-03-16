import { useState, useRef, useEffect } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, X,
  UserPlus, MessageSquare, Target, AlertTriangle,
  Calendar, TrendingUp, Phone, Mail,
} from 'lucide-react';
import { useStore, type AppNotification } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS: Record<AppNotification['type'], { icon: React.ElementType }> = {
  'lead-assigned': { icon: UserPlus },
  'status-change': { icon: Target },
  'deal-closed': { icon: TrendingUp },
  'task-assigned': { icon: Calendar },
  'task-due': { icon: AlertTriangle },
  'mention': { icon: MessageSquare },
  'call-recorded': { icon: Phone },
  'team-join': { icon: UserPlus },
  'message': { icon: Mail },
  'system': { icon: Bell },
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
        className="relative p-2 rounded-lg transition-colors"
        style={{
          color: 'var(--t-text-secondary)',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1"
            style={{
              backgroundColor: 'var(--t-primary)',
              color: 'var(--t-on-primary)',
            }}
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
            backgroundColor: 'var(--t-surface)',
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
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--t-primary)',
                    color: 'var(--t-on-primary)',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--t-text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={clearAllNotifications}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Clear all"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell size={32} style={{ color: 'var(--t-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                  No notifications
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = NOTIF_ICONS[notif.type].icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => { if (!notif.read) markNotificationRead(notif.id); }}
                    className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors"
                    style={{
                      borderColor: 'var(--t-border)',
                      backgroundColor: !notif.read ? 'var(--t-primary-dim)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = !notif.read ? 'var(--t-primary-dim)' : 'var(--t-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = !notif.read ? 'var(--t-primary-dim)' : 'transparent';
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                      style={{
                        backgroundColor: 'var(--t-surface)',
                        color: 'var(--t-primary-text)',
                      }}
                    >
                      <Icon size={16} />
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
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--t-primary)' }} />
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