import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Zap, Mail, MessageSquare, 
  Clock, Database, Bot,
  Webhook, Shield, ArrowRight
} from 'lucide-react';

const icons: Record<string, any> = {
  trigger: Webhook,
  action: Mail,
  sms: MessageSquare,
  delay: Clock,
  ai: Bot,
  database: Database,
  condition: Shield
};

const colors: Record<string, string> = {
  trigger: 'text-green-500 bg-green-500/10 border-green-500/20',
  action: 'text-[var(--t-primary)] bg-[var(--t-primary-dim)] border-[var(--t-primary)]/20',
  sms: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  delay: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  ai: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  database: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  condition: 'text-orange-500 bg-orange-500/10 border-orange-500/20'
};

export const AutomationNode = memo(({ data }: any) => {
  const Icon = icons[data.type] || Zap;
  const colorClass = colors[data.type] || 'text-[var(--t-text)] bg-[var(--t-surface-hover)] border-[var(--t-border)]';

  return (
    <div className="group relative min-w-[200px] bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-xl p-4 transition-all hover:border-[var(--t-primary)] hover:shadow-[var(--t-primary-dim)]">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-[var(--t-primary)] border-2 border-[var(--t-bg)]" 
      />
      
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">{data.type}</p>
          <h4 className="text-sm font-bold text-[var(--t-text)] truncate">{data.label}</h4>
        </div>
      </div>

      {data.description && (
        <p className="mt-3 text-[10px] text-[var(--t-text-muted)] leading-relaxed">
          {data.description}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--t-border)] flex items-center justify-between">
        <div className="flex -space-x-1">
          <div className="w-4 h-4 rounded-full bg-[var(--t-surface-hover)] border border-[var(--t-border)]" />
          <div className="w-4 h-4 rounded-full bg-[var(--t-surface-hover)] border border-[var(--t-border)]" />
        </div>
        <ArrowRight size={14} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)] transition-colors" />
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-[var(--t-primary)] border-2 border-[var(--t-bg)]" 
      />
    </div>
  );
});
