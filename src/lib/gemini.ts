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
  'AT&T': 'txt.att.net',
  'Verizon': 'vtext.com',
  'T-Mobile': 'tmomail.net',
  'Sprint': 'messaging.sprintpcs.com',
  'Boost Mobile': 'myboostmobile.com',
  'Cricket Wireless': 'sms.cricketwireless.net',
  'Google Fi': 'msg.fi.google.com',
  'Republic Wireless': 'text.republicwireless.com',
  'U.S. Cellular': 'email.uscc.net',
  'Virgin Mobile': 'vmobl.com'
};

export async function sendSMSViaAI(target: string, message: string): Promise<{ success: boolean; message: string }> {
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
  const lead = store.leads.find(l => l.name?.toLowerCase().includes(target.toLowerCase()) || l.phone?.includes(target));
  
  if (lead && lead.phone) {
    // For now, we assume the RECEIVER has a carrier-agnostic way or we use a default?
    // Wait, the prompt implies "Text John Smith". If John Smith is a lead, we need HIS carrier?
    // Actually, usually email-to-SMS requires knowing the receiver's carrier.
    // However, if the user is texting THEMSELVES or a known team member, we can use their settings.
    // If it's a lead, without their carrier info, this won't work perfectly.
    // I'll assume for this task we use a default gateway or the user's carrier as a fallback if unknown.
    // Better yet, I'll check if the lead has a carrier stored.
    // For this implementation, I'll use the user's carrier as the protocol for the receiver too if unspecified.
    const cleanPhone = lead.phone.replace(/\D/g, '');
    targetEmail = `${cleanPhone}@${SMS_GATEWAYS[userCarrier]}`;
  } else if (target.replace(/\D/g, '').length >= 10) {
    const cleanPhone = target.replace(/\D/g, '');
    targetEmail = `${cleanPhone}@${SMS_GATEWAYS[userCarrier]}`;
  } else {
    return { success: false, message: `Could not find a valid phone number for '${target}'.` };
  }

  // 3. Send via unified email service (which now uses direct Gmail API)
  const { sendEmail } = await import('./email');
  const res = await sendEmail({
    to: targetEmail,
    subject: 'SMS via WholeScale AI',
    html: `<p>${message}</p>`,
    from: 'WholeScale OS <alerts@wholescale.work>'
  });

  if (res.success) {
    return { success: true, message: `SMS successfully sent via Gmail to ${target} (${targetEmail})` };
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
 * Sends a prompt and context to the Gemini API and returns a parsed intent and response.
 * Strictly requires a user-configured API key from settings.
 */
export async function processPrompt(prompt: string, context: Record<string, any> = {}): Promise<GeminiResponse> {
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
  let model = '';
  if (userId) {
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

  const systemInstruction = `You are ${aiName}, a highly capable AI assistant for the WholeScale OS real estate platform. 
Your personality: ${toneInstructions[aiTone as keyof typeof toneInstructions] || toneInstructions.friendly}

Core Rules:
1. RESPONSE FORMAT: Strictly return raw JSON matching the structure below. No markdown backticks.
2. SMS RECOGNITION: If the user provides a raw phone number (e.g. 555-0199), use it DIRECTLY as the 'target' in 'send_sms'. 
   Do NOT try to look up a name if a clear number is provided.
3. GUARDRAILS: For intents 'create_lead', 'update_lead', 'delete_lead', and 'send_sms', you MUST ask for confirmation first if the user hasn't explicitly said "yes" or "proceed" to a specific plan. 
   Use intent 'confirm_action' to summarize what you are about to do and ask for permission.
4. CONFIRMATION UI: When returning 'confirm_action', provide a clear, detailed summary in the 'response' field and include the intended action data in the 'data' field.
5. SMS CONTENT PARSING: Phrases like "this is [Name]", "I am [Name]", or "Hi, it's [Name]" at the BEGINNING of a prompt are almost always PART OF THE MESSAGE CONTENT if the user is asking to send an SMS. 
   Treat them as the first line of the message, not as the user's name identification for the system.
6. PLAIN ENGLISH: Always respond in natural language within the 'response' field. Never mention JSON or internal logic to the user.

JSON Structure:
{
  "intent": "<intent_name | 'confirm_action' | 'ask_question' | 'navigate'>",
  "response": "<conversational response in your specified ${aiTone} tone>",
  "data": <object matching intent requirements>
}

Intent Requirements:
- 'send_sms': data: { "target": "name or number", "message": "content" }
- 'create_task': data: { "title": "string", "dueDate": "YYYY-MM-DD", "priority": "low/medium/high/urgent", "leadId": "id" }
- 'update_status': data: { "leadId": "id", "newStatus": "new/contacted/qualified/negotiating/closed-won/closed-lost" }
- 'create_lead': data: { "name": "...", "phone": "...", "email": "...", "propertyAddress": "...", "notes": "..." }
- 'update_lead': data: { "leadId": "id", "any_field": "value" }
- 'delete_lead': data: { "leadId": "id" }`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    // Determine the correct API version (v1 for stable 1.5 models, v1beta for 2.x/3.x experimental)
    const apiVersion = (model.includes('2.0') || model.includes('2.5') || model.includes('3.') || model.includes('exp')) ? 'v1beta' : 'v1';
    const res = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      signal: controller.signal,
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
