import { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useStore, STATUS_LABELS } from '../store/useStore';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

type ChartType = 'bar' | 'line' | 'area';
type ChartTimeRange = '7d' | '30d' | '90d' | '1y';
type MetricType = 'leads' | 'deals' | 'revenue' | 'conversion';

const COLORS: Record<string, string> = {
  new: 'var(--t-primary)',
  contacted: 'var(--t-secondary)',
  qualified: 'var(--t-accent)',
  negotiating: '#ec4899', 
  'closed-won': 'var(--t-success)',
  'closed-lost': 'var(--t-error)',
};

export function PipelineChart() {
  const { leads } = useStore();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [timeRange, setTimeRange] = useState<ChartTimeRange>('30d');
  const [metric, setMetric] = useState<MetricType>('leads');

  const filteredLeads = useMemo(() => {
    if (!leads || !Array.isArray(leads)) return [];
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return leads.filter(l => l && l.createdAt && new Date(l.createdAt) >= cutoff);
  }, [leads, timeRange]);

  const data = useMemo(() => {
    const statuses = ['new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost'];
    const counts: Record<string, number> = {};
    statuses.forEach(s => counts[s] = 0);

    filteredLeads.forEach(l => {
      if (!l) return;
      const status = String(l.status);
      if (counts[status] !== undefined) {
        if (metric === 'revenue') {
          counts[status] += (l.estimatedValue || 0);
        } else if (metric === 'deals') {
          if (['qualified', 'negotiating', 'closed-won'].includes(status)) {
            counts[status]++;
          }
        } else if (metric === 'conversion') {
          // This is a bit tricky for conversion rate per status, 
          // usually it's % of previous status. 
          // For now let's just show count and update tooltip.
          counts[l.status]++;
        } else {
          counts[l.status]++;
        }
      }
    });

    return statuses.map(key => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS] || key,
      value: counts[key],
      key
    }));
  }, [filteredLeads, metric]);

  // Conversion rate
  const conversionRate = useMemo(() => {
    const closed = filteredLeads.filter(l => l && String(l.status).startsWith('closed'));
    if (closed.length === 0) return 0;
    const won = closed.filter(l => l && String(l.status) === 'closed-won').length;
    return Math.round((won / closed.length) * 100);
  }, [filteredLeads]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      let displayVal = (val || 0).toLocaleString();
      if (metric === 'revenue') displayVal = `$${(val || 0).toLocaleString()}`;
      else if (metric === 'conversion') {
        const total = filteredLeads.length;
        const percent = total > 0 ? Math.round((val / total) * 100) : 0;
        displayVal = `${val} (${percent}%)`;
      }

      return (
        <div className="astral-glass border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-3xl">
          <p className="text-[10px] font-black text-[#6d758c] uppercase tracking-[0.2em] mb-2">{label}</p>
          <p className="text-xl font-black text-white italic">
            {displayVal} <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 opacity-80">{metric === 'revenue' ? '' : val === 1 ? (metric === 'leads' ? 'Lead' : 'Deal') : (metric === 'leads' ? 'Leads' : 'Deals')}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const chartTypeButtons: { type: ChartType; icon: any; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: 'Bar' },
    { type: 'line', icon: TrendingUp, label: 'Line' },
    { type: 'area', icon: Layers, label: 'Area' },
  ];

  const timeButtons: { range: ChartTimeRange; label: string }[] = [
    { range: '7d', label: '7D' },
    { range: '30d', label: '30D' },
    { range: '90d', label: '90D' },
    { range: '1y', label: '1Y' },
  ];

  // Chart render helper
  const renderChart = () => {
    if (!leads || leads.length === 0) return null;

    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: -20, bottom: 0 },
    };

    const gridEl = (
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--t-border-subtle)" opacity={0.5} />
    );
    const xAxisEl = (
      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 700 }} dy={10} />
    );
    const yAxisEl = (
      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--t-text-muted)', fontSize: 10 }} />
    );
    const tooltipEl = (
      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-surface-dim)', radius: 8 }} />
    );

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {gridEl}{xAxisEl}{yAxisEl}{tooltipEl}
            <Line type="monotone" dataKey="value" stroke="var(--t-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--t-primary)' }} activeDot={{ r: 7 }} animationDuration={1500} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gridEl}{xAxisEl}{yAxisEl}{tooltipEl}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--t-primary)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--t-secondary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="var(--t-primary)" strokeWidth={4} fill="url(#areaGradient)" animationDuration={1500} />
          </AreaChart>
        );
      default:
        return (
          <BarChart {...commonProps} barSize={40}>
            {gridEl}{xAxisEl}{yAxisEl}{tooltipEl}
            <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.key === 'closed-won' || entry.key === 'closed-lost' ? COLORS[entry.key] : `url(#accentGradient)`} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  if (!leads || leads.length === 0) {
    return (
      <div className="h-[300px] w-full astral-glass rounded-[2rem] border border-dashed border-indigo-500/20 flex flex-col items-center justify-center p-8 text-center group">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
          <Layers className="text-indigo-400 w-8 h-8" />
        </div>
        <p className="text-lg font-black text-white mb-2 uppercase italic">No Pipeline Infrastructure</p>
        <p className="text-[10px] text-[#6d758c] uppercase tracking-[0.2em] font-black">Lead metrics will populate here upon ingestion.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex bg-[var(--t-surface-dim)] rounded-lg p-0.5 border border-[var(--t-border-subtle)] overflow-x-auto no-scrollbar">
          {(['leads', 'deals', 'revenue', 'conversion'] as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                metric === m
                  ? 'bg-[var(--t-primary)] text-white shadow-lg'
                  : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex bg-[var(--t-surface-dim)] rounded-lg p-0.5 border border-[var(--t-border-subtle)]">
          {chartTypeButtons.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                chartType === type
                  ? 'bg-[var(--t-primary)] text-white shadow-lg'
                  : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Conversion Rate Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--t-success)]/10 rounded-lg border border-[var(--t-success)]/20">
            <TrendingUp size={12} className="text-[var(--t-success)]" />
            <span className="text-[10px] font-bold text-[var(--t-success)] uppercase tracking-wider">
              {conversionRate}% Conversion
            </span>
          </div>

          <div className="flex bg-[var(--t-surface-dim)] rounded-lg p-0.5 border border-[var(--t-border-subtle)]">
            {timeButtons.map(({ range, label }) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  timeRange === range
                    ? 'bg-[var(--t-primary)] text-white shadow-lg'
                    : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
