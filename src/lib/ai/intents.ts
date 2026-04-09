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
    patterns: ["hot leads", "top leads", "who should I call", "urgent leads", "show hot leads", "who is hot", "best leads", "deals to close"],
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
    patterns: ["add task", "create task", "remind me to", "set a reminder for"],
    action: "createTask",
    required_params: ["title"],
    template: "✅ Task added: {title}"
  },
  {
    name: "show_tasks",
    patterns: ["show tasks", "my tasks", "what do I need to do", "pending tasks", "list tasks"],
    action: "listTasks",
    template: "You have {count} pending tasks. {list}"
  },
  {
    name: "send_sms",
    patterns: ["send text to", "send sms to", "text", "message", "send a message to", "sms", "tell", "shoot a text to"],
    action: "sendSMS",
    required_params: ["target", "message"],
    template: "✅ SMS sent to {target}"
  },
  {
    name: "send_sms_partial",
    patterns: ["send text", "send sms", "text someone", "send a message", "write a text", "can you text for me"],
    action: "sendSMSPartial",
    template: "Who would you like to text?"
  },
  {
    name: "who_online",
    patterns: ["who's online", "who is online", "team online", "online team"],
    action: "getOnlineTeam",
    template: "Online: {list}"
  },
  {
    name: "schedule",
    patterns: ["what's on my calendar", "show schedule", "my calendar", "get schedule", "view appointments", "when is my next appointment"],
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
    patterns: ["add lead", "create lead", "new lead", "add as a lead"],
    action: "createLead",
    required_params: ["name"],
    template: "✅ New lead created: {name}"
  },
  {
    name: "navigate",
    patterns: ["go to", "show me", "open", "take me to"],
    action: "navigate",
    required_params: ["path"],
    template: "Navigating to {path}..."
  },
  {
    name: "lead_query",
    patterns: ["how many leads", "show my recent deals", "what's my top lead"],
    action: "queryLeads",
    template: "{response}"
  },
  {
    name: "task_query",
    patterns: ["how many tasks", "overdue tasks", "tasks due today"],
    action: "queryTasks",
    template: "{response}"
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
  },
  {
    name: "automation_query",
    patterns: ["what automations can you set up", "automation hub", "workflow setup", "what can I automate", "my automations", "automatic emails", "summary alerts"],
    action: "automation_query",
    template: "You have several automation options available: {details}"
  },
  {
    name: "automation_setup",
    patterns: ["setup automation", "create a workflow", "configure alerts", "set up summaries", "open automations"],
    action: "navigate",
    params: { path: "automations" },
    template: "Opening the Automations Hub for you now..."
  },
  {
    name: "greeting",
    patterns: ["hi", "hello", "yo", "hey", "hola", "greetings", "good morning", "good afternoon"],
    action: "greeting",
    template: "Hello! I'm 🤖 OS Bot, your intelligent real estate assistant. How can I help you today?"
  },
  {
    name: "capabilities",
    patterns: [
      "what can you do", 
      "what can you do for me", 
      "what can you help me with",
      "what are your capabilities",
      "list your capabilities",
      "capabilities", 
      "features", 
      "what are you", 
      "who are you"
    ],
    action: "capabilities",
    template: "I can manage your leads, send SMS, create tasks, query your pipeline, and help you navigate the platform. Try asking 'show my hot leads' or 'text John saying hello'."
  },
  {
    name: "bot_origin",
    patterns: ["who built you", "who made you", "what is your purpose", "where do you come from", "are you gemini", "who is your creator"],
    action: "bot_origin",
    template: "I am **🤖 OS Bot**, a custom-built AI assistant for WholeScale OS. I was designed to help you dominate your real estate market with advanced automation and CRM intelligence."
  },
  {
    name: "philosophical",
    patterns: ["meaning of life", "are you sentient", "do you have feelings", "is the world a simulation", "what is reality"],
    action: "philosophical",
    template: "{response}"
  },
  {
    name: "feedback",
    patterns: ["you are great", "good job", "bad bot", "you're slow", "awesome work", "love you", "thanks"],
    action: "feedback",
    template: "{response}"
  },
  {
    name: "system_status",
    patterns: ["how are you today", "how is the system", "performance", "is everything okay", "how are things looking"],
    action: "system_status",
    template: "{response}"
  },
  {
    name: "clarify_previous",
    patterns: ["explain that more", "why", "tell me more", "elaborate", "give me more details"],
    action: "clarify_previous",
    template: "{response}"
  },
  {
    name: "help_commands",
    patterns: ["help", "help me", "show commands", "what are your commands", "list commands", "options", "command list"],
    action: "capabilities",
    template: "Here are some things I can do:\n- 'Show my hot leads'\n- 'Text [Name] saying [Message]'\n- 'Create task: Call back John tomorrow'\n- 'Go to calendar'\n- 'How many deals are closing this month?'"
  },
  {
    name: "weather_query",
    patterns: ["weather", "forecast", "is it raining"],
    action: "weather_query",
    template: "{response}"
  },
  {
    name: "get_preferences",
    patterns: ["my preferences", "show my info", "my profile"],
    action: "get_preferences",
    template: "{response}"
  },
  {
    name: "personality_check",
    patterns: ["how you talk", "personality", "as I told you"],
    action: "personality_check",
    template: "{response}"
  }
];
