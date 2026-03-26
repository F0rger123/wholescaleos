import React from 'react';
import { 
  TrendingUp, Activity, Target, ArrowRight, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Lead, generateNextAction, calculateDealScore, getScoreColor } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';

interface LeadHoverCardProps {
  lead: Lead;
}

export const LeadHoverCard: React.FC<LeadHoverCardProps> = ({ lead }) => {
  const score = calculateDealScore(lead);
  const scoreBadge = getScoreColor(score);
  const nextAction = generateNextAction(lead);
  
  // Get 3 most recent timeline entries
  const recentActivity = [...lead.timeline]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  return (
    <div className="relative w-80 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in duration-200 z-[3000]">
      {/* Arrow */}
      <div 
        className="absolute w-3 h-3 bg-[var(--t-surface)] border-l border-t border-[var(--t-border)] z-[-1]"
        style={{ 
          display: 'var(--card-arrow-display, block)',
          left: 'var(--card-arrow-left, -6px)',
          right: 'var(--card-arrow-right, auto)',
          top: 'var(--card-arrow-top, 32px)',
          transform: 'rotate(var(--card-arrow-rotate, -45deg))'
        }}
      />
      
      {/* Header with Score */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--t-border)]">
        <div>
          <h4 className="text-sm font-semibold text-[var(--t-text)]">{lead.name}</h4>
          <p className="text-xs text-[var(--t-text-muted)] truncate max-w-[180px]">
            {lead.propertyAddress}
          </p>
        </div>
        <div 
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full border-2"
          style={{ 
            backgroundColor: scoreBadge.bg, 
            borderColor: scoreBadge.bar,
            color: scoreBadge.text 
          }}
        >
          <span className="text-xs font-bold">{score}</span>
          <span className="text-[8px] uppercase tracking-tighter leading-none">{scoreBadge.label}</span>
        </div>
      </div>

      {/* Score Explanation */}
      <div className="space-y-2 mb-4">
        <h5 className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Score Breakdown
        </h5>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--t-surface-hover)] p-2 rounded-lg">
            <p className="text-[10px] text-[var(--t-text-muted)]">Probability</p>
            <p className="text-xs font-semibold text-[var(--t-text)]">{lead.probability}%</p>
          </div>
          <div className="bg-[var(--t-surface-hover)] p-2 rounded-lg">
            <p className="text-[10px] text-[var(--t-text-muted)]">Engagement</p>
            <p className="text-xs font-semibold text-[var(--t-text)]">{lead.engagementLevel}/5</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2 mb-4">
        <h5 className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-text-muted)] flex items-center gap-1">
          <Activity className="w-3 h-3" /> Recent Activity
        </h5>
        <div className="space-y-2">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex gap-2">
              <div className="w-1 h-auto rounded-full bg-[var(--t-primary)] opacity-30 mt-1 mb-1" />
              <div>
                <p className="text-[11px] text-[var(--t-text)] line-clamp-1">{activity.content}</p>
                <p className="text-[9px] text-[var(--t-text-muted)]">
                  {formatDistanceToNow(new Date(activity.timestamp))} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Next Step */}
      <div className="bg-[var(--t-primary-dim)] p-3 rounded-xl border border-[var(--t-primary-border)]">
        <h5 className="text-[10px] uppercase tracking-wider font-bold text-[var(--t-primary)] flex items-center gap-1 mb-1">
          <Target className="w-3 h-3" /> AI Recommendation
        </h5>
        <p className="text-[11px] text-[var(--t-text)] font-medium leading-relaxed mb-2">
          {nextAction.title}
        </p>
        <div className="flex gap-2">
          <Link 
            to={`/leads/${lead.id}/manage`}
            className="flex-1 py-1.5 px-2 bg-[var(--t-surface-hover)] text-[var(--t-text)] text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-[var(--t-surface-active)] transition-all border border-[var(--t-border)]"
          >
            Full Edit <ExternalLink className="w-3 h-3" />
          </Link>
          <button className="flex-1 py-1.5 px-2 bg-[var(--t-primary)] text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:brightness-110 transition-all">
            Take Action <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
