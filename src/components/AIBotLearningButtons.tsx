import React from 'react';

interface LearningButtonsProps {
  originalPhrase: string;
  onSelect: (intent: string, params?: Record<string, any>) => void;
  onDismiss: () => void;
}

const COMMON_INTENTS = [
  { intent: 'list_leads', label: '📁 Show my leads' },
  { intent: 'hot_leads', label: '🔥 Show top leads' },
  { intent: 'tasks_due', label: '📅 Show tasks due' },
  { intent: 'create_lead', label: '➕ Add a lead' },
  { intent: 'add_task', label: '✅ Create a task' },
  { intent: 'send_sms', label: '💬 Send a text' },
  { intent: 'calendar_query', label: '📆 Check calendar' },
  { intent: 'help_commands', label: '❓ Show help' },
];

export const AIBotLearningButtons: React.FC<LearningButtonsProps> = ({
  originalPhrase: _originalPhrase,
  onSelect,
  onDismiss,
}) => {
  return (
    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase tracking-wider mb-2">Did you mean:</p>
      <div className="flex flex-wrap gap-2">
        {COMMON_INTENTS.slice(0, 4).map((item) => (
          <button
            key={item.intent}
            onClick={() => onSelect(item.intent)}
            className="px-3 py-1.5 text-[10px] font-bold bg-[var(--t-surface-subtle)] border border-[var(--t-border)] hover:bg-[var(--t-primary)] hover:text-[var(--t-on-primary)] hover:border-[var(--t-primary)] text-[var(--t-text)] rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-[10px] font-bold bg-transparent hover:bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] rounded-full transition-colors border border-transparent hover:border-[var(--t-border)]"
        >
          ✕ Dismiss
        </button>
      </div>
      <p className="text-[9px] text-[var(--t-text-muted)] mt-2 italic opacity-60">
        I'll remember this for next time.
      </p>
    </div>
  );
};
