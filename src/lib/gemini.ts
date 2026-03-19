import { useStore } from '../store/useStore';

export interface GeminiResponse {
  intent: string;
  response: string;
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
  const enhancedContext = {
    ...context,
    todaysSchedule: schedule,
    availableLeads: leads.length > 50 
      ? `Total Leads: ${leads.length}. Showing first 50: ${JSON.stringify(leads.slice(0, 50))}` 
      : leads
  };

  const systemInstruction = `You are an AI assistant for the WholeScale OS wholesale real estate application. 
Analyze the user's prompt and the provided application context to determine their intent and generate a helpful response.
You MUST reply strictly with a seamless JSON object matching the following structure exactly (no markdown formatting, just raw JSON):
{
  "intent": "<a short string identifying the action, e.g., 'create_team', 'navigate', 'ask_question', 'analyze_deal'>",
  "response": "<your helpful response, explanation, or generated content>"
}`;

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
        response: parsed.response || textData
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
