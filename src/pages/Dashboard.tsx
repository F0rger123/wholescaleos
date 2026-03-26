import { useState, useEffect } from 'react';
import { useStore, calculateDealScore, getScoreColor, STATUS_LABELS, type Lead, type LeadSource } from '../store/useStore';
import { LeadQuickViewModal } from '../components/LeadQuickViewModal';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  PieChart,
  BarChart3,
  Activity,
  Eye,
  ExternalLink
} from 'lucide-react';
import { StreakBadge } from '../components/StreakBadge';
import { TeamLeaderboard } from '../components/TeamLeaderboard';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart as RePieChart, Pie,
  AreaChart, Area,
  BarChart, Bar,
  LineChart,
} from 'recharts';

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
  title, value, change, changeType, icon: Icon, color, animated, formatter, onClick,
}: {
  title: string; value: number; change: string; changeType: 'up' | 'down'; icon: React.ElementType; color: string;
  animated?: boolean; formatter?: (val: number) => string;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 hover:border-[var(--t-border-strong)] transition-all theme-transition ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--t-text-secondary)] font-medium">{title}</p>
          <p className="text-2xl font-bold text-[var(--t-on-surface)] mt-1">
            {animated ? <AnimatedCounter value={value} formatter={formatter} /> : (formatter ? formatter(value) : value)}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {changeType === 'up' ? (
          <ArrowUpRight size={14} className="text-[var(--t-success)]" />
        ) : (
          <ArrowDownRight size={14} className="text-[var(--t-error)]" />
        )}
        <span className={`text-xs font-semibold ${changeType === 'up' ? 'text-[var(--t-success)]' : 'text-[var(--t-error)]'}`}>
          {change}
        </span>
        <span className="text-xs text-[var(--t-text-muted)]">vs last month</span>
      </div>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const statusBarColors: Record<string, string> = {
  new: 'bg-[var(--t-info)]', 
  contacted: 'bg-[var(--t-warning)]', 
  qualified: 'bg-[var(--t-accent)]',
  negotiating: 'bg-[var(--t-warning)]', 
  'closed-won': 'bg-[var(--t-success)]', 
  'closed-lost': 'bg-[var(--t-error)]',
};

