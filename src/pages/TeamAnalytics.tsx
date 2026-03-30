import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  Trophy, Users, Target, Award, DollarSign, Zap
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { ReferralLeaderboard } from '../components/ReferralLeaderboard';

export default function TeamAnalytics() {
  const { team, leads, tasks } = useStore();
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1yr'>('30d');
  const [leaderboardFilter, setLeaderboardFilter] = useState<'revenue' | 'deals' | 'conversion'>('revenue');

  // Team-level metrics
  const closedDeals = leads.filter(l => l.status === 'closed-won');
  const totalRevenue = closedDeals.reduce((s, l) => s + (l.offerAmount || 0), 0);
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? ((closedDeals.length / totalLeads) * 100).toFixed(1) : '0.0';
  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
  const totalTasks = tasks?.length || 0;
  const taskCompletionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0';
  const avgDealsPerMember = team?.length > 0 ? (closedDeals.length / team.length).toFixed(1) : '0.0';

  // Agent leaderboard
  const agentStats = useMemo(() => {
    const agentMap: Record<string, { name: string; avatar: string; leads: number; deals: number; revenue: number }> = {};
    
    (team || []).forEach(member => {
      agentMap[member.id] = {
        name: member.name,
        avatar: member.avatar || member.name?.[0] || '?',
        leads: 0,
        deals: 0,
        revenue: 0,
      };
    });

    leads.forEach(lead => {
      const assignee = lead.assignedTo;
      if (assignee && agentMap[assignee]) {
        agentMap[assignee].leads++;
        if (lead.status === 'closed-won') {
          agentMap[assignee].deals++;
          agentMap[assignee].revenue += lead.offerAmount || 0;
        }
      }
    });

    return Object.values(agentMap).sort((a, b) => {
      if (leaderboardFilter === 'deals') return b.deals - a.deals;
      if (leaderboardFilter === 'conversion') {
        const aConv = a.leads > 0 ? a.deals / a.leads : 0;
        const bConv = b.leads > 0 ? b.deals / b.leads : 0;
        return bConv - aConv;
      }
      return b.revenue - a.revenue;
    });
  }, [team, leads, leaderboardFilter]);

  // Conversion funnel data
  const funnelData = useMemo(() => {
    const stages = [
      { name: 'New Leads', count: leads.filter(l => l.status === 'new').length, color: '#3B82F6' },
      { name: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: '#6366F1' },
      { name: 'Qualified', count: leads.filter(l => l.status === 'qualified').length, color: '#8B5CF6' },
      { name: 'Negotiating', count: leads.filter(l => l.status === 'negotiating').length, color: '#A855F7' },
      { name: 'Closed Won', count: closedDeals.length, color: '#22C55E' },
      { name: 'Closed Lost', count: leads.filter(l => l.status === 'closed-lost').length, color: '#EF4444' },
    ];
    return stages;
  }, [leads, closedDeals]);

  // Monthly revenue trend
  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    closedDeals.forEach(deal => {
      const d = new Date(deal.createdAt);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) {
        months[key] += deal.offerAmount || 0;
      }
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [closedDeals]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase flex items-center gap-3" style={{ color: 'var(--t-text)' }}>
            <Trophy size={28} className="text-yellow-500" /> Team Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-secondary)' }}>
            Performance metrics across your entire team
          </p>
        </div>
        <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
          {(['7d', '30d', '90d', '1yr'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'hover:bg-white/5'
              }`}
              style={timeframe !== tf ? { color: 'var(--t-text-muted)' } : undefined}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Leads', value: totalLeads, icon: Users, color: 'blue', trend: '+12%' },
          { label: 'Closed Deals', value: closedDeals.length, icon: Target, color: 'green', trend: '+8%' },
          { label: 'Team Revenue', value: `$${(totalRevenue / 1000).toFixed(0)}k`, icon: DollarSign, color: 'purple', trend: '+15%' },
          { label: 'Avg Deals / Rep', value: avgDealsPerMember, icon: Award, color: 'blue', trend: '+0.5' },
          { label: 'Task Completion', value: `${taskCompletionRate}%`, icon: Target, color: 'pink', trend: '+5%' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Zap, color: 'orange', trend: '+2.1%' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl relative overflow-hidden group"
            style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <stat.icon size={60} />
            </div>
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--t-text-muted)' }}>{stat.label}</p>
              <p className="text-3xl font-black" style={{ color: 'var(--t-text)' }}>{stat.value}</p>
              <p className="text-[10px] font-bold" style={{ color: 'var(--t-success)' }}>
                {stat.trend} <span style={{ color: 'var(--t-text-muted)' }}>vs last period</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 p-8 rounded-2xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
          <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--t-text)' }}>Team Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="p-8 rounded-2xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
          <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--t-text)' }}>Conversion Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((stage, i) => {
              const maxCount = Math.max(...funnelData.map(s => s.count), 1);
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--t-text-secondary)' }}>{stage.name}</span>
                    <span className="font-bold" style={{ color: 'var(--t-text)' }}>{stage.count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--t-bg)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent Leaderboard */}
      <div className="p-8 rounded-2xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
            <Award className="text-yellow-500" size={20} /> Agent Leaderboard
          </h3>
          <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
            {(['revenue', 'deals', 'conversion'] as const).map(f => (
              <button
                key={f}
                onClick={() => setLeaderboardFilter(f)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  leaderboardFilter === f ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'hover:bg-white/5'
                }`}
                style={leaderboardFilter !== f ? { color: 'var(--t-text-muted)' } : undefined}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {agentStats.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--t-text-muted)' }}>
            No team members found. Add team members to see leaderboard data.
          </p>
        ) : (
          <div className="space-y-3">
            {agentStats.map((agent, rank) => (
              <div
                key={rank}
                className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                  rank === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  rank === 1 ? 'bg-gray-400/20 text-gray-300' :
                  rank === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/5 text-gray-500'
                }`}>
                  #{rank + 1}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                     style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
                  {agent.avatar}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{agent.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>
                    {agent.leads} leads • {agent.deals} closed
                  </p>
                </div>

                {/* Revenue */}
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: 'var(--t-success)' }}>
                    ${agent.revenue.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--t-text-muted)' }}>Revenue</p>
                </div>

                {/* Conversion */}
                <div className="text-right min-w-[60px]">
                  <p className="text-sm font-bold" style={{ color: 'var(--t-primary)' }}>
                    {agent.leads > 0 ? ((agent.deals / agent.leads) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--t-text-muted)' }}>Conv.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Goals */}
      <div className="p-8 rounded-2xl" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
          <Target className="text-blue-500" size={20} /> Team Goals
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: 'Deals This Month', current: closedDeals.length, target: 20, color: '#3B82F6' },
            { label: 'Revenue Target', current: totalRevenue, target: 500000, color: '#22C55E', isCurrency: true },
            { label: 'Lead Response < 1hr', current: 82, target: 95, color: '#A855F7', isPercent: true },
          ].map((goal, i) => {
            const pct = Math.min(100, (goal.current / goal.target) * 100);
            const displayCurrent = goal.isCurrency
              ? `$${(goal.current / 1000).toFixed(0)}k`
              : goal.isPercent
              ? `${goal.current}%`
              : goal.current;
            const displayTarget = goal.isCurrency
              ? `$${(goal.target / 1000).toFixed(0)}k`
              : goal.isPercent
              ? `${goal.target}%`
              : goal.target;

            return (
              <div key={i} className="p-6 rounded-xl" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--t-text-muted)' }}>{goal.label}</p>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>{displayCurrent}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--t-text-muted)' }}>/ {displayTarget}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--t-surface)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, backgroundColor: goal.color }}
                  />
                </div>
                <p className="text-[10px] font-bold mt-2" style={{ color: pct >= 100 ? 'var(--t-success)' : 'var(--t-text-muted)' }}>
                  {pct.toFixed(0)}% complete
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Affiliate Leaderboard */}
      <ReferralLeaderboard />
    </div>
  );
}
