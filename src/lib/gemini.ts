import { useStore, TaskPriority, LeadStatus, STATUS_FLOW, STATUS_LABELS } from '../store/useStore';
import type { Lead } from '../store/useStore';
import { supabase, isSupabaseConfigured } from './supabase';
import { sendSMS } from './sms-service';
import { recognizeIntent } from './local-ai/intent-engine';
import { executeTask } from './local-ai/task-executor';
import { generateResponse } from './local-ai/response-generator';
import { saveConversation } from './local-ai/memory-store';

export interface GeminiResponse {
  intent: string;
  response: string;
  data?: any;
  systemLog?: string;
}

export async function listAvailableModels(apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.error('Failed to list models:', err);
    return [];
  }
}

export async function generateLeadInsight(lead: Lead): Promise<string> {
  const status = String(lead.status);
  const isHot = status === 'negotiating' || status === 'qualified';
  const statusNote = status === 'new' ? 'Fast follow-up recommended.' :
                     status === 'contacted' ? 'Keep momentum with a touchpoint.' :
                     isHot ? 'Active deal - prioritize this lead.' : 'Monitor for future opportunities.';
  const valNote = lead.estimatedValue > 250000 ? ` High-value target ($${lead.estimatedValue.toLocaleString()}).` : '';
  
  return `🤖 OS Bot: ${statusNote}${valNote} Review their notes and reach out when ready.`;
}

export async function generatePageInsights(_page: string): Promise<string[]> {
  const store = useStore.getState();
  const leadsCount = store.leads?.length || 0;
  const hotLeads = store.leads?.filter(l => {
    const s = String(l.status);
    return s === 'negotiating' || s === 'qualified';
  }).length || 0;
  const tasksDue = store.tasks?.filter(t => t.status === 'todo').length || 0;
  
  const insights = [];
  insights.push(`🤖 OS Bot: You have ${hotLeads} hot leads out of ${leadsCount} total leads.`);
  if (tasksDue > 0) insights.push(`🤖 OS Bot: Focus on clearing your ${tasksDue} pending tasks today.`);
  else insights.push(`🤖 OS Bot: Your task list is clear. Great time to prospect!`);
  insights.push(`🤖 OS Bot: Consider reviewing any leads stuck in "Contacted" status.`);

  return insights;
}


export interface CallScriptTemplate {
  name: string;
  category: string;
  script: string;
  description: string;
}

export async function generateCallScriptTemplates(lead: Lead): Promise<CallScriptTemplate[]> {
  const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
  const address = lead.propertyAddress || 'your property';

  const defaults: CallScriptTemplate[] = [
    {
      name: "Introductory Outreach",
      category: "Introductory",
      description: "A straightforward, professional opening to gauge initial interest.",
      script: `Hi {{lead.name}}, my name is [Your Name] and I'm a local real estate investor. I was calling about your property at {{lead.address}}. Are you open to receiving a quick, no-obligation cash offer for it?`
    },
    {
      name: "Follow-up Check-in",
      category: "Follow-up",
      description: "Use this when reconnecting with a lead who wasn't ready before or needs a nudge.",
      script: `Hey {{lead.name}}, it's [Your Name] following up regarding {{lead.address}}. I know timing is everything in real estate, so I just wanted to see if your timeline has changed or if you're ready to explore an offer.`
    },
    {
      name: "Urgent Closer",
      category: "Urgent/Closer",
      description: "A more direct script for leads showing high motivation or distressed properties.",
      script: `Hello {{lead.name}}, this is [Your Name]. I'm looking to close on a property in your neighborhood this month, and {{lead.address}} caught my eye. If I pay cash and cover all closing costs, what's a number that would make sense for you?`
    }
  ];

  let customScripts: CallScriptTemplate[] = [];
  try {
    const saved = localStorage.getItem('user_custom_scripts');
    if (saved) customScripts = JSON.parse(saved);
  } catch (err) {
    console.error('Failed to parse custom scripts', err);
  }

  const allScripts = [...defaults, ...customScripts];

  // Apply template replacements
  return allScripts.map(t => ({
    ...t,
    script: t.script
      .replace(/\{\{lead\.name\}\}/gi, firstName)
      .replace(/\{\{lead\.address\}\}/gi, address)
      .replace(/\{\{lead\.score\}\}/gi, String(lead.engagementLevel || 0))
  }));
}

