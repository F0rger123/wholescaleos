import React from 'react';
import { X, Sparkles, Brain, Cpu, Zap, Ghost } from 'lucide-react';

interface AIOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigureCloud: () => void;
}

export function AIOnboardingModal({ isOpen, onClose, onConfigureCloud }: AIOnboardingModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div 
        className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 40px rgba(var(--t-primary-rgb), 0.15)' }}
      >
        {/* Animated Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--t-primary)] opacity-10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[var(--t-primary)] opacity-10 blur-3xl rounded-full" />

        <div className="p-6 md:p-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[var(--t-text-muted)] hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--t-primary-dim)] flex items-center justify-center mb-6 ring-4 ring-[var(--t-primary)]/10">
              <Sparkles className="w-8 h-8 text-[var(--t-primary)]" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2 leading-tight">
              Welcome to the Hybrid AI Era
            </h2>
            <p className="text-[var(--t-text-muted)] mb-8 max-w-sm">
              WholeScale OS uses a <strong>Local AI foundation</strong> that respects your privacy. You can start chatting right now, or bring your own cloud keys for premium firepower.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
              <div className="p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-bg)]/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-[var(--t-primary)]" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Local OS Bot</span>
                </div>
                <ul className="text-xs text-[var(--t-text-muted)] space-y-2">
                  <li className="flex items-start gap-2">
                    <Zap className="w-3 h-3 mt-0.5 text-[var(--t-success)]" />
                    Unlimited access
                  </li>
                  <li className="flex items-start gap-2">
                    <Ghost className="w-3 h-3 mt-0.5 text-[var(--t-success)]" />
                    Maximum Privacy
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-[var(--t-border)] bg-[var(--t-bg)]/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[var(--t-primary)]" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Cloud Premium</span>
                </div>
                <ul className="text-xs text-[var(--t-text-muted)] space-y-2">
                  <li className="flex items-start gap-2">
                    <Brain className="w-3 h-3 mt-0.5 text-[var(--t-primary)]" />
                    Advanced Analysis
                  </li>
                  <li className="flex items-start gap-2">
                    <Cpu className="w-3 h-3 mt-0.5 text-[var(--t-primary)]" />
                    Higher Reasoning
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-[var(--t-surface)] border border-[var(--t-border)] hover:border-[var(--t-primary)] rounded-xl text-white font-bold transition-all"
              >
                Chat Privately Now
              </button>
              <button
                onClick={onConfigureCloud}
                className="flex-1 py-3 px-6 bg-[var(--t-primary)] hover:brightness-110 rounded-xl text-white font-bold shadow-lg shadow-[var(--t-primary)]/20 transition-all"
              >
                Setup Cloud Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
