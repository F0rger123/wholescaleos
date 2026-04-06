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

  // 3. Find matching intent by patterns with Confidence Scoring
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

  // 4. Robust Parameter Extraction
  if (matchedIntent.name === 'send_sms') {
    // Patterns: "text [name] saying [message]", "text [name] [message]", "send a message to [name]"
    const cleanRemaining = remaining.replace(/^to\s+/i, '').trim();
    
    // Look for "saying" or "that says" or "message" to split
    const splitRegex = /\ssaying\s|\sthat\ssays\s|\smessage\s/i;
    const splitMatch = cleanRemaining.match(splitRegex);
    
    if (splitMatch) {
      const splitAt = splitMatch.index!;
      params.number = cleanRemaining.substring(0, splitAt).trim();
      params.message = cleanRemaining.substring(splitAt + splitMatch[0].length).trim();
    } else {
      // Split by first space if no keyword found
      const firstSpace = cleanRemaining.indexOf(' ');
      if (firstSpace !== -1) {
        params.number = cleanRemaining.substring(0, firstSpace).trim();
        params.message = cleanRemaining.substring(firstSpace).trim();
      } else {
        params.number = cleanRemaining;
        params.message = "";
      }
    }

    // Logic: If we have a number/name but NO message, use partial intent
    if (params.number && !params.message) {
      const partial = intents.find(i => i.name === 'send_sms_partial');
      if (partial) return { intent: partial, params, confidence: bestMatch.confidence };
    }
  } else if (matchedIntent.name === 'add_task') {
    // "remind me to [description]" or "add task [description]"
    params.description = remaining || normalized;
  } else if (matchedIntent.name === 'create_lead') {
    // "add lead [name]"
    params.name = remaining;
  } else if (matchedIntent.name === 'update_status') {
    // "change status for [name] to [status]"
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

