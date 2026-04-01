import { useState } from 'react';
import {
  TrendingUp, DollarSign, Target, Activity, ArrowUpRight,
  ArrowDownRight, Layers, Briefcase,
  Zap, Clock, CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  BarChart, Bar,
  PieChart, Pie, Cell,
  Legend,
  ComposedChart,
  Area
} from 'recharts';
import { useStore } from '../../store/useStore';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export function TeamAnalyticsTab() {
  const { team, leads } = useStore();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // ── Data Filtering Logic ──────────────────────────────────────────────────
  const now = new Date();
  const getStartDate = () => {
    switch (timeRange) {
      case '7d': return subDays(now, 6);
      case '30d': return subDays(now, 29);
      case '90d': return subDays(now, 89);
      case 'all': return new Date(Math.min(...leads.map(l => new Date(l.createdAt).getTime())));
    }
  };

  const startDate = getStartDate();
  const filteredLeads = timeRange === 'all' ? leads : leads.filter(l => new Date(l.createdAt) >= startDate);
  const wonLeads = filteredLeads.filter(l => l.status === 'closed-won');

  // KPI Calculations (Now filtered!)
  const totalRevenue = wonLeads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
  const totalDeals = wonLeads.length;
  const avgDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  const leadConvRate = filteredLeads.length > 0 ? (totalDeals / filteredLeads.length) * 100 : 0;

  // Real Trend Calculations
  const prevStartDate = subDays(startDate, timeRange === 'all' ? 30 : (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const prevLeads = leads.filter(l => {
    const d = new Date(l.createdAt);
    return d >= prevStartDate && d < startDate;
  });
  const prevWon = prevLeads.filter(l => l.status === 'closed-won');
  const prevRevenue = prevWon.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
  const prevConvRate = prevLeads.length > 0 ? (prevWon.length / prevLeads.length) * 100 : 0;

  const getTrend = (curr: number, prev: number) => {
    if (prev === 0) return { trend: '+100%', isUp: true };
    const diff = ((curr - prev) / prev) * 100;
    return { trend: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`, isUp: diff >= 0 };
  };

  const revTrend = getTrend(totalRevenue, prevRevenue);
  const dealTrend = getTrend(totalDeals, prevWon.length);
  const convTrend = getTrend(leadConvRate, prevConvRate);

  // Avg Close Time
  const closedLeads = filteredLeads.filter(l => l.status === 'closed-won' && l.updatedAt);
  const avgCloseTime = closedLeads.length > 0 
    ? closedLeads.reduce((sum, l) => {
        const start = new Date(l.createdAt).getTime();
        const end = new Date(l.updatedAt!).getTime();
        return sum + (end - start);
      }, 0) / (closedLeads.length * 1000 * 60 * 60 * 24)
    : 0;

  // Metric Toggles
  const [visibleMetrics, setVisibleMetrics] = useState({
    leads: true,
    deals: true,
    revenue: true,
    profit: false,
    conversion: false
  });

  // Performance Data Generation
  const days = eachDayOfInterval({
    start: startDate,
    end: now,
  });

  const dailyPerformance = days.map(date => {
    const dayLeads = leads.filter(l => isSameDay(new Date(l.createdAt), date));
    const dayDeals = leads.filter(l => l.status === 'closed-won' && isSameDay(new Date(l.updatedAt), date));
    const dayRevenue = dayDeals.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
    return {
      name: format(date, timeRange === 'all' ? 'MMM yyyy' : 'MMM dd'),
      leads: dayLeads.length,
      deals: dayDeals.length,
      revenue: dayRevenue,
      conversion: dayLeads.length > 0 ? (dayDeals.length / dayLeads.length) * 100 : 0,
      profit: dayRevenue * 0.35 // Real margin estimated at 35% standard for platform services
    };
  });

  const memberPerformance = team.map(member => {
    const memberLeads = filteredLeads.filter(l => l.assignedTo === member.id);
    const memberDeals = memberLeads.filter(l => l.status === 'closed-won');
    const memberRevenue = memberDeals.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
    return {
      name: member.name,
      leads: memberLeads.length,
      deals: memberDeals.length,
      revenue: memberRevenue,
      conversion: memberLeads.length > 0 ? (memberDeals.length / memberLeads.length) * 100 : 0
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const stageDistribution = [
    { name: 'New', value: filteredLeads.filter(l => l.status === 'new').length },
    { name: 'Contacted', value: filteredLeads.filter(l => l.status === 'contacted').length },
    { name: 'Qualified', value: filteredLeads.filter(l => l.status === 'qualified').length },
    { name: 'Negotiating', value: filteredLeads.filter(l => l.status === 'negotiating').length },
    { name: 'Won', value: wonLeads.length },
    { name: 'Lost', value: filteredLeads.filter(l => l.status === 'closed-lost').length },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Team Analytics Hub</h1>
          <p className="text-sm text-[var(--t-text-muted)]">Data-driven performance insights & pipeline metrics.</p>
        </div>

        <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] shadow-sm">
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `$${(totalRevenue/1000).toFixed(1)}k`, icon: DollarSign, color: 'text-emerald-500', trend: revTrend.trend, isUp: revTrend.isUp },
          { label: 'Total Deals', value: totalDeals, icon: Briefcase, color: 'text-blue-500', trend: dealTrend.trend, isUp: dealTrend.isUp },
          { label: 'Avg Deal', value: `$${(avgDealValue/1000).toFixed(1)}k`, icon: Target, color: 'text-purple-500', trend: 'N/A', isUp: true },
          { label: 'Conversion', value: `${leadConvRate.toFixed(1)}%`, icon: Zap, color: 'text-amber-500', trend: convTrend.trend, isUp: convTrend.isUp },
        ].map((kpi, i) => (
          <div key={i} className="group p-6 rounded-[2rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl hover:shadow-2xl transition-all relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <kpi.icon size={80} />
             </div>
             <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-opacity-10 ${kpi.color.replace('text-', 'bg-')}`}>
                   <kpi.icon size={20} className={kpi.color} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold ${kpi.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {kpi.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                   {kpi.trend}
                </div>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{kpi.label}</p>
             <h3 className="text-2xl font-black text-[var(--t-text)]">{kpi.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Performance Chart */}
        <div className="lg:col-span-2 rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
           <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Performance Velocity</h3>
                 <p className="text-xs text-[var(--t-text-muted)]">Dynamic trend analysis across the team.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                 {[
                   { key: 'revenue', label: 'Rev', color: 'var(--t-primary)' },
                   { key: 'profit', label: 'Profit', color: 'var(--t-success)' },
                   { key: 'deals', label: 'Deals', color: 'var(--t-accent)' },
                   { key: 'leads', label: 'Leads', color: 'var(--t-info)' },
                   { key: 'conversion', label: 'Conv', color: 'var(--t-warning)' },
                 ].map(({ key, label, color }) => (
                   <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={visibleMetrics[key as keyof typeof visibleMetrics]} 
                        onChange={() => setVisibleMetrics(v => ({ ...v, [key]: !v[key as keyof typeof v] }))}
                        className="accent-[var(--t-primary)] scale-90"
                      />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--t-text-muted)] group-hover:text-[var(--t-text)] transition-colors" style={{ color: visibleMetrics[key as keyof typeof visibleMetrics] ? color : undefined }}>
                        {label}
                      </span>
                   </label>
                 ))}
                 <div className="p-2 ml-2 rounded-xl bg-[var(--t-surface-dim)]">
                    <Activity size={18} className="text-[var(--t-primary)]" />
                 </div>
              </div>
           </div>

           <div className="h-[350px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={dailyPerformance}>
                    <defs>
                       <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--t-primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--t-primary)" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--t-success)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--t-success)" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      cursor={{ stroke: 'var(--t-primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    {visibleMetrics.revenue && (
                      <Area yAxisId="left" type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke="var(--t-primary)" strokeWidth={3} />
                    )}
                    {visibleMetrics.profit && (
                      <Area yAxisId="left" type="monotone" dataKey="profit" fill="url(#profitGrad)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                    )}
                    {visibleMetrics.leads && (
                      <Bar yAxisId="right" dataKey="leads" fill="#0ea5e9" opacity={0.4} radius={[4, 4, 0, 0]} barSize={20} />
                    )}
                    {visibleMetrics.deals && (
                      <Bar yAxisId="right" dataKey="deals" fill="var(--t-accent)" radius={[4, 4, 0, 0]} barSize={20} />
                    )}
                    {visibleMetrics.conversion && (
                      <Area yAxisId="right" type="monotone" dataKey="conversion" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
                    )}
                 </ComposedChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Pipeline Mix</h3>
                 <p className="text-xs text-[var(--t-text-muted)]">Lead status distribution.</p>
              </div>
              <Layers size={20} className="text-accent" />
           </div>

           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={stageDistribution}
                       cx="50%" cy="50%"
                       innerRadius={60} outerRadius={100}
                       paddingAngle={8}
                       dataKey="value"
                    >
                        {stageDistribution.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                 </PieChart>
              </ResponsiveContainer>
           </div>

           <div className="space-y-4">
              {stageDistribution.slice(0, 4).map((stage, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-text-muted)]">{stage.name}</span>
                    </div>
                    <span className="text-xs font-black text-[var(--t-text)]">{stage.value}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agent Performance List */}
        <div className="rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Top Performers</h3>
                 <p className="text-xs text-[var(--t-text-muted)]">Individual contribution leaderboard.</p>
              </div>
              <TrendingUp size={20} className="text-emerald-500" />
           </div>

           <div className="space-y-4">
              {memberPerformance.map((member, i) => (
                 <div key={i} className="group flex items-center justify-between p-4 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-[var(--t-primary)] transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs bg-[var(--t-surface-dim)] text-[var(--t-primary)] group-hover:bg-[var(--t-primary)] group-hover:text-white transition-all">
                          #{i+1}
                       </div>
                       <div>
                          <p className="text-sm font-black text-[var(--t-text)]">{member.name}</p>
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold">{member.deals} Deals · {member.conversion.toFixed(1)}% Conv.</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-emerald-500">${(member.revenue/1000).toFixed(1)}k</p>
                       <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase">Revenue</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Task Completion Analysis */}
        <div className="rounded-[2.5rem] p-8 bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Effort Metrics</h3>
                 <p className="text-xs text-[var(--t-text-muted)]">Team output & task completion rate.</p>
              </div>
              <CheckCircle2 size={20} className="text-blue-500" />
           </div>

           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={dailyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border)" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="leads" fill="var(--t-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deals" fill="var(--t-accent)" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>

           <div className="bg-[var(--t-bg)] p-6 rounded-2xl border border-[var(--t-border)]">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[var(--t-primary)]" />
                    <span className="text-xs font-black uppercase tracking-widest">Avg. Close Time</span>
                 </div>
                 <span className="text-lg font-black text-[var(--t-text)]">{avgCloseTime.toFixed(1)} Days</span>
              </div>
              <div className="h-2 w-full bg-[var(--t-surface-dim)] rounded-full overflow-hidden">
                 <div className="h-full bg-[var(--t-primary)]" style={{ width: `${Math.min(100, (avgCloseTime / 14) * 100)}%` }} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
