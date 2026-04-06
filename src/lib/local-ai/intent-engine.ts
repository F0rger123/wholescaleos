import { Intent, intents } from '../ai/intents';
import { spellCheck } from './spell-checker';
import { resolveEntityFromContext } from './memory-store';

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, any>;
  confidence: number;
}

export const LOCAL_INTENTS = intents.map(i => i.name);

export function recognizeIntent(input: string): ParsedIntent | null {
  // 1. Spell Check & Normalize
  const checked = spellCheck(input);
  let normalized = checked.toLowerCase().trim();

  // 2. Resolve multi-turn entity (pronouns)
  const activeEntity = resolveEntityFromContext(normalized);

  // 3. PRIORITY REGEX MATCHING
  const handlers = [
    // --- SMS / Messaging ---
    {
      intent: 'send_sms',
      patterns: [
        /^(?:text|textt|txt|send text to|send sms to|message|send a message to|shoot a text to|tell)\s+([a-zA-Z\s]+)\s+(?:saying|that says|message|with the message|telling them|that)\s+(.*)$/i,
        /^(?:text|textt|txt|message|tell)\s+([a-zA-Z\s]+)\s*(?:[,:]\s*)?(.*)$/i
      ],
      params: (matches: string[]) => ({ target: matches[1].trim(), message: matches[2].trim() })
    },
    {
      intent: 'send_sms_partial',
      patterns: [
        /^(?:text|textt|txt|send text to|send sms to|message|send a message to|shoot a text to|tell)\s+([a-zA-Z\s]+)$/i,
        /^(?:text someone for me|can you text for me|send a text|send sms|text someone|write a text|send a message|i want to text someone)$/i
      ],
      params: (matches: string[]) => ({ target: matches[1]?.trim() })
    },

    // --- Lead Management ---
    {
      intent: 'create_lead',
      patterns: [
        /^(?:add|create|new)\s+lead\s+([a-zA-Z\s]+)\s+from\s+(.*)$/i,
        /^(?:add|create|new)\s+lead\s+([a-zA-Z\s]+)$/i,
        /^(?:add|create)\s+([a-zA-Z\s]+)\s+as\s+a\s+lead$/i
      ],
      params: (matches: string[]) => ({ name: matches[1].trim(), location: matches[2]?.trim() })
    },

    // --- Task Management ---
    {
      intent: 'add_task',
      patterns: [
        /^(?:create task|add task|remind me to|set a reminder for)\s+(.*?)\s+(?:for|on|due|at)\s+(.*)$/i,
        /^(?:create task|add task|remind me to|set a reminder for)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ title: matches[1].trim(), dueDate: matches[2]?.trim() })
    },

    // --- Navigation ---
    {
      intent: 'navigate',
      patterns: [
        /^(?:go to|show me|open|take me to)\s+(leads|tasks|calendar|dashboard|settings|inbox)$/i
      ],
      params: (matches: string[]) => ({ path: matches[1].toLowerCase() })
    },

    // --- Queries ---
    {
      intent: 'lead_query',
      patterns: [
        /^how many leads(?: do i have)?$/i,
        /^show my recent deals$/i,
        /^what's my top lead$/i
      ],
      params: () => ({})
    },
    {
      intent: 'task_query',
      patterns: [
        /^how many tasks(?: do i have)?$/i,
        /^how many tasks are overdue$/i,
        /^(?:what are|show)? my overdue tasks$/i
      ],
      params: () => ({})
    },
    {
      intent: 'schedule',
      patterns: [
        /^what's on my calendar today$/i,
        /^show my schedule for today$/i,
        /^what meetings do i have today$/i,
        /^when is my next appointment$/i
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
          const params = h.params(match) as Record<string, any>;
          
          // Inject context if target is a pronoun
          if (params.target && activeEntity && ['him', 'her', 'them', 'it', 'his', 'hers', 'their'].includes(params.target.toLowerCase())) {
            params.target = activeEntity.name;
          }

          return { intent: intentObj, params, confidence: 100 };
        }
      }
    }
  }

  // 4. FALLBACK: Keyword Matching (Confidence Scoring)
  let bestMatch: { intent: Intent, pattern: string, confidence: number } | null = null;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const p = pattern.toLowerCase();
      if (normalized === p) {
        bestMatch = { intent, pattern, confidence: 100 };
        break;
      }
      if (normalized.startsWith(p + ' ')) {
        bestMatch = { intent, pattern, confidence: 95 };
        break;
      }
      if (normalized.includes(p)) {
        const score = (p.length / normalized.length) * 85;
        if (!bestMatch || score > bestMatch.confidence) {
          bestMatch = { intent, pattern, confidence: Math.round(score) };
        }
      }
    }
    if (bestMatch?.confidence === 100) break;
  }

  if (!bestMatch || bestMatch.confidence < 45) return null;

  const matchedIntent = bestMatch.intent;
  const params: Record<string, any> = { ...matchedIntent.params };

  const patternUsed = bestMatch.pattern.toLowerCase();
  const index = normalized.indexOf(patternUsed);
  const remaining = normalized.substring(index + patternUsed.length).trim();

  // 5. Robust Parameter Extraction for other intents
  if (matchedIntent.name === 'add_task') {
    params.description = remaining || normalized;
  } else if (matchedIntent.name === 'create_lead') {
    params.name = remaining;
  } else if (matchedIntent.name === 'update_status') {
    const toMatch = remaining.match(/(.*?)\s+to\s+(.*)/i);
    if (toMatch) {
      params.leadName = toMatch[1].replace(/^for\s+/i, '').trim();
      params.status = toMatch[2].trim();
    } else {
      params.leadName = remaining.replace(/^for\s+/i, '').trim();
    }
  }

  return {
    intent: matchedIntent,
    params,
    confidence: bestMatch.confidence
  };
}

