export type IntentName = 
  | 'show_leads'
  | 'add_task'
  | 'show_tasks'
  | 'send_sms'
  | 'who_online'
  | 'schedule'
  | 'update_status'
  | 'get_leads_count'
  | 'get_tasks_count'
  | 'greeting'
  | 'capabilities'
  | 'weather_query'
  | 'search'
  | 'navigate'
  | 'delete_lead'
  | 'delete_task'
  | 'team_assignments'
  | 'filter_leads_source'
  | 'filter_leads_time'
  | 'filter_leads_location'
  | 'unresponsive_leads'
  | 'smart_follow_up'
  | 'pipeline_stats'
  | 'closing_month'
  | 'analytics_conversion'
  | 'set_preference'
  | 'catch_me_up'
  | 'train_ai'
  | 'bot_origin'
  | 'philosophical'
  | 'feedback'
  | 'system_status'
  | 'clarify_previous'
  | 'help_commands'
  | 'get_preferences'
  | 'automation_query'
  | 'automation_setup'
  | 'personality_check'
  | 'send_sms_partial'
  | 'memory_recall'
  | 'hot_leads'
  | 'personality_query'
  | 'calendar_setup'
  | 'sms_reply_check'
  | 'email_campaign'
  | 'test_query'
  | 'create_lead'
  | 'lead_query'
  | 'task_query'
  | 'lead_details'
  | 'complete_task'
  | 'small_talk'
  | 'cancel_confirmation'
  | 'typo_suggestion'
  | 'send_email'
  | 'tasks_due'
  | 'change_greeting'
  | 'list_leads'
  | 'joke'
  | 'time_query'
  | 'user_fact'
  | 'mood_check'
  | 'motivation'
  | 'follow_up'
  | 'proactive_suggestion'
  | 'lead_context_query'
  | 'forget_learned'
  | 'list_learned'
  | 'repeat_last'
  | 'change_personality'
  | 'remember_fact'
  | 'recall_yesterday'
  | 'analyze_deal'
  | 'match_buyers'
  | 'market_pulse'
  | 'offer_strategy'
  | 'clarify_context'
  | 'delete_task'
  | 'update_task_priority'
  | 'delete_lead'
  | 'navigate_to'
  | 'pipeline_stats'
  | 'calendar_query_ext'
  | 'add_buyer'
  | 'search_crm'
  | 'bulk_action'
  | 'daily_briefing'
  | 'export_data'
  | 'set_reminder'
  | 'count_query'
  | 'toggle_automation'
  | 'smart_followup'
  | 'rei_knowledge'
  | 'analyze_deal'
  | 'generate_content'
  | 'market_intelligence';


export interface Intent {
  name: IntentName;
  patterns: string[];
  action: string;
  params?: Record<string, any>;
  required_params?: string[];
  template: string;
  confidence?: number;
}

