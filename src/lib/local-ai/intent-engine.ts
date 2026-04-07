import { Intent, intents } from '../ai/intents';
import { spellCheck } from './spell-checker';
import { resolveEntityFromContext, getMemory, setActiveState, setTopic } from './memory-store';

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, any>;
  confidence: number;
  originalText?: string;
  isAmbiguous?: boolean;
  isConfirming?: boolean;
}

/**
 * Strips filler words and common phrases to help regex matching
 */
export function normalizeInput(input: string): string {
  const fillers = [
    /^(?:can you|please|could you|would you|hey os bot|os bot|bot|assistant|can you please|could you please)\s+/i,
    /^(?:i want to|i need to|i'd like to|let's)\s+/i,
    /\s+(?:please|now|right now|immediately|for me|thank you|thanks)$/i,
    /\?$/ // remove question mark at the end
  ];

  let normalized = input.trim();
  fillers.forEach(regex => {
    normalized = normalized.replace(regex, '');
  });
  
  return normalized.trim();
}

/**
 * Splits complex user input into multiple command segments.
 * Example: "Add John as a lead AND text him hello" -> ["Add John as a lead", "text him hello"]
 */
export function splitMultiIntent(input: string): string[] {
  // Simple delimiter-based splitting
  const segments = input.split(/\s+(?:and then|then|and|also)\s+/i);
  if (segments.length <= 1) return [input];
  return segments.map(s => s.trim()).filter(s => s.length > 2);
}

export const LOCAL_INTENTS = intents.map(i => i.name);

/**
 * Calculates a confidence score for an intent based on keyword matching
 */
export function calculateIntentScore(input: string, intent: Intent): number {
  const lower = input.toLowerCase();
  let score = 0;
  
  // 1. Pattern checks
  intent.patterns.forEach(p => {
    if (lower.includes(p.toLowerCase())) {
      score += 25;
      // Bonus for exact or near-exact match
      if (lower === p.toLowerCase()) score += 50;
      if (lower.startsWith(p.toLowerCase())) score += 15;
    }
  });

  // 2. Keyword density
  const words = lower.split(/\s+/);
  const patternWords = intent.patterns.flatMap(p => p.toLowerCase().split(/\s+/));
  const uniquePatternWords = [...new Set(patternWords)].filter(w => w.length > 3);
  
  uniquePatternWords.forEach(pw => {
    if (words.includes(pw)) {
      let weight = 10;
      // Bonus for Action Verbs
      const verbs = ['send', 'create', 'add', 'text', 'navigate', 'delete', 'update', 'mark', 'show'];
      if (verbs.includes(pw)) weight += 15;
      
      const nouns = ['lead', 'task', 'pipeline', 'workflow', 'automation', 'contact'];
      if (nouns.includes(pw)) weight += 5;

      score += weight;
    }
  });

  // 3. Negative signals (Anti-patterns)
  const negatives = ['not', 'don\'t', 'never', 'stop', 'no', 'none'];
  if (negatives.some(n => words.includes(n))) {
    score -= 50;
  }

  return Math.min(Math.max(score, 0), 100);
}

