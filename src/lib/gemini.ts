import { useStore, TaskPriority, LeadStatus, STATUS_FLOW, STATUS_LABELS } from '../store/useStore';
import type { Lead } from '../store/useStore';
import { supabase, isSupabaseConfigured } from './supabase';

export interface GeminiResponse {
  intent: string;
  response: string;
  data?: any;
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
  
  if (lead.status === newStatus) {
    return { success: true, message: `Lead is already marked as ${STATUS_LABELS[newStatus] || newStatus}.` };
  }
  
  const allowedNextSteps = STATUS_FLOW[lead.status] || [];
  if (!allowedNextSteps.includes(newStatus)) {
    return { 
      success: false, 
      message: `Invalid status transition. Cannot move from '${STATUS_LABELS[lead.status]}' to '${STATUS_LABELS[newStatus]}'. Allowed next steps: ${allowedNextSteps.map(s => STATUS_LABELS[s]).join(', ')}` 
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

export const SMS_GATEWAYS: Record<string, string> = {
  // Standard SMS-to-email gateways
  'AT&T': 'txt.att.net',
  'Verizon': 'vtext.com',
  'T-Mobile': 'tmomail.net',
  'Sprint': 'messaging.sprintpcs.com',
  'Boost Mobile': 'myboostmobile.com',
  'Cricket Wireless': 'sms.cricketwireless.net',
  'Google Fi': 'msg.fi.google.com',
  'Republic Wireless': 'text.republicwireless.com',
  'U.S. Cellular': 'email.uscc.net',
  'Virgin Mobile': 'vmobl.com',
  // MMS gateways (better for iPhone recipients on major carriers)
  'AT&T MMS': 'mms.att.net',
  'Verizon MMS': 'vzwpix.com',
  'T-Mobile MMS': 'tmomail.net',  // T-Mobile uses same gateway for both
  'Sprint MMS': 'pm.sprint.com',
};

export async function sendSMSViaAI(target: string, message: string, targetCarrier?: string): Promise<{ success: boolean; message: string }> {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return { success: false, message: 'User not authenticated.' };

  // 1. Get User Preferences for SMS
  let userPhone = '';
  let userCarrier = '';

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('agent_preferences').select('phone_number, carrier').eq('user_id', userId).maybeSingle();
    if (data) {
      userPhone = data.phone_number;
      userCarrier = data.carrier;
    }
  } else {
    userPhone = localStorage.getItem('user_sms_phone') || '';
    userCarrier = localStorage.getItem('user_sms_carrier') || '';
  }

  if (!userPhone || !userCarrier) {
    return { success: false, message: 'SMS settings not configured. Please set your phone and carrier in SMS Settings.' };
  }

  // 2. Resolve Target (could be a lead name, or a raw number)
  let targetEmail = '';
  let targetPhone = '';
  const lead = store.leads.find(l => l.name?.toLowerCase().includes(target.toLowerCase()) || l.phone?.includes(target));
  
  // Use explicit target carrier if provided, otherwise fallback to user's carrier
  const effectiveTargetCarrier = targetCarrier || userCarrier;
  
  // Try MMS variant first for better iPhone compatibility, fallback to SMS
  const mmsKey = effectiveTargetCarrier + ' MMS';
  const gateway = SMS_GATEWAYS[mmsKey] || SMS_GATEWAYS[effectiveTargetCarrier] || SMS_GATEWAYS['Verizon'];

  if (lead && lead.phone) {
    const cleanPhone = lead.phone.replace(/\D/g, '');
    targetPhone = cleanPhone;
    targetEmail = `${cleanPhone}@${gateway}`;
  } else if (target.replace(/\D/g, '').length >= 10) {
    const cleanPhone = target.replace(/\D/g, '');
    targetPhone = cleanPhone;
    targetEmail = `${cleanPhone}@${gateway}`;
  } else {
    return { success: false, message: `Could not find a valid phone number for '${target}'.` };
  }

  // 3. Send via unified email service (which now uses direct Gmail API)
  const { sendEmail } = await import('./email');
  const res = await sendEmail({
    to: targetEmail,
    subject: '',  // Blank subject works better for SMS gateway delivery
    text: message,
    from: `${store.currentUser?.name} <${store.currentUser?.email}>`
  });

  if (res.success) {
    return { success: true, message: `SMS sent to ${targetPhone} via ${effectiveTargetCarrier} gateway (${gateway}). Note: iPhone users may need the carrier set to their actual carrier (AT&T MMS, Verizon MMS, etc.) for reliable delivery.` };
  } else {
    return { success: false, message: `Failed to send SMS via Gmail: ${res.error}` };
  }
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

/**
 * Generates a call script based on lead information and conversation history.
 */
export async function generateCallScript(lead: Lead, customContext?: string): Promise<string> {
  const prompt = `Generate a persuasive and professional real estate call script for the follow lead:
Lead Name: ${lead.name}
Property: ${lead.propertyAddress} (${lead.propertyType})
Estimated Value: $${lead.estimatedValue}
Status: ${STATUS_LABELS[lead.status] || lead.status}
Notes: ${lead.notes}

${customContext ? `Additional Context: ${customContext}` : ''}

The script should include:
1. A warm opening.
2. A clear reason for the call (discussing their property/interest).
3. Discovery questions to uncover pain points or motivation.
4. Handling potential objections based on the lead status.
5. A clear call to action (next appointment/follow-up).

Return ONLY the script content, formatted for readability.`;

  const res = await processPrompt(prompt, { lead });
  return res.response;
}

/**
 * Sends a prompt and context to the Gemini API and returns a parsed intent and response.
 * Strictly requires a user-configured API key from settings.
 */
export async function processPrompt(prompt: string, context: Record<string, any> = {}, modelOverride?: string, signal?: AbortSignal): Promise<GeminiResponse> {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  let apiKey = '';

  // Only use user-specific key
  if (userId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('user_connections')
          .select('refresh_token')
          .eq('user_id', userId)
          .eq('provider', 'gemini')
          .maybeSingle();
        if (data?.refresh_token) {
          apiKey = data.refresh_token;
        }
      } catch (err) {
        console.error('Error fetching user API key:', err);
      }
    } else {
      const localKey = localStorage.getItem('user_gemini_api_key');
      if (localKey) apiKey = localKey;
    }
  }
  
  if (!apiKey) {
    console.warn('Gemini API key is missing.');
    return {
      intent: 'redirect_setup',
      response: 'Gemini API key is missing. Please configure your personal API key in the AI Settings page to use the assistant.'
    };
  }

  const schedule = context.test ? { tasksDueToday: [], calendarEventsToday: [] } : getTodaysSchedule();
  const leadsRaw = context.test ? [] : lookupLeads();
  const todaysTasks = context.test ? [] : getTodaysTasks();
  const allTasks = context.test ? [] : useStore.getState().tasks;
  
  // Get preferred model
  let model = modelOverride || '';
  if (!model && userId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('user_connections')
          .select('access_token')
          .eq('user_id', userId)
          .eq('provider', 'gemini')
          .maybeSingle();
        if (data?.access_token && data.access_token !== 'active') model = data.access_token;
      } catch (err) {}
    }
    if (!model) model = localStorage.getItem('user_gemini_model') || 'gemini-2.5-flash-lite';
  } else {
    model = 'gemini-2.5-flash-lite';
  }
  
  // Get AI Personality from profiles.settings
  let aiName = localStorage.getItem('user_ai_name') || 'AI Assistant';
  let aiTone = localStorage.getItem('user_ai_tone') || 'friendly';

  if (userId && isSupabaseConfigured && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .maybeSingle();
      
      if (profile?.settings?.ai_name) aiName = profile.settings.ai_name;
      if (profile?.settings?.ai_tone) aiTone = profile.settings.ai_tone;
    } catch (err) {}
  }

  const enhancedContext = {
    ...context,
    userPreferences: { aiName, aiTone },
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
- **navigate** — user wants to go to a page
- **ask_question** — you need more info before proceeding
- **redirect_setup** — user needs to configure something first

### 3. SMS Handling
- If the user provides a phone number, use it DIRECTLY as the 'target' — do NOT ask for a name.
- If you have both 'target' (phone or name) AND 'message', return 'confirm_action' with the full plan in one step.
- Do NOT ask for confirmation of each field separately — gather what you can and confirm once.
- For the 'message' field, include EXACTLY what the user wants to say. Never paraphrase or rewrite their message without asking.
- **Name-Number Memory**: If the user says "the person's name is X" then later provides a number, REMEMBER that name-number association for the rest of this conversation. Use the number as the 'target' and note the name in the response.
- **iPhone Delivery**: For best iPhone compatibility, specify carrier as "AT&T MMS", "Verizon MMS", or "T-Mobile MMS" in targetCarrier. If the user just says "AT&T", use "AT&T MMS" for MMS gateway which works better with iPhones.
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
- send_sms: { target: "name or phone number", message: "exact text to send", targetCarrier?: "Verizon MMS|AT&T MMS|T-Mobile MMS|Verizon|AT&T|T-Mobile|Sprint" }
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
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  // Combine internal timeout signal with external caller signal if provided
  const combinedSignal = signal ? ((AbortSignal as any).any ? (AbortSignal as any).any([controller.signal, signal]) : signal) : controller.signal;

  try {
    // Determine the correct API version (v1 for stable 1.5 models, v1beta for 2.x/3.x experimental)
    const apiVersion = (model.includes('2.0') || model.includes('2.5') || model.includes('3.') || model.includes('exp')) ? 'v1beta' : 'v1';
    const res = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      signal: combinedSignal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nContext: ${JSON.stringify(enhancedContext)}\n\nUser Prompt: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
        }
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        const errorData = await res.json().catch(() => null);
        console.error('Gemini Rate Limit Hit [429]:', errorData?.error);
        return {
          intent: 'rate_limit',
          response: errorData?.error?.message || "You've reached your rate limit for the Gemini API. Please wait a moment before trying again.",
          data: { 
            retryAfter: 60,
            error: errorData?.error
          }
        };
      }
      
      const errorData = await res.json().catch(() => null);
      console.error('Gemini API Error Response:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData?.error
      });
      
      throw new Error(`Gemini API Error [${res.status}]: ${errorData?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const textData = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textData) {
      throw new Error('Received an empty valid response from Gemini API');
    }

    // Attempt to extract and parse the valid JSON
    try {
      // Find the JSON-like structure (between { and })
      // This handles triple backticks and other surrounding text
      const jsonMatch = textData.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : textData;
      
      const parsed = JSON.parse(jsonStr);
      
      // If the parsed response is still an object-like string, clean it again
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
      console.error('Failed to parse Gemini response as JSON:', textData);
      return {
        intent: 'unknown',
        response: textData
      };
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Error processing prompt with Gemini:', error);
    
    if (error.name === 'AbortError') {
      return {
        intent: 'error',
        response: 'AI request timed out after 30 seconds. This might be a network issue or the model is overloaded. Please try again.'
      };
    }

    return {
      intent: 'error',
      response: error instanceof Error ? error.message : 'An unexpected error occurred while communicating with Gemini.'
    };
  }
}