export function getTodaysTasks() {
  const store = useStore.getState();
  const today = new Date().toISOString().split('T')[0];
  return store.tasks.filter(t => t.dueDate && t.dueDate.startsWith(today));
}

export function getUserTasks(userId: string) {
  const store = useStore.getState();
  return store.tasks.filter(t => t.assignedTo === userId);
}

export function createTask(taskData: { title: string, dueDate?: string, priority?: TaskPriority, leadId?: string }) {
  const store = useStore.getState();
  const currentUser = store.currentUser?.id || 'system';
  store.addTask({
    title: taskData.title,
    description: '',
    assignedTo: currentUser,
    dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
    priority: taskData.priority || 'medium',
    status: 'todo',
    createdBy: currentUser,
    leadId: taskData.leadId
  });
  return true;
}

export function updateLeadStatusViaAI(leadId: string, newStatus: LeadStatus): { success: boolean; message: string } {
  const store = useStore.getState();
  const lead = store.leads.find(l => l.id === leadId);
  
  if (!lead) {
    return { success: false, message: `Lead with ID ${leadId} not found.` };
  }
  
  if (String(lead.status) === String(newStatus)) {
    return { success: true, message: `Lead is already marked as ${STATUS_LABELS[newStatus] || String(newStatus)}.` };
  }
  
  const currentStatus = String(lead.status) as LeadStatus;
  const allowedNextSteps = STATUS_FLOW[currentStatus] || [];
  if (!allowedNextSteps.includes(newStatus)) {
    return { 
      success: false, 
      message: `Invalid status transition. Cannot move from '${STATUS_LABELS[currentStatus] || currentStatus}' to '${STATUS_LABELS[newStatus] || String(newStatus)}'. Allowed next steps: ${allowedNextSteps.map(s => STATUS_LABELS[s]).join(', ')}` 
    };
  }
  
  const currentUser = store.currentUser?.id || 'system';
  store.updateLeadStatus(leadId, newStatus, currentUser);
  
  return { success: true, message: `Successfully updated lead status to '${STATUS_LABELS[newStatus] || newStatus}'` };
}

export function createLeadViaAI(leadData: Partial<Lead>): { success: boolean; message: string; leadId?: string } {
  const store = useStore.getState();
  const currentUser = store.currentUser?.id || 'system';
  
  if (!leadData.name && !leadData.propertyAddress) {
    return { success: false, message: 'A lead requires at least a name or property address.' };
  }
  
  store.addLead({
    name: leadData.name || 'Unknown',
    email: leadData.email || '',
    phone: leadData.phone || '',
    status: 'new',
    source: 'other',
    propertyAddress: leadData.propertyAddress || '',
    propertyType: 'single-family',
    estimatedValue: 0,
    offerAmount: 0,
    lat: 30.2672,
    lng: -97.7431,
    sqft: 0,
    bedrooms: 0,
    bathrooms: 0,
    documents: [],
    notes: leadData.notes || 'Created via AI Assistant',
    assignedTo: currentUser,
    probability: 50,
    engagementLevel: 1,
    timelineUrgency: 1,
    competitionLevel: 1,
  });
  
  return { success: true, message: `Successfully created new lead: ${leadData.name || leadData.propertyAddress}` };
}

export function updateLeadViaAI(leadId: string, updates: Partial<Lead>): { success: boolean; message: string } {
  const store = useStore.getState();
  const lead = store.leads.find(l => l.id === leadId);
  
  if (!lead) return { success: false, message: `Lead with ID ${leadId} not found.` };
  
  store.updateLead(leadId, updates);
  return { success: true, message: `Successfully updated lead: ${lead.name || lead.propertyAddress}` };
}

export function deleteLeadViaAI(leadId: string): { success: boolean; message: string } {
  const store = useStore.getState();
  const lead = store.leads.find(l => l.id === leadId);
  
  if (!lead) return { success: false, message: `Lead with ID ${leadId} not found.` };
  
  store.deleteLead(leadId);
  return { success: true, message: `Successfully deleted lead: ${lead.name || lead.propertyAddress}` };
}

