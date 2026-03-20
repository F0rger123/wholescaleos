import { PRESENCE_COLORS, PRESENCE_LABELS, type PresenceStatus } from '../store/useStore';

interface StatusIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
}

export function StatusIndicator({ status, size = 'md', showLabel = false, pulse = true }: StatusIndicatorProps) {
  const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  const color = PRESENCE_COLORS[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex">
        <span
          className={`${sizes[size]} rounded-full inline-block`}
          style={{ backgroundColor: color }}
        />
        {pulse && status === 'online' && (
          <span
            className={`absolute inset-0 ${sizes[size]} rounded-full animate-ping opacity-40`}
            style={{ backgroundColor: color }}
          />
        )}
      </span>
      {showLabel && (
        <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{PRESENCE_LABELS[status]}</span>
      )}
    </span>
  );
}

interface StatusBadgeProps {
  status: PresenceStatus;
  customStatus?: string;
}

export function StatusBadge({ status, customStatus }: StatusBadgeProps) {
  const bgMap: Record<PresenceStatus, string> = {
    online: 'bg-[var(--t-success)]/15 text-[var(--t-success)] border-[var(--t-success)]/30',
    offline: 'bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] border-[var(--t-border)]',
    busy: 'bg-[var(--t-error)]/15 text-[var(--t-error)] border-[var(--t-error)]/30',
    dnd: 'bg-[var(--t-warning)]/15 text-[var(--t-warning)] border-[var(--t-warning)]/30',
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bgMap[status]}`}>
        <StatusIndicator status={status} size="sm" pulse={false} />
        {PRESENCE_LABELS[status]}
      </span>
      {customStatus && (
        <span className="text-[11px] italic pl-0.5" style={{ color: 'var(--t-text-muted)' }}>
          "{customStatus}"
        </span>
      )}
    </div>
  );
}
