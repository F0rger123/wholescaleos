import { useStore } from '../../../store/useStore';
import { getMemory } from '../memory-store';
import { getConversationContext } from '../learning-service';
import { callExternalAPI } from '../../ai/api-router';

export interface ParsedIntent {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  reasoning: string;
}

/**
 * The Brain of OS Bot's NLU.
 * Combines high-precision Cloud extraction with a local regex "Fast Path".
 * v13.0: Refactored to use Hybrid API Router for secure, multi-provider extraction.
 */
export class NLUEngine {
  private static FAST_PATH_PATTERNS = [
    // Greetings & Small Talk
    { regex: /^(hi|hello|hey|yo|greetings|good morning|good afternoon|good evening|howdy|sup|what's up)/i, intent: 'system_action', params: { action: 'small_talk' } },
    { regex: /^(how are you|how's it going|what's new|how have you been|what's up)/i, intent: 'system_action', params: { action: 'small_talk' } },
    { regex: /^(thanks|thank you|thanks a lot|thank you so much|i appreciate it)/i, intent: 'system_action', params: { action: 'small_talk' } },

    // Help & Capabilities
    { regex: /^(help|what can you do|commands|capabilities|skills|what are you|who are you)/i, intent: 'system_action', params: { action: 'help' } },
    { regex: /^(list commands|show me what you can do|tutorial|guide me)/i, intent: 'system_action', params: { action: 'help' } },

    // v12.1: Affirmation Loop
    { regex: /^(yes|yeah|yup|affirmative|do it|okay|ok|sure|proceed|confirm)$/i, intent: 'affirm_action', params: { value: true } },
    { regex: /^(no|nope|nah|negative|stop|cancel|don't|dont)$/i, intent: 'affirm_action', params: { value: false } },

    // CRM Actions
    { regex: /^show (?:my )?leads$/i, intent: 'crm_action', params: { action: 'list_leads' } },
    { regex: /^(show|list|get) (my )?hot leads/i, intent: 'crm_action', params: { action: 'filter_leads', minScore: 80 } },
    { regex: /^(show|list|get) (my )?cold leads/i, intent: 'crm_action', params: { action: 'filter_leads', maxScore: 40 } },
    { regex: /^(show|list|get) (my )?new leads/i, intent: 'crm_action', params: { action: 'filter_leads', status: 'new' } },
    { regex: /^(show|list|get) (my )?active leads/i, intent: 'crm_action', params: { action: 'filter_leads', status: 'active' } },
    { regex: /^(top leads|best leads|priority leads|most important leads)/i, intent: 'crm_action', params: { action: 'filter_leads', minScore: 80, limit: 5 } },
    { regex: /^(tell me about|who is|show details for|lead info for) (.+)/i, intent: 'crm_action', params: { action: 'get_lead' } },
    { regex: /^what's (.+)'s (phone|number|email|address|contact)/i, intent: 'crm_action', params: { action: 'get_lead' } },
    { regex: /^lead details? for (.+)/i, intent: 'crm_action', params: { action: 'get_lead' } },
    { regex: /^show me (.+)'s info|show info for (.+)/i, intent: 'crm_action', params: { action: 'get_lead' } },

    // Lead Management - Creating & Updating
    { regex: /^(add|create|new|input) (a )?lead/i, intent: 'crm_action', params: { action: 'create_lead' } },
    { regex: /^(update|edit|modify|change) (the )?lead/i, intent: 'crm_action', params: { action: 'update_lead' } },
    { regex: /^(update|edit|modify|change) (the )?status/i, intent: 'crm_action', params: { action: 'update_status' } },
    { regex: /^(delete|remove|archive) (the )?lead/i, intent: 'crm_action', params: { action: 'delete_lead' } },
    { regex: /^change (.+)'s status to (.+)/i, intent: 'crm_action', params: { action: 'update_status' } },
    { regex: /^mark (.+) as (.+)/i, intent: 'crm_action', params: { action: 'update_status' } },

    // Lead Comparison & Analysis
    { regex: /^compare (.+) and (.+)/i, intent: 'crm_action', params: { action: 'compare_leads' } },
    { regex: /^which is better (.+) or (.+)/i, intent: 'crm_action', params: { action: 'compare_leads' } },
    { regex: /^analyze (.+)'s deal/i, intent: 'crm_action', params: { action: 'analyze_lead' } },
    { regex: /^what's (.+)'s deal score/i, intent: 'crm_action', params: { action: 'get_lead_score' } },

    // Task & Calendar Management
    { regex: /^(show|list|get|view) (my )?tasks/i, intent: 'task_action', params: { action: 'list_tasks' } },
    { regex: /^(what's on my schedule today|what are my meetings today|show my calendar today)/i, intent: 'task_action', params: { action: 'list_tasks', type: 'calendar' } },
    { regex: /^(add|create|new) (a )?task/i, intent: 'task_action', params: { action: 'create_task' } },
    { regex: /^(finish|complete|done) (the )?task/i, intent: 'task_action', params: { action: 'complete_task' } },

    // Real Estate Analysis
    { regex: /^analyze (.+) as (flip|rental|wholesale|brrrr)/i, intent: 'real_estate_action', params: { action: 'calculate_deal' } },
    { regex: /^calculate (.+) as (flip|rental|wholesale|brrrr)/i, intent: 'real_estate_action', params: { action: 'calculate_deal' } },

    // Communication - SMS
    { regex: /^(send|text|sms) (a message to )?(.+)/i, intent: 'comms_action', params: { action: 'send_sms' } },
    { regex: /^(text|send|message) (.+) (that|to say) (.+)/i, intent: 'comms_action', params: { action: 'send_sms' } },
    { regex: /^draft (an|a) (sms|text|message) for (.+)/i, intent: 'comms_action', params: { action: 'draft_sms' } },

    // Navigation
    { regex: /^(go to|navigate to|open|show me|take me to) (.+)/i, intent: 'system_action', params: { action: 'navigate' } },
    { regex: /^(open|show|go to) (the )?(dashboard|leads|tasks|calendar|settings|pipeline)/i, intent: 'system_action', params: { action: 'navigate' } },
  ];

  /**
   * Main entry point for NLU resolution.
   */
  async resolve(text: string): Promise<ParsedIntent> {
    console.log('[🤖 NLU] Resolving:', text);

    // 1. Check Fast Path (Low latency)
    const fastMatch = this.checkFastPath(text);
    if (fastMatch) {
      console.log('[🤖 NLU] Fast Path Match:', fastMatch.intent);
      return fastMatch;
    }

    // 2. Check Semantic Similarity (Medium latency)
    const semanticMatch = await this.checkSemanticSimilarity(text);
    if (semanticMatch && semanticMatch.confidence > 0.7) {
      console.log('[🤖 NLU] Semantic Match:', semanticMatch.intent);
      return semanticMatch;
    }

    // 3. Fallback to Hybrid Semantic Extraction (High latency)
    console.log('[🤖 NLU] Falling back to Hybrid Semantic Extraction');
    return this.resolveSemantic(text);
  }

  /**
   * Static wrapper for easy access.
   */
  static async process(text: string, _context: any = {}): Promise<ParsedIntent> {
    const engine = new NLUEngine();
    return engine.resolve(text);
  }

  private checkFastPath(text: string): ParsedIntent | null {
    for (const { regex, intent, params } of NLUEngine.FAST_PATH_PATTERNS) {
      const match = text.match(regex);
      if (match) {
        const entities: Record<string, any> = { ...params };
        return {
          intent,
          entities,
          confidence: 0.95,
          reasoning: "Matched local regex fast-path pattern."
        };
      }
    }
    return null;
  }

  /**
   * Semantic similarity matching using token-weighted overlap.
   */
  private async checkSemanticSimilarity(text: string): Promise<ParsedIntent | null> {
    const memory = getMemory();
    const normalizedInput = text.toLowerCase().trim();
    const inputTokens = new Set(normalizedInput.split(/\s+/));

    if (memory.learnedIntents && memory.learnedIntents.length > 0) {
      for (const learned of memory.learnedIntents) {
        const learnedPhrase = learned.phrase.toLowerCase().trim();
        const learnedTokens = new Set(learnedPhrase.split(/\s+/));
        
        const intersection = new Set([...inputTokens].filter(t => learnedTokens.has(t)));
        const union = new Set([...inputTokens, ...learnedTokens]);
        const similarity = intersection.size / union.size;

        if (similarity > 0.75) {
          return {
            intent: learned.intent,
            entities: learned.params || {},
            confidence: similarity,
            reasoning: `Neural Match: ${Math.round(similarity * 100)}% token alignment.`
          };
        }
      }
    }

    return null;
  }

  private async resolveSemantic(prompt: string): Promise<ParsedIntent> {
    const store = useStore.getState();
    const memory = getMemory();
    const history = await getConversationContext(store.currentUser?.id || 'system', memory.sessionId);

    const systemPrompt = `You are the NLU engine for OS Bot. Extract intent and entities as JSON.
    INTENTS: crm_action, comms_action, task_action, system_action, real_estate_action, proactive_trigger.
    OUTPUT SCHEMA: { "intent": "string", "entities": {}, "confidence": number, "reasoning": "string" }`;

    try {
      const responseText = await callExternalAPI(prompt, {
        systemInstruction: systemPrompt,
        history,
        isExtraction: true
      });

      if (!responseText) throw new Error("Hybrid extraction failed.");
      
      const parsed = JSON.parse(responseText.trim());
      return parsed;
    } catch (e) {
      console.error("[NLU] Hybrid resolution error:", e);
      return { intent: 'unknown', entities: {}, confidence: 0, reasoning: "Error during hybrid extraction." };
    }
  }
}