export function getTeamAvailability() {
  const store = useStore.getState();
  return store.team.map(m => ({ name: m.name, role: m.role, status: m.presenceStatus }));
}


export async function sendSMSViaAI(target: string, message: string, targetCarrier?: string): Promise<{ success: boolean; message: string; formattedPhone?: string }> {
  const store = useStore.getState();
  const currentUser = store.currentUser;
  
  // Resolve Target Phone from Leads
  let phoneToUse = target;
  const lead = store.leads.find(l =>
    (l.name && l.name.toLowerCase().includes(target.toLowerCase())) ||
    (l.phone && l.phone.replace(/\D/g, '').includes(target.replace(/\D/g, '')))
  );
  
  if (lead && lead.phone) {
    phoneToUse = lead.phone;
  }

  const carrier = targetCarrier || lead?.carrier || 'Unknown';
  
  console.log(`[SMS AI] Delegating send to sms-service for: ${phoneToUse} (${carrier})`);
  
  const result = await sendSMS(phoneToUse, message, carrier);
  
  if (result.success && currentUser) {
    // Record in Supabase so it shows up in the SMS Inbox
    if (isSupabaseConfigured && supabase) {
      const formattedForSend = result.formattedPhone || phoneToUse.replace(/\D/g, '');
      
      supabase.from('sms_messages').insert({
        user_id: currentUser.id,
        lead_id: lead?.id ?? null,
        phone_number: formattedForSend,
        content: message,
        direction: 'outbound',
        carrier: carrier !== 'Unknown' ? carrier : null,
        is_read: true
      }).then(({ error }: { error: any }) => {
        if (error) console.error('[SMS AI] Failed to log to DB:', error);
      });
    }
  }

  return {
    success: result.success,
    message: result.message,
    formattedPhone: result.formattedPhone
  };
}

/**
 * Helper to fetch today's calendar events and tasks to provide to Gemini.
 */
export function getTodaysSchedule() {
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Get tasks due today from useStore
  const store = useStore.getState();
  const tasksToday = store.tasks.filter(t => t.dueDate && t.dueDate.startsWith(today));
  
  // 2. Get local calendar events (Calendar.tsx stores these in localStorage)
  let eventsToday = [];
  try {
    const saved = localStorage.getItem('calendarEvents');
    if (saved) {
      const parsed = JSON.parse(saved);
      eventsToday = parsed.filter((e: any) => e.start && e.start.startsWith(today));
    }
  } catch (err) {
    console.error('Could not parse calendarEvents from localStorage', err);
  }

  return {
    tasksDueToday: tasksToday.map(t => ({ title: t.title, status: t.status, priority: t.priority })),
    calendarEventsToday: eventsToday.map((e: any) => ({ title: e.title, start: e.start, end: e.end }))
  };
}

/**
 * Look up leads by name or partial address from the useStore.
 * Returns formatted details optimized for AI context.
 */
export function lookupLeads(query?: string) {
  const store = useStore.getState();
  const allLeads = store.leads || [];
  
  let filtered = allLeads;
  if (query) {
    const q = query.toLowerCase();
    filtered = allLeads.filter(l => 
      (l.name && l.name.toLowerCase().includes(q)) || 
      (l.propertyAddress && l.propertyAddress.toLowerCase().includes(q))
    );
  }

  // Format nicely for the AI to understand
  return filtered.map(l => ({
    name: l.name || 'Unknown',
    status: l.status || 'new',
    address: l.propertyAddress || 'No address',
    estimatedValue: l.estimatedValue || 0,
    phone: l.phone || 'No phone',
    email: l.email || 'No email'
  }));
}

/**
 * Helper to check if the current user has a Gemini API key configured.
 */
export async function hasUserApiKey(): Promise<boolean> {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('user_connections')
        .select('refresh_token, access_token')
        .eq('user_id', userId)
        .eq('provider', 'gemini')
        .maybeSingle();
      return !!data?.refresh_token;
    } catch (err) {
      console.error('Error checking for user API key:', err);
      return false;
    }
  } else {
    return !!localStorage.getItem('user_gemini_api_key');
  }
}

