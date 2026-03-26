import { useState, useEffect, useMemo } from 'react';
import { useStore, calculateDealScore } from '../store/useStore';
import { 
  Bot, 
  Calendar, 
  CheckCircle2, 
  Users, 
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isToday } from 'date-fns';

export function AIQuickBoard() {
  const { leads, tasks, currentUser, aiName, aiPersonality } = useStore();
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // ─── Data Aggregation ──────────────────────────────────────
  const agenda = useMemo(() => {
    const todayTasks = tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)));
    const hotLeads = [...leads]
      .filter(l => !l.status.startsWith('closed'))
      .sort((a, b) => calculateDealScore(b) - calculateDealScore(a))
      .slice(0, 3);
    
    const completedToday = tasks.filter(t => t.completedAt && isToday(new Date(t.completedAt))).length;
    const incomingToday = leads.filter(l => isToday(new Date(l.createdAt))).length;

    return {
      todayTasks,
      hotLeads,
      stats: {
        completedToday,
        incomingToday
      }
    };
  }, [leads, tasks]);

  const fullBriefing = useMemo(() => {
    const name = currentUser?.name?.split(' ')[0] || 'Partner';
    const taskCount = agenda.todayTasks.length;
    const leadCount = agenda.hotLeads.length;
    
    let text = `Good morning, ${name}! This is ${aiName}. `;
    
    if (taskCount > 0 || leadCount > 0) {
      text += `I've analyzed your pipeline. You have ${taskCount} tasks due today and ${leadCount} high-priority leads waiting for follow-up. `;
    } else {
      text += `Your pipeline looks steady today. It's a great time to focus on prospecting or organizing your database. `;
    }

    if (aiPersonality.toLowerCase().includes('aggressive')) {
      text += "Let's crush these targets and secure those listings!";
    } else if (aiPersonality.toLowerCase().includes('friendly')) {
      text += "I'm here to help you have a productive and smooth day!";
    } else {
      text += "Let's maintain this momentum.";
    }

    return text;
  }, [currentUser, aiName, aiPersonality, agenda]);

  // ─── Typing Animation ──────────────────────────────────────
  useEffect(() => {
    setDisplayText('');
    setIsTyping(true);
    let i = 0;
    const speed = 25; // ms per character
    const interval = setInterval(() => {
      setDisplayText(fullBriefing.slice(0, i + 1));
      i++;
      if (i >= fullBriefing.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [fullBriefing]);

  return (
    <div className="bg-gradient-to-br from-[var(--t-surface)] to-[var(--t-background)] border border-[var(--t-border)] rounded-3xl overflow-hidden shadow-xl mb-8 relative group">
      {/* Decorative background element */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--t-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--t-primary)]/10 transition-colors duration-1000" />
      
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Briefing Section */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--t-primary)] to-[var(--t-secondary)] p-[1px] shadow-lg shadow-[var(--t-primary)]/20">
                <div className="w-full h-full rounded-2xl bg-[var(--t-surface)] flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[var(--t-primary)]" />
                </div>
              </div>
              <div>
                <h3 className="text-white font-black text-xl tracking-tight">AI QuickBoard</h3>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[var(--t-success)] animate-pulse" />
                  <p className="text-[var(--t-text-muted)] text-[10px] uppercase tracking-widest font-bold">System Online · {aiName}</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <p className="text-[var(--t-text)] leading-relaxed text-lg font-medium min-h-[80px]">
                {displayText}
                {isTyping && <span className="inline-block w-2 h-5 ml-1 bg-[var(--t-primary)] animate-pulse align-middle" />}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--t-border)]/50">
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--t-surface-subtle)]/50 rounded-2xl border border-[var(--t-border-subtle)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--t-success)]" />
                <span className="text-sm text-white font-bold">{agenda.stats.completedToday}</span>
                <span className="text-xs text-[var(--t-text-muted)]">Completed</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--t-surface-subtle)]/50 rounded-2xl border border-[var(--t-border-subtle)]">
                <Users className="w-4 h-4 text-[var(--t-info)]" />
                <span className="text-sm text-white font-bold">{agenda.stats.incomingToday}</span>
                <span className="text-xs text-[var(--t-text-muted)]">New Leads</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--t-surface-subtle)]/50 rounded-2xl border border-[var(--t-border-subtle)]">
                <Zap className="w-4 h-4 text-[var(--t-warning)]" />
                <span className="text-sm text-white font-bold">{leads.length}</span>
                <span className="text-xs text-[var(--t-text-muted)]">In Pipeline</span>
              </div>
            </div>
          </div>

          {/* Actionable Column */}
          <div className="w-full md:w-80 space-y-4">
            <h4 className="text-[10px] font-black text-[var(--t-text-muted)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-[var(--t-primary)]" />
              Priority Actions
            </h4>

            {/* Tasks Due Today */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[var(--t-text-muted)] flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Agenda Today
              </p>
              {agenda.todayTasks.length > 0 ? (
                agenda.todayTasks.slice(0, 2).map(task => (
                  <div key={task.id} className="p-3 rounded-2xl bg-[var(--t-surface)]/40 border border-[var(--t-border-subtle)] hover:border-[var(--t-primary)]/30 transition-colors cursor-pointer group/item"
                    onClick={() => navigate('/tasks')}
                  >
                    <p className="text-xs text-white font-medium truncate">{task.title}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-[var(--t-text-muted)]">Due today</span>
                      <ArrowRight className="w-3 h-3 text-[var(--t-text-muted)] group-hover/item:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-2xl border border-dashed border-[var(--t-border)] text-center">
                  <p className="text-[10px] text-[var(--t-text-muted)]">No tasks scheduled for today</p>
                </div>
              )}
            </div>

            {/* Hot Leads */}
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold text-[var(--t-text-muted)] flex items-center gap-2">
                <Zap className="w-3 h-3 text-[var(--t-warning)]" /> Hot Leads
              </p>
              {agenda.hotLeads.length > 0 ? (
                agenda.hotLeads.slice(0, 2).map(lead => (
                  <div key={lead.id} className="p-3 rounded-2xl bg-[var(--t-surface)]/40 border border-[var(--t-border-subtle)] hover:border-[var(--t-primary)]/30 transition-colors cursor-pointer group/item"
                    onClick={() => navigate(`/leads/${lead.id}/manage`)}
                  >
                    <p className="text-xs text-white font-medium truncate">{lead.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-[var(--t-warning)] font-bold">Score: {calculateDealScore(lead)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--t-text-muted)] group-hover/item:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-2xl border border-dashed border-[var(--t-border)] text-center">
                  <p className="text-[10px] text-[var(--t-text-muted)]">No active leads found</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/ai-test')}
              className="w-full mt-2 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-active)] text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-[var(--t-primary)]/20 active:scale-[0.98]"
            >
              Consult {aiName} Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
