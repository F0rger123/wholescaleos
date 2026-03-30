import { useState, useEffect } from 'react';
import { 
  Users, DollarSign, TrendingUp, BarChart3, 
  ArrowUpRight, Loader2, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
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
    conversionRate: 0
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
        { data: profiles }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('subscription_tier, created_at')
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

      profiles?.forEach(p => {
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

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: activeSubs,
        totalLeads: leadCount || 0,
        mrr: mrr,
        monthlyGrowth: prevMonthData.revenue ? ((currentMonthData.revenue - prevMonthData.revenue) / prevMonthData.revenue) * 100 : 0,
        conversionRate: userCount ? (activeSubs / userCount) * 100 : 0,
        userTrend: calculateTrend(currentMonthData.users, prevMonthData.users),
        revTrend: calculateTrend(currentMonthData.revenue, prevMonthData.revenue),
        leadTrend: '+12%' // Placeholder for leads until we have monthly lead data
      } as any);

      setProfiles(profiles || []);
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
    { label: 'Conv. Rate', value: `${stats.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'purple', trend: '+0.4%' },
    { label: 'Total Leads', value: stats.totalLeads.toLocaleString(), icon: BarChart3, color: 'orange', trend: (stats as any).leadTrend || '+0%' }
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
              <div className={`p-3 rounded-2xl bg-${kpi.color}-500/10 text-${kpi.color}-500`}>
                <kpi.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                <ArrowUpRight size={12} /> {kpi.trend}
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
              <h3 className="text-xl font-bold italic uppercase tracking-tighter text-[var(--t-text)]">User Acquisition</h3>
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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--t-border)" opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: 'var(--t-primary)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="var(--t-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--t-primary-dim)] to-[var(--t-surface)] border border-[var(--t-border)] space-y-6 flex flex-col justify-between">
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
            
            <button 
              onClick={fetchGlobalStats}
              className="w-full py-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] text-xs font-bold uppercase tracking-widest text-[var(--t-text-muted)] hover:bg-[var(--t-primary-dim)] hover:text-[var(--t-primary)] transition-all"
            >
              Sync Analytics
            </button>
         </div>
      </div>
    </div>
  );
}
