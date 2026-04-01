import { useStore } from '../store/useStore';
import { TrendingUp, Award, Flame, Star, DollarSign, TrendingDown } from 'lucide-react';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function TeamLeaderboard() {
  const { team, leads, memberStreaks, loginStreak, taskStreak, currentUser } = useStore();

  const leaderData = (team || []).map(member => {
    const assignedLeads = (leads || []).filter(l => l && (l.assignedTo === member.id || l.assignedTo === member.name));
    const closedWon = assignedLeads.filter(l => l.status === 'closed-won');
    const totalRevenue = closedWon.reduce((sum, l) => sum + (l.offerAmount || l.estimatedValue || 0), 0);
    const totalProfit = closedWon.reduce((sum, l) => {
      const revenue = l.offerAmount || l.estimatedValue || 0;
      // Profit = estimatedValue - offerAmount (wholesale spread)
      const profit = l.offerAmount && l.estimatedValue
        ? Math.max(0, l.estimatedValue - l.offerAmount)
        : revenue * 0.2; // Fallback: 20% margin estimate
      return sum + profit;
    }, 0);
    const conversionRate = assignedLeads.length > 0
      ? Math.round((closedWon.length / assignedLeads.length) * 100)
      : 0;

    const isCurrentUser = member.id === currentUser?.id || member.email === currentUser?.email;
    const streaks = memberStreaks || {};
    const lStreak = streaks[member.id]?.login ?? (isCurrentUser ? loginStreak : 0);
    const tStreak = streaks[member.id]?.task ?? (isCurrentUser ? taskStreak : 0);

    return {
      ...member,
      closedWonCount: closedWon.length,
      totalRevenue,
      totalProfit,
      conversionRate,
      assignedCount: assignedLeads.length,
      loginStreak: lStreak,
      taskStreak: tStreak,
    };
  }).sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));

  const maxRevenue = leaderData[0]?.totalRevenue || 1;

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
                  {(member.full_name || member.name || '?').charAt(0)}
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

              {/* Name + Stats */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-white truncate">{member.full_name || member.name || 'Unknown'}</p>
                  {/* Streaks */}
                  <div className="flex items-center gap-1 shrink-0">
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

                {/* Revenue + Profit row */}
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex items-center gap-0.5">
                    <DollarSign size={9} style={{ color: 'var(--t-success)' }} />
                    <span className="text-[11px] font-bold" style={{ color: 'var(--t-success)' }}>
                      {fmtMoney(member.totalRevenue)}
                    </span>
                    <span className="text-[9px] ml-0.5" style={{ color: 'var(--t-text-muted)' }}>rev</span>
                  </div>
                  {member.totalProfit > 0 && (
                    <>
                      <span className="text-[9px]" style={{ color: 'var(--t-border)' }}>|</span>
                      <div className="flex items-center gap-0.5">
                        <TrendingDown size={9} className="text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-400">{fmtMoney(member.totalProfit)}</span>
                        <span className="text-[9px] ml-0.5" style={{ color: 'var(--t-text-muted)' }}>profit</span>
                      </div>
                    </>
                  )}
                  <span className="text-[9px] ml-auto" style={{ color: 'var(--t-text-muted)' }}>
                    {member.closedWonCount} won · {member.conversionRate}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-[var(--t-background)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (member.totalRevenue / maxRevenue) * 100)}%`,
                      background: 'var(--t-primary)',
                    }}
                  />
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
