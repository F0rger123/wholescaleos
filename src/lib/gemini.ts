import { useStore, TaskPriority, LeadStatus, STATUS_FLOW, STATUS_LABELS } from '../store/useStore';
import type { Lead } from '../store/useStore';
import { supabase, isSupabaseConfigured } from './supabase';

export interface GeminiResponse {
  intent: string;
  response: string;
  data?: any;
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
        .select('refresh_token')
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

  const schedule = getTodaysSchedule();
  const leads = lookupLeads();
  const todaysTasks = getTodaysTasks();
  const allTasks = useStore.getState().tasks;
  
  const enhancedContext = {
    ...context,
    todaysSchedule: schedule,
    todaysTasks: todaysTasks,
    allTasks: allTasks,
    teamAvailability: getTeamAvailability(),
    availableLeads: leads.length > 50 
      ? `Total Leads: ${leads.length}. Showing first 50: ${JSON.stringify(leads.slice(0, 50))}` 
      : leads
  };

  const systemInstruction = `You are an AI assistant for the WholeScale OS wholesale real estate application. 
Analyze the user's prompt and the provided application context to determine their intent and generate a helpful response.
You MUST reply strictly with a seamless JSON object matching the following structure exactly (no markdown formatting, just raw JSON):
{
  "intent": "<a short string identifying the action, e.g., 'create_team', 'navigate', 'ask_question', 'analyze_deal', 'create_task', 'get_tasks', 'update_status', 'create_lead', 'update_lead', 'delete_lead', 'get_team'>",
  "response": "<your helpful, conversational response to the user's command>",
  "data": <optional object containing extracted parameters>
}

Specific Intent Data Requirements:
- 'create_task': include 'data' object with 'title', 'dueDate' (YYYY-MM-DD), 'priority' (low/medium/high/urgent), and 'leadId' (if applicable based on availableLeads).
- 'update_status': include 'data' object with 'leadId' (must extract from availableLeads) and 'newStatus' (MUST be exactly one of: 'new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost').
- 'create_lead': include 'data' object with 'name', 'phone' (if available), 'email' (if available), 'propertyAddress', and 'notes'.
- 'update_lead': include 'data' object with 'leadId' (MUST extract from availableLeads) and any updated fields.
- 'delete_lead': include 'data' object with 'leadId' (MUST extract from availableLeads).`;

  try {
    // We utilize the gemini-2.5-flash model via the REST API for simplicity
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Context: ${JSON.stringify(enhancedContext)}\n\nUser Prompt: ${prompt}` }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2, // Low temperature for more deterministic JSON intent parsing
        }
      })
    });

    if (!res.ok) {
      if (res.status === 429) {
        return {
          intent: 'rate_limit',
          response: "You've reached your rate limit for the Gemini API. Please wait a moment before trying again.",
          data: { retryAfter: 60 } // Default fallback for free tier
        };
      }
      const errorData = await res.json().catch(() => null);
      throw new Error(`Gemini API Error [${res.status}]: ${errorData?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const textData = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textData) {
      throw new Error('Received an empty valid response from Gemini API');
    }

    // Attempt to parse the valid JSON
    try {
      const parsed = JSON.parse(textData);
      return {
        intent: parsed.intent || 'unknown',
        response: parsed.response || textData,
        data: parsed.data
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', textData);
      return {
        intent: 'unknown',
        response: textData
      };
    }

  } catch (error) {
    console.error('Error processing prompt with Gemini:', error);
    return {
      intent: 'error',
      response: error instanceof Error ? error.message : 'An unexpected error occurred while communicating with Gemini.'
    };
  }
}
