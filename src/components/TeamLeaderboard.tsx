import { useStore } from '../store/useStore';
import { TrendingUp, Award, Users, Flame } from 'lucide-react';

export function TeamLeaderboard() {
  const { team, leads, memberStreaks } = useStore();

  // Calculate stats per team member
  const leaderData = team.map(member => {
    const assignedLeads = leads.filter(l => l.assignedTo === member.id);
    const closedWon = assignedLeads.filter(l => l.status === 'closed-won');
    const totalVolume = closedWon.reduce((sum, l) => sum + (l.offerAmount || l.estimatedValue || 0), 0);
    const conversionRate = assignedLeads.length > 0 
      ? (closedWon.length / assignedLeads.length) * 100 
      : 0;

    return {
      ...member,
      closedWonCount: closedWon.length,
      totalVolume,
      conversionRate,
      assignedCount: assignedLeads.length,
      loginStreak: memberStreaks[member.id]?.login || 0,
      taskStreak: memberStreaks[member.id]?.task || 0
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);

  return (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface-hover)]">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
          <h3 className="font-bold text-white">Team Performance</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--t-text-muted)' }}>
          <TrendingUp size={12} /> Monthly Stats
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest border-b border-[var(--t-border)]" style={{ color: 'var(--t-text-muted)' }}>
              <th className="px-4 py-3 font-semibold">Member</th>
              <th className="px-4 py-3 font-semibold text-right">Revenue</th>
              <th className="px-4 py-3 font-semibold text-right">Streaks</th>
              <th className="px-4 py-3 font-semibold text-right">Conv. %</th>
              <th className="px-4 py-3 font-semibold">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--t-border)]">
            {leaderData.map((member, idx) => (
              <tr key={member.id} className="group hover:bg-[var(--t-surface-hover)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      {idx === 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-[var(--t-surface)]">
                          <Award size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{member.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-white">${(member.totalVolume / 1000).toFixed(1)}k</span>
                    <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{member.closedWonCount} closed</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {member.loginStreak > 0 && (
                      <div className="flex items-center gap-0.5 bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        <Flame size={10} /> {member.loginStreak}
                      </div>
                    )}
                    {member.taskStreak > 0 && (
                      <div className="flex items-center gap-0.5 bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        <Award size={10} /> {member.taskStreak}
                      </div>
                    )}
                    {member.loginStreak === 0 && member.taskStreak === 0 && (
                      <span className="text-[10px] text-[var(--t-text-muted)]">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-medium text-[var(--t-text-secondary)]">
                    {member.conversionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="w-16 h-1.5 bg-[var(--t-background)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${Math.min(100, (member.totalVolume / (leaderData[0].totalVolume || 1)) * 100)}%`,
                        background: 'var(--t-primary)'
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 bg-[var(--t-surface-hover)] border-t border-[var(--t-border)] flex items-center justify-center">
        <button className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 transition-colors"
          style={{ color: 'var(--t-primary-text)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--t-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--t-primary-text)'}
        >
          <Users size={12} /> View Full Team Analytics
        </button>
      </div>
    </div>
  );
}
