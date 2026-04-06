import { Intent, intents } from '../ai/intents';
import { spellCheck } from './spell-checker';
import { resolveEntityFromContext, getMemory, setActiveState } from './memory-store';

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, any>;
  confidence: number;
}

export const LOCAL_INTENTS = intents.map(i => i.name);

export function recognizeIntent(input: string): ParsedIntent | null {
  const memory = getMemory();
  const checked = spellCheck(input);
  const normalized = checked.toLowerCase().trim();
  const activeEntity = resolveEntityFromContext(normalized);

  // 1. CHECK MULTI-TURN STATE
  if (memory.activeState?.type === 'AWAITING_SMS_MESSAGE') {
    const target = memory.activeState.data?.target || memory.activeEntity?.name || 'someone';
    const intentObj = intents.find(i => i.name === 'send_sms');
    if (intentObj) {
      // Clear state once fulfilled
      setActiveState(null);
      return { 
        intent: intentObj, 
        params: { target, message: input, is_followup: true }, 
        confidence: 100 
      };
    }
  }

  // 2. PRIORITY REGEX HANDLERS (v5.0 - Smarter, Better Extractors)
  const handlers = [
    {
      intent: 'send_sms',
      patterns: [
        /^(?:text|textt|txt|send text to|send sms to|message|send a message to|shoot a text to|tell)\s+([a-zA-Z\s]+)\s+(?:saying|that says|message|with the message|telling them|that)\s+(.*)$/i,
        /^(?:text|textt|txt|message|tell)\s+([a-zA-Z0-9\s]+)\s*[:|,]\s*(.*)$/i,
        /^(?:text|textt|txt)\s+([a-zA-Z0-9\s]+)\s+(.*)$/i
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
      params: (matches: string[]) => ({ title: matches[1].trim(), dueDate: matches[2]?.trim() })
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
    }
  ];

  for (const h of handlers) {
    for (const pattern of h.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const intentObj = intents.find(i => i.name === h.intent);
        if (intentObj) {
          const params = h.params(match as string[]) as Record<string, any>;
          
          // Inject context if target is a pronoun
          if (params.target && activeEntity && ['him', 'her', 'them', 'it', 'his', 'hers', 'their'].includes(params.target.toLowerCase())) {
            params.target = activeEntity.name;
          }

          return { intent: intentObj, params, confidence: 100 };
        }
      }
    }
  }

  // 3. FALLBACK: Keyword / Confidence matching
  let bestMatch: { intent: Intent, confidence: number } | null = null;
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const p = pattern.toLowerCase();
      if (normalized === p) {
        bestMatch = { intent, confidence: 100 };
        break;
      }
      if (normalized.includes(p)) {
        const score = (p.length / normalized.length) * 85;
        if (!bestMatch || score > bestMatch.confidence) {
          bestMatch = { intent, confidence: Math.round(score) };
        }
      }
    }
    if (bestMatch?.confidence === 100) break;
  }

  if (!bestMatch || bestMatch.confidence < 40) return null;

  return { intent: bestMatch.intent, params: {}, confidence: bestMatch.confidence };
}
