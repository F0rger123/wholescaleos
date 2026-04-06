import { Intent, intents } from './intents';
import { AIContextManager } from './context';
import { UserLearningManager } from './user-learning';

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, any>;
  confidence: number;
}

export function parseIntent(input: string): ParsedIntent | null {
  let normalized = input.toLowerCase().trim();

  // 1. Resolve Shortcuts and Training
  const prefs = UserLearningManager.getPreferences();
  if (prefs.shortcuts[normalized]) {
    normalized = prefs.shortcuts[normalized].toLowerCase();
  }
  
  // Handle "Train: X means Y"
  if (normalized.startsWith('train:') || normalized.startsWith('learn:')) {
    const trainingParts = normalized.replace(/train:|learn:/, '').split('means');
    if (trainingParts.length === 2) {
      return {
        intent: intents.find(i => i.name === 'train_ai')!,
        params: { phrase: trainingParts[0].trim(), meaning: trainingParts[1].trim() },
        confidence: 100
      };
    }
  }

  // 2. Handle Contextual References ("him", "it", "that lead")
  const context = AIContextManager.getContext();
  if (normalized.includes('him') || normalized.includes('it') || normalized.includes('that lead')) {
    if (context.lastLeadName) {
      normalized = normalized.replace(/him|it|that lead/g, context.lastLeadName);
    }
  }

  // 3. Find matching intent by patterns with Confidence Scoring
  let bestMatch: { intent: Intent, pattern: string, confidence: number } | null = null;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const p = pattern.toLowerCase();
      if (normalized === p) {
        bestMatch = { intent, pattern, confidence: 100 };
        break;
      }
      if (normalized.startsWith(p)) {
        bestMatch = { intent, pattern, confidence: 95 };
        break;
      }
      if (normalized.includes(p)) {
        const score = (p.length / normalized.length) * 90;
        if (!bestMatch || score > bestMatch.confidence) {
          bestMatch = { intent, pattern, confidence: Math.round(score) };
        }
      }
    }
    if (bestMatch?.confidence === 100) break;
  }

  if (!bestMatch || bestMatch.confidence < 40) return null;

  const matchedIntent = bestMatch.intent;
  const params: Record<string, any> = { ...matchedIntent.params };

  // 4. Extract parameters
  // Helper: Extract location (zip code)
  const zipMatch = normalized.match(/\b\d{5}\b/);
  if (zipMatch) params.location = zipMatch[0];

  // Helper: Extract source
  const sourceKeywords = ['facebook', 'zillow', 'referral', 'bandit', 'website', 'social'];
  sourceKeywords.forEach(s => {
    if (normalized.includes(s)) params.source = s;
  });

  // Helper: Extract phone number
  const phoneMatch = normalized.match(/(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch) params.number = phoneMatch[0];

  const patternUsed = bestMatch.pattern.toLowerCase();
  const remaining = normalized.split(patternUsed)[1]?.trim() || "";

  // Logic for specific intents
  if (matchedIntent.name === 'send_sms') {
    // Handle "text [name] saying [message]" or "text [name] [message]"
    const cleanRemaining = remaining.replace(/^to\s+/i, '').trim();
    const sayingMatch = cleanRemaining.match(/(.*?)\s+saying\s+(.*)/i);
    
    if (sayingMatch) {
      params.number = params.number || sayingMatch[1].trim(); // Name or number
      params.message = sayingMatch[2].trim();
    } else {
      // split by first space if no "saying"
      const firstSpace = cleanRemaining.indexOf(' ');
      if (firstSpace !== -1) {
        params.number = params.number || cleanRemaining.substring(0, firstSpace).trim();
        params.message = cleanRemaining.substring(firstSpace).trim();
      } else {
        params.number = params.number || cleanRemaining;
        params.message = "";
      }
    }
    
    // If we have a number/name but NO message, downgrade to partial
    if (params.number && !params.message) {
      return {
        intent: intents.find(i => i.name === 'send_sms_partial')!,
        params,
        confidence: bestMatch.confidence
      };
    }
  } else if (matchedIntent.name === 'add_task') {
    params.description = remaining || normalized;
  } else if (matchedIntent.name === 'create_lead') {
    params.name = remaining;
  } else if (matchedIntent.name === 'update_status') {
    const parts = remaining.split(' to ');
    if (parts.length === 2) {
      params.leadName = parts[0].replace('for ', '').trim();
      params.status = parts[1].trim();
    } else {
      params.leadName = remaining;
    }
  } else if (matchedIntent.name === 'lead_details') {
    params.name = remaining.replace('for ', '').trim();
  } else if (matchedIntent.name === 'filter_leads_source') {
    params.source = remaining.replace('from ', '').trim();
  } else if (matchedIntent.name === 'filter_leads_location') {
    params.location = remaining.replace('in ', '').trim();
  }

  return {
    intent: matchedIntent,
    params,
    confidence: bestMatch.confidence
  };
}