export const intents: Intent[] = [
  {
    name: 'follow_up',
    patterns: [
      'what about leads', 'and tasks', 'what else', 'anything else',
      'what about sms', 'and calendar', 'tell me more', 'go on'
    ],
    action: 'follow_up',
    template: '{response}'
  },
  {
    name: 'proactive_suggestion',
    patterns: [
      'what should i do', 'suggest something', 'any recommendations',
      'whats next', 'what should i focus on', 'give me a task',
      'what would you recommend i do with him', 'what should i do with this lead',
      'any suggestions for him', "what's next with this lead", 'what now',
      'what should i do with him', 'what would you recommend i do with her',
      'any suggestions for her', 'what should i do with the lead'
    ],
    action: 'proactive_suggestion',
    template: '{response}'
  },
  {
    name: 'repeat_last',
    patterns: [
      'repeat that', 'say that again', 'what did you say', 'repeat',
      'say again', 'come again'
    ],
    action: 'repeat_last',
    template: '{response}'
  },
  {
    name: 'lead_context_query',
    patterns: [
      'whats his phone', 'whats her email', 'whats the address',
      'show me the notes', 'when did i last contact', 'whats the status of',
      'tell me about this lead', 'lead details for',
      'what do you know about', 'give me info on', 'give me what you know for',
      'info on', 'details on', 'get info for'
    ],
    action: 'lead_context_query',
    required_params: ['leadName'],
    template: '{response}'
  },
  {
    name: 'forget_learned',
    patterns: [
      'forget that', 'unlearn that', 'remove that command',
      'stop remembering', 'delete that phrase', 'forget what i taught you about'
    ],
    action: 'forget_learned',
    template: '{response}'
  },
  {
    name: 'list_learned',
    patterns: [
      'what have i taught you', 'show learned commands',
      'what did you learn', 'list my phrases', 'what have you remembered'
    ],
    action: 'list_learned',
    template: '{response}'
  },
  {
    name: 'small_talk',
    patterns: [
      'okay', 'ok', 'k', 'got it', 'alr', 'alright', 'sure', 'bet', 'sounds good',
      'yes', 'yeah', 'yup', 'yep', 'exactly', 'correct', 'thats the one',
      'cool', 'nice', 'great', 'awesome', 'perfect', 'good', 'fine',
      'thanks', 'thank you', 'thx', 'ty', 'appreciate it',
      'stop', 'wait', 'hold up', 'hold on', 'pause', 'cancel', 'nevermind', 'nvm', 'nah', 'no thanks', 'no', 'nope',
      'bye', 'goodbye', 'see you', 'see ya', 'later', 'cya', 'peace', 'good night',
      'lol', 'haha', 'hehe', 'lmao', 'nice one', 'good one', 'funny',
      'huh', 'what', 'hmm', 'umm', 'pardon', 'excuse me', 'i dont get it',
      'how are you', 'how you doing', 'whats up', 'whats new', 'how are things',
      'good morning', 'good afternoon', 'good evening',
      'tell me a joke', 'make me laugh', 'another joke',
      'who are you', 'what are you', 'introduce yourself'
    ],
    action: 'small_talk',
    template: '{response}'
  },
  {
    name: "hot_leads",
    patterns: [
      "hot leads", "top leads", "who should I call", "urgent leads", 
      "show hot leads", "who is hot", "best leads", "deals to close",
      "what are my top leads", "show me my top leads", "what are my best leads", "list my hot leads",
      "top 5 leads", "best 5 leads"
    ],
    action: "hot_leads",
    params: { score_min: 80 },
    template: "You have {count} hot leads: {list}"
  },
  {
    name: 'personality_query',
    patterns: ['personality', 'how you talk', 'be more', 'change your personality', 'be sassy', 'be professional', 'what personality', 'what tone', 'current tone', 'current personality'],
    action: 'redirect_to_settings',
    template: "Redirecting to personality settings..."
  },
  {
    name: 'change_personality',
    patterns: [
      'be sassy', 'be professional', 'be funny', 'be casual', 'turn on cursing', 
      'switch to sassy mode', 'talk like a professional', 'change your tone to', 
      'change personality to'
    ],
    action: 'change_personality',
    template: '{response}'
  },
  {
    name: 'remember_fact',
    patterns: ['remember that', 'keep in mind', 'make a note that', 'i prefer'],
    action: 'remember_fact',
    template: 'Got it. I will remember that.'
  },
  {
    name: 'recall_yesterday',
    patterns: ['what was i working on yesterday', 'what did we do yesterday', 'yesterday'],
    action: 'recall_yesterday',
    template: '{response}'
  },
  {
    name: 'clarify_context',
    patterns: ['that lead', 'him', 'her', 'them', 'the task', 'it'],
    action: 'clarify_context',
    template: '{response}'
  },
  {
    name: 'calendar_setup',
    patterns: ['add to calendar', 'schedule', 'event', 'calendar entry'],
    action: 'start_calendar_flow',
    template: "Starting calendar setup flow..."
  },
  {
    name: 'sms_reply_check',
    patterns: ['did they reply', 'respond to my sms', 'check messages', 'last reply'],
    action: 'check_sms_inbox',
    template: "Checking your SMS inbox..."
  },
  {
    name: 'email_campaign',
    patterns: ['send email campaign', 'bulk email', 'blast', 'campaign wizard'],
    action: 'trigger_campaign',
    template: "Launching campaign wizard..."
  },
  {
    name: 'test_query',
    patterns: ['test', 'ping', 'are you working', 'system check'],
    action: 'system_status',
    template: "System status: Online"
  },
  {
    name: 'list_leads',
    patterns: [
      "leads", "top leads", "lead list", "my leads", "view leads", "show leads", "total leads", "active leads",
      "top leads", "best leads", "hot leads", "highest scoring leads", "lead"
    ],
    action: "queryLeads",
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
    patterns: ["tasks", "task", "show tasks", "my tasks", "what do I need to do", "pending tasks", "list tasks", "view tasks", "show my tasks", "what are my tasks"],
    action: "show_tasks",
    template: "You have {count} pending tasks. {list}"
  },
  {
    name: "send_sms",
    patterns: ["send text to", "send sms to", "text", "message", "send a message to", "sms", "tell", "shoot a text to", "text both", "text all of them", "message them", "blast all"],
    action: "sendSMS",
    required_params: ["target", "message"],
    template: "✅ SMS sent to {target}"
  },
  {
    name: "send_sms_partial",
    patterns: ["send text", "send sms", "text someone", "send a message", "write a text", "can you text for me", "text them", "text those", "message both", "text everyone"],
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
      "what can you",
      "what can you do", 
      "what can you do for me", 
      "what can you help me with",
      "what are your capabilities",
      "list your capabilities",
      "what capabilities",
      "capabilities", 
      "features", 
      "what are you", 
      "who are you"
    ],
    action: "capabilities",
    template: "I can manage your leads, send SMS, create tasks, query your pipeline, and help you navigate the platform. Try asking 'show my hot leads' or 'text John saying hello'."
  },
  {
    name: "memory_recall",
    patterns: ["what memories", "what do you remember", "what memories do you have", "what do you know about me", "recall memory", "show my actions"],
    action: "memory_recall",
    template: "Here is what I remember: {summary}"
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
    patterns: ["you are great", "bad bot", "you're slow", "awesome work"],
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
    template: "Here are some things I can do:\n- 'Show my hot leads'\n- 'Text [Name] saying [Message]'\n- 'Create task: Call back John tomorrow'\n- 'Go to calendar'\n- 'Change personality to [Sassy/Professional/Funny]'\n- 'How many deals are closing this month?'"
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
    name: 'personality_check',
    patterns: ["how you talk", "personality", "as I told you"],
    action: "personality_check",
    template: "{response}"
  },
  {
    name: 'send_email',
    patterns: ['send email', 'email someone', 'compose email', 'send an email to', 'email [name]'],
    action: 'send_email',
    template: "Opening email compose modal..."
  },
  {
    name: 'tasks_due',
    patterns: ['tasks due today', 'overdue tasks', 'what is due', 'my schedule today'],
    action: 'queryTasks',
    template: "You have {count} tasks due: {list}"
  },
  {
    name: 'joke',
    patterns: ['tell me a joke', 'make me laugh', 'humor me', 'tell a joke'],
    action: 'joke',
    template: "{response}"
  },
  {
    name: 'time_query',
    patterns: ['what time is it', 'what is the date', 'current time'],
    action: 'time_query',
    template: "The current time is {time} on {date}."
  },
  {
    name: 'user_fact',
    patterns: ['my name is', 'remember that I', 'I like'],
    action: 'store_fact',
    template: "✅ got it, I'll remember that {fact}"
  },
  {
    name: 'mood_check',
    patterns: ['am I doing good', 'how am I doing', 'am I failing', 'is my business ok'],
    action: 'mood_check',
    template: "{response}"
  },
  {
    name: 'motivation',
    patterns: ['encourage me', 'need motivation', 'give me a quote', 'tough day'],
    action: 'motivation',
    template: "{response}"
  },
  {
    name: 'analyze_deal',
    patterns: [
      'analyze this deal', 'is this a good deal', 'should i buy this', 
      'calculate roi', 'calculate mao', 'deal analysis for', 
      'how are the numbers for', 'profit potential for'
    ],
    action: 'analyze_deal',
    template: "{response}"
  },
  {
    name: 'match_buyers',
    patterns: [
      'find buyers', 'who would buy this', 'buyer matches for', 
      'who is looking for', 'potential buyers for', 'match buyers to'
    ],
    action: 'match_buyers',
    template: "{response}"
  },
  {
    name: 'market_pulse',
    patterns: [
      'market in', 'market pulse', 'average price in', 
      'how is the market', 'market stats for', 'price per sqft in'
    ],
    action: 'market_pulse',
    template: "{response}"
  },
  {
    name: 'offer_strategy',
    patterns: [
      'what should i offer', 'offer strategy', 'best offer for', 
      'calculate offer for', 'offer amount recommendation'
    ],
    action: 'offer_strategy',
    template: "{response}"
  },
  {
    name: 'delete_task',
    patterns: ['delete task', 'remove task', 'cancel task', 'drop task'],
    action: 'delete_task',
    template: "{response}"
  },
  {
    name: 'update_task_priority',
    patterns: ['change priority', 'set priority', 'make task urgent', 'update task'],
    action: 'update_task_priority',
    template: "{response}"
  },
  {
    name: 'delete_lead',
    patterns: ['delete lead', 'remove lead', 'drop lead', 'erase lead'],
    action: 'delete_lead',
    template: "{response}"
  },
  {
    name: 'navigate_to',
    patterns: ['go to', 'take me to', 'open', 'navigate to', 'show me the'],
    action: 'navigate_to',
    template: "{response}"
  },
  {
    name: 'pipeline_stats',
    patterns: ['pipeline', 'pipeline stats', 'pipeline summary', 'deal breakdown', 'conversion rate'],
    action: 'pipeline_stats',
    template: "{response}"
  },
  {
    name: 'calendar_query_ext',
    patterns: ['calendar', 'my calendar', 'any meetings', 'agenda', 'schedule today'],
    action: 'calendar_query_ext',
    template: "{response}"
  },
  {
    name: 'add_buyer',
    patterns: ['add buyer', 'create buyer', 'new buyer', 'register buyer'],
    action: 'add_buyer',
    template: "{response}"
  },
  {
    name: 'search_crm',
    patterns: ['search for', 'find', 'look up', 'search leads', 'search crm'],
    action: 'search_crm',
    template: "{response}"
  },
  {
    name: 'bulk_action',
    patterns: ['text all', 'message all', 'mark all', 'update all', 'bulk'],
    action: 'bulk_action',
    template: "{response}"
  },
  {
    name: 'daily_briefing',
    patterns: ['brief me', 'morning summary', 'daily briefing', 'catch me up', 'whats happening'],
    action: 'daily_briefing',
    template: "{response}"
  },
  {
    name: 'export_data',
    patterns: ['export leads', 'export data', 'download leads', 'export my data'],
    action: 'export_data',
    template: "{response}"
  },
  {
    name: 'set_reminder',
    patterns: ['remind me in', 'set a reminder', 'alert me in', 'notify me in'],
    action: 'set_reminder',
    template: "{response}"
  },
  {
    name: 'count_query',
    patterns: ['how many leads', 'how many tasks', 'how many buyers', 'lead count', 'task count'],
    action: 'count_query',
    template: "{response}"
  },
  {
    name: 'toggle_automation',
    patterns: ['turn on', 'turn off', 'enable', 'disable', 'toggle'],
    action: 'toggle_automation',
    template: "{response}"
  },
  {
    name: 'smart_followup',
    patterns: ['who needs follow up', 'stale leads', 'neglected leads', 'who havent i talked to', 'cold leads'],
    action: 'smart_followup',
    template: "{response}"
  },
  {
    name: 'rei_knowledge',
    patterns: ['what is', 'explain', 'how does', 'meaning of', 'define', 'what are', 'whats', 'what do you mean by'],
    action: 'rei_knowledge',
    template: "{response}"
  },
  {
    name: 'analyze_deal',
    patterns: ['analyze', 'calculate', 'run the numbers', 'arv', 'mao', 'roi', 'breakdown', 'is this a good deal', 'evaluate'],
    action: 'analyze_deal',
    template: "{response}"
  },
  {
    name: 'generate_content',
    patterns: ['write', 'draft', 'generate', 'create a script', 'email to', 'text to', 'message to', 'what should i say', 'give me an email'],
    action: 'generate_content',
    template: "{response}"
  },
  {
    name: 'market_intelligence',
    patterns: ['market temperature', 'best buyers', 'buyer matches', 'pipeline insights', 'market stats', 'who wants'],
    action: 'market_intelligence',
    template: "{response}"
  }
];
