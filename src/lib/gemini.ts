import { useStore } from '../store/useStore';
import type { Lead } from '../store/useStore';

// New Modular Architecture Imports
import { 
  callExternalAPI
} from './ai/api-router';
import { TaskExecutor } from './local-ai';


export interface BotResponse {
  intent: string;
  response: string;
  data?: any;
  nextIntent?: { name: string; params: any };
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

/**
 * Legacy Wrappers (v13.0 Support)
 * These ensure backward compatibility for old pages/tests.
 */
export async function createTask(params: any) {
  return TaskExecutor.execute('task_action', { action: 'create_task', ...params });
}

export async function updateLeadStatusViaAI(leadId: string, newStatus: string) {
  const res = await TaskExecutor.execute('crm_action', { 
    action: 'update_status', 
    leadId, 
    newStatus 
  });
  return { success: res.success, message: res.message };
}

export async function sendSMSViaAI(target: string, message: string, carrier?: string) {
  const res = await TaskExecutor.execute('comms_action', { 
    action: 'send_sms', 
    target, 
    message, 
    targetCarrier: carrier 
  });
  return { success: res.success, message: res.message };
}

export async function generatePageInsights(url: string, context: any): Promise<string[]> {
  const prompt = `Analyze this page: ${url}. Context: ${JSON.stringify(context)}. Provide 3 individual strategic insights as a list. Each insight should be a separate line.`;
  const response = await callExternalAPI(prompt, context || {});
  
  if (!response) return ["No insights available at this time."];
  
  // Split by newline and clean up numbering/bullets
  return response
    .split('\n')
    .map(line => line.replace(/^(\d+\.|-|\*)\s*/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, 3);
}

export interface CallScriptTemplate {
  name: string;
  category: string;
  script: string;
  description: string;
}

export async function generateCallScriptTemplates(_lead: Lead): Promise<CallScriptTemplate[]> {

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
  } catch (err) { console.error(err); }

  return [...defaults, ...customScripts];
}

/**
 * Sends a prompt and context to the Hybrid API Router.
 * This is the primary entry point for all external AI intelligence.
 */
export async function processPrompt(
  prompt: string,
  context: any = {},
  modelId: string = 'gemini-2.0-flash',
  signal?: AbortSignal
): Promise<BotResponse> {
  try {
    const responseText = await callExternalAPI(prompt, { ...context, modelId }, signal);
    
    if (!responseText) {
      return {
        intent: 'unknown',
        response: "I'm having trouble connecting to my external intelligence. I'll switch to my local core for now. How can I help with your leads or tasks?",
        systemLog: '🤖 Hybrid AI (No response)'
      };
    }

    // Success: Refresh credits in UI
    try {
      useStore.getState().refreshCredits();
    } catch (err) {
      console.warn('[🤖 Hybrid AI] Failed to refresh credits:', err);
    }

    // Attempt to parse as JSON if it looks like one, otherwise return as text
    if (responseText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(responseText.trim());
        return {
          intent: parsed.intent || 'unknown',
          response: parsed.response || parsed.text || responseText,
          data: parsed.data || null,
          systemLog: '🤖 Hybrid AI'
        };
      } catch (e) {
        // Fallback to text if JSON parsing fails
      }
    }

    return {
      intent: 'unknown',
      response: responseText,
      systemLog: '🤖 Hybrid AI'
    };
  } catch (error) {
    console.error('[🤖 Hybrid AI] Error:', error);
    return {
      intent: 'error',
      response: "I'm having trouble connecting to my external intelligence. Please check your AI API configurations.",
      systemLog: '🤖 Hybrid AI'
    };
  }
}

export function hasUserApiKey() {
  const store = useStore.getState();
  
  // If we're on local-only mode, we always have "permission" to use the bot
  if (store.currentUser?.preferred_api_provider === 'local' || store.preferred_api_provider === 'local') {
    return true;
  }

  // Check profile keys in store or local fallback
  const profileKeys = store.currentUser?.user_api_keys;
  if (profileKeys && Object.keys(profileKeys).length > 0) return true;
  
  return !!(
    localStorage.getItem('user_gemini_api_key') ||
    localStorage.getItem('user_openai_api_key') ||
    localStorage.getItem('user_anthropic_api_key') ||
    localStorage.getItem('user_ai_api_key')
  );
}
