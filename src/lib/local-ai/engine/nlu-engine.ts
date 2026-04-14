import { useStore } from '../../../store/useStore';
import { getMemory } from '../memory-store';
import { getConversationContext } from '../learning-service';

export interface ParsedIntent {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  reasoning: string;
}

/**
 * The Brain of OS Bot's NLU.
 * Combines high-precision Gemini extraction with a local regex "Fast Path".
 */
export class NLUEngine {
  private static FAST_PATH_PATTERNS = [
    { regex: /^(hi|hello|hey|yo|good morning|good evening)/i, intent: 'greeting' },
    { regex: /^(help|what can you do|commands)/i, intent: 'help' },
    { regex: /^(show|list|get) (my )?leads/i, intent: 'crm_action', params: { action: 'filter_leads' } },
    { regex: /^(show|list|get) (my )?tasks/i, intent: 'task_action', params: { action: 'list_tasks' } },
    { regex: /^(go to|navigate to) (.*)/i, intent: 'navigate' }
  ];

  /**
   * Main entry point for NLU resolution.
   */
  async resolve(text: string, apiKey: string): Promise<ParsedIntent> {
    // 1. Check Fast Path (Low latency)
    const fastMatch = this.checkFastPath(text);
    if (fastMatch) return fastMatch;

    // 2. Fallback to Gemini Semantic Extraction
    return this.resolveSemantic(text, apiKey);
  }

  private checkFastPath(text: string): ParsedIntent | null {
    for (const { regex, intent, params } of NLUEngine.FAST_PATH_PATTERNS) {
      if (regex.test(text)) {
        return {
          intent,
          entities: params || {},
          confidence: 0.95,
          reasoning: "Matched local regex fast-path pattern."
        };
      }
    }
    return null;
  }

  private async resolveSemantic(prompt: string, apiKey: string): Promise<ParsedIntent> {
    const store = useStore.getState();
    const memory = getMemory();
    const history = await getConversationContext(store.currentUser?.id || 'system', memory.sessionId);

    const systemPrompt = `You are the NLU engine for WholeScale OS. Your job is to extract the user's intent and entities with high precision.
    Return ONLY valid JSON.
    
    INTENTS:
    - crm_action: { "action": "get_lead|create_lead|update_status|filter_leads", "name": "...", "status": "...", "leadId": "..." }
    - comms_action: { "action": "send_sms|draft_sms", "target": "...", "message": "..." }
    - task_action: { "action": "create_task|list_tasks", "title": "...", "date": "..." }
    - navigate: { "path": "leads|tasks|calendar|dashboard|settings" }
    - small_talk: { "text": "..." }
    - unknown: If the prompt is totally unintelligible.

    Rules:
    - If the user says "him", "her", or "that lead", identify it as a reference using context.
    - If the user is correcting themselves ("no wait", "actually"), prioritize the correction.
    - Return a "reasoning" field explaining your classification.

    SCHEMA:
    {
      "intent": "string",
      "entities": "object",
      "confidence": "number (0-1)",
      "reasoning": "string"
    }`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nContext History: ${JSON.stringify(history)}\n\nUser Prompt: ${prompt}` }] }],
          generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
        })
      });

      if (!res.ok) throw new Error("Gemini extraction failed.");
      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawJson);
    } catch (e) {
      console.error("[NLU] Semantic resolution error:", e);
      return { intent: 'unknown', entities: {}, confidence: 0, reasoning: "Error during semantic resolution." };
    }
  }
}
