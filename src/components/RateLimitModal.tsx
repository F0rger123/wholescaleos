import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RateLimitModal({ isOpen, onClose }: RateLimitModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div 
        className="w-full max-w-md border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
      >
        <div className="p-6 text-center border-b" style={{ borderColor: 'var(--t-border)' }}>
          <div className="w-16 h-16 rounded-2xl bg-[var(--t-warning)]/10 flex items-center justify-center mx-auto mb-4 border border-[var(--t-warning)]/20 text-[var(--t-warning)]">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">API Rate Limit Reached</h2>
          <p className="text-sm text-[var(--t-text-muted)]">
            The AI provider has temporarily limited requests. Please try again in a few minutes or upgrade for higher limits.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, var(--t-primary), #a855f7)', color: 'white' }}
          >
            <div className="text-left">
              <p className="text-sm font-bold text-white">Upgrade to OS Pro</p>
              <p className="text-xs text-white/80 mt-1">Get higher rate limits and priority access</p>
            </div>
          </button>
        </div>

        <div className="p-4 border-t flex justify-center" style={{ borderColor: 'var(--t-border)', background: 'var(--t-surface-hover)' }}>
          <button onClick={onClose} className="text-sm font-bold text-[var(--t-text-muted)] hover:text-[var(--t-text)] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
