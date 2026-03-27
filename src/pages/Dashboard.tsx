/** Main CRM Dashboard */
import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { useStore, calculateDealScore, getScoreColor, STATUS_LABELS, type LeadSource } from '../store/useStore';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Map,
  Settings,
  Check,
  RotateCcw,
  ChevronDown,
  LayoutGrid,
  AlertCircle,
  Flame,
  GripVertical
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

// —— Error Boundary ————————————————————————————————————————
class DashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard Crash Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-[var(--t-surface)] border border-[var(--t-error)]/30 rounded-3xl m-6">
          <AlertCircle className="w-12 h-12 text-[var(--t-error)] mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Dashboard Encountered an Error</h2>
          <p className="text-[var(--t-text-muted)] text-sm mb-6 text-center max-w-md">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    leads, team,
    loginStreak, taskStreak, memberStreaks,
    dashboardLayout, setDashboardLayout,
    dataLoaded
  } = useStore();

  console.log('DEBUG: Dashboard rendering. dataLoaded:', dataLoaded, 'leads:', leads?.length, 'team:', team?.length);

  const [isEditing, setIsEditing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

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

  const currentLayout = (dashboardLayout && Array.isArray(dashboardLayout) && dashboardLayout.length > 0) ? dashboardLayout : DEFAULT_LAYOUT;

  const moveWidget = (from: number, to: number) => {
    const next = [...currentLayout];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDashboardLayout(next);
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    if (showPresets) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showPresets]);

  // Quick fix: Show loading if data is not yet available
  if (!dataLoaded || !leads || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--t-bg)] p-8">
        <div className="w-16 h-16 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-black text-white mb-2">Dashboard Loading</h2>
        <p className="text-[var(--t-text-muted)] text-sm animate-pulse">Fetching your pipeline and team data...</p>
      </div>
    );
  }


  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOverIndex) setDragOverIndex(index);
  };
  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(fromIndex) && fromIndex !== index) moveWidget(fromIndex, index);
    setDragOverIndex(null);
    setDragIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Calculations
  const dataToUse = leads || [];
  const totalPipeline = dataToUse
    .filter((l) => l && l.status && !l.status.startsWith('closed'))
    .reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
  const closedRevenue = dataToUse
    .filter((l) => l.status === 'closed-won')
    .reduce((sum, l) => sum + (l.offerAmount || 0), 0);
  const activeLeads = dataToUse.filter((l) => !l.status?.startsWith('closed')).length;
  const closedLeads = dataToUse.filter((l) => l.status?.startsWith('closed'));
  const winRate = (closedLeads || []).length > 0
    ? Math.round((dataToUse.filter((l) => l && l.status === 'closed-won').length / (closedLeads.length || 1)) * 100)
    : 0;

  const activeDeals = dataToUse.filter(l => l && (l.status === 'negotiating' || l.status === 'qualified'));
  const projectedProfit = activeDeals.reduce((s, l) => {
    const margin = (l.estimatedValue || 0) - (l.offerAmount || 0);
    const prob = ((l as any).probability || 50) / 100;
    return s + (margin > 0 ? margin * prob : 0);
  }, 0);
  const negotiatingValue = dataToUse
    .filter(l => l.status === 'negotiating')
    .reduce((s, l) => s + (l.estimatedValue || 0), 0);
  const monthlyProjection = Math.round((closedRevenue + projectedProfit * 0.6) / 3);

  const sourceCounts: Record<string, number> = {};
  dataToUse.forEach(l => {
    const src = l.source || 'other';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const recentLeads = [...dataToUse]
    .filter(l => l && l.updatedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const pipelineStages = [
    { label: 'New', key: 'new' },
    { label: 'Contacted', key: 'contacted' },
    { label: 'Qualified', key: 'qualified' },
    { label: 'Negotiating', key: 'negotiating' },
    { label: 'Won', key: 'closed-won' },
    { label: 'Lost', key: 'closed-lost' },
  ];

  const topLeads = [...dataToUse]
    .filter((l) => !l.status?.startsWith('closed'))
    .sort((a, b) => calculateDealScore(b) - calculateDealScore(a))
    .slice(0, 5);

  const streakMembers = (team || [])
    .filter(m => m && m.id)
    .map(m => ({
    id: m.id,
    name: m.name || 'Unknown',
    avatar: m.avatar || 'U',
    loginStreak: (memberStreaks && memberStreaks[m.id]?.login) || 0,
    taskStreak: (memberStreaks && memberStreaks[m.id]?.task) || 0,
  }));

  const pipelineChange = 12.5; // Dummy trend
  const revenueChange = 8.2; 

  return (
    <DashboardErrorBoundary>
      <div className="space-y-6 theme-transition p-6 lg:p-8 min-h-screen bg-[var(--t-bg)]">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[var(--t-on-background)] tracking-tight">Dashboard</h1>
            <p className="text-[var(--t-text-secondary)] text-sm font-medium opacity-80 mt-1">Real-time performance & pipeline insights.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative" ref={presetsRef}>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="p-2.5 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-sm"
              >
                <LayoutGrid size={14} /> Presets <ChevronDown size={12} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              </button>
              {showPresets && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button key={key} onClick={() => { setDashboardLayout(preset.layout); setShowPresets(false); }}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-xs font-bold transition-colors text-left ${
                        JSON.stringify(currentLayout) === JSON.stringify(preset.layout) ? 'bg-[var(--t-primary-dim)] text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] hover:text-white'
                      }`}
                    >
                      <preset.icon size={14} /> {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-sm ${
                isEditing ? 'bg-[var(--t-success)]/10 border-[var(--t-success)] text-[var(--t-success)]' : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-white'
              }`}
            >
              {isEditing ? <><Check size={14} /> Save Layout</> : <><Settings size={14} /> Customize</>}
            </button>
            {isEditing && (
              <button onClick={() => setDashboardLayout(DEFAULT_LAYOUT)} className="p-2.5 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-white shadow-sm">
                <RotateCcw size={14} />
              </button>
            )}
            <StreakBadge streak={loginStreak} type="login" size="md" showLabel />
            {taskStreak > 0 && <StreakBadge streak={taskStreak} type="task" size="md" />}
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="space-y-8">
          {currentLayout.map((widgetId, index) => {
            const renderWidget = () => {
              switch (widgetId) {
                case 'quick-board': return <AIQuickBoard />;
                case 'stats-grid': return (
                  <div key="stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Total Pipeline" value={totalPipeline} change={`+${pipelineChange}%`} changeType="up" icon={TrendingUp} color="bg-[var(--t-primary-dim)] text-[var(--t-primary)]" animated formatter={formatMoney} />
                    <MetricCard title="Closed Revenue" value={closedRevenue} change={`+${revenueChange}%`} changeType="up" icon={DollarSign} color="bg-[var(--t-success)]/10 text-[var(--t-success)]" animated formatter={formatMoney} />
                    <MetricCard title="Active Leads" value={activeLeads} change="+3" changeType="up" icon={Users} color="bg-[var(--t-info)]/10 text-[var(--t-info)]" animated />
                    <MetricCard title="Win Rate" value={winRate} change="-1.4%" changeType="down" icon={Check} color="bg-[var(--t-warning)]/10 text-[var(--t-warning)]" animated formatter={(val) => `${val}%`} />
                  </div>
                );
                case 'profit-projection': return (
                  <div key="profit" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 shadow-sm">
                       <h3 className="text-sm font-black uppercase text-[var(--t-success)] tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp size={16} /> Projected Profit
                       </h3>
                       <p className="text-4xl font-black text-white mb-2"><AnimatedCounter value={projectedProfit} formatter={formatMoney} /></p>
                       <p className="text-xs text-[var(--t-text-muted)]">From {activeDeals.length} active deals weighted by probability</p>
                    </div>
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 shadow-sm">
                       <h3 className="text-sm font-black uppercase text-[var(--t-info)] tracking-widest mb-4 flex items-center gap-2">
                        <Map size={16} /> Expected Monthly
                       </h3>
                       <p className="text-4xl font-black text-white mb-2"><AnimatedCounter value={monthlyProjection} formatter={formatMoney} /></p>
                       <p className="text-xs text-[var(--t-text-muted)]">Based on trailing 90-day pipeline flow</p>
                    </div>
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 shadow-sm">
                       <h3 className="text-sm font-black uppercase text-[var(--t-warning)] tracking-widest mb-4 flex items-center gap-2">
                        <DollarSign size={16} /> In Negotiation
                       </h3>
                       <p className="text-4xl font-black text-white mb-2"><AnimatedCounter value={negotiatingValue} formatter={formatMoney} /></p>
                       <p className="text-xs text-[var(--t-text-muted)]">{dataToUse.filter(l => l.status === 'negotiating').length} deals currently in final negotiation</p>
                    </div>
                  </div>
                );
                case 'pipeline-trends': return (
                  <div key="trends" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white">Pipeline Performance</h2>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--t-primary-dim)]">
                          <span className="w-2 h-2 rounded-full bg-[var(--t-primary)] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-primary)]">Live Insights</span>
                        </div>
                      </div>
                      <PipelineChart />
                      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {pipelineStages.map(stage => (
                          <div key={stage.key} className="p-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border-subtle)]">
                            <p className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-widest mb-2">{stage.label}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-white">{dataToUse.filter(l => l.status === stage.key).length}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 shadow-sm flex flex-col">
                      <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Map size={20} className="text-[var(--t-info)]" /> Lead Sources</h2>
                      <div className="space-y-5 flex-1 overflow-auto">
                        {Object.entries(sourceCounts).sort(([,a],[,b])=>b-a).map(([source, count]) => {
                          const sc = SOURCE_COLORS[source as LeadSource] || SOURCE_COLORS.other;
                          const pct = (count / (dataToUse.length || 1)) * 100;
                          return (
                            <div key={source}>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-bold text-white">{sc.label}</span>
                                <span className="text-[10px] font-bold text-[var(--t-text-muted)]">{count} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-[var(--t-surface-active)] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: sc.bar }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
                case 'leaderboard-recent': return (
                  <div key="bottom" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6">
                      <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2"><Zap size={18} className="text-[var(--t-warning)]" /> Hot Deals</h2>
                      <div className="space-y-4">
                        {topLeads.map((lead, i) => {
                          const score = calculateDealScore(lead);
                          const sc = getScoreColor(score);
                          return (
                            <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}/manage`)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--t-surface-hover)] transition-all cursor-pointer border border-transparent hover:border-[var(--t-border)]">
                              <span className="w-4 text-xs font-black text-[var(--t-text-muted)]">{i+1}</span>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xl" style={{ backgroundColor: sc.bar }}>{score}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                                <p className="text-[10px] text-[var(--t-text-muted)] truncate">{STATUS_LABELS[lead.status] || String(lead.status)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6">
                       <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white">Recent Activity</h2>
                        <button onClick={() => navigate('/leads')} className="text-xs font-black text-[var(--t-primary)] uppercase tracking-widest hover:underline">View All</button>
                       </div>
                       <div className="space-y-3">
                        {recentLeads.map(lead => (
                          <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}/manage`)} className="flex items-center gap-4 p-3.5 rounded-2xl border border-[var(--t-border-subtle)] hover:border-[var(--t-primary)]/30 hover:bg-[var(--t-surface-hover)] transition-all cursor-pointer group">
                             <div className="w-12 h-12 rounded-2xl bg-[var(--t-surface-dim)] flex items-center justify-center font-black text-[var(--t-primary)] group-hover:scale-105 transition-transform">{lead.name[0]}</div>
                             <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white">{lead.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`w-2 h-2 rounded-full ${statusBarColors[String(lead.status)] || 'bg-[var(--t-border)]'}`} />
                                  <span className="text-[10px] text-[var(--t-text-muted)] uppercase font-bold tracking-tighter">{STATUS_LABELS[lead.status] || String(lead.status)}</span>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-white">{formatMoney(lead.estimatedValue)}</p>
                                <p className="text-[10px] text-[var(--t-text-muted)]">{formatDistanceToNow(new Date(lead.updatedAt))} ago</p>
                             </div>
                          </div>
                        ))}
                       </div>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                      <TeamLeaderboard />
                      <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6">
                        <h3 className="text-sm font-black uppercase text-[var(--t-warning)] tracking-widest mb-4 flex items-center gap-2"><Flame size={16}/> Team Streaks</h3>
                        <div className="space-y-3">
                          {streakMembers.sort((a,b)=>b.loginStreak-a.loginStreak).slice(0,4).map(m => (
                            <div key={m.id} className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] flex items-center justify-center text-[10px] font-black text-white">{m.avatar}</div>
                               <span className="text-xs font-bold text-white flex-1 truncate">{m.name}</span>
                               <StreakBadge streak={m.loginStreak} size="sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                default: return null;
              }
            };
            return (
              <div key={widgetId} draggable={isEditing} onDragStart={handleDragStart(index)} onDragOver={handleDragOver(index)} onDrop={handleDrop(index)} onDragEnd={handleDragEnd}
                className={`group relative transition-all duration-300 ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''} ${dragIndex === index ? 'opacity-30 scale-[0.98]' : ''} ${dragOverIndex === index && dragIndex !== index ? 'border-t-4 border-[var(--t-primary)] pt-4' : ''}`}
              >
                {isEditing && <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity"><GripVertical size={20} className="text-[var(--t-primary)]" /></div>}
                <div className={isEditing ? 'pl-4 border-l-2 border-dashed border-[var(--t-border)] py-4' : ''}>
                  {renderWidget()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}