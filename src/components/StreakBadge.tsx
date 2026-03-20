import { Flame, Trophy, Zap } from 'lucide-react';

function getStreakLevel(streak: number) {
  if (streak >= 30) return { color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', label: 'Legendary', emoji: '👑' };
  if (streak >= 14) return { color: 'text-[var(--t-warning)]', bg: 'bg-[var(--t-warning-dim)]/15', border: 'border-[var(--t-warning)]/30', label: 'On Fire', emoji: '🔥' };
  if (streak >= 7) return { color: 'var(--t-warning)', bg: 'var(--t-warning-dim)', border: 'var(--t-warning-border)', label: 'Hot Streak', emoji: '⚡' };
  if (streak >= 3) return { color: 'var(--t-warning)', bg: 'var(--t-warning-dim)', border: 'var(--t-warning-border)', label: 'Warming Up', emoji: '✨' };
  return { color: 'var(--t-text-muted)', bg: 'var(--t-surface-hover)', border: 'var(--t-border)', label: 'Getting Started', emoji: '💪' };
}

interface StreakBadgeProps {
  streak: number;
  type?: 'login' | 'task';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StreakBadge({ streak, type = 'login', size = 'sm', showLabel = false }: StreakBadgeProps) {
  const level = getStreakLevel(streak);
  if (streak <= 0) return null;

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${level.bg} ${level.border}`}>
        <div className="text-2xl">{level.emoji}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black ${level.color}`}>{streak}</span>
            <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>day streak</span>
          </div>
          {showLabel && (
            <span className={`text-[10px] font-semibold ${level.color}`}>{level.label}</span>
          )}
        </div>
        {type === 'login' && <Flame size={20} className={`ml-auto ${level.color}`} />}
        {type === 'task' && <Trophy size={20} className={`ml-auto ${level.color}`} />}
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${level.bg} ${level.border} ${level.color}`}>
        <span>{level.emoji}</span>
        <span>{streak}</span>
        {showLabel && <span className="text-[10px] font-normal opacity-70">days</span>}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${level.bg} ${level.color}`}>
      <span className="text-[8px]">{level.emoji}</span>
      <span>{streak}</span>
    </div>
  );
}

// ─── Streak Leaderboard ──────────────────────────────────────────────────────

interface StreakMember {
  id: string;
  name: string;
  avatar: string;
  loginStreak: number;
  taskStreak: number;
}

export function StreakLeaderboard({ members }: { members: StreakMember[] }) {
  const sorted = [...members].sort((a, b) => b.loginStreak - a.loginStreak);

  return (
    <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Flame size={18} style={{ color: 'var(--t-warning)' }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Productivity Streaks</h2>
      </div>
      <div className="space-y-3">
        {sorted.map((member, i) => {
          const level = getStreakLevel(member.loginStreak);
          return (
            <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl transition-colors" style={{ backgroundColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <span className="text-sm font-bold w-5" style={{ color: 'var(--t-text-muted)' }}>{i + 1}</span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'var(--t-gradient)' }}>
                {member.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--t-text)' }}>{member.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StreakBadge streak={member.loginStreak} type="login" size="sm" />
                  {member.taskStreak > 0 && (
                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--t-text-muted)' }}>
                      <Zap size={8} />
                      {member.taskStreak} tasks
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-sm font-black ${level.color}`}>{member.loginStreak}</span>
                <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>days</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
