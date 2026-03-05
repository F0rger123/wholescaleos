import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { leadsAtom, teamAtom } from '../store/atoms';
import { calculateDealScore, getScoreColor, STATUS_LABELS, type LeadSource } from '../store/useStore';
import {
  TrendingUp, DollarSign, Users, Target, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Zap,
  PieChart, BarChart3, Flame,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { StreakBadge } from '../components/StreakBadge';

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200 }: {
  value: number; prefix?: string; suffix?: string; duration?: number;
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

  return <>{prefix}{displayed.toLocaleString()}{suffix}</>;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  title, value, change, changeType, icon: Icon, color, animated, prefix, suffix,
}: {
  title: string; value: string | number; change: string; changeType: 'up' | 'down'; icon: React.ElementType; color: string;
  animated?: boolean; prefix?: string; suffix?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {animated && typeof value === 'number'
              ? <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
              : value
            }
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
  console.log('🔍 Dashboard rendering - checking atoms:');
  
  const [leads] = useAtom(leadsAtom);
  const [team] = useAtom(teamAtom);

  console.log('leadsAtom:', leads);
  console.log('teamAtom:', team);
  console.log('leads is array?', Array.isArray(leads));
  console.log('team is array?', Array.isArray(team));

  // Safe defaults
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeTeam = Array.isArray(team) ? team : [];

  console.log('safeLeads length:', safeLeads.length);
  console.log('safeTeam length:', safeTeam.length);

  // Test first filter
  try {
    const testFilter = safeLeads.filter(l => l);
    console.log('✅ Basic filter works:', testFilter.length);
  } catch (e) {
    console.error('❌ Filter failed:', e);
  }

  // ─── Calculations ────────────────────────────────────────
  let totalPipeline = 0;
  try {
    totalPipeline = safeLeads
      .filter((l) => l && !l.status?.startsWith('closed'))
      .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    console.log('✅ totalPipeline calculated:', totalPipeline);
  } catch (e) {
    console.error('❌ totalPipeline error:', e);
  }
  
  let closedRevenue = 0;
  try {
    closedRevenue = safeLeads
      .filter((l) => l && l.status === 'closed-won')
      .reduce((sum, l) => sum + (l.offerAmount || 0), 0);
    console.log('✅ closedRevenue calculated:', closedRevenue);
  } catch (e) {
    console.error('❌ closedRevenue error:', e);
  }
  
  const activeLeads = safeLeads.filter((l) => l && !l.status?.startsWith('closed')).length;
  console.log('activeLeads:', activeLeads);
  
  const closedLeads = safeLeads.filter((l) => l && l.status?.startsWith('closed'));
  console.log('closedLeads length:', closedLeads.length);
  
  const winRate = closedLeads.length > 0
    ? Math.round((safeLeads.filter((l) => l && l.status === 'closed-won').length / closedLeads.length) * 100)
    : 0;
  console.log('winRate:', winRate);
  
  let avgScore = 0;
  try {
    avgScore = safeLeads.length > 0
      ? Math.round(safeLeads.reduce((s, l) => s + calculateDealScore(l || {}), 0) / safeLeads.length) 
      : 0;
    console.log('avgScore:', avgScore);
  } catch (e) {
    console.error('❌ avgScore error:', e);
  }

  // Profit Projection
  const activeDeals = safeLeads.filter(l => l && (l.status === 'negotiating' || l.status === 'qualified'));
  console.log('activeDeals length:', activeDeals.length);
  
  let projectedProfit = 0;
  try {
    projectedProfit = activeDeals.reduce((s, l) => {
      const margin = (l.estimatedValue || 0) - (l.offerAmount || 0);
      const prob = (l.probability || 0) / 100;
      return s + (margin > 0 ? margin * prob : 0);
    }, 0);
    console.log('projectedProfit:', projectedProfit);
  } catch (e) {
    console.error('❌ projectedProfit error:', e);
  }
  
  let negotiatingValue = 0;
  try {
    negotiatingValue = safeLeads
      .filter(l => l && l.status === 'negotiating')
      .reduce((s, l) => s + (l.estimatedValue || 0), 0);
    console.log('negotiatingValue:', negotiatingValue);
  } catch (e) {
    console.error('❌ negotiatingValue error:', e);
  }
  
  const monthlyProjection = Math.round((closedRevenue + projectedProfit * 0.6) / 3);
  console.log('monthlyProjection:', monthlyProjection);

  // Source Stats
  const sourceCounts: Record<string, number> = {};
  const sourceValues: Record<string, number> = {};
  
  try {
    safeLeads.forEach(l => {
      if (!l) return;
      const src = l.source || 'other';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      sourceValues[src] = (sourceValues[src] || 0) + (l.estimatedValue || 0);
    });
    console.log('sourceCounts:', sourceCounts);
  } catch (e) {
    console.error('❌ sourceCounts error:', e);
  }
  
  const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  const maxSourceCount = Math.max(...Object.values(sourceCounts), 1);
  console.log('sortedSources:', sortedSources);

  let recentLeads: any[] = [];
  try {
    recentLeads = [...safeLeads]
      .filter(l => l)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 6);
    console.log('recentLeads length:', recentLeads.length);
  } catch (e) {
    console.error('❌ recentLeads error:', e);
  }

  const pipelineStages = [
    { label: 'New', key: 'new' },
    { label: 'Contacted', key: 'contacted' },
    { label: 'Qualified', key: 'qualified' },
    { label: 'Negotiating', key: 'negotiating' },
    { label: 'Won', key: 'closed-won' },
    { label: 'Lost', key: 'closed-lost' },
  ];

  let topLeads: any[] = [];
  try {
    topLeads = [...safeLeads]
      .filter((l) => l && !l.status?.startsWith('closed'))
      .sort((a, b) => calculateDealScore(b || {}) - calculateDealScore(a || {}))
      .slice(0, 5);
    console.log('topLeads length:', topLeads.length);
  } catch (e) {
    console.error('❌ topLeads error:', e);
  }

  // Streak leaderboard data
  const streakMembers = safeTeam.map(m => ({
    id: m?.id || '',
    name: m?.name || 'Unknown',
    avatar: m?.avatar || 'U',
    loginStreak: 0,
    taskStreak: 0,
  }));
  console.log('streakMembers length:', streakMembers.length);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold text-white">Dashboard Debug</h1>
      <div className="bg-slate-800 p-4 rounded-lg">
        <pre className="text-green-400 text-sm">
          {JSON.stringify({
            safeLeadsLength: safeLeads.length,
            safeTeamLength: safeTeam.length,
            activeLeads,
            closedLeads: closedLeads.length,
            totalPipeline,
            closedRevenue,
            avgScore,
            winRate,
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}