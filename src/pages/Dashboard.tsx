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
  GripVertical,
  Plus
} from 'lucide-react';
import { StreakBadge } from '../components/StreakBadge';
import { TeamLeaderboard } from '../components/TeamLeaderboard';
import { AIQuickBoard } from '../components/AIQuickBoard';
import { PipelineChart } from '../components/PipelineChart';
import { MetricCard } from '../components/MetricCard';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// ─── Money Formatter ─────────────────────────────────────────────────────────

const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '$0';
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${(value || 0).toLocaleString()}`;
};

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ value, formatter, duration = 1200 }: {
  value: number; formatter?: (val: number) => string; duration?: number;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayed(0);
      return;
    }
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
  'referral': { bg: 'var(--t-success-dim)', text: 'var(--t-success)', bar: 'var(--t-success)', label: 'Revenue Share' },
  'website': { bg: 'rgba(6, 182, 212, 0.15)', text: 'rgb(34, 211, 238)', bar: 'rgb(6, 182, 212)', label: 'Website' },
  'social-media': { bg: 'rgba(236, 72, 153, 0.15)', text: 'rgb(244, 114, 182)', bar: 'rgb(236, 72, 153)', label: 'Social Media' },
  'open-house': { bg: 'rgba(249, 115, 22, 0.15)', text: 'rgb(251, 146, 60)', bar: 'rgb(249, 115, 22)', label: 'Open House' },
  'fsbo': { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(129, 140, 248)', bar: 'rgb(99, 102, 241)', label: 'FSBO' },
  'cold-call': { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', bar: 'var(--t-primary)', label: 'Cold Call' },
  'email-campaign': { bg: 'rgba(107, 114, 128, 0.15)', text: 'rgb(156, 163, 175)', bar: 'rgb(107, 114, 128)', label: 'Email Campaign' },
  'google-sheets': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', bar: '#22c55e', label: 'Google Sheets' },
  'homes-com': { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', bar: 'var(--t-primary)', label: 'Homes.com' },
  'pdf': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', bar: '#ef4444', label: 'PDF Upload' },
  'smart-paste': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', bar: '#a855f7', label: 'Smart Paste' },
  'manual': { bg: 'var(--t-surface-hover)', text: 'var(--t-text-muted)', bar: 'var(--t-border)', label: 'Manual' },
  'ai_bot': { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', bar: 'var(--t-primary)', label: 'AI Bot' },
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
        <div className="flex flex-col items-center justify-center min-h-[400px] p-12 astral-glass border border-red-500/20 rounded-[3rem] m-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-white mb-3 uppercase italic tracking-tighter">System Error Detected</h2>
          <p className="text-[#6d758c] text-sm mb-8 max-w-md font-medium">
            {this.state.error?.message || "A critical rendering failure occurred in the dashboard core."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all hover-glow"
          >
            Reboot Dashboard
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
    dataLoaded, currentUser
  } = useStore();

  console.log('DEBUG: Dashboard rendering. dataLoaded:', dataLoaded, 'leads:', leads?.length, 'team:', team?.length);

  const [isEditing, setIsEditing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const presetsRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  if (!dataLoaded || !leads || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--t-bg)] p-8">
        <div className="w-20 h-20 border-4 border-[var(--t-primary)] border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_var(--t-primary-dim)]"></div>
        <h2 className="text-3xl font-black text-white mb-3 uppercase italic tracking-tighter">Initializing OS</h2>
        <p className="text-[#6d758c] text-sm font-black uppercase tracking-[0.2em] animate-pulse">Syncing Cloud Infrastructure...</p>
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
    .filter((l) => l && l.status === 'closed-won')
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
    .filter(l => l && l.status === 'negotiating')
    .reduce((s, l) => s + (l.estimatedValue || 0), 0);
  const monthlyProjection = Math.round((closedRevenue + projectedProfit * 0.6) / 3);

  const sourceCounts: Record<string, number> = {};
  dataToUse.forEach(l => {
    if (!l) return;
    const src = l.source || l.importSource || 'other';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const recentLeads = [...dataToUse]
    .filter(l => l && l.name && l.updatedAt)
    .sort((a, b) => {
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      return db - da;
    })
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
      <div className="crm-container crm-page-transition space-y-8 min-h-screen bg-[var(--t-bg)] text-[var(--t-text)]">
        {/* Header */}
        <div className={`flex items-center justify-between flex-wrap gap-6 mb-12 animate-astral-nav relative ${showPresets ? 'z-[201]' : 'z-[10]'}`}>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase" style={{ color: 'var(--t-text)' }}>Dashboard</h1>
            <p className="text-[#6d758c] text-sm font-black uppercase tracking-[0.2em] mt-2 opacity-80 italic">Real-time Performance Metrics</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative" ref={presetsRef}>
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="p-3.5 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border-subtle)] text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-2xl hover-lift"
              >
                <LayoutGrid size={16} /> Presets <ChevronDown size={14} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              </button>
              {showPresets && (
                <div className="absolute right-0 mt-3 w-64 bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl shadow-2xl z-[150] overflow-hidden backdrop-blur-3xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button key={key} onClick={() => { setDashboardLayout(preset.layout); setShowPresets(false); }}
                      className={`w-full flex items-center gap-4 px-6 py-4 text-xs font-black uppercase tracking-widest transition-colors text-left ${
                        JSON.stringify(currentLayout) === JSON.stringify(preset.layout) ? 'bg-indigo-600/20 text-indigo-400' : 'text-[#6d758c] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <preset.icon size={16} /> {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-2xl hover-lift ${
                isEditing ? 'bg-[var(--t-primary)] border-[var(--t-primary)] text-[var(--t-on-primary)] shadow-lg shadow-[var(--t-primary)]/30' : 'bg-[var(--t-surface)] border-[var(--t-border-subtle)] text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
              }`}
            >
              {isEditing ? <><Check size={16} /> Finalize</> : <><Settings size={16} /> Customize</>}
            </button>
            {isEditing && (
              <button onClick={() => setDashboardLayout(DEFAULT_LAYOUT)} className="p-3.5 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border-subtle)] text-[var(--t-text-muted)] hover:text-[var(--t-text)] shadow-2xl hover-lift">
                <RotateCcw size={16} />
              </button>
            )}
            <div className="flex items-center gap-3 h-[48px]">
              <StreakBadge streak={loginStreak} type="login" size="md" showLabel />
              {taskStreak > 0 && <StreakBadge streak={taskStreak} type="task" size="md" />}
            </div>
          </div>
        </div>

        {/* AI Greeting & Status */}
        <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--t-surface)] to-[var(--t-surface-dim)] border border-[var(--t-border)] shadow-2xl group animate-in slide-in-from-top-6 duration-1000">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Zap size={160} />
           </div>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-2">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                    Good Morning, <span className="text-[var(--t-primary)]">{currentUser?.name?.split(' ')[0] || 'Operative'}</span>.
                 </h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text-muted)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {useStore.getState().aiName || 'OS Bot'} is standing by for tactical operations.
                 </p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1">Current Session</p>
                    <p className="text-xl font-black text-[var(--t-text)] italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                 </div>
                 <div className="w-px h-10 bg-[var(--t-border)]" />
                 <button 
                    onClick={() => navigate('/leads/new')}
                    className="px-8 py-3 bg-[var(--t-primary)] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 shadow-xl shadow-[var(--t-primary-dim)] hover:translate-y-[-2px] transition-all flex items-center gap-2"
                 >
                    <Plus size={16} />
                    New Acquisition
                 </button>
              </div>
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
                    <MetricCard title="Total Pipeline" value={totalPipeline} change={`+${pipelineChange}%`} changeType="up" icon={TrendingUp} animated formatter={formatMoney} />
                    <MetricCard title="Closed Revenue" value={closedRevenue} change={`+${revenueChange}%`} changeType="up" icon={DollarSign} animated formatter={formatMoney} />
                    <MetricCard title="Active Leads" value={activeLeads} change="+3" changeType="up" icon={Users} animated />
                    <MetricCard title="Win Rate" value={winRate} change="-1.4%" changeType="down" icon={Check} animated formatter={(val) => `${val}%`} />
                  </div>
                );
                case 'profit-projection': return (
                  <div key="profit" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="astral-glass border border-indigo-500/10 rounded-[2.5rem] p-8 hover-lift group">
                       <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-4 flex items-center gap-2 italic">
                        <TrendingUp size={14} /> Projected Profit
                       </h3>
                       <p className="text-4xl font-black mb-2 italic tracking-tighter" style={{ color: 'var(--t-text)' }}><AnimatedCounter value={projectedProfit} formatter={formatMoney} /></p>
                       <p className="text-[10px] text-[#6d758c] font-bold uppercase tracking-widest">From {activeDeals.length} deals @ weighted probability</p>
                    </div>
                    <div className="astral-glass border border-indigo-500/10 rounded-[2.5rem] p-8 hover-lift group">
                       <h3 className="text-[10px] font-black uppercase text-purple-400 tracking-[0.2em] mb-4 flex items-center gap-2 italic">
                        <Map size={14} /> Expected Monthly
                       </h3>
                       <p className="text-4xl font-black mb-2 italic tracking-tighter" style={{ color: 'var(--t-text)' }}><AnimatedCounter value={monthlyProjection} formatter={formatMoney} /></p>
                       <p className="text-[10px] text-[#6d758c] font-bold uppercase tracking-widest">Trailing 90-day pipeline average</p>
                    </div>
                    <div className="astral-glass border border-indigo-500/10 rounded-[2.5rem] p-8 hover-lift group">
                       <h3 className="text-[10px] font-black uppercase text-pink-400 tracking-[0.2em] mb-4 flex items-center gap-2 italic">
                        <DollarSign size={14} /> In Negotiation
                       </h3>
                       <p className="text-4xl font-black mb-2 italic tracking-tighter" style={{ color: 'var(--t-text)' }}><AnimatedCounter value={negotiatingValue} formatter={formatMoney} /></p>
                       <p className="text-[10px] text-[#6d758c] font-bold uppercase tracking-widest">{dataToUse.filter(l => l.status === 'negotiating').length} contracts pending final signature</p>
                    </div>
                  </div>
                );
                case 'pipeline-trends': return (
                  <div key="trends" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 astral-glass border border-indigo-500/10 rounded-[3rem] p-10 hover-lift group">
                      <div className="flex items-center justify-between mb-10">
                        <h2 className="text-2xl font-black italic uppercase tracking-tight" style={{ color: 'var(--t-text)' }}>Pipeline Performance</h2>
                        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(159,167,255,0.8)]" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Live Infrastructure</span>
                        </div>
                      </div>
                      <PipelineChart />
                      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {pipelineStages.map(stage => (
                          <div key={stage.key} className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                            <p className="text-[9px] font-black text-[#6d758c] uppercase tracking-[0.2em] mb-2">{stage.label}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-black text-white italic">{dataToUse.filter(l => l.status === stage.key).length}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="astral-glass border border-indigo-500/10 rounded-[3rem] p-10 hover-lift group flex flex-col">
                      <h2 className="text-2xl font-black mb-8 flex items-center gap-3 italic uppercase tracking-tight" style={{ color: 'var(--t-text)' }}><Map size={24} className="text-indigo-400" /> Lead Sources</h2>
                      <div className="space-y-6 flex-1 overflow-auto pr-2 custom-scrollbar">
                        {Object.entries(sourceCounts).sort(([,a],[,b])=>b-a).map(([source, count]) => {
                          const sc = SOURCE_COLORS[source as LeadSource] || SOURCE_COLORS.other;
                          const pct = (count / (dataToUse.length || 1)) * 100;
                          return (
                            <div key={source} className="group/item">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover/item:text-indigo-300 transition-colors italic">{sc.label}</span>
                                <span className="text-[10px] font-black text-[#6d758c] uppercase tracking-widest">{count} units</span>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(159,167,255,0.4)]" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${sc.bar}, #be83fa)` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
                case 'leaderboard-recent': return (
                  <div key="bottom" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 astral-glass border border-indigo-500/10 rounded-[2.5rem] p-8 hover-lift group">
                      <h2 className="text-xl font-black mb-8 flex items-center gap-3 italic uppercase tracking-tight" style={{ color: 'var(--t-text)' }}><Zap size={20} className="text-amber-400 group-hover:scale-110 transition-transform" /> Hot Deals</h2>
                      <div className="space-y-5">
                        {topLeads.map((lead, i) => {
                          const score = calculateDealScore(lead);
                          const sc = getScoreColor(score);
                          return (
                            <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}/manage`)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-indigo-500/20 group/deal">
                              <span className="w-5 text-[10px] font-black text-[#6d758c] uppercase">{i+1}</span>
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xl shadow-indigo-600/20 transition-transform group-hover/deal:scale-110 italic" style={{ backgroundColor: sc.bar }}>{score}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate group-hover/deal:text-indigo-300 transition-colors uppercase italic">{lead.name}</p>
                                <p className="text-[10px] text-[#6d758c] truncate font-black uppercase tracking-widest">{STATUS_LABELS[lead.status] || String(lead.status)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="lg:col-span-2 astral-glass border border-indigo-500/10 rounded-[2.5rem] p-8 hover-lift group">
                       <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black italic uppercase tracking-tight" style={{ color: 'var(--t-text)' }}>Recent Activity</h2>
                        <button onClick={() => navigate('/leads')} className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors">View All Infrastructure</button>
                       </div>
                       <div className="space-y-4">
                        {recentLeads.map(lead => (
                          <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}/manage`)} className="flex items-center gap-5 p-4 rounded-2xl border border-white/5 hover:border-indigo-500/20 hover:bg-white/5 transition-all cursor-pointer group/activity">
                             <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center font-black text-indigo-400 group-hover/activity:scale-105 transition-transform shadow-inner">{lead.name[0]}</div>
                             <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white uppercase italic group-hover/activity:text-indigo-300 transition-colors">{lead.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`w-2 h-2 rounded-full ${statusBarColors[String(lead.status)] || 'bg-white/10'}`} />
                                  <span className="text-[9px] text-[#6d758c] uppercase font-black tracking-widest">{STATUS_LABELS[lead.status] || String(lead.status)}</span>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-white italic">{formatMoney(lead.estimatedValue)}</p>
                                <p className="text-[9px] text-[#6d758c] font-bold uppercase tracking-widest">{formatDistanceToNow(new Date(lead.updatedAt))} ago</p>
                             </div>
                          </div>
                        ))}
                       </div>
                    </div>
                    <div className="lg:col-span-1 space-y-8">
                      <TeamLeaderboard />
                      <div className="astral-glass border border-indigo-500/10 rounded-[2.5rem] p-8 hover-lift group">
                        <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em] mb-6 flex items-center gap-2 italic"><Flame size={16} className="animate-pulse" /> Team Streaks</h3>
                        <div className="space-y-4">
                          {streakMembers.sort((a,b)=>b.loginStreak-a.loginStreak).slice(0,4).map(m => (
                            <div key={m.id} className="flex items-center gap-4 group/streak">
                               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white italic group-hover/streak:scale-110 transition-transform">{m.avatar}</div>
                               <span className="text-xs font-black text-white flex-1 truncate uppercase italic">{m.name}</span>
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