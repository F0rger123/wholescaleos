import { Intent, intents } from '../ai/intents';
import { spellCheck } from './spell-checker';

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

  // 2. Multi-turn context cleanup (e.g., "to Mike saying hi")
  normalized = normalized.replace(/^to\s+/i, '');

  // 3. SPECIAL CASE: Exact matches/Start matches for SMS
  // "text [name] saying [message]"
  // "text [name] [message]"
  // "text someone for me"
  // "can you send a text"
  // "text [name]"
  // Typos: "textt Luke", "txt luke"
  
  const smsPatterns = [
    { pattern: /^(?:text|textt|txt|send text to|send sms to|message|send a message to)\s+(.*?)\s+(?:saying|that says|message)\s+(.*)$/i, intent: 'send_sms', fields: ['number', 'message'] },
    { pattern: /^(?:text|textt|txt|send text to|send sms to|message|send a message to)\s+(.*?)\s+(.*)$/i, intent: 'send_sms', fields: ['number', 'message'] },
    { pattern: /^(?:text|textt|txt|send text to|send sms to|message|send a message to)\s+(.*)$/i, intent: 'send_sms', fields: ['number'] },
    { pattern: /^(?:text someone for me|can you send a text|send a text|send sms|text someone|write a text)$/i, intent: 'send_sms_partial', fields: [] }
  ];

  for (const p of smsPatterns) {
    const match = normalized.match(p.pattern);
    if (match) {
      const params: Record<string, any> = {};
      p.fields.forEach((field, i) => {
        params[field] = match[i + 1].trim();
      });

      const intentObj = intents.find(i => i.name === p.intent);
      if (intentObj) {
        // If it's send_sms but missing message, convert to partial
        if (p.intent === 'send_sms' && !params.message) {
           const partial = intents.find(i => i.name === 'send_sms_partial');
           return { intent: partial || intentObj, params, confidence: 100 };
        }
        return { intent: intentObj, params, confidence: 100 };
      }
    }
  }

  // 4. Find matching intent by patterns with Confidence Scoring (Standard Flow)
  let bestMatch: { intent: Intent, pattern: string, confidence: number } | null = null;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const p = pattern.toLowerCase();
      
      // Exact match
      if (normalized === p) {
        bestMatch = { intent, pattern, confidence: 100 };
        break;
      }
      
      // Starts with (strong)
      if (normalized.startsWith(p + ' ')) {
        bestMatch = { intent, pattern, confidence: 95 };
        break;
      }

      // Includes (weak)
      if (normalized.includes(p)) {
        const score = (p.length / normalized.length) * 90;
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

