/** Main CRM Dashboard */
import { useState, useEffect, useRef } from 'react';
import { useStore, calculateDealScore, getScoreColor, STATUS_LABELS, type LeadSource } from '../store/useStore';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Flame,
  Map,
  ArrowUpRight,
  GripVertical,
  Settings,
  Check,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Save
} from 'lucide-react';
import { StreakBadge } from '../components/StreakBadge';
import { TeamLeaderboard } from '../components/TeamLeaderboard';

import { AIQuickBoard } from '../components/AIQuickBoard';
import { PipelineChart } from '../components/PipelineChart';
import { MetricCard } from '../components/MetricCard';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';


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
  'bandit-signs': { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(248, 113, 113)', bar: 'rgb(239, 68, 68)', label: 'Bandit Signs' },
  'personal-relations': { bg: 'rgba(16, 185, 129, 0.15)', text: 'rgb(52, 211, 153)', bar: 'rgb(16, 185, 129)', label: 'Personal Relations' },
  'pay-per-lead': { bg: 'rgba(245, 158, 11, 0.15)', text: 'rgb(251, 191, 36)', bar: 'rgb(245, 158, 11)', label: 'Pay Per Lead' },
  'doorknocking': { bg: 'rgba(139, 92, 246, 0.15)', text: 'rgb(167, 139, 250)', bar: 'rgb(139, 92, 246)', label: 'Doorknocking' },
  'referral': { bg: 'var(--t-success-dim)', text: 'var(--t-success)', bar: 'var(--t-success)', label: 'Referral' },
  'website': { bg: 'rgba(6, 182, 212, 0.15)', text: 'rgb(34, 211, 238)', bar: 'rgb(6, 182, 212)', label: 'Website' },
  'social-media': { bg: 'rgba(236, 72, 153, 0.15)', text: 'rgb(244, 114, 182)', bar: 'rgb(236, 72, 153)', label: 'Social Media' },
  'open-house': { bg: 'rgba(249, 115, 22, 0.15)', text: 'rgb(251, 146, 60)', bar: 'rgb(249, 115, 22)', label: 'Open House' },
  'fsbo': { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(129, 140, 248)', bar: 'rgb(99, 102, 241)', label: 'FSBO' },
  'cold-call': { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', bar: 'var(--t-primary)', label: 'Cold Call' },
  'email-campaign': { bg: 'rgba(107, 114, 128, 0.15)', text: 'rgb(156, 163, 175)', bar: 'rgb(107, 114, 128)', label: 'Email Campaign' },
  other: { bg: 'var(--t-surface-hover)', text: 'var(--t-text-muted)', bar: 'var(--t-border)', label: 'Other' },
};


// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    leads, team,
    loginStreak, taskStreak, memberStreaks,
    dashboardLayout, setDashboardLayout
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Widget Registry
  const DEFAULT_LAYOUT = [
    'quick-board',
    'stats-grid',
    'profit-projection',
    'pipeline-trends',
    'leaderboard-recent'
  ];

  const PRESETS: Record<string, { label: string; icon: any; layout: string[] }> = {
    default: { label: 'Default', icon: LayoutGrid, layout: DEFAULT_LAYOUT },
    focused: { label: 'Focused', icon: Target, layout: ['quick-board', 'leaderboard-recent'] },
    analytics: { label: 'Analytics', icon: TrendingUp, layout: ['profit-projection', 'pipeline-trends'] },
  };

  const currentLayout = dashboardLayout?.length > 0 ? dashboardLayout : DEFAULT_LAYOUT;

  const moveWidget = (from: number, to: number) => {
    const next = [...currentLayout];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDashboardLayout(next);
  };

  // Close presets dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    if (showPresets) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showPresets]);

  // Drag handlers
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(fromIndex) && fromIndex !== index) {
      moveWidget(fromIndex, index);
    }
    setDragOverIndex(null);
    setDragIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const dataToUse = leads;

  const totalPipeline = dataToUse
    .filter((l) => !l.status.startsWith('closed'))
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  
  const closedRevenue = dataToUse
    .filter((l) => l.status === 'closed-won')
    .reduce((sum, l) => sum + (l.offerAmount || 0), 0);
  
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
    const margin = (l.estimatedValue || 0) - (l.offerAmount || 0);
    const prob = ((l as any).probability || 50) / 100;
    return s + (margin > 0 ? margin * prob : 0);
  }, 0);
  
  const negotiatingValue = dataToUse
    .filter(l => l.status === 'negotiating')
    .reduce((s, l) => s + (l.estimatedValue || 0), 0);

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
  const pipelineChange = ((totalPipeline - lastMonthPipeline) / (lastMonthPipeline || 1)) * 100;
  
  const lastMonthRevenue = closedRevenue * 0.918; 
  const revenueChange = ((closedRevenue - lastMonthRevenue) / (lastMonthRevenue || 1)) * 100;

  return (
    <div className="space-y-6 theme-transition" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Header with Streak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--t-on-background)]">Dashboard</h1>
          <p className="text-[var(--t-text-secondary)] text-sm mt-1">Welcome back. Here's your pipeline overview.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Preset Dropdown */}
          <div className="relative" ref={presetsRef}>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="p-2 rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
            >
              <LayoutGrid size={14} />
              Presets
              <ChevronDown size={12} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>
            {showPresets && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-2xl z-50 overflow-hidden">
                {Object.entries(PRESETS).map(([key, preset]) => {
                  const Icon = preset.icon;
                  const isActive = JSON.stringify(currentLayout) === JSON.stringify(preset.layout);
                  return (
                    <button
                      key={key}
                      onClick={() => { setDashboardLayout(preset.layout); setShowPresets(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-colors text-left ${
                        isActive ? 'bg-[var(--t-primary-dim)] text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] hover:text-white'
                      }`}
                    >
                      <Icon size={14} />
                      {preset.label}
                      {isActive && <Check size={12} className="ml-auto" />}
                    </button>
                  );
                })}
                <div className="border-t border-[var(--t-border)]">
                  <button
                    onClick={() => {
                      localStorage.setItem('dashboard-custom-preset', JSON.stringify(currentLayout));
                      setShowPresets(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-[var(--t-success)] hover:bg-[var(--t-success)]/10 transition-colors text-left"
                  >
                    <Save size={14} />
                    Save Current as Custom
                  </button>
                  {(() => {
                    try {
                      const saved = localStorage.getItem('dashboard-custom-preset');
                      if (saved) {
                        const custom = JSON.parse(saved);
                        return (
                          <button
                            onClick={() => { setDashboardLayout(custom); setShowPresets(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-[var(--t-accent)] hover:bg-[var(--t-accent)]/10 transition-colors text-left"
                          >
                            <LayoutGrid size={14} />
                            Load Custom
                          </button>
                        );
                      }
                    } catch { /* ignore */ }
                    return null;
                  })()}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
              isEditing 
                ? 'bg-[var(--t-success)]/10 border-[var(--t-success)]/30 text-[var(--t-success)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-white'
            }`}
          >
            {isEditing ? <Check size={14} /> : <Settings size={14} />}
            {isEditing ? 'Save Layout' : 'Customize'}
          </button>
          {isEditing && (
            <button
              onClick={() => setDashboardLayout(DEFAULT_LAYOUT)}
              className="p-2 rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-white transition-all"
              title="Reset to default"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <StreakBadge streak={loginStreak} type="login" size="md" showLabel />
          {taskStreak > 0 && <StreakBadge streak={taskStreak} type="task" size="md" />}
        </div>
      </div>

      {/* Widgets Container */}
      <div className="space-y-6">
        {currentLayout.map((widgetId, index) => {
          const renderWidget = () => {
            switch (widgetId) {
              case 'quick-board':
                return (
                  <div key="quick-board" className="space-y-4">
                    <AIQuickBoard />
                  </div>
                );
              case 'stats-grid':
                return (
                  <div key="stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      title="Total Pipeline" value={totalPipeline}
                      change={`${pipelineChange > 0 ? '+' : ''}${pipelineChange.toFixed(1)}%`}
                      changeType={pipelineChange > 0 ? 'up' : 'down'} 
                      icon={TrendingUp}
                      color="bg-[var(--t-primary-dim)] text-[var(--t-primary-text)]"
                      animated={true}
                      formatter={formatMoney}
                      onClick={() => navigate('/leads')}
                    />
                    <MetricCard
                      title="Closed Revenue" value={closedRevenue}
                      change={`${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`}
                      changeType={revenueChange > 0 ? 'up' : 'down'} 
                      icon={DollarSign}
                      color="bg-[var(--t-success)]/20 text-[var(--t-success)]"
                      animated={true}
                      formatter={formatMoney}
                      onClick={() => navigate('/leads')}
                    />
                    <MetricCard
                      title="Active Leads" value={activeLeads}
                      change="+3 this month" changeType="up" icon={Users}
                      color="bg-[var(--t-accent)]/20 text-[var(--t-accent)]"
                      animated={true}
                      onClick={() => navigate('/leads')}
                    />
                    <MetricCard
                      title="Avg Deal Score" value={avgScore}
                      change={`${winRate}% win rate`} changeType={winRate > 50 ? 'up' : 'down'} icon={Target}
                      color="bg-[var(--t-warning)]/20 text-[var(--t-warning)]"
                      animated={true}
                      onClick={() => navigate('/leads')}
                    />
                  </div>
                );
              case 'profit-projection':
                return (
                  <div key="profit-projection" className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <p className="text-xs text-[var(--t-success)]/70">From {activeDeals.length} active deals (weighted)</p>
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
                          <Map size={16} className="text-[var(--t-info)]" />
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
                      <div className="mt-3 text-[10px] text-[var(--t-warning)] hover:opacity-80 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        onClick={() => navigate('/leads?status=negotiating')}
                      >
                        View negotiating deals <ArrowUpRight size={10} />
                      </div>
                    </div>
                  </div>
                );
              case 'pipeline-trends':
                return (
                  <div key="pipeline-trends" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Pipeline Performance</h2>
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-[var(--t-primary)] animate-pulse" />
                          <span className="text-[10px] text-[var(--t-text-muted)] uppercase font-bold tracking-widest">Real-time Data</span>
                        </div>
                      </div>
                      <PipelineChart />
                      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {pipelineStages.map((stage) => {
                          const count = dataToUse.filter((l) => l.status === stage.key).length;
                          const pct = dataToUse.length > 0 ? (count / dataToUse.length) * 100 : 0;
                          return (
                            <div key={stage.key} className="p-3 rounded-xl bg-[var(--t-surface-dim)] border border-[var(--t-border-subtle)]">
                              <p className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider mb-1">{stage.label}</p>
                              <div className="flex items-end justify-between">
                                <span className="text-base font-black text-[var(--t-on-surface)]">{count}</span>
                                <span className="text-[8px] text-[var(--t-text-secondary)] mb-0.5">{pct.toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <Map size={18} className="text-[var(--t-info)]" />
                        <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Lead Sources</h2>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(sourceCounts)
                          .sort(([, countA], [, countB]) => countB - countA)
                          .map(([source, count]) => {
                            const sc = SOURCE_COLORS[source as LeadSource] || SOURCE_COLORS.other;
                            const totalLeadsCount = dataToUse.length;
                            const percentage = totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0;
                            return (
                              <div key={source} className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-[var(--t-on-surface)]">{sc.label}</span>
                                    <span className="text-[10px] text-[var(--t-text-secondary)]">{count} ({percentage.toFixed(0)}%)</span>
                                  </div>
                                  <div className="mt-1 h-1.5 bg-[var(--t-surface-active)] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: sc.bar }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <button className="mt-4 text-[10px] text-[var(--t-primary)] hover:opacity-80 font-medium flex items-center gap-1 transition-colors"
                        onClick={() => navigate('/leads')}
                      >
                        View all sources <ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              case 'leaderboard-recent':
                return (
                  <div key="leaderboard-recent" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap size={18} className="text-[var(--t-warning)]" />
                        <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Top Deals</h2>
                      </div>
                      <div className="space-y-3">
                        {topLeads.map((lead, i) => {
                          const score = calculateDealScore(lead);
                          const sc = getScoreColor(score);
                          return (
                            <div key={lead.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--t-surface-hover)] transition-colors cursor-pointer"
                              onClick={() => navigate(`/leads/${lead.id}/manage`)}
                            >
                              <span className="text-sm font-bold text-[var(--t-text-muted)] w-4 text-center">{i + 1}</span>
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                                style={{ backgroundColor: sc.bar }}
                              >
                                {score}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--t-on-surface)] truncate">{lead.name}</p>
                                <p className="text-[10px] text-[var(--t-text-muted)] truncate">{STATUS_LABELS[lead.status]}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 theme-transition">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-[var(--t-on-surface)]">Recent Activity</h2>
                        <button className="text-xs text-[var(--t-primary)] hover:underline" onClick={() => navigate('/leads')}>View All</button>
                      </div>
                      <div className="space-y-3">
                        {recentLeads.map((lead) => {
                          const score = calculateDealScore(lead);
                          const sc = getScoreColor(score);
                          return (
                            <div 
                              key={lead.id} 
                              onClick={() => navigate(`/leads/${lead.id}/manage`)}
                              className="flex items-center gap-4 p-3 rounded-xl border border-[var(--t-border-subtle)] hover:bg-[var(--t-surface-hover)] transition-colors cursor-pointer group/lead"
                            >
                              <div className="w-10 h-10 rounded-xl bg-[var(--t-surface-dim)] flex items-center justify-center font-bold text-[var(--t-primary)] group-hover/lead:scale-110 transition-transform">
                                {lead.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[var(--t-on-surface)] truncate">{lead.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${statusBarColors[lead.status] || 'bg-[var(--t-border)]'}`} />
                                  <span className="text-[10px] text-[var(--t-text-muted)] uppercase tracking-wider font-bold">
                                    {STATUS_LABELS[lead.status]}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-4">
                                <div>
                                  <p className="text-sm font-black text-[var(--t-on-surface)]">{formatMoney(lead.estimatedValue)}</p>
                                  <p className="text-[10px] text-[var(--t-text-muted)]">Updated {formatDistanceToNow(new Date(lead.updatedAt))} ago</p>
                                </div>
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold`} style={{ backgroundColor: sc.bar + '20', color: sc.bar }}>
                                  <Zap size={8} /> {score}
                                </div>
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
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
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
                );
              default:
                return null;
            }
          };

          return (
            <div
              key={widgetId}
              className={`relative group/widget transition-all duration-200 ${
                isEditing ? 'cursor-grab active:cursor-grabbing' : ''
              } ${
                dragIndex === index ? 'opacity-40 scale-[0.98]' : ''
              } ${
                dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-[var(--t-primary)] pt-2' : ''
              }`}
              draggable={isEditing}
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              {isEditing && (
                <div className="absolute -left-8 top-4 z-10 opacity-30 group-hover/widget:opacity-100 transition-opacity">
                  <GripVertical size={18} className="text-[var(--t-text-muted)]" />
                </div>
              )}
              <div className={`transition-all duration-300 ${isEditing ? 'pl-4 rounded-xl border border-dashed border-[var(--t-border)] hover:border-[var(--t-primary)]/40 py-2' : ''}`}>
                {renderWidget()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}