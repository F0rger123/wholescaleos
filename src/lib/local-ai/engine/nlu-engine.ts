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
 * v11.0: Supports mid-sentence corrections, entity linking, and proactive triggers.
 */
export class NLUEngine {
  private static FAST_PATH_PATTERNS = [
    { regex: /^(hi|hello|hey|yo|greetings|good morning|good evening)/i, intent: 'system_action', params: { action: 'small_talk' } },
    { regex: /^(help|what can you do|commands|capabilities|skills)/i, intent: 'system_action', params: { action: 'help' } },
    { regex: /^(show|list|get) (my )?leads/i, intent: 'crm_action', params: { action: 'filter_leads' } },
    { regex: /^(show|list|get) (my )?tasks/i, intent: 'task_action', params: { action: 'list_tasks' } },
    { regex: /^(go to|navigate to|open) (.*)/i, intent: 'system_action', params: { action: 'navigate' } },
    { regex: /^(any suggestions|what should i do|check pipeline|proactive)/i, intent: 'proactive_trigger' },
    { regex: /^(top leads|hot leads|best leads)/i, intent: 'crm_action', params: { action: 'filter_leads', minScore: 80 } }
  ];

  /**
   * Main entry point for NLU resolution.
   */
  async resolve(text: string, apiKey: string): Promise<ParsedIntent> {
    console.log('[🤖 NLU] Resolving:', text);
    
    // 1. Check Fast Path (Low latency)
    const fastMatch = this.checkFastPath(text);
    if (fastMatch) {
      console.log('[🤖 NLU] Fast Path Match:', fastMatch.intent);
      return fastMatch;
    }

    // 2. Fallback to Gemini Semantic Extraction
    console.log('[🤖 NLU] Falling back to Semantic Extraction');
    const semanticMatch = await this.resolveSemantic(text, apiKey);
    
    // Ensure we have a valid intent even if confidence is low
    if (semanticMatch.confidence < 0.3) {
      console.warn('[🤖 NLU] Low confidence match:', semanticMatch.intent);
    }

    console.log('[🤖 NLU] Semantic Result:', semanticMatch.intent, semanticMatch.entities);
    return semanticMatch;
  }

  /**
   * Static wrapper for easy access.
   * Matches the v11.0 desired signature.
   */
  static async process(text: string, context: any = {}): Promise<ParsedIntent> {
    const store = useStore.getState();
    const apiKey = localStorage.getItem('user_ai_api_key') || localStorage.getItem('user_gemini_api_key') || '';
    
    const engine = new NLUEngine();
    return engine.resolve(text, apiKey);
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

    const systemPrompt = `You are the NLU engine for OS Bot, a high-performance real estate assistant.
    Your job is to extract the user's intent and entities with extreme precision. 
    Return ONLY valid JSON.
    
    INTENTS:
    - crm_action: { "action": "get_lead|create_lead|update_status|filter_leads|compare_leads", "name": "...", "status": "...", "leadId": "...", "address": "...", "targets": ["name1", "name2"] }
    - comms_action: { "action": "send_sms|draft_sms", "target": "...", "message": "...", "carrier": "..." }
    - task_action: { "action": "create_task|list_tasks", "title": "...", "dueDate": "...", "priority": "..." }
    - system_action: { "action": "navigate|help|small_talk|memory_recall", "path": "leads|tasks|calendar|dashboard|settings", "text": "..." }
    - real_estate_action: { "action": "calculate_deal|analyze_property|get_knowledge|strategy_advice|script_generation", "topic": "...", "type": "flip|rental", "address": "...", "strategy": "wholesaling|brrrr|sub2" }
    - proactive_trigger: Analysis and suggestions for the pipeline.
    - unknown: Use if the intent is missing or unintelligible.

    RULES:
    1. CONTEXT: If user says "him", "the guy", "that property", resolve to the Lead Name or Address from history.
    2. CORRECTIONS: User might change mind ("Schedule a call—actually, make it an SMS"). Identify action as 'send_sms' and treat the first part as noise.
    3. BULK: "Text both" or "Message them" -> action 'send_sms', target 'both' or 'them'.
    4. ADDRESSES: Extract property addresses clearly in the "address" field.
    5. COMPARISON: "Compare [X] and [Y]" -> action 'compare_leads', targets: ["X", "Y"].

    OUTPUT SCHEMA:
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
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nContext History: ${JSON.stringify(history)}\n\nUser Input: ${prompt}` }] }],
          generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
        })
      });

      if (!res.ok) throw new Error("Gemini NLU extraction failed.");
      const data = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawJson);
    } catch (e) {
      console.error("[NLU] Semantic resolution error:", e);
      return { intent: 'unknown', entities: {}, confidence: 0, reasoning: "Error during semantic resolution." };
    }
  }
}
