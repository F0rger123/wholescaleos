import { Intent, intents } from '../ai/intents';
import { getLevenshteinDistance, spellCheck } from './spell-checker';
import { getMemory, getLastSuggestion, clearLastSuggestion } from './memory-store';
import { expandSynonyms } from './utils/synonym-mapper';
import { useStore } from '../../store/useStore';
import { getLearnedIntent } from './learning-service';
import { routeHybridIntent } from './improvements/local-first-router';

// Debug mode — toggle to true to see detailed intent matching logs
const DEBUG_MODE = true;

function debugLog(stage: string, message: string, data?: unknown) {
  if (!DEBUG_MODE) return;
  console.log(`[🚀 OS Strategist Debug][${stage}] ${message}`, data ?? '');
}

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, unknown>;
  confidence: number;
  originalText?: string;
  isAmbiguous?: boolean;
  isConfirming?: boolean;
  suggestion?: string;
  needsAgentLoop: boolean;
  matchedBy?: string; 
  reasoning?: string; // Chain of Thought reasoning
}

/**
 * Strips filler words and common phrases to help regex matching.
 */
export function normalizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Only strip leading filler phrases (multi-word prefixes)
  const leadingFillers = [
    /^(?:can you|please|could you|would you|hey os bot|os bot|bot|assistant|can you please|could you please)\s+/i,
    /^(?:i want to|i need to|i'd like to|let's|tell me|show me|can you tell me|do you know|can you find|find me|search for)\s+/i,
    /^(?:give me|get me|look up|check on)\s+/i,
  ];

  const trailingFillers = [
    /\s+(?:please|for me|thank you|buddy|friend|now|asap|quick)\s*$/i,
    /\?$/, 
    /[\[\]\(\)\{\}\\]/g,
    /^[ \t]+|[ \t]+$/g 
  ];

  let normalized = input.toLowerCase().trim();
  normalized = normalized.replace(/^["']+|["']+$/g, '').trim();

  // Strip generic greeting fillers at start
  const greetingFillers = /^(?:bot|ai|assistant|os bot|hey|yo|hi|hello|please|can you|could you)\s+/i;
  normalized = normalized.replace(greetingFillers, '');
  
  const wordCount = normalized.split(/\s+/).length;
  if (wordCount > 1) {
    leadingFillers.forEach(regex => {
      normalized = normalized.replace(regex, '');
    });
  }
  
  trailingFillers.forEach(regex => {
    normalized = normalized.replace(regex, '');
  });

  const correctionPattern = /^.*?(?:\b(?:wait no|no wait|actually|i mean|scratch that|wait actually|instead just|no i meant|my bad i meant)\b|[—]{1,2}|[-]{2,})\s*(?:no wait|wait no|actually|no|i meant)?\s*/i;
  if (correctionPattern.test(normalized)) {
    normalized = normalized.replace(correctionPattern, '');
  }

  normalized = expandSynonyms(normalized);
  return normalized.trim();
}

export function splitMultiIntent(input: string): string[] {
  const segments = input.split(/\s+(?:and also|and then|after that|as well as|then|and|plus|also)\s+/i);
  if (segments.length <= 1) return [input];
  return segments.map(s => s.trim()).filter(s => s.length > 2);
}

function scoreIntent(intent: { intent: string; patterns: (string | RegExp)[]; params: any }, input: string, context: any): { score: number; params: any } {
  let score = 0;
  let detectedParams: any = {};
  const normalized = input.toLowerCase().trim();

  if (intent.patterns) {
    for (const pattern of intent.patterns) {
      if (pattern instanceof RegExp) {
        const match = normalized.match(pattern);
        if (match) {
          score = 100;
          if (intent.params && typeof intent.params === 'function') {
            detectedParams = intent.params(match);
          } else if (intent.params) {
            detectedParams = intent.params;
          }
          break;
        }
      } else if (typeof pattern === 'string') {
        const lowerPattern = pattern.toLowerCase();
        if (normalized === lowerPattern) {
          score = 100;
          detectedParams = typeof intent.params === 'function' ? intent.params() : (intent.params || {});
          break;
        } else if (normalized.includes(lowerPattern)) {
          score = Math.max(score, 70);
          detectedParams = typeof intent.params === 'function' ? intent.params() : (intent.params || {});
        }
      }
    }
  }

  const activeState = context.activeState;
  const intentName = intent.intent;
  if (activeState && intentName && activeState.type.toLowerCase().includes(intentName.toLowerCase())) {
    score += 20;
  }

  if (score < 70 && intentName) {
    const keywords = intentName.split('_');
    const matches = keywords.filter((kw: string) => normalized.includes(kw));
    const keywordScore = (matches.length / keywords.length) * 60;
    score = Math.max(score, keywordScore);
  }

  return { score: Math.min(score, 100), params: detectedParams };
}

function fuzzyIntentMatch(input: string, allIntents: Intent[]): ParsedIntent | null {
  const normalized = input.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  let bestMatch: Intent | null = null;
  let highestScore = 0;

  for (const intent of allIntents) {
    const name = intent.name || (intent as any).intent;
    if (!name) continue;
    
    const keywords = name.split('_');
    let hits = 0;
    
    keywords.forEach((kw: string) => {
      if (normalized.includes(kw)) hits++;
      words.forEach(word => {
        if (getLevenshteinDistance(word, kw) <= 1) hits += 0.5;
      });
    });

    const score = (hits / keywords.length) * 40; 
    if (score > highestScore && score > 20) {
      highestScore = score;
      bestMatch = intent;
    }
  }

  if (bestMatch) {
    return {
      intent: bestMatch,
      params: { action: bestMatch.name },
      confidence: Math.round(highestScore),
      needsAgentLoop: false,
      matchedBy: 'semantic_fallback',
      reasoning: `Matched by semantic density overlap with ${bestMatch.name}.`
    };
  }

  return null;
}

export function detectMultiStep(input: string): boolean {
  const multiStepIndicators = [
    /\band then\b/i, /\bafter that\b/i, /\band also\b/i, /\bplus\b/i, /\bnext\b/i,
    /\bfind\b.*\bthen\b/i, /\bsearch\b.*\bthen\b/i, /\btext\b.*\band\s+email\b/i,
    /\badd\b.*\band\b.*\btask\b/i,
  ];
  return multiStepIndicators.some(pattern => pattern.test(input));
}

export const LOCAL_INTENTS = intents.map(i => i.name);

function isSmallTalkPhrase(input: string): boolean {
  const lower = input.toLowerCase().trim();
  const smallTalkPhrases = new Set([
    'okay', 'ok', 'k', 'kk', 'okk', 'got it', 'alright', 'sure', 'bet', 'sounds good', 'cool', 'nice', 'great', 'awesome', 'perfect', 'good', 'fine',
    'thanks', 'thank you', 'thx', 'ty', 'appreciate it',
    'stop', 'wait', 'hold up', 'cancel', 'nevermind', 'nvm', 'nah', 'no thanks', 'no', 'nope',
    'bye', 'goodbye', 'see you', 'later', 'cya', 'peace', 'good night',
    'lol', 'haha', 'hehe', 'lmao', 'funny', 'bruh', 'bro',
    'huh', 'what', 'hmm', 'pardon', 'excuse me',
    'how are you', 'whats up', 'sup', 'wassup',
    'good morning', 'morning', 'good afternoon', 'good evening',
    'tell me a joke', 'joke', 'make me laugh',
    'who are you', 'what are you',
    'yo', 'hey', 'hi', 'hello', 'heya',
    'yeah', 'yea', 'yep', 'yup'
  ]);
  return smallTalkPhrases.has(lower);
}



// REGEX HANDLERS
const handlers = [
  { intent: 'help_commands', patterns: [/^(?:help|help me|show commands|what are your commands|list commands|options|command list)\??$/i], params: () => ({}) },
  { intent: 'list_leads', patterns: [/^leads$/i, /^show leads$/i, /^list leads$/i, /^my leads$/i, /^view leads$/i, /^(?:show all leads|list all leads|get leads)$/i], params: () => ({}) },
  { intent: 'show_tasks', patterns: [/^tasks$/i, /^my tasks$/i, /^show tasks$/i, /^list tasks$/i, /^pending tasks$/i, /^view tasks$/i, /^show my tasks$/i, /^what are my tasks$/i], params: () => ({}) },
  { intent: 'capabilities', patterns: [/^what can you do\??$/i, /^capabilities$/i, /^features$/i, /^who are you$/i], params: () => ({}) },
  { intent: 'hot_leads', patterns: [/^hot leads$/i, /^top leads$/i, /^best leads$/i, /^top (\d+) leads$/i], params: (m: any) => ({ limit: parseInt(m[1]) || 5 }) },
  { intent: 'create_lead', patterns: [/^(?:add|create|new|register) lead for (.*)$/i, /^(?:add|create|new) (.*) as a lead$/i], params: (m: any) => ({ name: m[1]?.trim() }) },
  { intent: 'add_task', patterns: [/^(?:create|add) task (?:to )?(.*)$/i, /^remind me to (.*)$/i], params: (m: any) => ({ title: m[1]?.trim() }) },
  { intent: 'send_sms', patterns: [/^(?:text|message) (.*?) saying (.*)$/i, /^(?:text|message) (.*?): (.*)$/i], params: (m: any) => ({ target: m[1]?.trim(), message: m[2]?.trim() }) },
  { intent: 'joke', patterns: [/tell me a joke/i, /make me laugh/i, /^joke$/i], params: () => ({}) },
  { intent: 'time_query', patterns: [/what time is it/i, /^time$/i, /^date$/i], params: () => ({}) },
  { intent: 'test_query', patterns: [/^test$/i, /^ping$/i], params: () => ({}) },
  { intent: 'system_status', patterns: [/system status/i, /how are you/i], params: () => ({}) },
  { intent: 'navigate', patterns: [/^go to (.*)$/i, /^open (.*)$/i, /^navigate to (.*)$/i], params: (m: any) => ({ path: m[1]?.trim() }) },
  { intent: 'real_estate_knowledge', patterns: [/what is (?:a )?(.*)\??$/i, /^explain (.*)$/i], params: (m: any) => ({ topic: m[1]?.trim() }) },
  { intent: 'deal_calculator', patterns: [/calculate (flip|rental)$/i, /run a (flip|rental)/i], params: (m: any) => ({ type: m[1]?.trim() }) },
];

export async function recognizeIntent(input: string): Promise<ParsedIntent | null> {
  try {
    const memory = getMemory();
    const rawInput = input.trim();
    const lowerOrig = rawInput.toLowerCase();
    const needsAgentLoop = detectMultiStep(rawInput);

    if (!rawInput) return null;
    debugLog('START', `Input: "${rawInput}"`);

    // 1. SUGGESTION CONFIRMATION
    const confirmationPattern = /^(?:yes|yep|yup|yeah|sure|do it|ok do it|okay do it|yes do that|go ahead|sure thing|yes please|do that|absolutely|definitely|let's do it|ye|ya|bet)$/i;
    const pendingSuggestion = getLastSuggestion();
    if (pendingSuggestion && confirmationPattern.test(lowerOrig)) {
      clearLastSuggestion();
      const intentObj = intents.find(i => i.name === pendingSuggestion.action || i.action === pendingSuggestion.action);
      if (intentObj) return { intent: intentObj, params: { ...pendingSuggestion.params, action: pendingSuggestion.action }, confidence: 100, needsAgentLoop, matchedBy: 'suggestion_confirmation' };
    }

    // 2. SMALL TALK EARLY EXIT
    if (isSmallTalkPhrase(lowerOrig)) {
      const smallTalkIntent = intents.find(i => i.name === 'small_talk');
      if (smallTalkIntent) return { intent: smallTalkIntent, params: { text: lowerOrig, action: 'small_talk' }, confidence: 100, needsAgentLoop, matchedBy: 'small_talk_early_exit' };
    }

    // 3. AWAITING CONFIRMATION STATE
    if (memory.activeState?.type === 'AWAITING_INTENT_CONFIRMATION') {
      if (confirmationPattern.test(lowerOrig)) {
        return { intent: memory.activeState.data.intent, params: { ...memory.activeState.data.params }, confidence: 100, isConfirming: true, needsAgentLoop, matchedBy: 'confirmation_yes' };
      }
      if (lowerOrig.match(/^(?:no|nope|nah|cancel|stop|wrong|forget it)$/i)) {
        return { intent: { name: 'cancel_confirmation', patterns: [], action: 'cancel', template: 'No problem.' }, params: { action: 'cancel' }, confidence: 100, needsAgentLoop, matchedBy: 'confirmation_no' };
      }
    }

    // 4. EXACT KEYWORD MATCHING
    const checked = spellCheck(rawInput);
    const normalizedOrig = checked.toLowerCase().trim();
    const normalized = normalizeInput(normalizedOrig);
    
    const exactMap: Record<string, string> = {
      'tasks': 'show_tasks', 'task': 'show_tasks', 'my tasks': 'show_tasks', 'list tasks': 'show_tasks', 'show tasks': 'show_tasks',
      'leads': 'list_leads', 'lead': 'list_leads', 'my leads': 'list_leads', 'list leads': 'list_leads', 'show leads': 'list_leads',
      'help': 'help_commands', 'help me': 'help_commands', 'commands': 'help_commands', 'options': 'help_commands', 'command list': 'help_commands',
      'what can you do': 'capabilities', 'capabilities': 'capabilities', 'features': 'capabilities', 'who are you': 'capabilities',
      'hot leads': 'hot_leads', 'top leads': 'hot_leads', 'best leads': 'hot_leads',
      'hi': 'small_talk', 'hello': 'small_talk', 'hey': 'small_talk', 'yo': 'small_talk', 'whats up': 'small_talk', 'sup': 'small_talk',
      'test': 'test_query', 'ping': 'test_query', 'joke': 'joke', 'time': 'time_query'
    };

    const keywordIntent = exactMap[normalized] || exactMap[normalizedOrig];
    if (keywordIntent) {
      const intentObj = intents.find(i => i.name === keywordIntent);
      if (intentObj) return { intent: intentObj, params: { action: keywordIntent }, confidence: 100, needsAgentLoop, matchedBy: 'exact_keyword' };
    }

    // 5. REGEX & LEARNED INTENTS
    let candidates: any[] = [];
    const userId = useStore.getState().currentUser?.id;
    if (userId) {
      const learned = await getLearnedIntent(userId, normalized);
      if (learned) {
        const intentObj = intents.find(i => i.name === learned.mapped_intent);
        if (intentObj) candidates.push({ intent: intentObj, params: { ...learned.params, action: learned.mapped_intent }, score: 100, matchedBy: 'learned_exact' });
      }
    }

    for (const h of handlers) {
      const { score, params } = scoreIntent(h, normalized, memory);
      if (score > 30) {
        const intentObj = intents.find(i => i.name === h.intent);
        if (intentObj) candidates.push({ intent: intentObj, params: { ...params, action: h.intent }, score, matchedBy: score === 100 ? 'regex_match' : 'pattern_overlap' });
      }
    }

    // 6. SEMANTIC FALLBACK
    if (candidates.length === 0 || candidates.every(c => c.score < 80)) {
      const fuzzy = fuzzyIntentMatch(normalized, intents);
      if (fuzzy) candidates.push({ ...fuzzy, score: fuzzy.confidence });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (best && best.score >= 40) {
      debugLog('WINNER', `${best.intent.name} (${best.score}%)`);
      return { 
        ...best, 
        confidence: best.score, 
        originalText: rawInput, 
        needsAgentLoop: false,
        matchedBy: best.matchedBy || 'regex'
      };
    }

    // 7. HYBRID ROUTING & LOCAL FALLBACK
    const provider = useStore.getState().currentUser?.preferred_api_provider;
    const allowExternal = provider !== 'local';
    
    debugLog('HYBRID', allowExternal ? 'Falling back to External API check...' : 'Local Mode: Bypassing External API');
    
    const context = { personality: useStore.getState().aiTone || 'professional', recentMessages: memory.history };
    const hybrid = await routeHybridIntent(
      rawInput, 
      context, 
      { 
        exact: best?.score === 100 ? best : null, 
        regex: best?.score >= 80 ? best : null, 
        embedding: best 
      },
      allowExternal
    );

    if (hybrid) {
      return { ...hybrid, needsAgentLoop: hybrid.needsAgentLoop ?? false };
    }

    // 8. FINAL LOCAL FALLBACK (Help/Capabilities)
    debugLog('NO_MATCH', 'Returning helpful local fallback.');
    const helpIntent = intents.find(i => i.name === 'help_commands' || i.name === 'capabilities');
    return {
      intent: helpIntent || intents[0],
      params: { action: 'help_commands' },
      confidence: 100,
      matchedBy: 'final_local_fallback',
      reasoning: "No intent found locally or via API. Providing help/capabilities as fallback.",
      needsAgentLoop: false
    };
  } catch (error) {
    console.error('[❌ OS Bot] recognizeIntent Crash:', error);
    return null;
  }
}
