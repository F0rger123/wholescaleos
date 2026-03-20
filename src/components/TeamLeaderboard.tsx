import { useStore } from '../store/useStore';
import { TrendingUp, Award, Flame, Star, DollarSign } from 'lucide-react';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function TeamLeaderboard() {
  const { team, leads, memberStreaks, loginStreak, taskStreak, currentUser } = useStore();

  const leaderData = team.map(member => {
    const assignedLeads = leads.filter(l => l.assignedTo === member.id);
    const closedWon = assignedLeads.filter(l => l.status === 'closed-won');
    const totalVolume = closedWon.reduce((sum, l) => sum + (l.offerAmount || l.estimatedValue || 0), 0);
    const conversionRate = assignedLeads.length > 0
      ? Math.round((closedWon.length / assignedLeads.length) * 100)
      : 0;

    // Use memberStreaks if available; fall back to current user's own streak
    const isCurrentUser = member.id === currentUser?.id || member.email === currentUser?.email;
    const lStreak = memberStreaks[member.id]?.login ?? (isCurrentUser ? loginStreak : 0);
    const tStreak = memberStreaks[member.id]?.task ?? (isCurrentUser ? taskStreak : 0);

    return {
      ...member,
      closedWonCount: closedWon.length,
      totalVolume,
      conversionRate,
      assignedCount: assignedLeads.length,
      loginStreak: lStreak,
      taskStreak: tStreak,
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);

  const maxVolume = leaderData[0]?.totalVolume || 1;

  const fmtMoney = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--t-border)] flex items-center justify-between"
           style={{ background: 'var(--t-surface-hover)' }}>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4" style={{ color: 'var(--t-primary)' }} />
          <h3 className="font-bold text-sm text-white">Team Performance</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--t-text-muted)' }}>
          <TrendingUp size={10} /> Monthly
        </div>
      </div>

      {/* Leader cards */}
      <div className="divide-y divide-[var(--t-border)]">
        {leaderData.map((member, idx) => (
          <div key={member.id} className="px-4 py-3 group hover:bg-[var(--t-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              {/* Rank + Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                >
                  {member.name.charAt(0)}
                </div>
                {idx < 3 && (
                  <div
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[var(--t-surface)]"
                    style={{ background: RANK_COLORS[idx] }}
                  >
                    <span className="text-[7px] font-black text-black">{idx + 1}</span>
                  </div>
                )}
              </div>

              {/* Name + Role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white truncate">{member.name}</p>
                  {/* Revenue */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <DollarSign size={9} style={{ color: 'var(--t-success)' }} />
                    <span className="text-xs font-black" style={{ color: 'var(--t-success)' }}>
                      {fmtMoney(member.totalVolume)}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 w-full h-1 bg-[var(--t-background)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (member.totalVolume / maxVolume) * 100)}%`,
                      background: 'var(--t-primary)',
                    }}
                  />
                </div>
                {/* Stats row */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>
                    {member.closedWonCount} closed · {member.conversionRate}% conv.
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    {member.loginStreak > 0 && (
                      <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[9px] font-bold">
                        <Flame size={8} /> {member.loginStreak}d
                      </div>
                    )}
                    {member.taskStreak > 0 && (
                      <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold">
                        <Star size={8} /> {member.taskStreak}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {leaderData.length === 0 && (
          <div className="px-4 py-6 text-center text-[var(--t-text-muted)] text-sm">
            No team members yet.
          </div>
        )}
      </div>
    </div>
  );
}
