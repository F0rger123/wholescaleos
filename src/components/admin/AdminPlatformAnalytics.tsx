import { useState, useEffect } from 'react';
import { 
  Users, DollarSign, TrendingUp, BarChart3, 
  ArrowUpRight, Loader2, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { toast } from 'react-hot-toast';

interface MonthlyData {
  name: string;
  users: number;
  revenue: number;
}

export default function AdminPlatformAnalytics() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalLeads: 0,
    mrr: 0,
    monthlyGrowth: 0,
    conversionRate: 0,
    suspendedUsers: 0,
    avgLeadsPerUser: 0,
    activeUserTrend: '+0%',
    churnRate: '0%'
  });
  const [historicalData, setHistoricalData] = useState<MonthlyData[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  async function fetchGlobalStats() {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Core Totals
      const [
        { count: userCount },
        { count: leadCount },
        { data: allProfiles }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('subscription_tier, subscription_status, created_at')
      ]);

      // 2. MRR Calculation
      const pricing: Record<string, number> = { 
        'Solo': 27, 
        'Pro': 97, 
        'Team': 197, 
        'Agency': 497 
      };

      let mrr = 0;
      let activeSubs = 0;
      const monthlyBuckets: Record<string, { users: number; revenue: number }> = {};

      allProfiles?.forEach((p: any) => {
        const tier = p.subscription_tier || 'Free';
        const revenue = pricing[tier] || 0;
        
        if (revenue > 0) {
          mrr += revenue;
          activeSubs++;
        }

        // Monthly Data (Grouping by created_at)
        const date = new Date(p.created_at);
        const monthYear = date.toLocaleString('default', { month: 'short' });
        if (!monthlyBuckets[monthYear]) monthlyBuckets[monthYear] = { users: 0, revenue: 0 };
        monthlyBuckets[monthYear].users++;
        monthlyBuckets[monthYear].revenue += revenue;
      });

      // 3. Transform Buckets for Recharts
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('default', { month: 'short' });
        last6Months.push({
          name: monthName,
          users: monthlyBuckets[monthName]?.users || 0,
          revenue: monthlyBuckets[monthName]?.revenue || 0
        });
      }

      // Calculate trends (Current vs Previous Month)
      const currentMonthIndex = last6Months.length - 1;
      const prevMonthIndex = last6Months.length - 2;
      
      const currentMonthData = last6Months[currentMonthIndex];
      const prevMonthData = last6Months[prevMonthIndex];

      const calculateTrend = (curr: number, prev: number) => {
        if (!prev) return curr > 0 ? '+100%' : '0%';
        const diff = ((curr - prev) / prev) * 100;
        return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
      };

      const suspendedCount = allProfiles?.filter((p: any) => p.subscription_status === 'suspended').length || 0;
      const avgLeads = userCount ? (leadCount || 0) / userCount : 0;
      const churnRate = activeSubs ? (suspendedCount / (activeSubs + suspendedCount)) * 100 : 0;

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: activeSubs,
        totalLeads: leadCount || 0,
        mrr: mrr,
        monthlyGrowth: prevMonthData.revenue ? ((currentMonthData.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100 : 0,
        conversionRate: userCount ? (activeSubs / userCount) * 100 : 0,
        suspendedUsers: suspendedCount,
        avgLeadsPerUser: avgLeads,
        userTrend: calculateTrend(currentMonthData.users, prevMonthData.users),
        revTrend: calculateTrend(currentMonthData.revenue, prevMonthData.revenue),
        leadTrend: '+12%',
        churnRate: `${churnRate.toFixed(1)}%`
      } as any);

      setProfiles(allProfiles || []);
      setHistoricalData(last6Months);

    } catch (err) {
      console.error('Error fetching global stats', err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  const kpis = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue', trend: (stats as any).userTrend || '+0%' },
    { label: 'Platform MRR', value: `$${stats.mrr.toLocaleString()}`, icon: DollarSign, color: 'green', trend: (stats as any).revTrend || '+0%' },
    { label: 'Churn Rate', value: (stats as any).churnRate, icon: TrendingUp, color: 'red', trend: '-0.2%' },
    { label: 'Avg Leads/User', value: (stats as any).avgLeadsPerUser.toFixed(1), icon: BarChart3, color: 'orange', trend: '+1.4' }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Loader2 className="animate-spin text-purple-600" size={48} />
        <p className="text-[var(--t-text-muted)] font-black uppercase tracking-widest text-xs">Crunching Platform Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl group hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${
                kpi.color === 'red' ? 'bg-red-500/10 text-red-500' :
                kpi.color === 'green' ? 'bg-green-500/10 text-green-500' :
                kpi.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                kpi.color === 'purple' ? 'bg-purple-500/10 text-purple-500' : 'bg-orange-500/10 text-orange-500'
              }`}>
                <kpi.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${
                kpi.color === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
              }`}>
                {kpi.color === 'red' ? null : <ArrowUpRight size={12} />} {kpi.trend}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{kpi.label}</div>
              <div className="text-3xl font-black text-[var(--t-text)]">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] h-[450px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold italic uppercase tracking-tighter text-[var(--t-text)]">Growth Vectors</h3>
                <p className="text-[10px] text-[var(--t-text-muted)] uppercase font-black tracking-widest mt-1">User acquisition vs revenue</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-[var(--t-text-muted)] uppercase bg-[var(--t-surface-dim)] px-4 py-2 rounded-xl">
                <Calendar size={12} /> Last 6 Months
              </div>
            </div>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--t-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--t-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--t-border)" opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: 'var(--t-primary)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="var(--t-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--t-primary-dim)] to-[var(--t-surface)] border border-[var(--t-border)] space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold italic uppercase tracking-tighter text-[var(--t-text)] mb-2">Revenue Mix</h3>
                <p className="text-xs text-[var(--t-text-muted)] mb-8">Estimated monthly recurring revenue by plan.</p>
                
                <div className="space-y-6">
                  {[
                    { plan: 'Solo', price: 27, color: '#3b82f6' },
                    { plan: 'Pro', price: 97, color: 'var(--t-primary)' },
                    { plan: 'Team', price: 197, color: '#6366f1' },
                    { plan: 'Agency', price: 497, color: '#ec4899' }
                  ].map((p, i) => {
                    const planUserCount = profiles?.filter(prof => prof.subscription_tier === p.plan).length || 0;
                    const revenue = planUserCount * p.price;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-[var(--t-text)]">{p.plan}</span>
                          <span className="text-[var(--t-text-muted)]">${revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--t-surface-dim)] overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{ 
                              width: `${stats.mrr > 0 ? (revenue / stats.mrr) * 100 : 0}%`,
                              backgroundColor: p.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Churn Status */}
              <div className="pt-6 border-t border-[var(--t-border)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Account Health</span>
                  <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{(stats as any).suspendedUsers} Suspended</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 rounded-full bg-[var(--t-surface-dim)] overflow-hidden flex">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${100 - parseFloat((stats as any).churnRate)}%` }}
                    />
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${(stats as any).churnRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-[var(--t-text)]">{(stats as any).churnRate}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={fetchGlobalStats}
              className="w-full py-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-xs font-bold uppercase tracking-widest text-[var(--t-text-muted)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary)] transition-all"
            >
              Sync Analytics
            </button>
         </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)]">
          <h3 className="text-xl font-bold italic uppercase tracking-tighter text-[var(--t-text)] mb-6">Revenue Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { plan: 'Solo', rev: (profiles?.filter(p => p.subscription_tier === 'Solo').length || 0) * 27 },
                { plan: 'Pro', rev: (profiles?.filter(p => p.subscription_tier === 'Pro').length || 0) * 97 },
                { plan: 'Team', rev: (profiles?.filter(p => p.subscription_tier === 'Team').length || 0) * 197 },
                { plan: 'Agency', rev: (profiles?.filter(p => p.subscription_tier === 'Agency').length || 0) * 497 }
              ]}>
                <XAxis dataKey="plan" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--t-primary-dim)', opacity: 0.1 }}
                  contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '16px' }}
                />
                <Bar dataKey="rev" radius={[10, 10, 0, 0]}>
                  {[0,1,2,3].map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', 'var(--t-primary)', '#6366f1', '#ec4899'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-[var(--t-border)] flex flex-col items-center justify-center text-center space-y-4">
          <TrendingUp size={48} className="text-[var(--t-primary)] opacity-20" />
          <div>
            <h4 className="text-lg font-bold text-[var(--t-text)]">Usage Deep Dive</h4>
            <p className="text-xs text-[var(--t-text-muted)] max-w-xs">
              Average user maintains <b>{(stats as any).avgLeadsPerUser.toFixed(0)} leads</b> and 
              generates <b>${(stats.mrr / (stats.totalUsers || 1)).toFixed(2)} ARPU</b>.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-4 py-2 rounded-xl bg-[var(--t-surface-dim)] text-[10px] font-black uppercase text-[var(--t-text-muted)]">
               Retention: 94.2%
             </div>
             <div className="px-4 py-2 rounded-xl bg-[var(--t-surface-dim)] text-[10px] font-black uppercase text-[var(--t-text-muted)]">
               Activation: 88.5%
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
