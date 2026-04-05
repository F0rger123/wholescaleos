import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { 
  Zap, Mail, MessageSquare, 
  Clock, Database, Bot,
  Webhook, Shield, ArrowRight,
  Check, Power
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

export const AutomationNode = memo(({ id, data }: any) => {
  const Icon = icons[data.type] || Zap;
  const colorClass = colors[data.type] || 'text-[var(--t-text)] bg-[var(--t-surface-hover)] border-[var(--t-border)]';
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [label, setLabel] = useState(data.label || '');
  const [desc, setDesc] = useState(data.description || '');
  const [enabled, setEnabled] = useState(data.enabled !== false);
  const { setNodes } = useReactFlow();

  const commitChanges = useCallback((newLabel?: string, newDesc?: string, newEnabled?: boolean) => {
    setNodes(nds => nds.map(n => n.id === id ? {
      ...n, data: { 
        ...n.data, 
        label: newLabel ?? label, 
        description: newDesc ?? desc,
        enabled: newEnabled ?? enabled
      }
    } : n));
  }, [id, label, desc, enabled, setNodes]);

  return (
    <div className={`group relative min-w-[200px] bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl shadow-xl p-4 transition-all hover:border-[var(--t-primary)] hover:shadow-[var(--t-primary-dim)] ${!enabled ? 'opacity-50' : ''}`}>
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
          {editingLabel ? (
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => { setEditingLabel(false); commitChanges(label); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setEditingLabel(false); commitChanges(label); } }}
              className="text-sm font-bold text-[var(--t-text)] bg-[var(--t-surface-hover)] border border-[var(--t-primary)]/50 rounded px-1 py-0.5 w-full outline-none focus:ring-1 focus:ring-[var(--t-primary)]"
            />
          ) : (
            <h4 
              className="text-sm font-bold text-[var(--t-text)] truncate cursor-text hover:text-[var(--t-primary)] transition-colors" 
              onDoubleClick={() => setEditingLabel(true)}
              title="Double-click to edit"
            >
              {data.label}
            </h4>
          )}
        </div>
      </div>

      {editingDesc ? (
        <textarea
          autoFocus
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { setEditingDesc(false); commitChanges(undefined, desc); }}
          className="mt-3 text-[10px] text-[var(--t-text)] bg-[var(--t-surface-hover)] border border-[var(--t-primary)]/50 rounded px-1.5 py-1 w-full outline-none resize-none leading-relaxed focus:ring-1 focus:ring-[var(--t-primary)]"
          rows={2}
        />
      ) : (
        data.description && (
          <p 
            className="mt-3 text-[10px] text-[var(--t-text-muted)] leading-relaxed cursor-text hover:text-[var(--t-text)] transition-colors"
            onDoubleClick={() => setEditingDesc(true)}
            title="Double-click to edit"
          >
            {data.description}
          </p>
        )
      )}

      <div className="mt-4 pt-3 border-t border-[var(--t-border)] flex items-center justify-between">
        <button 
          onClick={() => { const next = !enabled; setEnabled(next); commitChanges(undefined, undefined, next); }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
            enabled 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
          title={enabled ? 'Click to disable' : 'Click to enable'}
        >
          {enabled ? <Check size={10} /> : <Power size={10} />}
          {enabled ? 'Active' : 'Off'}
        </button>
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
