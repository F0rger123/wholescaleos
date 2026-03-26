import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useStore, STATUS_LABELS } from '../store/useStore';

const COLORS = {
  new: 'var(--t-info)',
  contacted: 'var(--t-warning)',
  qualified: 'var(--t-accent)',
  negotiating: 'var(--t-warning)',
  'closed-won': 'var(--t-success)',
  'closed-lost': 'var(--t-error)',
};

export function PipelineChart() {
  const { leads, timeframe } = useStore();

  const data = useMemo(() => {
    const filtered = leads.filter(l => {
      if (timeframe === 'all') return true;
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return new Date(l.createdAt) >= cutoff;
    });

    const counts: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      negotiating: 0,
      'closed-won': 0,
      'closed-lost': 0,
    };

    filtered.forEach(l => {
      if (counts[l.status] !== undefined) {
        counts[l.status]++;
      }
    });

    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS] || key,
      value,
      key
    }));
  }, [leads, timeframe]);

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

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barSize={40}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="var(--t-border-subtle)" 
            opacity={0.5}
          />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--t-text-muted)', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--t-text-muted)', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--t-surface-dim)', radius: 8 }} />
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.key as keyof typeof COLORS] || 'var(--t-primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
