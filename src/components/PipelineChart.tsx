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

const COLORS: Record<string, string> = {
  new: 'var(--t-info)',
  contacted: 'var(--t-warning)',
  qualified: 'var(--t-accent)',
  negotiating: 'var(--t-warning)',
  'closed-won': 'var(--t-success)',
  'closed-lost': 'var(--t-error)',
};

export function PipelineChart() {
  const { leads } = useStore();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [timeRange, setTimeRange] = useState<ChartTimeRange>('30d');

  const filteredLeads = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return leads.filter(l => new Date(l.createdAt) >= cutoff);
  }, [leads, timeRange]);

  const data = useMemo(() => {
    const counts: Record<string, number> = {
      new: 0, contacted: 0, qualified: 0, negotiating: 0, 'closed-won': 0, 'closed-lost': 0,
    };
    filteredLeads.forEach(l => {
      if (counts[l.status] !== undefined) counts[l.status]++;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS] || key,
      value,
      key
    }));
  }, [filteredLeads]);

  // Conversion rate
  const conversionRate = useMemo(() => {
    const closed = filteredLeads.filter(l => l.status.startsWith('closed'));
    if (closed.length === 0) return 0;
    const won = closed.filter(l => l.status === 'closed-won').length;
    return Math.round((won / closed.length) * 100);
  }, [filteredLeads]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-xs font-black text-white uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm font-bold text-[var(--t-primary)]">
            {payload[0].value} {payload[0].value === 1 ? 'Lead' : 'Leads'}
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

  const renderChart = () => {
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
                <stop offset="5%" stopColor="var(--t-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--t-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="var(--t-primary)" strokeWidth={3} fill="url(#areaGradient)" animationDuration={1500} />
          </AreaChart>
        );
      default:
        return (
          <BarChart {...commonProps} barSize={40}>
            {gridEl}{xAxisEl}{yAxisEl}{tooltipEl}
            <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.key] || 'var(--t-primary)'} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
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
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
