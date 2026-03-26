import { Bot, TrendingUp, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { useStore, calculateDealScore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export function AIDashboardSummary() {
  const { leads, tasks, currentUser } = useStore();
  const navigate = useNavigate();

  const hotLeads = leads.filter(l => calculateDealScore(l) >= 80);
  const dueTasks = tasks.filter(t => t.status !== 'done' && new Date(t.dueDate) <= new Date());
  
  // Calculate pipeline momentum (leads added in last 7 days)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const newLeads = leads.filter(l => new Date(l.createdAt) > lastWeek).length;

  return (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-5 shadow-sm relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--t-primary)] opacity-[0.03] blur-3xl group-hover:opacity-[0.05] transition-opacity" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--t-primary-dim)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[var(--t-primary)]" />
          </div>
          <div>
            <h3 className="text-white font-bold leading-none mb-1">AI Morning Catch-up</h3>
            <p className="text-[var(--t-text-muted)] text-xs">Good morning, {currentUser?.name?.split(' ')[0] || 'Partner'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--t-success-dim)] border border-[var(--t-success)]/20">
          <Zap className="w-3 h-3 text-[var(--t-success)]" />
          <span className="text-[10px] font-bold text-[var(--t-success)] uppercase tracking-wider">Smart Assistant Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-[var(--t-background)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[var(--t-primary)]" />
            <span className="text-xs font-medium text-[var(--t-text-muted)]">Hot Leads</span>
          </div>
          <div className="text-2xl font-bold text-white">{hotLeads.length}</div>
          <p className="text-[10px] text-[var(--t-text-muted)] mt-1">Ready for closing</p>
        </div>

        <div className="p-3 rounded-xl bg-[var(--t-background)] border border-[var(--t-border)] hover:border-[var(--t-warning)]/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-[var(--t-warning)]" />
            <span className="text-xs font-medium text-[var(--t-text-muted)]">Tasks Due</span>
          </div>
          <div className="text-2xl font-bold text-white">{dueTasks.length}</div>
          <p className="text-[10px] text-[var(--t-text-muted)] mt-1">Require attention</p>
        </div>

        <div className="p-3 rounded-xl bg-[var(--t-background)] border border-[var(--t-border)] hover:border-[var(--t-success)]/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[var(--t-success)]" />
            <span className="text-xs font-medium text-[var(--t-text-muted)]">Momentum</span>
          </div>
          <div className="text-2xl font-bold text-white">+{newLeads}</div>
          <p className="text-[10px] text-[var(--t-text-muted)] mt-1">New leads this week</p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest pl-1">Suggested Next Actions</h4>
        {hotLeads.length > 0 ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[var(--t-primary)]/10 to-transparent border border-[var(--t-primary)]/20 group/item cursor-pointer"
            onClick={() => navigate('/leads')}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--t-primary)]/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[var(--t-primary)]" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Follow up with {hotLeads[0].name}</p>
                <p className="text-[10px] text-[var(--t-text-muted)]">Deal Score: {calculateDealScore(hotLeads[0])}/100</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--t-text-muted)] group-hover/item:text-[var(--t-primary)] transform group-hover/item:translate-x-1 transition-all" />
          </div>
        ) : (
          <div className="text-center py-4 bg-[var(--t-background)] rounded-xl border border-dashed border-[var(--t-border)]">
            <p className="text-xs text-[var(--t-text-muted)]">No urgent actions right now. Great job!</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-widget'))}
        className="w-full mt-6 py-2.5 rounded-xl bg-[var(--t-primary)] hover:bg-[var(--t-primary-active)] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--t-primary)]/20"
      >
        <Bot size={14} />
        Open Full Assistant
      </button>
    </div>
  );
}
