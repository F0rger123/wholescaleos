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
        <span className="text-xs text-slate-400">{PRESENCE_LABELS[status]}</span>
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
    online: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    offline: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    busy: 'bg-red-500/15 text-red-400 border-red-500/30',
    dnd: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bgMap[status]}`}>
        <StatusIndicator status={status} size="sm" pulse={false} />
        {PRESENCE_LABELS[status]}
      </span>
      {customStatus && (
        <span className="text-[11px] text-slate-500 italic pl-0.5">
          "{customStatus}"
        </span>
      )}
    </div>
  );
}
