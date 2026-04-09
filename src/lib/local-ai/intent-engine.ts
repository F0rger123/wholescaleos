import { Intent, intents } from '../ai/intents';
import { spellCheck, getLevenshteinDistance } from './spell-checker';
import { resolveEntityFromContext, getMemory, setActiveState, setTopic, getLearnedFact } from './memory-store';

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, any>;
  confidence: number;
  originalText?: string;
  isAmbiguous?: boolean;
  isConfirming?: boolean;
  suggestion?: string;
}

/**
 * Strips filler words and common phrases to help regex matching
 */
export function normalizeInput(input: string): string {
  const fillers = [
    /^(?:can you|please|could you|would you|hey os bot|os bot|bot|assistant|can you please|could you please)\s+/i,
    /^(?:i want to|i need to|i'd like to|let's)\s+/i,
    /\s+(?:please|now|right now|immediately|for me|thank you|thanks)$/i,
    /\?$/, // remove question mark at the end
    /[\[\]\(\)\{\}\\]/g, // strip common typo characters like [ or ]
    /^[ \t]+|[ \t]+$/g // trim whitespace
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
      
      const nouns = ['lead', 'task', 'pipeline', 'workflow', 'automation', 'contact', 'weather', 'name'];
      if (nouns.includes(pw)) weight += 10;

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
  const lowerOrig = input.toLowerCase().trim();
  
  // Check for custom facts/memory first
  if (lowerOrig === "what's my name" || lowerOrig === "whats my name" || lowerOrig === "what is my name") {
    const name = getLearnedFact('name');
    if (name) {
      return {
        intent: { name: 'small_talk', action: 'small_talk', patterns: [], template: `Your name is ${name}.` },
        params: { text: `Your name is ${name}.` },
        confidence: 100
      };
    }
  }

  if (lowerOrig.includes("address for") || lowerOrig.includes("where is")) {
    const target = lowerOrig.replace(/^(?:what's the|whats the|where is the|address for)\s+/i, '').replace(/\s*property\s*/i, '').trim();
    const address = getLearnedFact(`last_address`); // Or more complex logic
    if (address && lowerOrig.includes(target)) {
       return {
         intent: { name: 'small_talk', action: 'small_talk', patterns: [], template: `The address for ${target} is ${address}.` },
         params: { text: `The address for ${target} is ${address}.` },
         confidence: 100
       };
    }
  }

  const checked = spellCheck(input);
  const normalizedOrig = checked.toLowerCase().trim();
  const normalized = normalizeInput(normalizedOrig);
  const activeEntity = resolveEntityFromContext(normalized);

  console.log(`[🤖 OS Bot] Normalized: "${normalized}" | Active Entity: ${activeEntity?.name || 'none'}`);

  // Check for typo suggestions (Fuzzy matching on command keywords)
  const commandKeywords = ['text', 'lead', 'task', 'weather', 'update', 'status', 'add', 'create', 'hello', 'whats up', 'hey', 'yo'];
  const inputWords = normalized.split(/\s+/);
  
  for (const keyword of commandKeywords) {
    for (const word of inputWords) {
      if (word.length < 3 && keyword.length >= 3) continue; // skip very short words
      
      const distance = getLevenshteinDistance(word, keyword);
      if (distance > 0 && distance <= 2) {
        const confidence = 100 - (distance * 20); // Simple confidence
        if (confidence > 70) {
          const suggestedText = normalized.replace(word, keyword);
          return {
            intent: { name: 'typo_suggestion', action: 'small_talk', patterns: [], template: `I think you meant '${keyword}'?` },
            params: { text: `I think you meant '${keyword}'?`, suggestedText, keyword },
            confidence: 100,
            suggestion: keyword
          };
        }
      }
    }
  }

  // Handle specific "Whats u[" case specifically if it slipped through
  if (normalized === 'whats u' || normalized === 'whats up') {
    // If it's already whats up, greeting handler will catch it, 
    // but if it's 'whats u' it might need help
  }

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

  // 2. PRIORITY REGEX HANDLERS
  const handlers = [
    {
      intent: 'greeting',
      patterns: [
        /^(?:yo|hi|hello|hey|hey there|hi there|hola|howdy|sup|what's up|whats up|whats? u[\[p]?)$/i,
        /^(?:how's it going|how are you|good morning|good afternoon|good evening)$/i,
        /\b(?:hi|hello|yo|hey)\b/i
      ],
      params: (matches: string[]) => ({ text: matches[0].toLowerCase() })
    },
    {
      intent: 'weather_query',
      patterns: [
        /^(?:what's the weather|whats the weather|what is the weather|how is the weather|is it raining|weather forecast)$/i,
        /^(?:weather|forecast|wevver)$/i,
        /\bweather\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'personality_check',
      patterns: [
        /^(?:can you talk how i told you to|talk like i told you|use my settings|how i told you to talk)$/i,
        /^(?:like in the settings|as specified in settings)$/i,
        /\b(?:personality|custom style|settings)\b/i
      ],
      params: () => ({})
    },
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
      intent: 'add_task',
      patterns: [
        /^(?:create task|add task|remind me to|set reminder|remind me)\s+(?:to\s+)?(.*?)(?:\s+(?:for|on|due|at|by)\s+(.*))?$/i
      ],
      params: (matches: string[]) => {
        setTopic('tasks');
        return { title: matches[1].trim(), dueDate: matches[2]?.trim() };
      }
    },
    {
      intent: 'create_lead',
      patterns: [
        /^(?:add|create|new|register)\s+(?:a\s+)?lead\s+(?:for\s+)?([a-zA-Z\s]+)$/i,
        /^(?:add|create|new)\s+([a-zA-Z\s]+)\s+as\s+(?:a\s+)?lead$/i,
        /^(?:leed|add leed)\s+([a-zA-Z\s]+)$/i
      ],
      params: (matches: string[]) => ({ name: matches[1].trim() })
    },
    {
      intent: 'help',
      patterns: [
        /^(?:help|what can you do|capabilities|features|show commands|options)$/i,
        /\b(?:help|capabilities)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'test_query',
      patterns: [
        /^(?:test|testing|system test|is it working)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'change_greeting',
      patterns: [
        /^(?:change your greeting to|set your greeting to|update your greeting to|change greeting to)\s+(.*)$/i,
        /^(?:change your greeting|update your greeting|change greeting|set greeting)$/i
      ],
      params: (matches: string[]) => ({ newGreeting: matches[1]?.trim() })
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

  // 3. FUZZY MATCHING FALLBACK
  const scores = intents.map(intent => ({
    intent,
    score: calculateIntentScore(normalized, intent)
  })).sort((a, b) => b.score - a.score);

  const bestMatchResult = scores[0];
  if (bestMatchResult && bestMatchResult.score >= 75) {
    return {
      intent: bestMatchResult.intent,
      params: {},
      confidence: bestMatchResult.score,
      originalText: input
    };
  }

  return null;
}
