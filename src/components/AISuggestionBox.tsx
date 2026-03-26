import { Bot, Target, ArrowRight, Lightbulb } from 'lucide-react';
import { useStore, calculateDealScore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

export function AISuggestionBox() {
  const { leads, showGoalsForToday } = useStore();
  const navigate = useNavigate();

  const topLead = [...leads]
    .filter(l => !l.status.startsWith('closed'))
    .sort((a, b) => calculateDealScore(b) - calculateDealScore(a))[0];

  const suggestions = [
    { text: "Show hot leads", action: () => navigate('/leads?filter=hot') },
    { text: `Add task to call ${topLead?.name || 'top lead'}`, action: () => navigate('/tasks') },
    { text: "Send follow-up texts to leads not contacted in 3 days", action: () => navigate('/sms') },
    { text: `Schedule showing for ${topLead?.propertyAddress?.split(',')[0] || 'property'}`, action: () => navigate('/tasks') },
    { text: `Update status for ${topLead?.name || 'lead'}`, action: () => navigate('/leads') },
  ];

  const goals = [
    { text: "Call 5 new leads", current: 2, total: 5 },
    { text: "Update 3 past-due tasks", current: 1, total: 3 },
    { text: "Follow up on pending offers", current: 0, total: 2 },
  ];

  return (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="p-5 border-b border-[var(--t-border-subtle)] bg-gradient-to-r from-[var(--t-primary)]/5 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--t-primary)]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[var(--t-primary)]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">AI Assistant</h3>
            <p className="text-[var(--t-text-muted)] text-xs">How can I help you accelerate your deals today?</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={s.action}
              className="px-3 py-2 rounded-xl bg-[var(--t-background)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/40 hover:bg-[var(--t-primary)]/5 text-xs text-[var(--t-text)] transition-all flex items-center gap-2 group"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[var(--t-primary)] opacity-60" />
              <span>{s.text}</span>
              <ArrowRight className="w-3 h-3 text-[var(--t-text-muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {showGoalsForToday && (
        <div className="p-5 bg-[var(--t-background)]/30">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[var(--t-warning)]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-widest">Goals for Today</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {goals.map((g, i) => {
              const progress = (g.current / g.total) * 100;
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--t-text)]">{g.text}</span>
                    <span className="text-[10px] font-mono text-[var(--t-text-muted)]">{g.current}/{g.total}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--t-surface)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--t-primary)] to-[var(--t-primary-active)] transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
