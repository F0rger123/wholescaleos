import React from 'react';
import { 
  X, Activity, Target, ExternalLink, 
  Phone, Mail, MapPin
} from 'lucide-react';
import { Lead, generateNextAction, calculateDealScore, getScoreColor, STATUS_LABELS } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';

interface LeadQuickViewModalProps {
  lead: Lead;
  onClose: () => void;
  onOpenFull: () => void;
}

export const LeadQuickViewModal: React.FC<LeadQuickViewModalProps> = ({ lead, onClose, onOpenFull }) => {
  const score = calculateDealScore(lead);
  const scoreBadge = getScoreColor(score);
  const nextAction = generateNextAction(lead);
  
  const recentActivity = [...lead.timeline]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-[90%] sm:max-w-[80%] md:max-w-2xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--t-border)] flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0"
              style={{ 
                backgroundColor: scoreBadge.bg, 
                borderColor: scoreBadge.bar,
                color: scoreBadge.text 
              }}
            >
              <span className="text-xl font-black">{score}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">{scoreBadge.label}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{lead.name}</h3>
              <div className="flex items-center gap-2 text-xs text-[var(--t-text-muted)]">
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${scoreBadge.bg} ${scoreBadge.text}`}>
                  {STATUS_LABELS[lead.status]}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {lead.propertyAddress}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--t-text-muted)] hover:text-white hover:bg-[var(--t-surface-hover)] rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Contact Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--t-surface-dim)] p-3 rounded-2xl border border-[var(--t-border-subtle)]">
              <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Phone size={10} /> Phone
              </p>
              <p className="text-sm font-semibold text-white">{lead.phone || 'No phone'}</p>
            </div>
            <div className="bg-[var(--t-surface-dim)] p-3 rounded-2xl border border-[var(--t-border-subtle)]">
              <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Mail size={10} /> Email
              </p>
              <p className="text-sm font-semibold text-white truncate">{lead.email || 'No email'}</p>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-[var(--t-primary-dim)] p-5 rounded-2xl border border-[var(--t-primary-border)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--t-primary)] opacity-5 blur-2xl -mr-12 -mt-12" />
            <h5 className="text-xs uppercase tracking-wider font-black text-[var(--t-primary)] flex items-center gap-1 mb-2">
              <Target className="w-4 h-4" /> AI Next Action
            </h5>
            <p className="text-sm font-bold text-white mb-2 leading-tight">
              {nextAction.title}
            </p>
            <p className="text-xs text-[var(--t-text-secondary)] leading-relaxed">
              {nextAction.description}
            </p>
          </div>

          {/* Recent Activity */}
          <div>
            <h5 className="text-xs uppercase tracking-wider font-bold text-[var(--t-text-muted)] flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" /> Recent Activity
            </h5>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3 relative pl-4">
                  <div className="absolute left-0 top-1.5 bottom-[-16px] w-[2px] bg-[var(--t-border)] last:bottom-0" />
                  <div className="absolute left-[-3px] top-1.5 w-2 h-2 rounded-full bg-[var(--t-primary)]" />
                  <div>
                    <p className="text-sm text-[var(--t-text)] leading-snug">{activity.content}</p>
                    <p className="text-[10px] text-[var(--t-text-muted)] mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp))} ago
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-[var(--t-text-muted)] italic">No recent activity logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-[var(--t-surface-dim)] border-t border-[var(--t-border)] flex gap-3">
          <button 
            onClick={onOpenFull}
            className="flex-1 py-3 px-4 bg-[var(--t-surface-hover)] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[var(--t-surface-active)] transition-all border border-[var(--t-border)]"
          >
            <ExternalLink size={18} /> Lead Management
          </button>
          <button className="flex-1 py-3 px-4 bg-[var(--t-primary)] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--t-primary)]/20">
            <Phone size={18} /> Call Lead
          </button>
        </div>
      </div>
    </div>
  );
};
