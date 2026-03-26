export interface Intent {
  name: string;
  patterns: string[];
  action: string;
  params?: Record<string, any>;
  required_params?: string[];
  template: string;
  confidence?: number;
}

export const intents: Intent[] = [
  {
    name: "hot_leads",
    patterns: ["hot leads", "top leads", "who should I call", "urgent leads", "show hot leads"],
    action: "queryLeads",
    params: { score_min: 80 },
    template: "You have {count} hot leads: {list}"
  },
  {
    name: "show_leads",
    patterns: ["show leads", "list leads", "all leads", "my leads"],
    action: "queryLeads",
    params: {},
    template: "You have {count} total leads. {list}"
  },
  {
    name: "add_task",
    patterns: ["add task", "create task", "remind me to"],
    action: "createTask",
    required_params: ["description"],
    template: "✅ Task added: {description}"
  },
  {
    name: "show_tasks",
    patterns: ["show tasks", "my tasks", "what do I need to do", "pending tasks"],
    action: "listTasks",
    template: "You have {count} pending tasks. {list}"
  },
  {
    name: "send_sms",
    patterns: ["send text", "send sms", "text"],
    action: "sendSMS",
    required_params: ["number", "message"],
    template: "✅ SMS sent to {number}"
  },
  {
    name: "who_online",
    patterns: ["who's online", "who is online", "team online", "online team"],
    action: "getOnlineTeam",
    template: "Online: {list}"
  },
  {
    name: "schedule",
    patterns: ["what's on my calendar", "show schedule", "my calendar"],
    action: "getCalendar",
    template: "Today: {list}"
  },
  {
    name: "update_status",
    patterns: ["update status", "change status", "set status to"],
    action: "updateLeadStatus",
    required_params: ["leadName", "status"],
    template: "✅ Status for {leadName} updated to {status}"
  },
  {
    name: "create_lead",
    patterns: ["add lead", "create lead", "new lead"],
    action: "createLead",
    required_params: ["name"],
    template: "✅ New lead created: {name}"
  },
  {
    name: "lead_details",
    patterns: ["show details for", "lead info", "details for", "what's up with"],
    action: "getLeadDetails",
    required_params: ["name"],
    template: "Details for {name}: {details}"
  },
  {
    name: "complete_task",
    patterns: ["complete task", "finish task", "mark task as done"],
    action: "completeTask",
    required_params: ["title"],
    template: "✅ Task '{title}' marked as complete"
  },
  {
    name: "delete_task",
    patterns: ["delete task", "remove task"],
    action: "deleteTask",
    required_params: ["title"],
    template: "✅ Task '{title}' deleted"
  },
  {
    name: "team_assignments",
    patterns: ["who is assigned to", "team assignments", "my team's leads"],
    action: "getTeamAssignments",
    template: "Assignments: {list}"
  },
  
  // --- ENHANCED INTENTS ---
  
  {
    name: "filter_leads_source",
    patterns: ["leads from", "leads from source", "show leads from"],
    action: "queryLeads",
    required_params: ["source"],
    template: "Found {count} leads from {source}: {list}"
  },
  {
    name: "filter_leads_time",
    patterns: ["leads added this week", "new leads this week", "recent leads"],
    action: "queryLeads",
    params: { timeframe: 'week' },
    template: "You have {count} new leads this week: {list}"
  },
  {
    name: "filter_leads_location",
    patterns: ["leads in", "leads in city", "leads in zip"],
    action: "queryLeads",
    required_params: ["location"],
    template: "Found {count} leads in {location}: {list}"
  },
  {
    name: "unresponsive_leads",
    patterns: ["who hasn't replied", "unresponsive leads", "no contact in"],
    action: "queryLeads",
    params: { unresponsiveDays: 3 },
    template: "These {count} leads haven't replied in {unresponsiveDays} days: {list}"
  },
  {
    name: "smart_follow_up",
    patterns: ["who should I follow up today", "follow up today", "recommended follow ups"],
    action: "getFollowUps",
    template: "Recommended follow-ups for today: {list}"
  },
  {
    name: "pipeline_stats",
    patterns: ["what's my pipeline looking like", "pipeline status", "pipeline value"],
    action: "getPipelineStats",
    template: "Pipeline Summary: {details}"
  },
  {
    name: "closing_month",
    patterns: ["deals closing this month", "closing soon", "expected revenue this month"],
    action: "getPipelineStats",
    params: { timeframe: 'month', status: 'negotiating' },
    template: "Deals closing this month: {list}"
  },
  {
    name: "analytics_conversion",
    patterns: ["my conversion rate", "best lead source", "how many leads did I get this week"],
    action: "getAnalytics",
    template: "Analytics: {details}"
  },
  {
    name: "set_preference",
    patterns: ["remember I prefer", "always show me", "my working hours are"],
    action: "updateAIPreferences",
    template: "✅ I've updated your preferences: {details}"
  },
  {
    name: "catch_me_up",
    patterns: ["catch me up", "morning summary", "daily brief"],
    action: "getDailySummary",
    template: "Summary: {details}"
  },
  {
    name: "train_ai",
    patterns: ["train:", "learn:", "when I say"],
    action: "trainAI",
    template: "✅ Learned: '{phrase}' means '{meaning}'"
  }
];