export function recognizeIntent(input: string): ParsedIntent | null {
  const memory = getMemory();
  const checked = spellCheck(input);
  const normalizedOrig = checked.toLowerCase().trim();
  const normalized = normalizeInput(normalizedOrig);
  const activeEntity = resolveEntityFromContext(normalized);

  console.log(`[🤖 OS Bot] Normalized: "${normalized}" | Active Entity: ${activeEntity?.name || 'none'}`);

  // Check Confirmation logic (Yes/No)
  if (memory.activeState?.type === 'AWAITING_INTENT_CONFIRMATION') {
    if (normalized.match(/^(?:yes|yep|yup|yeah|sure|do it|ok|okay|confirm)$/i)) {
      return { 
        intent: memory.activeState.data.intent, 
        params: memory.activeState.data.params || {}, 
        confidence: 100,
        isConfirming: true 
      };
    }
    if (normalized.match(/^(?:no|nope|nah|nevermind|stop|cancel|wrong)$/i)) {
      return { 
        intent: { name: 'cancel_confirmation', patterns: [], action: 'cancel', template: 'No problem.' }, 
        params: {}, 
        confidence: 100 
      };
    }
  }

  // 1. CHECK MULTI-TURN STATE
  if (memory.activeState?.type === 'AWAITING_SMS_MESSAGE') {
    const target = memory.activeState.data?.target || activeEntity?.name || 'someone';
    const intentObj = intents.find(i => i.name === 'send_sms');
    if (intentObj) {
      setActiveState(null);
      return { 
        intent: intentObj, 
        params: { target, message: input, is_followup: true }, 
        confidence: 100 
      };
    }
  }

  // 2. PRIORITY REGEX HANDLERS (v6.0 - Conversational + CRM Categories)
  const handlers = [
    // --- CONVERSATIONAL & LEARNING (Priority) ---
    {
      intent: 'small_talk',
      patterns: [
        /^(?:thanks|thank you|thx|thanks lot|great job|well done|nice|cool|awesome|sweet)$/i,
        /^(?:how are you|how it going|hows it going|how you doing|sup|whats up|how are things)$/i,
        /^(?:bye|goodbye|see you|later|im done|exit|close)$/i,
        /^(?:test|testing|test message|ping)$/i,
        /^(?:tell me a joke|joke)$/i
      ],
      params: (matches: string[]) => ({ text: matches[0].toLowerCase() })
    },
    {
      intent: 'greeting',
      patterns: [
        /^(?:yo|hi|hello|hey|hey there|hi there|hola|howdy|sup|what's up)$/i,
        /^(?:how's it going|how are you|good morning|good afternoon|good evening)$/i,
        /\b(?:hi|hello|yo|hey)\b/i
      ],
      params: (matches: string[]) => ({ text: matches[0].toLowerCase() })
    },

    // --- CRM_ACTIONS ---
    {
      intent: 'send_sms',
      patterns: [
        /^(?:text|textt|txt|send text to|send sms to|message|send a message to|shoot a text to|tell)\s+([a-zA-Z\s]+)\s+(?:saying|that says|message|with the message|telling them|that)\s+(.*)$/i,
        /^(?:text|textt|txt|message|tell)\s+([a-zA-Z0-9\s]+)\s*[:|,]\s*(.*)$/i,
        /^(?:text|textt|txt)\s+([a-z0-9\s]{2,})\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ target: matches[1].trim(), message: matches[2].trim() })
    },
    {
      intent: 'send_sms_partial',
      patterns: [
        /^(?:text|textt|txt|message|tell|shoot a text to|send message to)\s+([a-zA-Z0-9\s]+)$/i,
        /^(?:send a text|send sms|write a message)$/i
      ],
      params: (matches: string[]) => ({ target: matches[1]?.trim() })
    },
    {
      intent: 'update_lead_status',
      patterns: [
        /^(?:set|change|mark|update)\s+([a-zA-Z\s]+)\s+(?:as|to|status)\s+([a-zA-Z\s]+)$/i,
        /^(?:set|change|mark|update)\s+(?:status of\s+)?([a-zA-Z\s]+)\s+to\s+([a-zA-Z\s]+)$/i
      ],
      params: (matches: string[]) => {
        setTopic('leads');
        return { target: matches[1].trim(), status: matches[2].trim() };
      }
    },
    {
      intent: 'add_note',
      patterns: [
        /^(?:add note|note|add a note|record note)\s+(?:to|for)\s+([a-zA-Z\s]+)\s*[:|,]\s*(.*)$/i,
        /^(?:add note|note|add a note|record note)\s+(?:to|for)\s+([a-zA-Z\s]+)\s+(?:saying|that)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ target: matches[1].trim(), note: matches[2].trim() })
    },
    {
      intent: 'get_lead_info',
      patterns: [
        /^(?:tell me about|who is|show info for|details for|what do we know about)\s+([a-zA-Z\s]+)$/i,
        /^(?:show|view|open)\s+([a-zA-Z\s]+)(?:'s)?\s+(?:profile|details|info)$/i
      ],
      params: (matches: string[]) => {
        setTopic('leads');
        return { name: matches[1].trim() };
      }
    },
    {
      intent: 'automation_query',
      patterns: [
        /^(?:automation hub|automations|workflow hub|summary setup|alert setup)$/i,
        /^(?:what|how many|which)\s+(?:automations|workflows|background tasks|summary alerts)\s+(?:can you|are available|do I have|set up|exist)$/i
      ],
      params: (matches: string[]) => ({ query: matches[0] })
    },
    {
      intent: 'automation_setup',
      patterns: [
        /^(?:setup|configure|create|open|go to)\s+(?:automation|automations|workflow|workflows|summary|pipeline alerts)$/i
      ],
      params: () => ({ path: 'automations' })
    },
    {
      intent: 'clarify_previous',
      patterns: [
        /^(?:tell me more|explain that|why|elaborate|give me more details|what does that mean)$/i,
        /^(?:why|how)$/i
      ],
      params: () => ({ topic: getMemory().lastTopic })
    },
    {
      intent: 'create_lead',
      patterns: [
        /^(?:add|create|new|register)\s+(?:a\s+)?lead\s+(?:for\s+)?([a-zA-Z\s]+)$/i,
        /^(?:add|create|new)\s+([a-zA-Z\s]+)\s+as\s+(?:a\s+)?lead$/i
      ],
      params: (matches: string[]) => ({ name: matches[1].trim() })
    },
    {
      intent: 'add_task',
      patterns: [
        /^(?:create task|add task|remind me to|set reminder|remind me)\s+(?:to\s+)?(.*?)(?:\s+(?:for|on|due|at|by)\s+(.*))?$/i
      ],
      params: (matches: string[]) => {
        setTopic('tasks');
        const title = matches[1].trim();
        let dueDate = matches[2]?.trim();
        
        // Basic relative date conversion
        if (dueDate) {
          const d = new Date();
          const low = dueDate.toLowerCase();
          if (low === 'tomorrow') d.setDate(d.getDate() + 1);
          else if (low.includes('next week')) d.setDate(d.getDate() + 7);
          else if (low === 'today') { /* already now */ }
          
          if (low === 'tomorrow' || low.includes('next week') || low === 'today') {
            dueDate = d.toISOString().split('T')[0];
          }
        }

        return { title, dueDate };
      }
    },

    // --- CONVERSATIONAL & LEARNING ---
    {
      intent: 'set_preference',
      patterns: [
        /^(?:remember|save|note down|record)\s+(?:that\s+)?(?:i\s+)?(.*?)\s+(?:is|prefers?|likes?|wants?|preference)\s+(.*)$/i,
        /^(?:remember|save)\s+(?:that\s+)?(.*)$/i
      ],
      params: (matches: string[]) => ({ key: matches[1]?.trim(), value: matches[2]?.trim() || matches[1]?.trim() })
    },

    // --- SYSTEM_ACTIONS ---
    {
      intent: 'navigate',
      patterns: [
        /^(?:go to|show|open|take me to|take me home|view|navigate to)\s+(leads?|tasks?|calendar|dashboard|settings|inbox|messages|summaries|ai|training)$/i,
        /^(?:show|view|open)\s+(?:my\s+)?(leads?|tasks?|calendar|deals?|pipeline)$/i
      ],
      params: (matches: string[]) => {
        let p = matches[1].toLowerCase().replace(/s$/, ''); // singularize
        if (p === 'deal' || p === 'pipeline') p = 'leads';
        return { path: p };
      }
    },
    {
      intent: 'lead_query',
      patterns: [
        /^(?:how many|what is my|show)?\s*(?:total\s+)?leads?(?:\s+do i have)?$/i,
        /^(?:show|how many)\s*(?:of my\s+)?deals?\s*(?:are\s+)?(?:closing|closed|active)?$/i,
        /^what's my lead count$/i
      ],
      params: () => ({})
    },
    {
      intent: 'task_query',
      patterns: [
        /^(?:how many|what are my|show)\s*(?:all\s+)?tasks?(?:\s+do i have)?$/i,
        /^(?:how many|what are my|show)\s*(?:overdue|late|missed)\s*tasks?$/i,
        /^how many tasks are overdue$/i
      ],
      params: (matches: string[]) => ({ overdueOnly: matches[0].toLowerCase().includes('overdue') })
    },
    {
      intent: 'capabilities',
      patterns: [
        /^(?:what can you do\??|what are you\??|who are you\??|what features do you have\??|capabilities\??|what type of things can you do\??)$/i,
        /^(?:what can you all do for me\??|how can you help\??|what are your functions\??|give me a tour\??|show me what you got\??)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'help',
      patterns: [
        /^(?:help\??|commands|show examples|give me examples|help me)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'calendar_query',
      patterns: [
        /^(?:what's on my|show my|view|check|get|what is my|tell me my)\s*(?:today's\s+|current\s+)?(?:agenda|calendar|schedule)$/i,
        /^(?:agenda|schedule|calendar)$/i,
        /^(?:what am i doing today|what's happening today|anything on my schedule|whats on my agenda)$/i,
        /^(?:show|view)\s+calendar$/i
      ],
      params: () => ({})
    }
  ];

  for (const h of handlers) {
    for (const pattern of h.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const intentObj = intents.find(i => i.name === h.intent);
        if (intentObj) {
          const params = h.params(match as string[]) as Record<string, any>;
          
          const pronouns = ['him', 'her', 'them', 'it', 'his', 'hers', 'their', 'the lead', 'the contact', 'the task'];
          if (params.target && activeEntity && pronouns.includes(params.target.toLowerCase())) {
            params.target = activeEntity.name;
          }
          if (params.name && activeEntity && pronouns.includes(params.name.toLowerCase())) {
            params.name = activeEntity.name;
          }

          return { intent: intentObj, params, confidence: 100 };
        }
      }
    }
  }

  // 3. FUZZY MATCHING FALLBACK (Scoring Engine v6.1 - with Ambiguity Zone)
  const scores = intents.map(intent => ({
    intent,
    score: calculateIntentScore(normalized, intent)
  })).sort((a, b) => b.score - a.score);

  const bestMatchResult = scores[0];
  
  if (bestMatchResult) {
    if (bestMatchResult.score >= 75) {
      console.log(`[🤖 OS Bot] Strong Match: ${bestMatchResult.intent.name} (${bestMatchResult.score}%)`);
      return {
        intent: bestMatchResult.intent,
        params: {},
        confidence: bestMatchResult.score,
        originalText: input
      };
    }

    if (bestMatchResult.score >= 45) {
      console.log(`[🤖 OS Bot] Ambiguous Match: ${bestMatchResult.intent.name} (${bestMatchResult.score}%)`);
      return {
        intent: bestMatchResult.intent,
        params: {},
        confidence: bestMatchResult.score,
        originalText: input,
        isAmbiguous: true
      };
    }
  }

  return null;
}
