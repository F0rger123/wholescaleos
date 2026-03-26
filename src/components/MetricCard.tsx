/** Normalized StatCard component for dashboard metrics */
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change: string;
  changeType: 'up' | 'down';
  icon: LucideIcon;
  color: string;
  animated?: boolean;
  formatter?: (val: number) => string;
  onClick?: () => void;
}

function AnimatedCounter({ value, formatter }: { value: number; formatter?: (val: number) => string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const durationCount = 1000;
    const increment = value / (durationCount / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <>{formatter ? formatter(displayed) : (displayed || 0).toLocaleString()}</>;
}

export function MetricCard({
  title, value, change, changeType, icon: Icon, color, animated, formatter, onClick,
}: MetricCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[var(--t-surface)] border border-[var(--t-border-subtle)] rounded-2xl p-5 hover:border-[var(--t-border-strong)] transition-all theme-transition ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--t-text-secondary)] font-medium">{title}</p>
          <div className="text-2xl font-bold text-[var(--t-on-surface)] mt-1">
            {animated ? <AnimatedCounter value={value} formatter={formatter} /> : (formatter ? formatter(value) : (value || 0).toLocaleString())}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {changeType === 'up' ? (
          <ArrowUpRight size={14} className="text-[var(--t-success)]" />
        ) : (
          <ArrowDownRight size={14} className="text-[var(--t-error)]" />
        )}
        <span className={`text-xs font-semibold ${changeType === 'up' ? 'text-[var(--t-success)]' : 'text-[var(--t-error)]'}`}>
          {change}
        </span>
        <span className="text-xs text-[var(--t-text-muted)] ml-1">vs last month</span>
      </div>
    </div>
  );
}
