import { useStore, TaskPriority, LeadStatus, STATUS_FLOW, STATUS_LABELS } from '../store/useStore';

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
 * Sends a prompt and context to the Gemini API and returns a parsed intent and response.
 * Expects VITE_GEMINI_API_KEY to be set in your .env file.
 */
export async function processPrompt(prompt: string, context: Record<string, any> = {}): Promise<GeminiResponse> {
  // Use Vite's environment variable loading
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY is missing. Using fallback response.');
    return {
      intent: 'error',
      response: 'Gemini API key is missing. Please configure VITE_GEMINI_API_KEY in your .env file.'
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
    availableLeads: leads.length > 50 
      ? `Total Leads: ${leads.length}. Showing first 50: ${JSON.stringify(leads.slice(0, 50))}` 
      : leads
  };

  const systemInstruction = `You are an AI assistant for the WholeScale OS wholesale real estate application. 
Analyze the user's prompt and the provided application context to determine their intent and generate a helpful response.
You MUST reply strictly with a seamless JSON object matching the following structure exactly (no markdown formatting, just raw JSON):
{
  "intent": "<a short string identifying the action, e.g., 'create_team', 'navigate', 'ask_question', 'analyze_deal', 'create_task', 'get_tasks', 'update_status'>",
  "response": "<your helpful response, explanation, or generated content>",
  "data": <optional object containing extracted parameters, e.g. {"title": "Call John", "dueDate": "2026-03-20", "priority": "high", "leadId": "123"} for create_task>
}

If the user wants to create a task, set the intent to 'create_task' and include the 'data' object with 'title', 'dueDate' (YYYY-MM-DD), 'priority' (low/medium/high/urgent), and 'leadId' (if applicable based on availableLeads).
If the user wants to update a lead's status, set the intent to 'update_status' and include the 'data' object with 'leadId' (must extract from availableLeads) and 'newStatus' (MUST be exactly one of: 'new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost').`;

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
