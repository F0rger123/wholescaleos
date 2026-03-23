export interface PrebuiltRule {
  id: string;
  trigger: string;
  action: string;
  category: 'Lead Management' | 'Task Management' | 'Calendar' | 'SMS' | 'Reports' | 'Navigation' | 'System';
}

export const PREBUILT_RULES: PrebuiltRule[] = [
  // ── Lead Management ────────────────────────────────────────────────────────
  { id: 'lr1', trigger: "show hot leads", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr2', trigger: "add new lead", action: "create_lead", category: 'Lead Management' },
  { id: 'lr3', trigger: "how many leads", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr4', trigger: "show all my leads", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr5', trigger: "open lead database", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr6', trigger: "where are my leads", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr7', trigger: "find lead", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr8', trigger: "search leads", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr9', trigger: "close lead", action: "update_status", category: 'Lead Management' },
  { id: 'lr10', trigger: "delete lead", action: "delete_lead", category: 'Lead Management' },
  { id: 'lr11', trigger: "update lead", action: "update_lead", category: 'Lead Management' },
  { id: 'lr12', trigger: "prospects", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr13', trigger: "show new opportunities", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr14', trigger: "pipeline", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr15', trigger: "lead list", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr16', trigger: "manage prospects", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr17', trigger: "lead board", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr18', trigger: "sales pipeline", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr19', trigger: "who should i call", action: "navigate_leads", category: 'Lead Management' },
  { id: 'lr20', trigger: "cold leads", action: "navigate_leads", category: 'Lead Management' },

  // ── Task Management ────────────────────────────────────────────────────────
  { id: 'tm1', trigger: "what do i need to do", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm2', trigger: "show tasks", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm3', trigger: "add task", action: "create_task", category: 'Task Management' },
  { id: 'tm4', trigger: "create a task", action: "create_task", category: 'Task Management' },
  { id: 'tm5', trigger: "remind me to", action: "create_task", category: 'Task Management' },
  { id: 'tm6', trigger: "show my to do list", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm7', trigger: "what's pending", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm8', trigger: "open tasks", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm9', trigger: "urgent tasks", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm10', trigger: "due today", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm11', trigger: "overdue tasks", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm12', trigger: "mark task complete", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm13', trigger: "finish task", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm14', trigger: "task board", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm15', trigger: "what's next on my list", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm16', trigger: "assign a task", action: "create_task", category: 'Task Management' },
  { id: 'tm17', trigger: "schedule a reminder", action: "create_task", category: 'Task Management' },
  { id: 'tm18', trigger: "clear tasks", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm19', trigger: "my assignments", action: "navigate_tasks", category: 'Task Management' },
  { id: 'tm20', trigger: "view to-do", action: "navigate_tasks", category: 'Task Management' },

  // ── Calendar ───────────────────────────────────────────────────────────────
  { id: 'c1', trigger: "what's my schedule", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c2', trigger: "show calendar", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c3', trigger: "open calendar", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c4', trigger: "any meetings today", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c5', trigger: "what meetings do i have", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c6', trigger: "show my week", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c7', trigger: "schedule a meeting", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c8', trigger: "book an appointment", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c9', trigger: "view appointments", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c10', trigger: "calendar view", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c11', trigger: "what is planned for today", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c12', trigger: "show my agenda", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c13', trigger: "schedule view", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c14', trigger: "my availability", action: "navigate_calendar", category: 'Calendar' },
  { id: 'c15', trigger: "time blocks", action: "navigate_calendar", category: 'Calendar' },

  // ── SMS ────────────────────────────────────────────────────────────────────
  { id: 's1', trigger: "send a text", action: "send_sms", category: 'SMS' },
  { id: 's2', trigger: "text someone", action: "send_sms", category: 'SMS' },
  { id: 's3', trigger: "send sms", action: "send_sms", category: 'SMS' },
  { id: 's4', trigger: "message a lead", action: "send_sms", category: 'SMS' },
  { id: 's5', trigger: "open messages", action: "navigate_sms", category: 'SMS' },
  { id: 's6', trigger: "check my inbox", action: "navigate_sms", category: 'SMS' },
  { id: 's7', trigger: "show my texts", action: "navigate_sms", category: 'SMS' },
  { id: 's8', trigger: "read texts", action: "navigate_sms", category: 'SMS' },
  { id: 's9', trigger: "any new messages", action: "navigate_sms", category: 'SMS' },
  { id: 's10', trigger: "sms inbox", action: "navigate_sms", category: 'SMS' },
  { id: 's11', trigger: "reply to message", action: "navigate_sms", category: 'SMS' },
  { id: 's12', trigger: "send a reminder", action: "send_sms", category: 'SMS' },
  { id: 's13', trigger: "follow up text", action: "send_sms", category: 'SMS' },
  { id: 's14', trigger: "text client", action: "send_sms", category: 'SMS' },
  { id: 's15', trigger: "open outbox", action: "navigate_sms", category: 'SMS' },
  
  // ── Reports ────────────────────────────────────────────────────────────────
  { id: 'r1', trigger: "show reports", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r2', trigger: "open dashboard", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r3', trigger: "how am i doing", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r4', trigger: "show kpis", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r5', trigger: "performance metrics", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r6', trigger: "sales metrics", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r7', trigger: "analytics", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r8', trigger: "show numbers", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r9', trigger: "conversion rate", action: "navigate_dashboard", category: 'Reports' },
  { id: 'r10', trigger: "revenue chart", action: "navigate_dashboard", category: 'Reports' },

  // ── Navigation ─────────────────────────────────────────────────────────────
  { id: 'n1', trigger: "go home", action: "navigate_dashboard", category: 'Navigation' },
  { id: 'n2', trigger: "return to dashboard", action: "navigate_dashboard", category: 'Navigation' },
  { id: 'n3', trigger: "open team chat", action: "navigate_team", category: 'Navigation' },
  { id: 'n4', trigger: "show my team", action: "navigate_team", category: 'Navigation' },
  { id: 'n5', trigger: "go to settings", action: "navigate_settings", category: 'Navigation' },
  { id: 'n6', trigger: "open preferences", action: "navigate_settings", category: 'Navigation' },
  { id: 'n7', trigger: "show ai page", action: "navigate_ai", category: 'Navigation' },
  { id: 'n8', trigger: "open bot page", action: "navigate_ai", category: 'Navigation' },
  { id: 'n9', trigger: "calculator", action: "navigate_calculators", category: 'Navigation' },
  { id: 'n10', trigger: "math tools", action: "navigate_calculators", category: 'Navigation' },

  // ── System ─────────────────────────────────────────────────────────────────
  { id: 'sys1', trigger: "clear logs", action: "navigate_settings", category: 'System' },
  { id: 'sys2', trigger: "change theme", action: "navigate_settings", category: 'System' },
  { id: 'sys3', trigger: "sign out", action: "navigate_settings", category: 'System' },
  { id: 'sys4', trigger: "log out", action: "navigate_settings", category: 'System' },
  { id: 'sys5', trigger: "help me", action: "navigate_settings", category: 'System' },
  { id: 'sys6', trigger: "how does this work", action: "navigate_settings", category: 'System' },
  { id: 'sys7', trigger: "show tutorial", action: "navigate_settings", category: 'System' },
  { id: 'sys8', trigger: "system status", action: "navigate_settings", category: 'System' },
  { id: 'sys9', trigger: "update profile", action: "navigate_settings", category: 'System' },
  { id: 'sys10', trigger: "change password", action: "navigate_settings", category: 'System' }
];

export const getEnabledPrebuiltRules = (): string[] => {
  const saved = localStorage.getItem('active_prebuilt_rules');
  if (!saved) return PREBUILT_RULES.map(r => r.id); // All enabled by default
  return JSON.parse(saved);
};

export const setEnabledPrebuiltRules = (ids: string[]) => {
  localStorage.setItem('active_prebuilt_rules', JSON.stringify(ids));
};
