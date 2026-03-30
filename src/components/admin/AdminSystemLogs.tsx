import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  AlertCircle, Info, AlertTriangle, 
  Search, RefreshCw
} from 'lucide-react';
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
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4 h-16 bg-white/5"></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--t-text-muted)] italic text-sm">No logs found matching your criteria.</td>
                </tr>
              ) : filteredLogs.map(log => (
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
  );
}
