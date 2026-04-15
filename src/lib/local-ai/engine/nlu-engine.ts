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
 * v12.0: Enhanced with 50+ patterns, semantic similarity, and better entity extraction.
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

    // Lead Management - Viewing
    { regex: /^(show|list|get|view|display|pull up) (my )?leads/i, intent: 'crm_action', params: { action: 'filter_leads' } },
    { regex: /^show my current leads/i, intent: 'crm_action', params: { action: 'filter_leads' } },
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

    // Task Management
    { regex: /^(show|list|get|view|display) (my )?tasks/i, intent: 'task_action', params: { action: 'list_tasks' } },
    { regex: /^(show|list|get) (my )?pending tasks/i, intent: 'task_action', params: { action: 'list_tasks', status: 'pending' } },
    { regex: /^(show|list|get) (my )?overdue tasks/i, intent: 'task_action', params: { action: 'list_tasks', overdue: true } },
    { regex: /^(create|add|new|make) (a )?task/i, intent: 'task_action', params: { action: 'create_task' } },
    { regex: /^(update|edit|modify|change) (the )?task/i, intent: 'task_action', params: { action: 'update_task' } },
    { regex: /^(complete|finish|done|mark done) (the )?task/i, intent: 'task_action', params: { action: 'complete_task' } },
    { regex: /^(delete|remove|cancel) (the )?task/i, intent: 'task_action', params: { action: 'delete_task' } },

    // Communication - SMS
    { regex: /^(send|text|sms) (a message to )?(.+)/i, intent: 'comms_action', params: { action: 'send_sms' } },
    { regex: /^(text|send|message) (.+) (that|to say) (.+)/i, intent: 'comms_action', params: { action: 'send_sms' } },
    { regex: /^draft (an|a) (sms|text|message) for (.+)/i, intent: 'comms_action', params: { action: 'draft_sms' } },
    { regex: /^follow up with (.+)/i, intent: 'comms_action', params: { action: 'send_sms' } },
    { regex: /^check in with (.+)/i, intent: 'comms_action', params: { action: 'send_sms' } },

    // Navigation
    { regex: /^(go to|navigate to|open|show me|take me to) (.+)/i, intent: 'system_action', params: { action: 'navigate' } },
    { regex: /^(open|show|go to) (the )?(dashboard|leads|tasks|calendar|settings|pipeline)/i, intent: 'system_action', params: { action: 'navigate' } },

    // Proactive & Suggestions
    { regex: /^(any suggestions|what should i do|check pipeline|proactive|give me suggestions|what's next)/i, intent: 'proactive_trigger' },
    { regex: /^(prioritize|what's most important|where should i focus)/i, intent: 'proactive_trigger' },
    { regex: /^pipeline (analysis|review|check|health)/i, intent: 'proactive_trigger' },

    // Real Estate Knowledge & Analysis
    { regex: /^what is (.+)/i, intent: 'real_estate_action', params: { action: 'get_knowledge' } },
    { regex: /^explain (.+)/i, intent: 'real_estate_action', params: { action: 'get_knowledge' } },
    { regex: /^tell me about (.+)/i, intent: 'real_estate_action', params: { action: 'get_knowledge' } },
    { regex: /^how do i (.+)/i, intent: 'real_estate_action', params: { action: 'strategy_advice' } },
    { regex: /^calculate (the )?(.+)/i, intent: 'real_estate_action', params: { action: 'calculate_deal' } },
    { regex: /^analyze (the )?property/i, intent: 'real_estate_action', params: { action: 'analyze_property' } },
    { regex: /^run (the )?numbers/i, intent: 'real_estate_action', params: { action: 'calculate_deal' } },
    { regex: /^flip analysis|analyze this flip/i, intent: 'real_estate_action', params: { action: 'calculate_deal', type: 'flip' } },
    { regex: /^rental analysis|analyze this rental/i, intent: 'real_estate_action', params: { action: 'calculate_deal', type: 'rental' } },
    { regex: /^cap rate (for|on) (.+)/i, intent: 'real_estate_action', params: { action: 'cap_rate' } },
    { regex: /^generate (a )?script/i, intent: 'real_estate_action', params: { action: 'script_generation' } },
    { regex: /^marketing tips?/i, intent: 'real_estate_action', params: { action: 'marketing_advice' } },
    { regex: /^market trends?|market analysis/i, intent: 'real_estate_action', params: { action: 'market_trends' } },

    // Time & Date Queries
    { regex: /^schedule (a )?(call|meeting|appointment)/i, intent: 'task_action', params: { action: 'create_task', type: 'meeting' } },
    { regex: /^set (a )?reminder/i, intent: 'task_action', params: { action: 'create_task', type: 'reminder' } },
    { regex: /^what's on my calendar/i, intent: 'task_action', params: { action: 'list_tasks', type: 'calendar' } },

    // Memory & Context
    { regex: /^what did we talk about/i, intent: 'system_action', params: { action: 'memory_recall' } },
    { regex: /^remember (that|this)/i, intent: 'system_action', params: { action: 'remember_fact' } },
    { regex: /^what do you know about (.+)/i, intent: 'system_action', params: { action: 'memory_recall' } },
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

    // 2. Check Semantic Similarity (Medium latency)
    const semanticMatch = await this.checkSemanticSimilarity(text);
    if (semanticMatch && semanticMatch.confidence > 0.7) {
      console.log('[🤖 NLU] Semantic Match:', semanticMatch.intent);
      return semanticMatch;
    }

    // 3. Fallback to Gemini Semantic Extraction (High latency)
    console.log('[🤖 NLU] Falling back to Gemini Semantic Extraction');
    const geminiMatch = await this.resolveSemantic(text, apiKey);

    // Ensure we have a valid intent even if confidence is low
    if (geminiMatch.confidence < 0.3) {
      console.warn('[🤖 NLU] Low confidence match:', geminiMatch.intent);
    }

    console.log('[🤖 NLU] Gemini Result:', geminiMatch.intent, geminiMatch.entities);
    return geminiMatch;
  }

  /**
   * Static wrapper for easy access.
   * Matches the v12.0 desired signature.
   */
  static async process(text: string, _context: any = {}): Promise<ParsedIntent> {
    const apiKey = localStorage.getItem('user_ai_api_key') || localStorage.getItem('user_gemini_api_key') || '';

    const engine = new NLUEngine();
    return engine.resolve(text, apiKey);
  }

  private checkFastPath(text: string): ParsedIntent | null {
    for (const { regex, intent, params } of NLUEngine.FAST_PATH_PATTERNS) {
      const match = text.match(regex);
      if (match) {
        // Extract entities from the match groups
        const entities: Record<string, any> = { ...params };
        if (match.length > 1) {
          // Try to extract meaningful entities from capture groups
          for (let i = 1; i <= match.length; i++) {
            if (match[i]) {
              const value = match[i].trim();
              // Don't overwrite existing params
              if (!entities.text && value.length > 2) {
                entities.text = value;
              }
            }
          }
        }

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
   * Semantic similarity matching using learned intents and fuzzy matching.
   */
  private async checkSemanticSimilarity(text: string): Promise<ParsedIntent | null> {
    const memory = getMemory();
    const normalizedInput = text.toLowerCase().trim();

    // Check learned intents first
    if (memory.learnedFacts) {
      for (const [key, value] of Object.entries(memory.learnedFacts)) {
        if (key.startsWith('intent_') && typeof value === 'string') {
          const learnedPhrase = key.replace('intent_', '');
          const similarity = this.calculateSimilarity(normalizedInput, learnedPhrase);
          if (similarity > 0.8) {
            return {
              intent: value,
              entities: {},
              confidence: similarity,
              reasoning: `Matched learned intent with ${Math.round(similarity * 100)}% similarity.`
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Simple similarity calculation using word overlap.
   */
  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }

  private async resolveSemantic(prompt: string, apiKey: string): Promise<ParsedIntent> {
    const store = useStore.getState();
    const memory = getMemory();
    const history = await getConversationContext(store.currentUser?.id || 'system', memory.sessionId);

    const systemPrompt = `You are the NLU engine for OS Bot, a high-performance real estate assistant.
    Your job is to extract the user's intent and entities with extreme precision. 
    Return ONLY valid JSON.
    
    INTENTS:
    - crm_action: { "action": "get_lead|create_lead|update_status|filter_leads|compare_leads|analyze_lead|get_lead_score|delete_lead|update_lead", "name": "...", "status": "...", "leadId": "...", "address": "...", "targets": ["name1", "name2"] }
    - comms_action: { "action": "send_sms|draft_sms", "target": "...", "message": "...", "carrier": "..." }
    - task_action: { "action": "create_task|list_tasks|update_task|complete_task|delete_task", "title": "...", "dueDate": "...", "priority": "...", "type": "meeting|reminder|call" }
    - system_action: { "action": "navigate|help|small_talk|memory_recall|remember_fact", "path": "leads|tasks|calendar|dashboard|settings", "text": "..." }
    - real_estate_action: { "action": "calculate_deal|analyze_property|get_knowledge|strategy_advice|script_generation|marketing_advice|market_trends|cap_rate", "topic": "...", "type": "flip|rental|sub2", "address": "...", "strategy": "wholesaling|brrrr|sub2" }
    - proactive_trigger: Analysis and suggestions for the pipeline.
    - unknown: Use if the intent is missing or unintelligible.

    RULES:
    1. CONTEXT: If user says "him", "the guy", "that property", resolve to the Lead Name or Address from history.
    2. CORRECTIONS: User might change mind ("Schedule a call—actually, make it an SMS"). Identify action as 'send_sms' and treat the first part as noise.
    3. BULK: "Text both" or "Message them" -> action 'send_sms', target 'both' or 'them'.
    4. ADDRESSES: Extract property addresses clearly in the "address" field.
    5. COMPARISON: "Compare [X] and [Y]" -> action 'compare_leads', targets: ["X", "Y"].
    6. REAL ESTATE: If user asks about real estate concepts, strategies, or calculations, use real_estate_action.

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