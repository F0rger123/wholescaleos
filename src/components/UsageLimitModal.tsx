import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { MembershipTier } from '../lib/usage-tracking';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: MembershipTier;
  limit: number;
}

export const UsageLimitModal: React.FC<UsageLimitModalProps> = ({ 
  isOpen, 
  onClose, 
  tier, 
  limit 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--t-bg)] border border-[var(--t-border)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/20"
          >
            {/* Header / Glow */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[var(--t-primary)]/20 to-transparent -z-10" />
            
            <div className="p-8 pt-10 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-[var(--t-primary-dim)] border border-[var(--t-primary)] rounded-3xl flex items-center justify-center text-[var(--t-primary)] mb-4 animate-bounce">
                <Zap size={40} fill="currentColor" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                  Limit <span className="text-[var(--t-primary)]">Reached</span>
                </h2>
                <p className="text-[var(--t-text-muted)] text-sm px-4">
                  You've hit your daily message limit of <span className="text-white font-bold">{limit}</span> messages for your <span className="text-[var(--t-primary)] font-black uppercase italic tracking-tighter">{tier}</span> tier.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Clock size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Next Reset</span>
                  </div>
                  <p className="text-xs text-[var(--t-text-muted)] font-bold uppercase tracking-tight">Midnight UTC (Approx 4h)</p>
                </div>
                <div className="p-4 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <Zap size={16} fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Instant Upgrade</span>
                  </div>
                  <p className="text-xs text-[var(--t-text-muted)] font-bold uppercase tracking-tight">Get 500+ messages now</p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full py-4 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/30"
                >
                  Upgrade Membership
                  <ArrowRight size={20} />
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text-muted)] rounded-[1.5rem] font-bold text-sm hover:text-[var(--t-text)] hover:bg-[var(--t-surface-hover)] transition-all"
                >
                  Maybe later
                </button>
              </div>

              <div className="pt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-[0.2em]">
                <ShieldCheck size={12} className="text-indigo-500" />
                Secure Billing via Stripe
              </div>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-xl text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)] transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
