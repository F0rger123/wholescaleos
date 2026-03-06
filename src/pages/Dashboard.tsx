import { useState, useEffect } from 'react';
import { useStore, calculateDealScore, getScoreColor, STATUS_LABELS, type LeadSource } from '../store/useStore';
import {
  TrendingUp, DollarSign, Users, Target, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Zap,
  PieChart, BarChart3, Flame,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { StreakBadge } from '../components/StreakBadge';

// ─── Money Formatter ─────────────────────────────────────────────────────────

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
};

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ value, formatter, duration = 1200 }: {
  value: number; formatter?: (val: number) => string; duration?: number;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  if (formatter) {
    return <>{formatter(displayed)}</>;
  }
  return <>{displayed.toLocaleString()}</>;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  title, value, change, changeType, icon: Icon, color, animated, formatter,
}: {
  title: string; value: number; change: string; changeType: 'up' | 'down'; icon: React.ElementType; color: string;
  animated?: boolean; formatter?: (val: number) => string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {animated ? <AnimatedCounter value={value} formatter={formatter} /> : (formatter ? formatter(value) : value)}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {changeType === 'up' ? (
          <ArrowUpRight size={14} className="text-emerald-400" />
        ) : (
          <ArrowDownRight size={14} className="text-red-400" />
        )}
        <span className={`text-xs font-semibold ${changeType === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {change}
        </span>
        <span className="text-xs text-slate-500">vs last month</span>
      </div>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const statusBarColors: Record<string, string> = {
  new: 'bg-blue-500', contacted: 'bg-amber-500', qualified: 'bg-purple-500',
  negotiating: 'bg-orange-500', 'closed-won': 'bg-emerald-500', 'closed-lost': 'bg-red-500',
};

// Status badge colors available for use in future enhancements
const _statusBadgeColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400', contacted: 'bg-amber-500/20 text-amber-400',
  qualified: 'bg-purple-500/20 text-purple-400', negotiating: 'bg-orange-500/20 text-orange-400',
  'closed-won': 'bg-emerald-500/20 text-emerald-400', 'closed-lost': 'bg-red-500/20 text-red-400',
};
void _statusBadgeColors;

const SOURCE_COLORS: Record<string, { bg: string; text: string; bar: string; label: string }> = {
  website: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', bar: 'bg-cyan-500', label: 'Website' },
  referral: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Referral' },
  'cold-call': { bg: 'bg-blue-500/15', text: 'text-blue-400', bar: 'bg-blue-500', label: 'Cold Call' },
  'social-media': { bg: 'bg-pink-500/15', text: 'text-pink-400', bar: 'bg-pink-500', label: 'Social Media' },
  mailer: { bg: 'bg-amber-500/15', text: 'text-amber-400', bar: 'bg-amber-500', label: 'Mailer' },
  other: { bg: 'bg-slate-500/15', text: 'text-slate-400', bar: 'bg-slate-500', label: 'Other' },
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const { leads, team, loginStreak, taskStreak, memberStreaks } = useStore();

  // ─── Calculations ────────────────────────────────────────
  const totalPipeline = leads
    .filter((l) => !l.status.startsWith('closed'))
    .reduce((sum, l) => sum + l.estimatedValue, 0);
  
  const closedRevenue = leads
    .filter((l) => l.status === 'closed-won')
    .reduce((sum, l) => sum + l.offerAmount, 0);
  
  const activeLeads = leads.filter((l) => !l.status.startsWith('closed')).length;
  
  const closedLeads = leads.filter((l) => l.status.startsWith('closed'));
  const winRate = closedLeads.length > 0
    ? Math.round((leads.filter((l) => l.status === 'closed-won').length / closedLeads.length) * 100)
    : 0;
  
  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((s, l) => s + calculateDealScore(l), 0) / leads.length) : 0;

  // Profit Projection
  const activeDeals = leads.filter(l => l.status === 'negotiating' || l.status === 'qualified');
  const projectedProfit = activeDeals.reduce((s, l) => {
    const margin = l.estimatedValue - l.offerAmount;
    const prob = l.probability / 100;
    return s + (margin > 0 ? margin * prob : 0);
  }, 0);
  
  const negotiatingValue = leads
    .filter(l => l.status === 'negotiating')
    .reduce((s, l) => s + l.estimatedValue, 0);
  
  const monthlyProjection = Math.round((closedRevenue + projectedProfit * 0.6) / 3);

  // Source Stats
  const sourceCounts: Record<string, number> = {};
  const sourceValues: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.source;
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    sourceValues[src] = (sourceValues[src] || 0) + l.estimatedValue;
  });
  
  const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  const maxSourceCount = Math.max(...Object.values(sourceCounts), 1);

  const recentLeads = [...leads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 6);

  const pipelineStages = [
    { label: 'New', key: 'new' },
    { label: 'Contacted', key: 'contacted' },
    { label: 'Qualified', key: 'qualified' },
    { label: 'Negotiating', key: 'negotiating' },
    { label: 'Won', key: 'closed-won' },
    { label: 'Lost', key: 'closed-lost' },
  ];

  const topLeads = [...leads]
    .filter((l) => !l.status.startsWith('closed'))
    .sort((a, b) => calculateDealScore(b) - calculateDealScore(a))
    .slice(0, 5);

  // Streak leaderboard data
  const streakMembers = team.map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    loginStreak: memberStreaks[m.id]?.login || 0,
    taskStreak: memberStreaks[m.id]?.task || 0,
  }));

  // Calculate vs last month (using mock data for now - you can replace with real historical data)
  const lastMonthPipeline = totalPipeline * 0.875; // 12.5% less
  const pipelineChange = ((totalPipeline - lastMonthPipeline) / lastMonthPipeline) * 100;
  
  const lastMonthRevenue = closedRevenue * 0.918; // 8.2% less
  const revenueChange = ((closedRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

  return (
    <div className="space-y-6">
      {/* Header with Streak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back. Here's your pipeline overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={loginStreak} type="login" size="md" showLabel />
          {taskStreak > 0 && <StreakBadge streak={taskStreak} type="task" size="md" />}
        </div>
      </div>

      {/* Stats Grid - FIXED: Now uses proper money formatting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pipeline" value={totalPipeline}
          change={`${pipelineChange > 0 ? '+' : ''}${pipelineChange.toFixed(1)}%`}
          changeType={pipelineChange > 0 ? 'up' : 'down'} 
          icon={TrendingUp}
          color="bg-brand-500/20 text-brand-400"
          animated={true}
          formatter={formatMoney}
        />
        <StatCard
          title="Closed Revenue" value={closedRevenue}
          change={`${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`}
          changeType={revenueChange > 0 ? 'up' : 'down'} 
          icon={DollarSign}
          color="bg-emerald-500/20 text-emerald-400"
          animated={true}
          formatter={formatMoney}
        />
        <StatCard
          title="Active Leads" value={activeLeads}
          change="+3 this month" changeType="up" icon={Users}
          color="bg-purple-500/20 text-purple-400"
          animated={true}
        />
        <StatCard
          title="Avg Deal Score" value={avgScore}
          change={`${winRate}% win rate`} changeType={winRate > 50 ? 'up' : 'down'} icon={Target}
          color="bg-amber-500/20 text-amber-400"
          animated={true}
        />
      </div>

      {/* Profit Projection Row - FIXED: Now uses formatMoney */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-300 font-medium">Projected Profit</p>
          </div>
          <p className="text-3xl font-black text-white mb-1">
            <AnimatedCounter value={projectedProfit} formatter={formatMoney} />
          </p>
          <p className="text-xs text-emerald-400/70">From {activeDeals.length} active deals (probability-weighted)</p>
          <div className="mt-3 h-1.5 bg-emerald-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((projectedProfit / (totalPipeline || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart3 size={16} className="text-blue-400" />
            </div>
            <p className="text-sm text-blue-300 font-medium">Expected Monthly</p>
          </div>
          <p className="text-3xl font-black text-white mb-1">
            <AnimatedCounter value={monthlyProjection} formatter={formatMoney} />
          </p>
          <p className="text-xs text-blue-400/70">Based on 3-month pipeline average</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Target: {formatMoney(120000)}</span>
            <div className="flex-1 h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((monthlyProjection / 120000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-800/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <DollarSign size={16} className="text-orange-400" />
            </div>
            <p className="text-sm text-orange-300 font-medium">In Negotiation</p>
          </div>
          <p className="text-3xl font-black text-white mb-1">
            <AnimatedCounter value={negotiatingValue} formatter={formatMoney} />
          </p>
          <p className="text-xs text-orange-400/70">
            {leads.filter(l => l.status === 'negotiating').length} deals in final stages
          </p>
          <button className="mt-3 text-[10px] text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition-colors">
            View negotiating deals <ArrowUpRight size={10} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline visualization */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Pipeline Stages</h2>
          <div className="space-y-3">
            {pipelineStages.map((stage) => {
              const count = leads.filter((l) => l.status === stage.key).length;
              const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
              return (
                <div key={stage.key} className="flex items-center gap-4">
                  <span className="text-sm text-slate-400 w-24 shrink-0">{stage.label}</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${statusBarColors[stage.key]} rounded-lg flex items-center px-3 transition-all duration-500`}
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Source Stats - FIXED: Now uses formatMoney */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Lead Sources</h2>
          </div>
          <div className="space-y-3">
            {sortedSources.map(([source, count]) => {
              const sc = SOURCE_COLORS[source as LeadSource] || SOURCE_COLORS.other;
              const value = sourceValues[source] || 0;
              const pct = (count / maxSourceCount) * 100;
              return (
                <div key={source} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{count} leads</span>
                      <span className="text-xs text-slate-500">{formatMoney(value)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sc.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {sortedSources.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No source data</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Deal Scores */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Top Deal Scores</h2>
          </div>
          <div className="space-y-3">
            {topLeads.map((lead, i) => {
              const score = calculateDealScore(lead);
              const sc = getScoreColor(score);
              return (
                <div key={lead.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-bold text-slate-500 w-5">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {lead.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500">{STATUS_LABELS[lead.status]}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-black ${sc.text}`}>{score}</span>
                    <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topLeads.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No active leads</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="divide-y divide-slate-800">
            {recentLeads.map((lead) => {
              const score = calculateDealScore(lead);
              const sc = getScoreColor(score);
              return (
                <div key={lead.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    {lead.status === 'closed-won' ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Clock size={16} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.propertyAddress}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                    <Zap size={8} />
                    {score}
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 hidden sm:block">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Leaderboard + Streaks - FIXED: Now uses formatMoney */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Team Leaderboard</h2>
            <div className="space-y-3">
              {[...team]
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)
                .map((member, i) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors">
                    <span className="text-sm font-bold text-slate-500 w-5">{i + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {member.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.dealsCount} deals</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">
                      {formatMoney(member.revenue)}
                    </span>
                  </div>
                ))}
              {team.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No team members</p>
              )}
            </div>
          </div>

          {/* Mini Streak Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Team Streaks</h3>
            </div>
            <div className="space-y-2">
              {streakMembers
                .sort((a, b) => b.loginStreak - a.loginStreak)
                .slice(0, 4)
                .map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                      {m.avatar}
                    </div>
                    <span className="text-xs text-slate-300 flex-1 truncate">{m.name}</span>
                    <StreakBadge streak={m.loginStreak} size="sm" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}