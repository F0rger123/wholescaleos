import { AlertTriangle, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  onSwitchModel: (modelId: string) => void;
}

export function RateLimitModal({ isOpen, onClose, currentModel, onSwitchModel }: RateLimitModalProps) {
  const { aiUsage } = useStore();

  if (!isOpen) return null;

  const models = [
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', desc: 'Fast & Efficient', icon: <Zap size={16} /> },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: <Sparkles size={16} /> },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Advanced Reasoning', icon: <Sparkles size={16} className="text-[var(--t-warning)]" /> },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', icon: <Zap size={16} /> },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', icon: <Sparkles size={16} /> }
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
      >
        {/* Header */}
        <div className="p-6 text-center border-b" style={{ borderColor: 'var(--t-border)' }}>
          <div className="w-16 h-16 rounded-2xl bg-[var(--t-error)]/10 flex items-center justify-center mx-auto mb-4 border border-[var(--t-error)]/20 text-[var(--t-error)]">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Daily Quota Reached</h2>
          <p className="text-sm text-[var(--t-text-muted)]">
            You've hit the daily request limit for <strong>{currentModel}</strong>.
            Switch to another model to continue your conversation.
          </p>
        </div>

        {/* Model List */}
        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
          <p className="text-[10px] uppercase font-bold text-[var(--t-text-muted)] ml-2 mb-2 tracking-widest">Available Models</p>
          {models.map((m) => {
            const usage = aiUsage[m.id] || { used: 0, limit: m.id.includes('pro') ? 10 : 20 };
            const isFull = usage.used >= usage.limit;
            const isCurrent = currentModel === m.id;

            return (
              <button
                key={m.id}
                onClick={() => !isFull && onSwitchModel(m.id)}
                disabled={isFull || isCurrent}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                  isFull ? 'opacity-50 grayscale cursor-not-allowed' : 
                  isCurrent ? 'border-[var(--t-primary)] bg-[var(--t-primary-dim)] cursor-default' :
                  'hover:bg-[var(--t-surface-hover)] hover:border-[var(--t-border)]/80'
                }`}
                style={{ 
                  background: isCurrent ? 'var(--t-primary-dim)' : 'var(--t-background)',
                  borderColor: isCurrent ? 'var(--t-primary)' : 'var(--t-border)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    isCurrent ? 'bg-[var(--t-primary)] text-white' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)]'
                  }`}>
                    {m.icon}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-[var(--t-text)]'}`}>{m.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1 w-20 bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${isFull ? 'bg-[var(--t-error)]' : 'bg-[var(--t-primary)]'}`}
                          style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>
                        {usage.used}/{usage.limit}
                      </span>
                    </div>
                  </div>
                </div>
                {!isFull && !isCurrent && <ChevronRight size={16} className="text-[var(--t-text-muted)] group-hover:translate-x-1 transition-transform" />}
                {isCurrent && <span className="text-[10px] font-bold text-[var(--t-primary)] uppercase tracking-wider">Active</span>}
                {isFull && <span className="text-[10px] font-bold text-[var(--t-error)] uppercase tracking-wider">Full</span>}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface-hover)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border text-sm font-bold transition-all hover:bg-black/5"
            style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
          >
            Close
          </button>
          <a 
            href="/settings/ai"
            className="flex-1 py-3 rounded-2xl text-white text-sm font-bold text-center transition-all hover:shadow-lg hover:shadow-[var(--t-primary-dim)]"
            style={{ background: 'var(--t-primary)' }}
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    </div>
  );
}