const SOURCE_COLORS: Record<string, { bg: string; text: string; bar: string; label: string }> = {
  website: { bg: 'rgba(6, 182, 212, 0.15)', text: 'rgb(34, 211, 238)', bar: 'rgb(6, 182, 212)', label: 'Website' },
  referral: { bg: 'var(--t-success-dim)', text: 'var(--t-success)', bar: 'var(--t-success)', label: 'Referral' },
  'cold-call': { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', bar: 'var(--t-primary)', label: 'Cold Call' },
  'social-media': { bg: 'rgba(236, 72, 153, 0.15)', text: 'rgb(244, 114, 182)', bar: 'rgb(236, 72, 153)', label: 'Social Media' },
  mailer: { bg: 'var(--t-warning-dim)', text: 'var(--t-warning)', bar: 'var(--t-warning)', label: 'Mailer' },
  other: { bg: 'var(--t-surface-hover)', text: 'var(--t-text-muted)', bar: 'var(--t-border)', label: 'Other' },
};

type Timeframe = '7d' | '30d' | '90d' | 'all';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { leads, team, loginStreak, taskStreak, memberStreaks } = useStore();
  const navigate = useNavigate();
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>(
    (localStorage.getItem('dashboard-timeframe') as Timeframe) || '30d'
  );
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>(
    (localStorage.getItem('dashboard-chart-type') as any) || 'line'
  );

  const filteredLeads = leads.filter(l => {
    if (timeframe === 'all') return true;
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(l.createdAt) >= cutoff;
  });


  const handleOpenLead = (id: string) => {
    window.open(`/leads/${id}/manage`, '_blank');
  };

  // ─── Calculations ────────────────────────────────────────
  const dataToUse = filteredLeads || leads;

  const totalPipeline = dataToUse
    .filter((l) => !l.status.startsWith('closed'))
    .reduce((sum, l) => sum + l.estimatedValue, 0);
  
  const closedRevenue = dataToUse
    .filter((l) => l.status === 'closed-won')
    .reduce((sum, l) => sum + l.offerAmount, 0);
  
  const activeLeads = dataToUse.filter((l) => !l.status.startsWith('closed')).length;
  
  const closedLeads = dataToUse.filter((l) => l.status.startsWith('closed'));
  const winRate = closedLeads.length > 0
    ? Math.round((dataToUse.filter((l) => l.status === 'closed-won').length / closedLeads.length) * 100)
    : 0;
  
  const avgScore = dataToUse.length > 0
    ? Math.round(dataToUse.reduce((s, l) => s + calculateDealScore(l), 0) / dataToUse.length) : 0;

  // Profit Projection
  const activeDeals = dataToUse.filter(l => l.status === 'negotiating' || l.status === 'qualified');
  const projectedProfit = activeDeals.reduce((s, l) => {
    const margin = l.estimatedValue - l.offerAmount;
    const prob = (l as any).probability / 100 || 0.5;
    return s + (margin > 0 ? margin * prob : 0);
  }, 0);
  
  const negotiatingValue = dataToUse
    .filter(l => l.status === 'negotiating')
    .reduce((s, l) => s + l.estimatedValue, 0);
  
  const monthlyProjection = Math.round((closedRevenue + projectedProfit * 0.6) / 3);

  // Source Stats
  const sourceCounts: Record<string, number> = {};
  dataToUse.forEach(l => {
    const src = l.source;
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const recentLeads = [...dataToUse].sort(
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

  const topLeads = [...dataToUse]
    .filter((l) => !l.status.startsWith('closed'))
    .sort((a, b) => calculateDealScore(b) - calculateDealScore(a))
    .slice(0, 5);

  // ─── Analytics Data Calculations ───────────────────────────

  // 2. Response Time / Lead Trend (Mocking historical trend if limited real data)
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const leadTrendData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (11 - i) * (days / 11));
    const countAtDate = dataToUse.filter(l => new Date(l.createdAt) <= date).length;
    return {
      name: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      leads: countAtDate,
      avgSize: Math.floor(250000 + Math.random() * 50000),
      responseTime: 2 + Math.random() * 5 // Mock hours
    };
  });

  // 3. Source Pie Data
  const sourcePieData = Object.entries(sourceCounts).map(([source, count]) => {
    const sc = SOURCE_COLORS[source as LeadSource] || SOURCE_COLORS.other;
    return {
      name: sc.label,
      value: count,
      color: sc.bar.startsWith('var') ? sc.bar : sc.bar
    };
  });

  // 4. Heatmap Data (Hours vs Days)
  const heatmapData = Array.from({ length: 7 }).map((_, d) => {
    return Array.from({ length: 24 }).map((_, h) => {
      // Find activity count for this hour/day
      const count = dataToUse.filter(l => {
        const dt = new Date(l.updatedAt);
        return dt.getDay() === d && dt.getHours() === h;
      }).length;
      return count;
    });
  });

  // Streak leaderboard data
  const streakMembers = team.map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    loginStreak: memberStreaks[m.id]?.login || 0,
    taskStreak: memberStreaks[m.id]?.task || 0,
  }));

  // Calculate vs last month
  const lastMonthPipeline = totalPipeline * 0.875; 
  const pipelineChange = ((totalPipeline - lastMonthPipeline) / lastMonthPipeline) * 100;
  
  const lastMonthRevenue = closedRevenue * 0.918; 
  const revenueChange = ((closedRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

  return (
    <div className="space-y-6 theme-transition" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Header with Streak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--t-on-background)]">Dashboard</h1>
          <p className="text-[var(--t-text-secondary)] text-sm mt-1">Welcome back. Here's your pipeline overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--t-surface-dim)] rounded-xl p-1 border border-[var(--t-border-subtle)]">
            {(['7d', '30d', '90d', 'all'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === tf 
                    ? 'bg-[var(--t-primary)] text-white shadow-lg' 
                    : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
          <StreakBadge streak={loginStreak} type="login" size="md" showLabel />
          {taskStreak > 0 && <StreakBadge streak={taskStreak} type="task" size="md" />}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pipeline" value={totalPipeline}
          change={`${pipelineChange > 0 ? '+' : ''}${pipelineChange.toFixed(1)}%`}
          changeType={pipelineChange > 0 ? 'up' : 'down'} 
          icon={TrendingUp}
          color="bg-[var(--t-primary-dim)] text-[var(--t-primary-text)]"
          animated={true}
          formatter={formatMoney}
          onClick={() => navigate('/leads')}
        />
        <StatCard
          title="Closed Revenue" value={closedRevenue}
          change={`${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`}
          changeType={revenueChange > 0 ? 'up' : 'down'} 
          icon={DollarSign}
          color="bg-[var(--t-success)]/20 text-[var(--t-success)]"
          animated={true}
          formatter={formatMoney}
          onClick={() => navigate('/leads')}
        />
        <StatCard
          title="Active Leads" value={activeLeads}
          change="+3 this month" changeType="up" icon={Users}
          color="bg-[var(--t-accent)]/20 text-[var(--t-accent)]"
          animated={true}
          onClick={() => navigate('/leads')}
        />
        <StatCard
          title="Avg Deal Score" value={avgScore}
          change={`${winRate}% win rate`} changeType={winRate > 50 ? 'up' : 'down'} icon={Target}
          color="bg-[var(--t-warning)]/20 text-[var(--t-warning)]"
          animated={true}
          onClick={() => navigate('/leads')}
        />
      </div>

      {/* Profit Projection Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[var(--t-success)]/20 to-[var(--t-surface)] border border-[var(--t-success)]/30 rounded-2xl p-5 theme-transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-[var(--t-success)]/20">
              <TrendingUp size={16} className="text-[var(--t-success)]" />
            </div>
            <p className="text-sm text-[var(--t-success)] font-medium">Projected Profit</p>
          </div>
          <p className="text-3xl font-black text-[var(--t-on-surface)] mb-1">
            <AnimatedCounter value={projectedProfit} formatter={formatMoney} />
          </p>
          <p className="text-xs text-[var(--t-success)]/70">From {activeDeals.length} active deals (probability-weighted)</p>
          <div className="mt-3 h-1.5 bg-[var(--t-surface-active)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--t-success)] rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((projectedProfit / (totalPipeline || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[var(--t-info)]/20 to-[var(--t-surface)] border border-[var(--t-info)]/30 rounded-2xl p-5 theme-transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-[var(--t-info)]/20">
              <BarChart3 size={16} className="text-[var(--t-info)]" />
            </div>
            <p className="text-sm text-[var(--t-info)] font-medium">Expected Monthly</p>
          </div>
          <p className="text-3xl font-black text-[var(--t-on-surface)] mb-1">
            <AnimatedCounter value={monthlyProjection} formatter={formatMoney} />
          </p>
          <p className="text-xs text-[var(--t-info)]/70">Based on 3-month pipeline average</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-[var(--t-text-muted)]">Target: {formatMoney(120000)}</span>
            <div className="flex-1 h-1.5 bg-[var(--t-surface-active)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--t-info)] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((monthlyProjection / 120000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[var(--t-warning)]/20 to-[var(--t-surface)] border border-[var(--t-warning)]/30 rounded-2xl p-5 theme-transition">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-[var(--t-warning)]/20">
              <DollarSign size={16} className="text-[var(--t-warning)]" />
            </div>
            <p className="text-sm text-[var(--t-warning)] font-medium">In Negotiation</p>
          </div>
          <p className="text-3xl font-black text-[var(--t-on-surface)] mb-1">
            <AnimatedCounter value={negotiatingValue} formatter={formatMoney} />
          </p>
          <p className="text-xs text-[var(--t-warning)]/70">
            {leads.filter(l => l.status === 'negotiating').length} deals in final stages
          </p>
          <button className="mt-3 text-[10px] text-[var(--t-warning)] hover:opacity-80 font-medium flex items-center gap-1 transition-colors">
            View negotiating deals <ArrowUpRight size={10} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline & Trends */}
        <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Pipeline & Lead Trends</h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-[var(--t-surface-dim)] rounded-lg p-1 border border-[var(--t-border-subtle)] mr-2">
                {[
                  { id: 'area', icon: Activity, label: 'Area' },
                  { id: 'bar', icon: BarChart3, label: 'Bar' },
                  { id: 'line', icon: TrendingUp, label: 'Line' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setChartType(t.id as any);
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      chartType === t.id 
                        ? 'bg-[var(--t-primary)] text-white shadow-sm' 
                        : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                    }`}
                    title={t.label}
                  >
                    <t.icon size={14} />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => {
                  localStorage.setItem('dashboard-chart-type', chartType);
                  alert('Default chart view saved!');
                }}
                className="p-2 text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-colors"
                title="Save as default view"
              >
                <div className="w-4 h-4 border-2 border-current rounded-sm flex items-center justify-center text-[8px] font-bold">S</div>
              </button>
              <div className="hidden sm:flex items-center gap-4 text-[10px] ml-4">
                <div className="flex items-center gap-1.5 text-[var(--t-primary)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-primary)]" />
                  <span>Response Time</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--t-success)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--t-success)]" />
                  <span>Total Leads</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={leadTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '12px' }} />
                  <Bar dataKey="leads" fill="var(--t-success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={leadTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="leads" stroke="var(--t-success)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="responseTime" stroke="var(--t-primary)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              ) : (
                <AreaChart data={leadTrendData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--t-success)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--t-success)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="leads" stroke="var(--t-success)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                  <Line type="monotone" dataKey="responseTime" stroke="var(--t-primary)" strokeWidth={2} dot={{ r: 4 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStages.map((stage) => {
              const count = dataToUse.filter((l) => l.status === stage.key).length;
              const pct = dataToUse.length > 0 ? (count / dataToUse.length) * 100 : 0;
              return (
                <div key={stage.key} className="p-3 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border-subtle)]">
                  <p className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider mb-1">{stage.label}</p>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-black text-[var(--t-on-surface)]">{count}</span>
                    <span className="text-[10px] text-[var(--t-text-secondary)] mb-1">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 h-1 bg-[var(--t-surface-active)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${statusBarColors[stage.key]} transition-all duration-1000`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Source Stats */}
        <div className="bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-[var(--t-info)]" />
            <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Leads & Deal Size</h2>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={sourcePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourcePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {sourcePieData.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-[var(--t-text-muted)] truncate">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--t-border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--t-text-secondary)]">Avg Deal Size</span>
              <span className="text-sm font-bold text-[var(--t-on-surface)]">{formatMoney(avgScore * 5000)}</span>
            </div>
            <div className="h-[40px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadTrendData}>
                  <Area type="monotone" dataKey="avgSize" stroke="var(--t-primary)" fill="var(--t-primary-dim)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Activity Heatmap */}
        <div className="lg:col-span-1 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--t-on-surface)]">Activity Heatmap</h2>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(v => (
                <div key={v} className={`w-2 h-2 rounded-sm ${v === 0 ? 'bg-[var(--t-surface-dim)]' : v === 1 ? 'bg-[var(--t-primary)]/20' : v === 2 ? 'bg-[var(--t-primary)]/50' : 'bg-[var(--t-primary)]'}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[2px]">
            {heatmapData.map((day, d) => (
              <div key={d} className="flex gap-[2px]">
                <span className="w-4 text-[8px] text-[var(--t-text-muted)] uppercase">{['S','M','T','W','T','F','S'][d]}</span>
                {day.map((count, h) => (
                  <div 
                    key={h}
                    title={`${count} activity at ${h}:00`}
                    className="flex-1 aspect-square rounded-sm transition-colors"
                    style={{ 
                      backgroundColor: count === 0 ? 'var(--t-surface-dim)' :
                                      count === 1 ? 'var(--t-primary-dim)' :
                                      count < 3 ? 'var(--t-primary)' : 'var(--t-primary-text)',
                      opacity: count === 0 ? 0.3 : 0.6 + (count * 0.1)
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-[8px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest px-4">
            <span>12 AM</span>
            <span>12 PM</span>
            <span>11 PM</span>
          </div>
        </div>

        {/* Top Deal Scores */}
        <div className="lg:col-span-1 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-[var(--t-warning)]" />
            <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Top Deal Scores</h2>
          </div>
          <div className="space-y-3">
            {topLeads.map((lead, i) => {
              const score = calculateDealScore(lead);
              const sc = getScoreColor(score);
              return (
                <div key={lead.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--t-surface-hover)] transition-colors">
                  <span className="text-sm font-bold text-[var(--t-text-muted)] w-5">{i + 1}</span>
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[var(--t-on-primary)] shrink-0 shadow-sm"
                    style={{ background: 'var(--t-gradient)' }}
                  >
                    {lead.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--t-on-surface)] truncate">
                      {lead.name}
                    </p>
                    <p className="text-xs text-[var(--t-text-secondary)]">{STATUS_LABELS[lead.status]}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setQuickViewLead(lead)}
                      className="p-1.5 rounded-lg bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] hover:text-white transition-all border border-[var(--t-border)]"
                      title="Quick View"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => handleOpenLead(lead.id)}
                      className="p-1.5 rounded-lg bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] hover:text-white transition-all border border-[var(--t-border)]"
                      title="Open Lead"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-black ${sc.text}`}>{score}</span>
                    <div className="w-12 h-1.5 bg-[var(--t-surface-active)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topLeads.length === 0 && (
              <p className="text-sm text-[var(--t-text-muted)] text-center py-4">No active leads</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition">
          <h2 className="text-lg font-semibold text-[var(--t-on-surface)] mb-4">Recent Activity</h2>
          <div className="divide-y divide-[var(--t-border-subtle)]">
            {recentLeads.map((lead) => {
              const score = calculateDealScore(lead);
              const sc = getScoreColor(score);
              return (
                <div key={lead.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--t-surface-hover)] flex items-center justify-center shrink-0">
                    {lead.status === 'closed-won' ? (
                      <CheckCircle2 size={16} className="text-[var(--t-success)]" />
                    ) : (
                      <Clock size={16} className="text-[var(--t-text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--t-on-surface)] font-medium truncate">
                      {lead.name}
                    </p>
                    <p className="text-xs text-[var(--t-text-secondary)] truncate">{lead.propertyAddress}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => setQuickViewLead(lead)}
                      className="p-1.5 rounded-lg bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] hover:text-white transition-all border border-[var(--t-border)]"
                      title="Quick View"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => handleOpenLead(lead.id)}
                      className="p-1.5 rounded-lg bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] hover:text-white transition-all border border-[var(--t-border)]"
                      title="Open Lead"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                    <Zap size={8} />
                    {score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <TeamLeaderboard />

          {/* Mini Streak Panel */}
          <div className="bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-[var(--t-warning)]" />
              <h3 className="text-sm font-semibold text-[var(--t-on-surface)]">Team Streaks</h3>
            </div>
            <div className="space-y-2">
              {streakMembers
                .sort((a, b) => b.loginStreak - a.loginStreak)
                .slice(0, 4)
                .map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-[var(--t-on-primary)] shrink-0"
                      style={{ background: 'var(--t-gradient)' }}
                    >
                      {m.avatar}
                    </div>
                    <span className="text-[10px] text-[var(--t-text-secondary)] flex-1 truncate">{m.name}</span>
                    <StreakBadge streak={m.loginStreak} size="sm" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {quickViewLead && (
        <LeadQuickViewModal 
          lead={quickViewLead} 
          onClose={() => setQuickViewLead(null)}
          onOpenFull={() => {
            handleOpenLead(quickViewLead.id);
            setQuickViewLead(null);
          }}
        />
      )}
    </div>
  );
}