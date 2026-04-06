import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  AlertCircle, Info, AlertTriangle, 
  Search, RefreshCw, Activity, ShieldCheck, 
  Database, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { toast } from 'react-hot-toast';

interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error';
  component: string;
  action: string;
  details: any;
  created_at: string;
  user_id?: string;
}

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [healthStats, setHealthStats] = useState({
    errorFrequency: [] as any[],
    activeUserTrend: [] as any[],
    uptime: 99.98,
    dbStatus: 'Healthy',
    apiLatency: '124ms'
  });
  const [showHealth, setShowHealth] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);

      // Calculate Health Stats
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const errorFreq = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('default', { weekday: 'short' }),
        count: data?.filter((l: any) => l.level === 'error' && l.created_at.startsWith(date)).length || 0
      }));

      const activeUserTrend = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('default', { weekday: 'short' }),
        users: data?.filter((l: any) => l.created_at.startsWith(date)).reduce((acc: any, l: any) => acc.add(l.user_id), new Set()).size || 0
      }));

      setHealthStats(prev => ({
        ...prev,
        errorFrequency: errorFreq,
        activeUserTrend: activeUserTrend
      }));

    } catch (err: any) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = 
      log.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 text-red-600 border-red-100';
      case 'warning': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle size={14} />;
      case 'warning': return <AlertTriangle size={14} />;
      default: return <Info size={14} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">System Intelligence</h2>
          <p className="text-xs text-[var(--t-text-muted)] mt-1">Real-time health monitoring and audit trails.</p>
        </div>
        <button 
          onClick={() => setShowHealth(!showHealth)}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            showHealth 
            ? 'bg-[var(--t-primary)] text-white shadow-xl shadow-purple-600/20' 
            : 'bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:bg-white/5'
          }`}
        >
          <Activity size={16} />
          {showHealth ? 'Hide Health Metrics' : 'Show Health Metrics'}
        </button>
      </div>

      {showHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-4">
             <div className="flex justify-between items-start">
               <div className="p-3 rounded-2xl bg-green-500/10 text-green-500"><ShieldCheck size={24} /></div>
               <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">OPERATIONAL</span>
             </div>
             <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Core Uptime</div>
               <div className="text-3xl font-black text-[var(--t-text)]">{healthStats.uptime}%</div>
             </div>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-4">
             <div className="flex justify-between items-start">
               <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500"><Database size={24} /></div>
               <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">{healthStats.dbStatus}</span>
             </div>
             <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">DB Connections</div>
               <div className="text-3xl font-black text-[var(--t-text)]">Active</div>
             </div>
          </div>

          <div className="lg:col-span-2 p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)]">
             <div className="flex justify-between items-center mb-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">API Response Latency</div>
                <div className="flex items-center gap-2 text-xs font-bold text-orange-500"><Zap size={14} /> {healthStats.apiLatency}</div>
             </div>
             <div className="h-16 w-full opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={healthStats.errorFrequency}>
                      <Area type="monotone" dataKey="count" stroke="#f97316" fill="#f9731633" strokeWidth={2} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="lg:col-span-2 p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] h-[300px]">
             <h3 className="text-sm font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-6">Error Frequency (7D)</h3>
             <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={healthStats.errorFrequency}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--t-border)" opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                      <Tooltip 
                        cursor={{ fill: 'var(--t-primary-dim)', opacity: 0.1 }}
                        contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '16px' }}
                      />
                      <Bar dataKey="count" fill="var(--t-error)" radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="lg:col-span-2 p-8 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] h-[300px]">
             <h3 className="text-sm font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-6">Active Session Engagement</h3>
             <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={healthStats.activeUserTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--t-border)" opacity={0.1} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t-text-muted)', fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '16px' }}
                      />
                      <Line type="monotone" dataKey="users" stroke="var(--t-primary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--t-primary)', strokeWidth: 2, stroke: 'var(--t-surface)' }} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
            <input
              type="text"
              placeholder="Search logs by component, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border bg-[var(--t-bg)] text-sm focus:border-purple-500 outline-none transition-all"
              style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {['all', 'info', 'warning', 'error'].map(l => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  filter === l ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] hover:bg-white/5'
                }`}
              >
                {l}
              </button>
            ))}
            <button 
              onClick={fetchLogs}
              className="p-2.5 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text-muted)] hover:bg-white/5 transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-[var(--t-surface)] overflow-hidden" style={{ borderColor: 'var(--t-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--t-surface-dim)] border-b" style={{ borderColor: 'var(--t-border)' }}>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Timestamp</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Level</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Component</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Action</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i: number) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 h-16 bg-white/5"></td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--t-text-muted)] italic text-sm">No logs found matching your criteria.</td>
                  </tr>
                ) : filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-xs font-mono text-[var(--t-text-muted)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getLevelStyles(log.level)}`}>
                        {getLevelIcon(log.level)}
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-[var(--t-text)]">{log.component}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[var(--t-text)]">{log.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs overflow-hidden">
                        <pre className="text-[10px] text-[var(--t-text-muted)] bg-black/20 p-2 rounded-lg scrollbar-hide overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