export async function generateCallScript(lead: Lead, _customContext?: string): Promise<string> {
  const templates = await generateCallScriptTemplates(lead);
  return templates[0].script;
}

/**
 * OS Bot Processing Fallback
 * Tries to handle the prompt locally before falling back to external APIs.
 */
export async function processWithLocalAI(prompt: string): Promise<GeminiResponse | null> {
  const localResult = recognizeIntent(prompt);
  
  if (localResult.confidence >= 0.7) {
    console.log(`[🤖 OS Bot] Handling intent: ${localResult.intent} (${Math.round(localResult.confidence * 100)}%)`);
    const executionResult = await executeTask(localResult.intent, localResult.entities);
    const responseText = generateResponse(localResult.intent, executionResult);
    
    saveConversation(responseText, 'assistant');
    
    return {
      intent: localResult.intent,
      response: responseText,
      data: { ...localResult.entities, ...executionResult.data },
      systemLog: '🤖 OS Bot'
    };
  }
  
  return null;
}

/**
 * Sends a prompt and context to the Gemini API and returns a parsed intent and response.
 * Strictly requires a user-configured API key from settings.
 */
export async function processPrompt(prompt: string, context: Record<string, any> = {}, modelOverride?: string, signal?: AbortSignal): Promise<GeminiResponse> {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  
  // Save user message to local memory
  saveConversation(prompt, 'user');

  // ── OS BOT ENGINE (PRIORITY) ──────────────────────────────────────
  if (!context?.test) {
    const localResponse = await processWithLocalAI(prompt);
    if (localResponse) return localResponse;
    console.log(`[🤖 OS Bot] Low confidence, falling back to external API...`);
  }
  // ───────────────────────────────────────────────────────────────────────



  
  let provider: 'gemini'|'openai'|'anthropic'|'local' = 'gemini';
  let apiKey = '';
  let model = modelOverride || '';

  // 1. Resolve Provider, Model, and Key
  if (userId) {
    if (isSupabaseConfigured && supabase) {
      try {
        // Get active provider from profile
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', userId).maybeSingle();
        provider = profile?.settings?.active_ai_provider || 'gemini';
        if (!model) model = profile?.settings?.active_ai_model || '';

        // Get key for that provider
        const { data: conn } = await supabase
          .from('user_connections')
          .select('refresh_token, access_token')
          .eq('user_id', userId)
          .eq('provider', provider)
          .maybeSingle();
        
        if (conn?.refresh_token) apiKey = conn.refresh_token;
        if (!model && conn?.access_token && conn.access_token !== 'active') model = conn.access_token;
      } catch (err) {
        console.error('Error fetching provider/key:', err);
      }
    }
    
    // Fallback to local storage
    if (!apiKey) {
      provider = (localStorage.getItem('user_ai_provider') as any) || 'local';
      model = localStorage.getItem('user_ai_model') || '';
      
      if (provider === 'gemini') {
        apiKey = localStorage.getItem('user_gemini_api_key') || '';
        if (!model || !model.startsWith('gemini')) model = 'gemini-2.0-flash';
      } else if (provider === 'openai') {
        apiKey = localStorage.getItem('user_openai_api_key') || '';
        if (!model || !model.startsWith('gpt')) model = 'gpt-4o';
      } else if (provider === 'anthropic') {
        apiKey = localStorage.getItem('user_anthropic_api_key') || '';
        if (!model || !model.startsWith('claude')) model = 'claude-3-5-sonnet-latest';
      } else if (provider === 'local') {
        apiKey = 'local';
        model = 'local-engine';
      }
    } else {
      // Even if we have a key (from Supabase), validate the model-provider combo
      if (provider === 'gemini' && !model.startsWith('gemini')) model = 'gemini-2.0-flash';
      if (provider === 'openai' && !model.startsWith('gpt')) model = 'gpt-4o';
      if (provider === 'anthropic' && !model.startsWith('claude')) model = 'claude-3-5-sonnet-latest';
    }
  }

  // CRITICAL: Final safeguard against model name mismatch in URL construction
  if (provider === 'gemini') {
    // Map unsupported/hallucinated model strings (like gemini-3.x) to functional alternatives
    if (model.includes('3.1-flash-lite') || !model.startsWith('gemini')) {
      model = 'gemini-2.0-flash';
    }
  }
  if (provider === 'openai' && !model.startsWith('gpt')) model = 'gpt-4o';
  if (provider === 'anthropic' && !model.startsWith('claude')) model = 'claude-3-5-sonnet-latest';

  if (!apiKey && provider !== 'local') {
    return {
      intent: 'redirect_setup',
      response: `Your AI provider (${provider}) API key is missing. Please configure it in the AI Settings page.`
    };
  }

  // 1.5 - Intercept Local Provider
  if (provider === 'local' || provider === (null as any)) {
    const localResult = recognizeIntent(prompt);
    let executionResult;
    
    if (localResult.confidence > 0.4) {
      executionResult = await executeTask(localResult.intent, localResult.entities);
    }

    const responseText = generateResponse(localResult.intent, executionResult);
    
    saveConversation(responseText, 'assistant');
    
    return {
      intent: localResult.intent,
      response: responseText,
      data: localResult.entities || executionResult?.data || null
    };
  }

  const schedule = context.test ? { tasksDueToday: [], calendarEventsToday: [] } : getTodaysSchedule();
  const leadsRaw = context.test ? [] : lookupLeads();
  const todaysTasks = context.test ? [] : getTodaysTasks();
  const allTasks = context.test ? [] : useStore.getState().tasks;
  // Get AI Personality from profiles.settings
  let aiName = localStorage.getItem('user_ai_name') || 'OS Bot';
  let aiTone = localStorage.getItem('user_ai_tone') || 'friendly';
  let aiPersonality = localStorage.getItem('user_ai_personality') || '';

  if (userId && isSupabaseConfigured && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .maybeSingle();
      
      if (profile?.settings?.ai_name) aiName = profile.settings.ai_name;
      if (profile?.settings?.ai_personality) aiPersonality = profile.settings.ai_personality;
      if (profile?.settings?.ai_tone) aiTone = profile.settings.ai_tone;
    } catch (err) {}
  }

  const enhancedContext = {
    ...context,
    userPreferences: { aiName, aiTone, aiPersonality },
    todaysSchedule: schedule,
    todaysTasks: todaysTasks,
    allTasks: allTasks,
    teamAvailability: context.test ? [] : getTeamAvailability(),
    availableLeads: leadsRaw.length > 50 
      ? `Total Leads: ${leadsRaw.length}. Showing first 50: ${JSON.stringify(leadsRaw.slice(0, 50))}` 
      : leadsRaw
  };

  const toneInstructions = {
    friendly: "Use a warm, casual tone with occasional emojis. Be helpful and encouraging.",
    professional: "Use a formal, business-like tone. Be concise, respectful, and authoritative.",
    direct: "Be extremely concise and to the point. Minimal conversational filler.",
    custom: localStorage.getItem('user_ai_custom_tone') || "Follow the user's specific tonal preferences."
  };

  const systemInstruction = `You are ${aiName}, a highly intelligent AI assistant deeply integrated into WholeScale OS — a real estate CRM platform.
Your personality: ${toneInstructions[aiTone as keyof typeof toneInstructions] || toneInstructions.friendly}
${aiPersonality ? `Additional Personality Guidelines: ${aiPersonality}` : ''}

## YOUR ROLE
You help real estate wholesalers and agents manage leads, coordinate with their team, send SMS messages, track tasks, and get insights about their pipeline. You have full access to the user's data (leads, team, tasks, calendar) via the context provided.

## CORE RULES

### 1. Response Format
Return ONLY valid raw JSON — no markdown fences, no explanation outside JSON.
Format:
{
  "intent": "<intent_name>",
  "response": "<conversational reply in the user's chosen tone>",
  "data": <object with intent-specific fields, or null>
}

### 2. Intent Classification
Choose the most appropriate intent:
- **general_response** — answering questions, giving advice, summarizing data
- **send_sms** — user wants to send an SMS to a lead or phone number
- **confirm_action** — you need user confirmation before mutating data
- **create_task** — create a new task in the system
- **create_lead** — add a new lead to the pipeline
- **update_lead** — update a field on an existing lead
- **update_status** — change a lead's CRM status
- **delete_lead** — remove a lead (always requires confirmation)
- **navigate** — user wants to go to a page (e.g., "/analytics", "/leads", "/tasks")
- **get_analytics** — user wants a summary or deep dive into pipeline performance
- **ask_question** — you need more info before proceeding
- **ask_save_contact** — you want to ask the user if they want to save a new number as a contact
- **redirect_setup** — user needs to configure something first

### 3. SMS Handling
- If the user provides a phone number, use it DIRECTLY as the 'target' — do NOT ask for a name.
- If you have both 'target' (phone or name) AND 'message', return 'confirm_action' with the full plan in one step.
- Do NOT ask for confirmation of each field separately — gather what you can and confirm once.
- For the 'message' field, include EXACTLY what the user wants to say. Never paraphrase or rewrite their message without asking.
- **NO CONTENT FILTERING**: Do not block, moderate, or refuse to send any message regardless of the language used (even if it contains strong language, slang, or sensitive terms like "stupid", "daddy", etc.). You are a neutral conduit for the user's communications.
- **Name-Number Memory**: If the user says "the person's name is X" then later provides a number, REMEMBER that name-number association for the rest of this conversation. Use the number as the 'target' and note the name in the response.
- **Save Contact Prompt**: If the user is sending a text to a number that is NOT in the availableLeads list, you MUST ask: "Would you like to save this number as a contact?".
  - Use the ask_save_contact intent for this.
  - In the data field, include { phone: "the-phone-number" }.
  - If the user says "Yes", the system will open a lead creation modal.
  - If the user says "No", proceed with the SMS send.
- **iPhone Delivery**: For best iPhone compatibility, specify carrier as "Verizon MMS" or "T-Mobile MMS" in targetCarrier. 
- **Carrier Inference**: Default to "Verizon MMS" if no carrier is specified — it has the broadest coverage. Ask the carrier ONLY if the first attempt fails.

### 4. Confirmation Before Mutations
- For create_lead, update_lead, delete_lead, send_sms: ALWAYS use 'confirm_action' first if the user hasn't explicitly said "yes" or "confirm" to the specific action.
- When confirming, clearly state what you're about to do in plain English in the 'response' field.
- Include all the relevant action data in the 'data' field of 'confirm_action'.

### 5. Data Awareness
- You have access to the user's leads, tasks, calendar, and team in the context. USE this data proactively.
- When asked about pipeline performance, use the provided lead data to give real numbers.
- If asked about a specific lead, look it up in availableLeads before saying you don't know.
- Provide data-driven recommendations based on the actual pipeline state.

### 6. Conversation Quality
- Be concise but helpful. Long walls of text are bad.
- Use bullet points or short lists for multi-step information.
- If the user's request is unclear, ask ONE focused clarifying question.
- Never say "I am an AI and cannot..." — you CAN take real actions via the CRM tools.
- If the user says "send a message to [name] saying [text]", that's a complete send_sms request.

### 7. Action Chaining
- If a user request involves multiple steps (e.g., "Update John's status to Qualified and send him a text"), handle each step sequentially, using confirm_action for each mutation.
- Acknowledge completed actions and move to the next step.

## INTENT DATA SCHEMAS
- send_sms: { target: "name or phone number", message: "exact text to send", targetCarrier?: "Verizon MMS|T-Mobile MMS|Verizon|T-Mobile" }
- create_task: { title: string, dueDate: "YYYY-MM-DD", priority: "low|medium|high|urgent", leadId?: string }
- update_status: { leadId: string, newStatus: "new|contacted|qualified|negotiating|closed-won|closed-lost" }
- create_lead: { name: string, phone?: string, email?: string, propertyAddress?: string, estimatedValue?: number, notes?: string }
- update_lead: { leadId: string, ...fields to update }
- delete_lead: { leadId: string }
- navigate: { path: string (e.g. "/leads", "/settings", "/calendar") }
- confirm_action: { intent: string, ...all data needed to execute the confirmed action }

## CURRENT CONTEXT
User: ${store.currentUser?.name} (${store.currentUser?.email})
Page: ${context.page || 'unknown'}
Time: ${context.currentTime || new Date().toISOString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); 
  const combinedSignal = signal ? ((AbortSignal as any).any ? (AbortSignal as any).any([controller.signal, signal]) : signal) : controller.signal;

  try {
    let textData = '';

    if (provider === 'gemini') {
      const apiVersion = (model.includes('1.5') || model.includes('2.0') || model.includes('2.5') || model.includes('exp')) ? 'v1beta' : 'v1';
      const res = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: combinedSignal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nContext: ${JSON.stringify(enhancedContext)}\n\nUser Prompt: ${prompt}` }] }],
          generationConfig: { temperature: 0.2 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error("RATE_LIMIT");
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || res.statusText);
      }
      const data = await res.json();
      textData = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        signal: combinedSignal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Context: ${JSON.stringify(enhancedContext)}\n\nUser Prompt: ${prompt}` }
          ],
          temperature: 0.2
        })
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      textData = data.choices?.[0]?.message?.content;
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        signal: combinedSignal,
        body: JSON.stringify({
          model,
          system: systemInstruction,
          messages: [{ role: 'user', content: `Context: ${JSON.stringify(enhancedContext)}\n\nUser Prompt: ${prompt}` }],
          max_tokens: 1500,
          temperature: 0.2
        })
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      textData = data.content?.[0]?.text;
    }

    clearTimeout(timeoutId);

    if (!textData) {
      throw new Error(`Received an empty response from ${provider}`);
    }

    // Attempt to extract and parse the valid JSON
    try {
      const jsonMatch = textData.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : textData;
      const parsed = JSON.parse(jsonStr);
      
      let finalResponse = parsed.response || textData;
      if (typeof finalResponse === 'string' && finalResponse.trim().startsWith('{')) {
        try {
          const innerParsed = JSON.parse(finalResponse);
          if (innerParsed.response) finalResponse = innerParsed.response;
        } catch (e) {}
      }

      return {
        intent: parsed.intent || 'unknown',
        response: finalResponse,
        data: parsed.data
      };
    } catch (parseError) {
      console.error(`Failed to parse ${provider} response as JSON:`, textData);
      return {
        intent: 'unknown',
        response: textData
      };
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // SMART FALLBACK: If model is not found, retry with a cascade of valid models
    if (error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('invalid model') || error.message?.toLowerCase().includes('404') || error.message?.toLowerCase().includes('not supported')) {
      const geminiFallbackChain = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      const nextFallback = geminiFallbackChain.find(m => m !== model);
      
      if (nextFallback && (!modelOverride || modelOverride !== nextFallback)) {
        console.warn(`Model ${model} not found for ${provider}. Retrying with ${nextFallback}...`);
        return processPrompt(prompt, context, nextFallback, signal);
      }
    }

    console.error(`Error processing prompt with ${provider}:`, error);
    
    if (error.message === "RATE_LIMIT" || error.message?.includes('429')) {
      console.warn(`[AI Fallback] Rate limit reached for ${provider}. Falling back to OS Bot...`);
      
      // Try local processing first
      const localFallback = await processWithLocalAI(prompt);
      if (localFallback) {
        return {
          ...localFallback,
          systemLog: `🤖 OS Bot`
        };
      }

      // If OS Bot is low confidence, try a generic local response instead of an error
      const lowConfidenceLocal = recognizeIntent(prompt);
      const executionResult = await executeTask(lowConfidenceLocal.intent, lowConfidenceLocal.entities);
      const responseText = generateResponse(lowConfidenceLocal.intent, executionResult);
      
      return {
        intent: lowConfidenceLocal.intent,
        response: responseText,
        data: lowConfidenceLocal.entities,
        systemLog: `🤖 OS Bot`
      };
    }

    if (error.name === 'AbortError') {
      return {
        intent: 'error',
        response: 'AI request timed out after 30 seconds. This might be a network issue or the model is overloaded. Please try again.'
      };
    }

    return {
      intent: 'error',
      response: error instanceof Error ? error.message : `An unexpected error occurred while communicating with ${provider}.`
    };
  }
}
