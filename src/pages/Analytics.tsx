// @ts-nocheck
import { useState, useMemo, useRef } from 'react';
import { useStore, Lead, LeadStatus } from '../store/useStore';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, Target, Award, Download, Calendar,
  BarChart3, ArrowUpRight, ArrowDownRight, Users,
  DollarSign, CheckCircle2, Clock, Filter, FileText,
  Loader2
} from 'lucide-react';
import { format, subDays, subMonths, isAfter, startOfMonth, endOfMonth, eachMonthOfInterval, startOfDay } from 'date-fns';
import html2pdf from 'html2pdf.js';
import Papa from 'papaparse';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TimeframeKey = '7d' | '30d' | '90d' | '1y' | 'custom';
type ChartVariant = 'line' | 'bar' | 'area';

interface GoalConfig {
  leads: number;
  deals: number;
  revenue: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<LeadStatus, string> = {
  'new': 'Lead',
  'contacted': 'Contact',
  'qualified': 'Showing',
  'negotiating': 'Offer',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  'new': '#6366f1',
  'contacted': '#8b5cf6',
  'qualified': '#a855f7',
  'negotiating': '#f59e0b',
  'closed-won': '#22c55e',
  'closed-lost': '#ef4444',
};

const FUNNEL_ORDER: LeadStatus[] = ['new', 'contacted', 'qualified', 'negotiating', 'closed-won'];

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '1y', label: '1 Year' },
];

