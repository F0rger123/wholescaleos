/** Normalized StatCard component for dashboard metrics */
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change: string;
  changeType: 'up' | 'down';
  icon: LucideIcon;
  animated?: boolean;
  formatter?: (val: number) => string;
  onClick?: () => void;
}

function AnimatedCounter({ value, formatter }: { value: number; formatter?: (val: number) => string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayed(0);
      return;
    }
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
  title, value, change, changeType, icon: Icon, animated, formatter, onClick,
}: MetricCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`astral-glass rounded-2xl p-6 hover-lift hover-glow transition-all duration-500 border border-[var(--t-border-subtle)] ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--t-text-secondary)] font-medium">{title}</p>
          <div className="text-3xl font-black text-white mt-1 italic tracking-tighter">
            {animated ? (
              <AnimatedCounter value={value} formatter={formatter} />
            ) : (
              formatter ? formatter(value ?? 0) : (value ?? 0).toLocaleString()
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl`} style={{ 
          background: 'var(--t-accent-gradient)',
          color: 'var(--t-on-accent, #ffffff)',
          opacity: 0.9
        }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {changeType === 'up' ? (
          <ArrowUpRight size={14} className="text-[var(--t-success)]" />
        ) : (
          <ArrowDownRight size={14} className="text-[var(--t-error)]" />
        )}
        <span className={`text-[10px] font-black uppercase tracking-widest ${changeType === 'up' ? 'text-[var(--t-success)]' : 'text-[var(--t-error)]'}`}>
          {change}
        </span>
        <span className="text-[10px] text-[#6d758c] font-bold uppercase tracking-widest ml-1">vs last month</span>
      </div>
    </div>
  );
}