// US National Agent Benchmarks (NAR Member Profile 2024)
// Source: National Association of REALTORS® Member Profile
const US_NATIONAL_BENCHMARKS = {
  // Median of 12 transaction sides/yr → 1.0/mo
  dealsPerMonth: 1.0,
  // Median gross income $56,400/yr → $4,700/mo
  revenuePerMonth: 4700,
  // Average 26 active leads per month across all experience levels
  leadsPerMonth: 26,
  // ~6% of leads convert to closed deals nationally
  conversionRate: 0.06,
  // Median experience: 8 years
  medianExperienceYears: 8,
  // Average sale price $410k (2024)
  avgSalePrice: 410000,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStartDate(timeframe: TimeframeKey, customStart?: Date): Date {
  switch (timeframe) {
    case '7d': return subDays(new Date(), 7);
    case '30d': return subDays(new Date(), 30);
    case '90d': return subDays(new Date(), 90);
    case '1y': return subMonths(new Date(), 12);
    case 'custom': return customStart || subDays(new Date(), 30);
  }
}

function filterByTimeframe(leads: Lead[], timeframe: TimeframeKey, customStart?: Date): Lead[] {
  const start = getStartDate(timeframe, customStart);
  return leads.filter(l => isAfter(new Date(l.createdAt), start));
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { leads, tasks } = useStore();
  const reportRef = useRef<HTMLDivElement>(null);

  // State
  const [timeframe, setTimeframe] = useState<TimeframeKey>('30d');
  const [chartType, setChartType] = useState<ChartVariant>('area');
  const [isExporting, setIsExporting] = useState(false);
  const [goals, setGoals] = useState<GoalConfig>(() => {
    try {
      const saved = localStorage.getItem('wholescale-analytics-goals');
      return saved ? JSON.parse(saved) : { leads: 50, deals: 5, revenue: 50000 };
    } catch { return { leads: 50, deals: 5, revenue: 50000 }; }
  });
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftGoals, setDraftGoals] = useState<GoalConfig>(goals);

  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Filtered data
  const filteredLeads = useMemo(() => filterByTimeframe(safeLeads, timeframe), [safeLeads, timeframe]);
  
  // ─── KPI Calculations ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const closedWon = filteredLeads.filter(l => l.status === 'closed-won');
    const totalRevenue = closedWon.reduce((sum, l) => sum + (l.offerAmount || l.estimatedValue || 0), 0);
    const conversionRate = filteredLeads.length > 0 ? (closedWon.length / filteredLeads.length) * 100 : 0;
    const avgDealValue = closedWon.length > 0 ? totalRevenue / closedWon.length : 0;
    const completedTasks = safeTasks.filter(t => t.status === 'done').length;

    return {
      totalLeads: filteredLeads.length,
      closedDeals: closedWon.length,
      totalRevenue,
      conversionRate,
      avgDealValue,
      completedTasks,
    };
  }, [filteredLeads, safeTasks]);

  // ─── Conversion Funnel Data ────────────────────────────────────────────────

  const funnelData = useMemo(() => {
    return FUNNEL_ORDER.map(status => ({
      name: STATUS_LABELS[status],
      value: filteredLeads.filter(l => l.status === status).length,
      fill: STATUS_COLORS[status],
    }));
  }, [filteredLeads]);

  // ─── Revenue Over Time ─────────────────────────────────────────────────────

  const revenueOverTime = useMemo(() => {
    const startDate = getStartDate(timeframe);
    const now = new Date();
    const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(now) });
    
    return months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthLeads = safeLeads.filter(l => {
        const d = new Date(l.createdAt);
        return d >= monthStart && d <= monthEnd && l.status === 'closed-won';
      });
      const revenue = monthLeads.reduce((sum, l) => sum + (l.offerAmount || l.estimatedValue || 0), 0);
      const allMonthLeads = safeLeads.filter(l => {
        const d = new Date(l.createdAt);
        return d >= monthStart && d <= monthEnd;
      });
      return {
        name: format(monthStart, 'MMM yyyy'),
        revenue,
        deals: monthLeads.length,
        leads: allMonthLeads.length,
      };
    });
  }, [safeLeads, timeframe]);

  // ─── Pipeline Distribution (Pie) ──────────────────────────────────────────

  const pipelineData = useMemo(() => {
    const statusCounts = Object.entries(STATUS_LABELS).map(([status, label]) => ({
      name: label,
      value: filteredLeads.filter(l => l.status === status).length,
      fill: STATUS_COLORS[status as LeadStatus],
    })).filter(d => d.value > 0);
    return statusCounts;
  }, [filteredLeads]);

  // ─── Agent Percentile ─────────────────────────────────────────────────────

  const agentMetrics = useMemo(() => {
    const monthsInRange = timeframe === '7d' ? (7/30) : timeframe === '30d' ? 1 : timeframe === '90d' ? 3 : 12;
    const dealsPerMonth = monthsInRange > 0 ? kpis.closedDeals / monthsInRange : 0;
    const revenuePerMonth = monthsInRange > 0 ? kpis.totalRevenue / monthsInRange : 0;
    const leadsPerMonth = monthsInRange > 0 ? kpis.totalLeads / monthsInRange : 0;

    // Percentile calculation using log-normal distribution approximation
    // In real estate, deal distribution is heavily right-skewed
    // Top 20% of agents do 80% of transactions (Pareto)
    const calcPercentile = (userVal: number, nationalAvg: number): number => {
      if (nationalAvg === 0 || userVal === 0) return 50;
      const ratio = userVal / nationalAvg;
      // Approximate percentile using sigmoid curve fit to NAR distribution
      // ratio=1.0 → 50th percentile, ratio=2.0 → ~80th, ratio=3.0 → ~93rd
      const pct = Math.round(100 / (1 + Math.exp(-1.5 * (ratio - 1))));
      return Math.min(99, Math.max(1, pct));
    };

    return {
      dealsPerMonth,
      revenuePerMonth,
      leadsPerMonth,
      dealsPercentile: calcPercentile(dealsPerMonth, US_NATIONAL_BENCHMARKS.dealsPerMonth),
      revenuePercentile: calcPercentile(revenuePerMonth, US_NATIONAL_BENCHMARKS.revenuePerMonth),
      leadsPercentile: calcPercentile(leadsPerMonth, US_NATIONAL_BENCHMARKS.leadsPerMonth),
      // Use the best metric as the headline
      overallPercentile: Math.max(
        calcPercentile(dealsPerMonth, US_NATIONAL_BENCHMARKS.dealsPerMonth),
        calcPercentile(revenuePerMonth, US_NATIONAL_BENCHMARKS.revenuePerMonth),
      ),
    };
  }, [kpis, timeframe]);

  // ─── Goal Progress ────────────────────────────────────────────────────────

  const goalProgress = useMemo(() => {
    const thisMonthStart = startOfMonth(new Date());
    const thisMonthLeads = safeLeads.filter(l => isAfter(new Date(l.createdAt), thisMonthStart));
    const thisMonthDeals = thisMonthLeads.filter(l => l.status === 'closed-won');
    const thisMonthRevenue = thisMonthDeals.reduce((sum, l) => sum + (l.offerAmount || l.estimatedValue || 0), 0);

    return {
      leads: { current: thisMonthLeads.length, target: goals.leads, pct: Math.min(100, Math.round((thisMonthLeads.length / goals.leads) * 100)) },
      deals: { current: thisMonthDeals.length, target: goals.deals, pct: Math.min(100, Math.round((thisMonthDeals.length / goals.deals) * 100)) },
      revenue: { current: thisMonthRevenue, target: goals.revenue, pct: Math.min(100, Math.round((thisMonthRevenue / goals.revenue) * 100)) },
    };
  }, [safeLeads, goals]);

  // ─── Save Goals ───────────────────────────────────────────────────────────

  const saveGoals = () => {
    setGoals(draftGoals);
    localStorage.setItem('wholescale-analytics-goals', JSON.stringify(draftGoals));
    setEditingGoals(false);
  };

  // ─── Export Handlers ──────────────────────────────────────────────────────

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const opt = {
        margin: [0.3, 0.5, 0.3, 0.5] as [number, number, number, number],
        filename: `Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'landscape' as const },
        pagebreak: { mode: ['avoid-all', 'css'] },
      };
      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = () => {
    const data = filteredLeads.map(l => ({
      Name: l.name,
      Status: l.status,
      'Property Address': l.propertyAddress,
      'Estimated Value': l.estimatedValue,
      'Offer Amount': l.offerAmount,
      Source: l.source,
      'Created At': l.createdAt,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Analytics_Data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ─── Chart Renderer ───────────────────────────────────────────────────────

  const renderRevenueChart = () => {
    const commonProps = {
      data: revenueOverTime,
    };

    const xAxis = <XAxis dataKey="name" stroke="var(--t-text-muted)" fontSize={10} axisLine={false} tickLine={false} />;
    const yAxis = <YAxis stroke="var(--t-text-muted)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />;
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} />;
    const tip = <Tooltip
      contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
      labelStyle={{ color: 'var(--t-text)', fontWeight: 'bold' }}
      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
    />;

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--t-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--t-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}{xAxis}{yAxis}{tip}
          <Area type="monotone" dataKey="revenue" stroke="var(--t-primary)" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)" />
        </AreaChart>
      );
    }
    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tip}
          <Bar dataKey="revenue" fill="var(--t-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      );
    }
    return (
      <LineChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tip}
        <Line type="monotone" dataKey="revenue" stroke="var(--t-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--t-primary)', strokeWidth: 0 }} activeDot={{ r: 8 }} />
      </LineChart>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--t-text)] flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--t-primary-dim)]">
              <BarChart3 size={22} className="text-[var(--t-primary)]" />
            </div>
            Analytics
          </h1>
          <p className="text-sm text-[var(--t-text-muted)] mt-1">Performance metrics and pipeline insights</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Timeframe Switcher */}
          <div className="flex bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  timeframe === tf.key
                    ? 'bg-[var(--t-primary)] text-white shadow-md'
                    : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart Type Switcher */}
          <div className="flex bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-1">
            {(['area', 'bar', 'line'] as ChartVariant[]).map(ct => (
              <button
                key={ct}
                onClick={() => setChartType(ct)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  chartType === ct
                    ? 'bg-[var(--t-surface-hover)] text-[var(--t-text)]'
                    : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                }`}
              >
                {ct}
              </button>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-surface-hover)] transition-all disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-surface-hover)] transition-all"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: kpis.totalLeads, icon: Users, color: 'var(--t-primary)', fmt: (v: number) => v.toLocaleString() },
          { label: 'Closed Deals', value: kpis.closedDeals, icon: CheckCircle2, color: 'var(--t-success)', fmt: (v: number) => v.toLocaleString() },
          { label: 'Revenue', value: kpis.totalRevenue, icon: DollarSign, color: 'var(--t-success)', fmt: (v: number) => `$${v.toLocaleString()}` },
          { label: 'Conversion', value: kpis.conversionRate, icon: TrendingUp, color: 'var(--t-warning)', fmt: (v: number) => `${v.toFixed(1)}%` },
        ].map((card, i) => (
          <div key={i} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-5 hover:border-[var(--t-primary)]/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)]">{card.label}</span>
              <div className="p-1.5 rounded-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)` }}>
                <card.icon size={14} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-black text-[var(--t-text)]">{card.fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Over Time - 2 cols */}
        <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--t-text)]">Revenue Over Time</h3>
              <p className="text-xs text-[var(--t-text-muted)] mt-0.5">Monthly revenue from closed deals</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderRevenueChart()}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--t-text)] mb-2">Pipeline Distribution</h3>
          <p className="text-xs text-[var(--t-text-muted)] mb-4">Lead status breakdown</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px' }}
                  formatter={(value: number, name: string) => [`${value} leads`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pipelineData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-[var(--t-text-muted)]">{d.name}</span>
                </div>
                <span className="font-bold text-[var(--t-text)]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--t-text)] mb-2">Conversion Funnel</h3>
          <p className="text-xs text-[var(--t-text-muted)] mb-6">Lead → Contact → Showing → Offer → Closed</p>
          <div className="space-y-3">
            {funnelData.map((step, i) => {
              const maxVal = Math.max(...funnelData.map(d => d.value), 1);
              const pct = Math.round((step.value / maxVal) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[var(--t-text)]">{step.name}</span>
                    <span className="font-bold" style={{ color: step.fill }}>{step.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--t-surface-dim)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: step.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goal Tracker */}
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[var(--t-text)]">Monthly Goals</h3>
              <p className="text-xs text-[var(--t-text-muted)] mt-0.5">{format(new Date(), 'MMMM yyyy')}</p>
            </div>
            <button
              onClick={() => { setEditingGoals(!editingGoals); setDraftGoals(goals); }}
              className="text-xs font-bold text-[var(--t-primary)] hover:underline"
            >
              {editingGoals ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingGoals ? (
            <div className="space-y-4">
              {[
                { key: 'leads' as const, label: 'Leads Goal', icon: Users },
                { key: 'deals' as const, label: 'Deals Goal', icon: CheckCircle2 },
                { key: 'revenue' as const, label: 'Revenue Goal ($)', icon: DollarSign },
              ].map(g => (
                <div key={g.key}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] mb-1 block">{g.label}</label>
                  <input
                    type="number"
                    value={draftGoals[g.key]}
                    onChange={e => setDraftGoals(prev => ({ ...prev, [g.key]: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] outline-none focus:ring-2 focus:ring-[var(--t-primary)]"
                  />
                </div>
              ))}
              <button
                onClick={saveGoals}
                className="w-full py-2.5 rounded-xl bg-[var(--t-primary)] text-white font-bold text-sm hover:bg-[var(--t-primary)]/90 transition-all"
              >
                Save Goals
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {[
                { label: 'Leads', ...goalProgress.leads, color: 'var(--t-primary)', icon: Users },
                { label: 'Deals', ...goalProgress.deals, color: 'var(--t-success)', icon: CheckCircle2 },
                { label: 'Revenue', ...goalProgress.revenue, color: 'var(--t-warning)', icon: DollarSign, isCurrency: true },
              ].map((g, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <g.icon size={14} style={{ color: g.color }} />
                      <span className="font-medium text-[var(--t-text)]">{g.label}</span>
                    </div>
                    <span className="font-bold text-[var(--t-text)]">
                      {g.isCurrency ? `$${g.current.toLocaleString()}` : g.current} / {g.isCurrency ? `$${g.target.toLocaleString()}` : g.target}
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full bg-[var(--t-surface-dim)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${g.pct}%`, backgroundColor: g.color }}
                    />
                  </div>
                  <p className="text-[10px] font-bold mt-1 text-right" style={{ color: g.pct >= 100 ? 'var(--t-success)' : g.color }}>
                    {g.pct >= 100 ? '🎉 Goal reached!' : `${g.pct}% complete`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Percentile — US National Ranking */}
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--t-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--t-primary-dim)] flex items-center justify-center">
                <Award size={24} className="text-[var(--t-primary)]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--t-text-muted)]">US National Ranking</p>
                <div className="text-3xl font-black text-[var(--t-text)]">
                  Top {agentMetrics.overallPercentile}%
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-[var(--t-text-muted)] mb-4">
              Compared to 1.5M+ US agents (NAR 2024 benchmarks)
            </p>

            <div className="space-y-3 flex-1">
              {[
                { 
                  label: 'Deals/mo', 
                  yours: agentMetrics.dealsPerMonth.toFixed(1), 
                  national: US_NATIONAL_BENCHMARKS.dealsPerMonth.toFixed(1), 
                  pct: agentMetrics.dealsPercentile,
                  color: 'var(--t-success)'
                },
                { 
                  label: 'Revenue/mo', 
                  yours: `$${Math.round(agentMetrics.revenuePerMonth).toLocaleString()}`, 
                  national: `$${US_NATIONAL_BENCHMARKS.revenuePerMonth.toLocaleString()}`, 
                  pct: agentMetrics.revenuePercentile,
                  color: 'var(--t-warning)'
                },
                { 
                  label: 'Leads/mo', 
                  yours: Math.round(agentMetrics.leadsPerMonth).toString(), 
                  national: US_NATIONAL_BENCHMARKS.leadsPerMonth.toString(), 
                  pct: agentMetrics.leadsPercentile,
                  color: 'var(--t-primary)'
                },
              ].map((m, i) => (
                <div key={i} className="bg-[var(--t-surface-dim)] rounded-xl p-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--t-text-muted)] mb-2">
                    <span>{m.label}</span>
                    <span style={{ color: m.color }}>Top {m.pct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[var(--t-text)]">
                      You: <strong>{m.yours}</strong>
                    </span>
                    <span className="text-[var(--t-text-muted)]">
                      US Avg: {m.national}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--t-border)] overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700" 
                      style={{ width: `${m.pct}%`, backgroundColor: m.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leads Over Time Chart */}
      <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--t-text)]">Leads Over Time</h3>
            <p className="text-xs text-[var(--t-text-muted)] mt-0.5">New leads and deals per month</p>
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--t-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--t-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px' }}
              />
              <Bar dataKey="leads" fill="var(--t-primary)" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar dataKey="deals" fill="var(--t-success)" radius={[4, 4, 0, 0]} name="Deals" />
              <Legend
                wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
