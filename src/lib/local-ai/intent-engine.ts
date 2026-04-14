import { Intent, intents } from '../ai/intents';
import { spellCheck, getLevenshteinDistance } from './spell-checker';
import { resolveEntitiesFromContext, resolveEntityFromContext, getMemory, setActiveState, setTopic, getLearnedFact, getLastSuggestion, clearLastSuggestion } from './memory-store';
import { getLearnedIntent } from './learning-service';
import { useStore } from '../../store/useStore';
import { expandSynonyms } from './utils/synonym-mapper';

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
 * IMPORTANT: Does NOT strip standalone small-talk words — those are
 * handled by the small_talk handler before this function is relevant.
 */
export function normalizeInput(input: string): string {
  // Only strip leading filler phrases (multi-word prefixes)
  const leadingFillers = [
    /^(?:can you|please|could you|would you|hey os bot|os bot|bot|assistant|can you please|could you please)\s+/i,
    /^(?:i want to|i need to|i'd like to|let's|tell me|show me|can you tell me|do you know)\s+/i,
    /^(?:give me)\s+/i,
  ];

  // Only strip trailing filler phrases (multi-word suffixes)
  const trailingFillers = [
    /\s+(?:please|for me|thank you|buddy|friend)\s*$/i,
    /\?$/, // remove question mark at the end
    /[\[\]\(\)\{\}\\]/g, // strip common typo characters like [ or ]
    /^[ \t]+|[ \t]+$/g // trim whitespace
  ];

  // Input safety
  if (!input || typeof input !== 'string') return '';
  
  let normalized = input.toLowerCase().trim();

  // Strip leading/trailing quotation marks (for forgiving input)
  normalized = normalized.replace(/^["']+|["']+$/g, '').trim();

  // Handle missing space after starting quote if it was mistakenly stripped or present
  // e.g. "Analyze -> Analyze
  
  // Strip only very generic conversational filler at start
  const greetingFillers = /^(?:bot|ai|assistant|os bot|hey|yo|please|can you|could you)\s+/i;
  normalized = normalized.replace(greetingFillers, '');
  
  // Only apply leading filler stripping if the input has multiple words
  const wordCount = normalized.split(/\s+/).length;
  if (wordCount > 2) {
    leadingFillers.forEach(regex => {
      normalized = normalized.replace(regex, '');
    });
  }
  
  trailingFillers.forEach(regex => {
    normalized = normalized.replace(regex, '');
  });

  // Self-Correction: discard everything before "wait actually", "no wait", dashes, etc.
  const correctionPattern = /^.*?(?:\b(?:wait no|no wait|actually|i mean|scratch that|wait actually|instead just)\b|[—]{1,2}|[-]{2,})\s*(?:no wait|wait no|actually|no)?\s*/i;
  if (correctionPattern.test(normalized)) {
    normalized = normalized.replace(correctionPattern, '');
  }

  // Stage 0.5: Expand synonyms (deals -> leads, etc.)
  normalized = expandSynonyms(normalized);

  return normalized.trim();
}

export function splitMultiIntent(input: string): string[] {
  // Use a more robust regex that handles compound delimiters first
  // Delimiters: "and also", "and then", "after that", "and", "plus", "also", "then", "as well as"
  const segments = input.split(/\s+(?:and also|and then|after that|as well as|then|and|plus|also)\s+/i);
  if (segments.length <= 1) return [input];
  return segments.map(s => s.trim()).filter(s => s.length > 2);
}

/**
 * Evaluates an intent against normalized input and context.
 * Returns a score from 0-100.
 */
function scoreIntent(intent: any, input: string, context: any): { score: number; params: any } {
  let score = 0;
  let detectedParams: any = {};
  const normalized = input.toLowerCase().trim();

  // 1. Regex Match (High Weight: 70-100)
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
          detectedParams = intent.params || {};
          break;
        } else if (normalized.includes(lowerPattern)) {
          score = Math.max(score, 70);
          detectedParams = intent.params || {};
        }
      }
    }
  }

  // 2. Contextual Boosting (Bonus: 10-20)
  const activeState = context.activeState;
  if (activeState) {
    // Boost intent if it matches the active topic/state
    if (activeState.type.toLowerCase().includes(intent.intent.toLowerCase())) {
      score += 20;
    }
  }

  // 3. Keyword Density (Medium Weight: 0-60)
  if (score < 70) {
    const keywords = intent.intent.split('_');
    const matches = keywords.filter((kw: string) => normalized.includes(kw));
    const keywordScore = (matches.length / keywords.length) * 60;
    score = Math.max(score, keywordScore);
  }

  return { score: Math.min(score, 100), params: detectedParams };
}

/**
 * Fallback semantic matching when regex fails.
 */
function fuzzyIntentMatch(input: string, allIntents: any[]): ParsedIntent | null {
  const normalized = input.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  let bestMatch: any = null;
  let highestScore = 0;

  for (const intent of allIntents) {
    const keywords = intent.name.split('_');
    let hits = 0;
    
    keywords.forEach((kw: string) => {
      if (normalized.includes(kw)) hits++;
      // Check for fuzzy match on keywords
      words.forEach(word => {
        if (getLevenshteinDistance(word, kw) <= 1) hits += 0.5;
      });
    });

    const score = (hits / keywords.length) * 40; // Max 40 for fuzzy
    if (score > highestScore && score > 20) {
      highestScore = score;
      bestMatch = intent;
    }
  }

  if (bestMatch) {
    debugLog('FUZZY', `Matched by semantic density: ${bestMatch.name} (Score: ${highestScore})`);
    return {
      intent: bestMatch,
      params: {},
      confidence: Math.round(highestScore),
      needsAgentLoop: false,
      matchedBy: 'semantic_fallback',
      reasoning: `No direct pattern matched, but query shares ${Math.round(highestScore)}% semantic overlap with ${bestMatch.name}.`
    };
  }

  return null;
}

/**
 * Detects if the input requires multi-step reasoning or tool chaining.
 */
export function detectMultiStep(input: string): boolean {
  // Only trigger for phrases that strongly indicate a chain of actions
  const multiStepIndicators = [
    /\band then\b/i,
    /\bafter that\b/i,
    /\band also\b/i,
    /\bplus\b/i,
    /\bnext\b/i,
    /\bfind\b.*\bthen\b/i,
    /\bsearch\b.*\bthen\b/i,
    /\btext\b.*\band\s+email\b/i,
    /\badd\b.*\band\b.*\btask\b/i,
  ];
  return multiStepIndicators.some(pattern => pattern.test(input));
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

  // 2. Keyword density — only consider words > 2 chars
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

  // 3. Negative signals (Anti-patterns) — BUT NOT for small_talk intent
  if (intent.name !== 'small_talk') {
    const negatives = ['don\'t', 'never', 'none'];
    if (negatives.some(n => words.includes(n))) {
      score -= 50;
    }
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Checks if an input is a common short/casual phrase that should be treated
 * as small talk rather than a command. This prevents short words from
 * being sent to typo suggestion or "I didn't understand."
 */
function isSmallTalkPhrase(input: string): boolean {
  const lower = input.toLowerCase().trim();
  
  // Comprehensive list of short conversational phrases
  const smallTalkPhrases = new Set([
    // Acknowledgments
    'okay', 'ok', 'k', 'kk', 'okk', 'okayyy', 'okayy', 'okie', 'okey', 'oki',
    'got it', 'alr', 'alright', 'sure', 'bet', 'sounds good', 'cool', 'nice',
    'great', 'awesome', 'perfect', 'good', 'fine', 'right', 'noted', 'understood',
    'roger', 'copy', 'yep', 'yup', 'ya', 'yah', 'ye', 'word', 'facts', 'true',
    'fair', 'valid', 'aight', 'ight', 'ite', 'kewl', 'noice', 'dope',
    // Gratitude
    'thanks', 'thank you', 'thx', 'ty', 'appreciate it', 'tysm', 'tyvm',
    'much appreciated', 'thank u', 'thnx', 'thnks', 'tanks',
    // Stop/Cancel/No
    'stop', 'wait', 'hold up', 'hold on', 'pause', 'cancel', 'nevermind', 
    'nvm', 'nah', 'no thanks', 'no', 'nope', 'naw', 'neh',
    // Farewell
    'bye', 'goodbye', 'see you', 'see ya', 'later', 'cya', 'peace', 'im out',
    'gotta go', 'good night', 'gn', 'ttyl', 'bai', 'byeee', 'laterr',
    // Laughter
    'lol', 'haha', 'hehe', 'lmao', 'lmfao', 'rofl', 'nice one', 'good one',
    'funny', 'dead', 'bruh', 'bro', 'ong', 'fr', 'no cap',
    // Confusion (NOTE: 'repeat that', 'say that again', 'what did you say', 'come again' removed — handled by repeat_last)
    'huh', 'what', 'hmm', 'umm', 'um', 'uh', 'pardon', 'excuse me',
    'say what', 'i dont get it', "i don't get it", 'wut', 'wat', 'hm',
    // Status Check
    'how are you', 'how you doing', 'how goes it', 'whats up', "what's up",
    'whats new', 'how are things', 'sup', 'wassup', 'wsg',
    // Time-based greetings
    'good morning', 'morning', 'good afternoon', 'afternoon',
    'good evening', 'evening',
    // Jokes
    'tell me a joke', 'make me laugh', 'joke', 'humor me',
    'another joke', 'different joke', 'give me another',
    // Identity
    'who are you', 'what are you', 'introduce yourself',
    // Opinion
    'what do you think', 'your opinion', 'thoughts',
    // Fillers/misc
    'yo', 'hey', 'hi', 'hello', 'henlo', 'heya', 'hiya',
    'plz', 'pls', 'tho', 'tbh', 'idk', 'idc', 'imo', 'smh',
    'welp', 'well', 'hmm ok', 'ok cool', 'ok thanks', 'ok bye',
    'yeah', 'yea', 'yass', 'yas',
  ]);

  return smallTalkPhrases.has(lower);
}

/**
 * Categorizes a small-talk phrase for the task executor
 */
function categorizeSmallTalk(input: string): string {
  const lower = input.toLowerCase().trim();

  // Acknowledgments
  if (/^(okay|ok|k|kk|okk|okayyy|okayy|okie|okey|oki|got it|alr|alright|sure|bet|sounds good|cool|nice|great|awesome|perfect|good|fine|right|noted|understood|roger|copy|yep|yup|ya|yah|ye|word|facts|true|fair|valid|aight|ight|ite|kewl|noice|dope)$/i.test(lower)) return lower;
  
  // Gratitude
  if (/^(thanks|thank you|thx|ty|appreciate it|tysm|tyvm|much appreciated|thank u|thnx|thnks|tanks)$/i.test(lower)) return lower;
  
  // Stop/Cancel
  if (/^(stop|wait|hold up|hold on|pause|cancel|nevermind|nvm|nah|no thanks|no|nope|naw|neh)$/i.test(lower)) return lower;
  
  // Farewell
  if (/^(bye|goodbye|see you|see ya|later|cya|peace|im out|gotta go|good night|gn|ttyl|bai|byeee|laterr)$/i.test(lower)) return lower;
  
  // Laughter
  if (/^(lol|haha|hehe|lmao|lmfao|rofl|nice one|good one|funny|dead|bruh|bro|ong|fr|no cap)$/i.test(lower)) return lower;
  
  // Confusion
  if (/^(huh|what|hmm|umm|um|uh|pardon|excuse me|come again|say what|what did you say|say that again|repeat that|i dont get it|i don't get it|wut|wat|hm)$/i.test(lower)) return lower;
  
  // Status
  if (/^(how are you|how you doing|how goes it|whats up|what's up|whats new|how are things|sup|wassup|wsg)$/i.test(lower)) return lower;
  
  // Time-based greetings
  if (/^(good morning|morning|good afternoon|afternoon|good evening|evening)$/i.test(lower)) return lower;
  
  // Jokes
  if (/^(tell me a joke|make me laugh|joke|humor me|another joke|different joke|give me another)$/i.test(lower)) return lower;
  
  // Identity
  if (/^(who are you|what are you|introduce yourself)$/i.test(lower)) return lower;
  
  // Opinion
  if (/^(what do you think|your opinion|thoughts)$/i.test(lower)) return lower;
  
  return lower;
}

export async function recognizeIntent(input: string): Promise<ParsedIntent | null> {
  try {
    const memory = getMemory();
    const lowerOrig = input.toLowerCase().trim();
    const needsAgentLoop = detectMultiStep(input);

    if (!input || input.trim().length === 0) return null;

    debugLog('START', `Input: "${input}" | Lower: "${lowerOrig}"`);

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE -1: SUGGESTION CONFIRMATION
    // If the bot just offered a suggestion ("Want me to show your tasks?")
    // and the user replies with a confirmation phrase, execute that suggestion.
    // This MUST come before small talk, since "yes" / "sure" are small talk.
    // ═══════════════════════════════════════════════════════════════════════
    const confirmationPattern = /^(?:yes|yep|yup|yeah|sure|do it|ok do it|okay do it|yes do that|yeah do that|yeah go ahead|go ahead|sure thing|yes please|yea do it|do that|go for it|yeah please|yep do it|absolutely|definitely|please do|make it happen|let's do it|lets do it|ye|ya|bet)$/i;
    
    const pendingSuggestion = getLastSuggestion();
    if (pendingSuggestion && confirmationPattern.test(lowerOrig)) {
    debugLog('MATCHED', `Suggestion confirmation: "${lowerOrig}" → executing last suggestion: ${pendingSuggestion.action}`, pendingSuggestion);
    clearLastSuggestion();
    
    const intentObj = intents.find(i => i.name === pendingSuggestion.action || i.action === pendingSuggestion.action);
    if (intentObj) {
      return {
        intent: intentObj,
        params: pendingSuggestion.params as Record<string, unknown>,
        confidence: 100,
        needsAgentLoop,
        matchedBy: 'suggestion_confirmation'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 0: SMALL TALK EARLY EXIT
  // Check for common conversational phrases FIRST, before any processing.
  // This prevents "okay", "thanks", "lol", "stop" etc. from ever reaching
  // typo suggestion or "I didn't understand".
  // ═══════════════════════════════════════════════════════════════════════
  if (isSmallTalkPhrase(lowerOrig)) {
    const smallTalkIntent = intents.find(i => i.name === 'small_talk');
    if (smallTalkIntent) {
      const text = categorizeSmallTalk(lowerOrig);
      debugLog('MATCHED', `Small talk early exit: "${lowerOrig}" → small_talk`, { text });
      return {
        intent: smallTalkIntent,
        params: { text },
        confidence: 100,
        needsAgentLoop,
        matchedBy: 'small_talk_early_exit'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 0.5: CUSTOM FACTS/MEMORY
  // ═══════════════════════════════════════════════════════════════════════
  if (lowerOrig === "what's my name" || lowerOrig === "whats my name" || lowerOrig === "what is my name") {
    const name = getLearnedFact('name');
    if (name) {
      debugLog('MATCHED', 'Name recall from memory');
      return {
        intent: { name: 'small_talk', action: 'small_talk', patterns: [], template: `Your name is ${name}.` },
        params: { text: `Your name is ${name}.` },
        confidence: 100,
        needsAgentLoop,
        matchedBy: 'memory_fact'
      };
    }
  }

  if (lowerOrig.includes("address for") || lowerOrig.includes("where is")) {
    const target = lowerOrig.replace(/^(?:what's the|whats the|where is the|address for)\s+/i, '').replace(/\s*property\s*/i, '').trim();
    const address = getLearnedFact(`last_address`);
    if (address && lowerOrig.includes(target)) {
       debugLog('MATCHED', 'Address recall from memory');
       return {
         intent: { name: 'small_talk', action: 'small_talk', patterns: [], template: `The address for ${target} is ${address}.` },
         params: { text: `The address for ${target} is ${address}.` },
         confidence: 100,
         needsAgentLoop,
         matchedBy: 'memory_fact'
       };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 1: CONFIRMATION / MULTI-TURN STATE
  // ═══════════════════════════════════════════════════════════════════════
  if (memory.activeState?.type === 'AWAITING_INTENT_CONFIRMATION') {
    if (confirmationPattern.test(lowerOrig)) {
      debugLog('MATCHED', 'Confirmation: YES');
      return { 
        intent: memory.activeState.data.intent, 
        params: memory.activeState.data.params || {}, 
        confidence: 100,
        isConfirming: true,
        needsAgentLoop,
        matchedBy: 'confirmation_yes'
      };
    }
    if (lowerOrig.match(/^(?:no|nope|nah|nevermind|nvm|stop|cancel|wrong|no thanks|forget it|never mind)$/i)) {
      debugLog('MATCHED', 'Confirmation: NO');
      return { 
        intent: { name: 'cancel_confirmation', patterns: [], action: 'cancel', template: 'No problem.' }, 
        params: {}, 
        confidence: 100,
        needsAgentLoop,
        matchedBy: 'confirmation_no'
      };
    }
  }

  // SMS Multi-turn
  if (memory.activeState?.type === 'AWAITING_SMS_RECIPIENT') {
    const intentObj = intents.find(i => i.name === 'send_sms_partial');
    if (intentObj) {
      debugLog('MATCHED', 'SMS recipient multi-turn');
      return { intent: intentObj, params: { target: input }, confidence: 100, needsAgentLoop, matchedBy: 'multi_turn_sms' };
    }
  }

  if (memory.activeState?.type === 'AWAITING_SMS_MESSAGE') {
    const target = memory.activeState.data?.target || 'someone';
    const intentObj = intents.find(i => i.name === 'send_sms');
    if (intentObj) {
      setActiveState(null);
      debugLog('MATCHED', 'SMS message multi-turn');
      return { 
        intent: intentObj, 
        params: { target, message: input, is_followup: true }, 
        confidence: 100,
        needsAgentLoop,
        matchedBy: 'multi_turn_sms'
      };
    }
  }

  // Calendar Multi-turn
  if (memory.activeState?.type === 'AWAITING_CALENDAR_TITLE') {
    const intentObj = intents.find(i => i.name === 'calendar_setup');
    if (intentObj) {
      debugLog('MATCHED', 'Calendar title multi-turn');
      return { intent: intentObj, params: { title: input, step: 'DATE' }, confidence: 100, needsAgentLoop, matchedBy: 'multi_turn_calendar' };
    }
  }

  if (memory.activeState?.type === 'AWAITING_CALENDAR_DATE') {
    const intentObj = intents.find(i => i.name === 'calendar_setup');
    if (intentObj) {
      debugLog('MATCHED', 'Calendar date multi-turn');
      return { intent: intentObj, params: { date: input, step: 'TIME' }, confidence: 100, needsAgentLoop, matchedBy: 'multi_turn_calendar' };
    }
  }

  if (memory.activeState?.type === 'AWAITING_CALENDAR_TIME') {
    const intentObj = intents.find(i => i.name === 'calendar_setup');
    if (intentObj) {
      debugLog('MATCHED', 'Calendar time multi-turn');
      return { intent: intentObj, params: { time: input, step: 'COMPLETE' }, confidence: 100, needsAgentLoop, matchedBy: 'multi_turn_calendar' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 2: NORMALIZE AND SPELL-CHECK
  // ═══════════════════════════════════════════════════════════════════════
  const checked = spellCheck(input);
  const normalizedOrig = checked.toLowerCase().trim();
  const normalized = normalizeInput(normalizedOrig);
  const activeEntity = resolveEntityFromContext(normalized);
  const wordCount = normalized.split(/\s+/).length;

  debugLog('NORMALIZE', `Spell-checked: "${checked}" | Normalized: "${normalized}" | Active Entity: ${activeEntity?.name || 'none'}`);

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 1.5: ACTIVE STATE / SLOT FILLING
  // If the user previously started an intent but didn't finish, and 
  // the current input is just an entity (like a name or email), bridge them.
  // ═══════════════════════════════════════════════════════════════════════
  const activeState = memory.activeState;
  
  // Real Estate Expert Follow-up bridging (AWAITING_MARKETING_CHOICE / AWAITING_STRATEGY_CHOICE)
  if (activeState && wordCount <= 3) {
    const choice = normalized.toLowerCase();
    
    if (activeState.type === 'AWAITING_MARKETING_CHOICE') {
      if (['seo', 'social media', 'direct mail', 'mail', 'search engine optimization'].includes(choice)) {
        const intentObj = intents.find(i => i.name === 'marketing_tips');
        if (intentObj) {
          debugLog('MATCHED', `Contextual marketing choice match: ${choice}`);
          return {
            intent: intentObj,
            params: { category: choice },
            confidence: 100,
            needsAgentLoop,
            matchedBy: 'contextual_marketing_choice'
          };
        }
      }
    }

    if (activeState.type === 'AWAITING_STRATEGY_CHOICE') {
      if (['wholesaling', 'flipping', 'brrrr', 'brrrr method', 'rental', 'fix and flip'].includes(choice)) {
        const intentObj = intents.find(i => i.name === 'investment_strategy');
        if (intentObj) {
          debugLog('MATCHED', `Contextual strategy choice match: ${choice}`);
          return {
            intent: intentObj,
            params: { strategy: choice },
            confidence: 100,
            needsAgentLoop,
            matchedBy: 'contextual_strategy_choice'
          };
        }
      }
    }

    if (activeState.type === 'AWAITING_SCRIPT_CHOICE') {
      if (['expired listing', 'fsbo', 'cold call', 'objection', 'buyer consultation', 'seller follow-up', 'cold calling', 'buyer', 'seller'].includes(choice)) {
        const intentObj = intents.find(i => i.name === 'agent_script');
        if (intentObj) {
          debugLog('MATCHED', `Contextual script choice match: ${choice}`);
          return {
            intent: intentObj,
            params: { category: choice },
            confidence: 100,
            needsAgentLoop,
            matchedBy: 'contextual_script_choice'
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 2: EXACT KEYWORD MATCHING
  // Map standalone words/phrases to their intent definitions.
  // ═══════════════════════════════════════════════════════════════════════
  const exactKeywordMap: Record<string, string> = {
    // Tasks — map to show_tasks which has a task executor case 
    'tasks': 'show_tasks',
    'task': 'show_tasks',
    'my tasks': 'show_tasks',
    'show tasks': 'show_tasks',
    'list tasks': 'show_tasks',
    'pending tasks': 'show_tasks',
    'takss': 'show_tasks',   // common typo
    'taks': 'show_tasks',    // common typo
    'tsks': 'show_tasks',    // common typo
    
    // Leads
    'leads': 'list_leads',
    'lead': 'list_leads',
    'my leads': 'list_leads',
    'show leads': 'list_leads',
    'list leads': 'list_leads',
    'view leads': 'list_leads',
    'leed': 'list_leads',    // common typo
    'leeds': 'list_leads',   // common typo
    'leadas': 'list_leads',  // common typo

    // Help
    'help': 'help_commands',
    'help me': 'help_commands',
    'commands': 'help_commands',
    'hlp': 'help_commands',  // common typo
    
    // Hot/Top leads
    'hot leads': 'hot_leads',
    'top leads': 'hot_leads',
    'best leads': 'hot_leads',
    
    // Test
    'test': 'test_query',
    'ping': 'test_query',
  };

  const keywordIntent = exactKeywordMap[normalized] || exactKeywordMap[lowerOrig];
  if (keywordIntent) {
    const intentObj = intents.find(i => i.name === keywordIntent);
    if (intentObj) {
      debugLog('MATCHED', `Exact keyword: "${normalized}" → ${keywordIntent}`);
      return { intent: intentObj, params: {}, confidence: 100, needsAgentLoop, matchedBy: 'exact_keyword' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 4: PRIORITY REGEX HANDLERS
  // These are ordered by priority. More specific patterns first.
  // ═══════════════════════════════════════════════════════════════════════
  const handlers = [
    {
      intent: 'subject_to_analysis',
      patterns: [
        /analyze property (?:at )?(.+) as (?:a )?(?:subject[- ]?to|sub[- ]?[2-9]|sub2|creative) deal\.?\s+(?:purchase|price|for)\s*\$?([\d,.]+[kK]?|\d+).*?(?:loan|balance)\s*\$?([\d,.]+[kK]?|\d+).*?rent\s*\$?([\d,.]+[kK]?|\d+).*?(?:entry|cost)\s*\$?([\d,.]+[kK]?|\d+)/i,
        /subject-to:?\s+(.*)\s+\$?([\d,.]+[kK]?)\s+\$?([\d,.]+[kK]?)\s+\$?([\d,.]+[kK]?)\s+\$?([\d,.]+[kK]?)/i,
        /(?:analyze|calculate|run|calc)(?:\s+property\s+at|\s+address)?\s+(.*)\s+as\s+(?:subject-to|sub-2|sub2|creative)\s+deal\.?\s+purchase\s+\$?([\d,.]+[kK]?),?\s+loan\s+(?:balance|amt|amount)?\s+\$?([\d,.]+[kK]?),?\s+rent\s+\$?([\d,.]+[kK]?),?\s+entry\s+(?:cost|amt|mt)?\s+\$?([\d,.]+[kK]?)/i
      ],
      params: (matches: string[]) => {
        if (DEBUG_MODE) console.log('DEBUG: Matched subject_to_analysis', matches);
        return {
          address: matches[1]?.trim(),
          purchase: matches[2]?.trim(),
          loanBalance: matches[3]?.trim(),
          rent: matches[4]?.trim(),
          entryCost: matches[5]?.trim()
        };
      }
    },
    {
      intent: 'cap_rate_calculation',
      patterns: [
        /(?:calculate |what is |what's )?(?:the )?cap rate on a \$?([\d,.]+[kK]?) property with \$?([\d,.]+[kK]?) noi/i,
        /calculate cap rate:?\s*\$?([\d,.]+[kK]?|\d+).*?(?:purchase|price|for).*?\$?([\d,.]+[kK]?|\d+)\s*noi/i,
        /calculate cap rate:?\s*\$?([\d,.]+[kK]?|\d+)\s*(?:purchase|price|for).*?\$?([\d,.]+[kK]?|\d+).*?noi/i,
        /cap rate for \$?([\d,.]+[kK]?) price and \$?([\d,.]+[kK]?) income/i
      ],
      params: (matches: string[]) => {
        if (DEBUG_MODE) console.log('DEBUG: Matched cap_rate_calculation', matches);
        return {
          purchase: matches[1]?.trim(),
          noi: matches[2]?.trim()
        };
      }
    },
    {
      intent: 'worst_leads',
      patterns: [
        /worst (\d+) leads/i,
        /bottom (\d+) leads/i,
        /show (?:my |)worst leads/i,
        /lowest scoring leads/i,
        /leads (?:that |)need (?:the |)most work/i
      ],
      params: (matches: string[]) => ({ limit: parseInt(matches[1]) || 5 })
    },
    {
      intent: 'real_estate_knowledge',
      patterns: [
        /(?:what is|what's) a good cap rate/i,
        /what cap rate is good/i,
        /common cap rates/i
      ],
      params: () => ({ concept: 'cap rate' })
    },
    {
      intent: 'property_analysis',
      patterns: [
        /^(?:analyze|look at|is this a good deal)\??$/i,
        /^(?:analyze|is this a good deal|is it a good deal)\s+(?:the property for|the property of|the property for lead|lead|deal|property|for)?\s+(.*)$/i,
        /analyze (.*)'s property/i,
        /^(?:analyze)\s+(.*)$/i,
        /^\s*is\s+(.*)'s\s+house\s+a\s+good\s+deal\b/i
      ],
      params: (matches: string[]) => ({ target: matches[1]?.trim() })
    },
    {
      intent: 'memory_recall',
      patterns: [
        /(?:what do you remember|what do you know) about (.*)/i,
        /tell me about (.*)/i,
        /who is (.*)/i
      ],
      params: (matches: string[]) => ({ target: matches[1]?.trim() })
    },
    {
      intent: 'real_estate_strategy',
      patterns: [
        /^(?:give me a strategy for|how do i invest in|provide a plan for)\s+(.*)$/i,
        /^(wholesaling|flipping|brrrr|house hacking)\s+strategy$/i,
        /^(?:how to|should i)\s+(wholesaling|flipping|brrrr|house hacking|investing|flip this|wholesale this)$/i,
        /\b(?:the )?brrrr(?: method)?\b/i,
        /^give me a strategy$/i,
        /^strategy$/i,
        /^(wholesaling|flipping|brrrr|brrrr method|rental|fix and flip)$/i
      ],
      params: (matches: string[]) => ({ strategy: matches[1]?.trim() })
    },
    {
      intent: 'marketing_tips',
      patterns: [
        /^(?:give me )?(?:some )?marketing (?:tips|advice|ideas|strategies)/i,
        /^(?:how do i find|finding) (?:cash buyers|motivated sellers)$/i,
        /^(?:seo|search engine optimization|social media|social|direct mail|mail)$/i,
        /\bmarketing (?:tips|strategy|ideas)\b/i,
        /^(seo|social media|direct mail|mail|search engine optimization)$/i,
        /^tips for (seo|social media|direct mail)$/i
      ],
      params: (matches: string[]) => ({ category: matches[1]?.trim() })
    },
    {
      intent: 'business_advice',
      patterns: [
        /^(?:how do i scale|growing my business|business advice)$/i,
        /^(?:how to get more deals)$/i,
        /\b(?:scale|business advice)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'agent_script',
      patterns: [
        /(?:give me a |get me a |)(?:script|scripts) for (.*)/i,
        /(.*) script/i
      ],
      params: (matches: string[]) => ({ scriptType: matches[1]?.trim().toLowerCase() || 'general' })
    },
    {
      intent: 'investment_strategy',
      patterns: [
        /^(?:tell me about|how do i|explain)\s+(wholesaling|flipping|brrrr|house hacking|1031 exchange)/i,
        /^(?:investment strategies|ways to invest)$/i,
        /^(flipping|wholesaling|brrrr|rental|fix and flip|brrrr method|the brrrr)$/i
      ],
      params: (matches: string[]) => ({ strategy: matches[1]?.trim() })
    },
    {
      intent: 'real_estate_knowledge',
      patterns: [
        /^(?:what is a|what is|whats a|definition of|explain|tell me about)\s+([a-zA-Z\s]+)$/i,
        /^(?:what does)\s+([a-zA-Z\s]+)\s+(?:mean|represent)$/i,
        /^(?:how does)\s+([a-zA-Z\s]+)\s+(?:work)$/i
      ],
      params: (matches: string[]) => ({ concept: matches[1]?.trim() })
    },
    {
      intent: 'deal_calculator',
      patterns: [
        /^(?:calculate|run numbers|analyze)(?:\s+this)?\s+(flip|rental)$/i,
        /^(?:run a|calculate a)\s+(flip|rental)(?:\s+deal)?$/i,
        /^(?:calculate|run numbers|math for)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ type: matches[1]?.trim(), raw: matches[2]?.trim() })
    },
    {
      intent: 'financing_question',
      patterns: [
        /^(?:tell me about|how does|what is a)\s+(fha|va|usda|conventional|hard money|private money|seller financing)\b/i,
        /^(?:interest rates|mortgage rates|down payment|pmi)$/i,
        /\b(?:loan|mortgage|financing)\b/i
      ],
      params: (matches: string[]) => ({ topic: matches[1]?.trim() })
    },
    {
      intent: 'legal_question',
      patterns: [
        /^(?:explain|what is a|tell me about)\s+(contingency|disclosure|inspection|escrow|title insurance|closing costs)$/i,
        /^(?:purchase agreement|legal requirements|compliance)$/i
      ],
      params: (matches: string[]) => ({ topic: matches[1]?.trim() })
    },
    {
      intent: 'market_analysis',
      patterns: [
        /^(?:how is the market|market trends|market report|neighborhood analysis)$/i,
        /^(?:what are the comps for|comps for|valuation for)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ location: matches[1]?.trim() })
    },
    {
      intent: 'explain_logic',
      patterns: [
        /^(?:how did you get that|explain the math|show me the breakdown|why|how|explain)\??$/i,
        /^(?:how do you calculate|what is the formula for)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ detail: matches[1]?.trim() })
    },
    {
      intent: 'list_learned',
      patterns: [
        /^what have i taught you$/i,
        /^show learned commands$/i,
        /^what did you learn$/i,
        /^list my phrases$/i,
        /^what have you remembered$/i,
        /^what have you learned$/i,
        /^show what i taught you$/i,
        /^my custom commands$/i,
      ],
      params: () => ({})
    },
    {
      intent: 'forget_learned',
      patterns: [
        /^forget that$/i,
        /^unlearn that$/i,
        /^remove that command$/i,
        /^stop remembering that$/i,
        /^delete that phrase$/i,
        /^forget what i taught you about (.+)$/i,
        /^forget (.+)$/i,
      ],
      params: (matches: string[]) => ({ phrase: matches[1]?.trim() })
    },
    {
      intent: 'proactive_suggestion',
      patterns: [
        /^what should i do$/i,
        /^suggest something$/i,
        /^any recommendations$/i,
        /^whats next$/i,
        /^what's next$/i,
        /^what should i focus on$/i,
        /^give me a task$/i,
        /^what now$/i,
        /^what do i do$/i,
        /^what should i work on$/i,
        /^i'm bored$/i,
        /^im bored$/i,
        /^nothing to do$/i,
        /^(?:what would you recommend i do with|what should i do with|any suggestions for|what's next with|whats next with)\s+(him|her|this lead|the lead|(.+))$/i
      ],
      params: (matches: string[]) => ({ target: matches[1]?.trim() === 'this lead' ? 'this' : matches[1]?.trim() })
    },
    {
      intent: 'repeat_last',
      patterns: [
        /^(?:repeat that|say that again|what did you say|come again|repeat|say again|repeat what you said|repeat last|what was that)$/i,
      ],
      params: () => ({})
    },
    {
      intent: 'follow_up',
      patterns: [
        /^(what about leads|and leads|what about tasks|and tasks|what else|anything else|what about sms|and calendar|tell me more|go on)$/i,
        /^(what about|and) (leads|tasks|sms|calendar)$/i
      ],
      params: (matches: string[]) => ({ topic: matches[2] || 'general' })
    },
    {
      intent: 'lead_context_query',
      patterns: [
        /(?:what do you know about|what info do you have on|give me info on|give me what you know for|tell me about|info on|details on|get info for|show me details for)\s+(.+)$/i,
        /^(.+?)\s+info$/i,
        /^info\s+(.+)$/i,
        /^(?:whats|what is|what's) (?:his|her|their) (phone|email|address|status)$/i,
        /^lead details for (.+)$/i
      ],
      params: (matches: string[]) => {
        const leadName = matches[1]?.trim();
        const field = leadName === 'phone' || leadName === 'email' || leadName === 'address' || leadName === 'status' ? leadName : 'all';
        return { 
          leadName: field !== 'all' ? 'this' : leadName, 
          field 
        };
      }
    },
    {
      intent: 'greeting',
      patterns: [
        /^(?:yo|hi|hello|hey|hey there|hi there|hola|howdy|henlo|heya|hiya)$/i,
        /^(?:how's it going|how are you|good morning|good afternoon|good evening)$/i,
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
      intent: 'help_commands',
      patterns: [
        /^(?:help|help me|show commands|what are your commands|list commands|options|command list)\??$/i
      ],
      params: () => ({})
    },
    {
      intent: 'list_leads',
      patterns: [
        /^leads$/i,
        /^show leads$/i,
        /^list leads$/i,
        /^my leads$/i,
        /^view leads$/i,
        /^(?:show all leads|list all leads|get leads|show leeds|list leeds)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'show_tasks',
      patterns: [
        /^tasks$/i,
        /^my tasks$/i,
        /^show tasks$/i,
        /^list tasks$/i,
        /^pending tasks$/i,
        /^view tasks$/i,
        /^show my tasks$/i,
        /^what do i need to do$/i,
        /^what are my tasks$/i,
      ],
      params: () => ({})
    },
    {
      intent: 'capabilities',
      patterns: [
        /^(?:what\s+can\s+you\s+(do|help\s+with|offer)?\??)$/i,
        /^(?:what\s+are\s+your\s+capabilities\??)$/i,
        /^(?:capabilities|features)$/i,
        /^(?:list\s+(?:your\s+)?capabilities\??)$/i,
        /^(?:who\s+built\s+you|who\s+are\s+you|what\s+are\s+you)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'change_personality',
      patterns: [
        /^(?:be|act|talk|sound)(?:\s+more|\s+like\s+a)?\s+(professional|sassy|funny|casual|cursing)$/i,
        /^(?:change|set|switch)(?:\s+your)?\s+(?:personality|tone|mode|style)(?:\s+to)?\s+(professional|sassy|funny|casual|cursing)(?:\s+mode)?$/i,
        /^(?:turn\s+on)\s+(professional|sassy|funny|casual|cursing)(?:\s+mode)?$/i,
        /^(?:i\s+want\s+you\s+to\s+be)\s+(professional|sassy|funny|casual|cursing)$/i,
        /^(?:can\s+you\s+be)\s+(professional|sassy|funny|casual|cursing)$/i,
        /^(?:no\s+)?(?:can\s+you\s+change\s+(?:them|it)\s+(?:from\s+here|now)|change\s+(?:them|it)\s+here|can\s+you\s+change\s+(?:your\s+)?(?:personality|tone))$/i,
        /^(?:can\s+you\s+be)\s+(?:something\s+else|different)$/i
      ],
      params: (matches: string[]) => ({ target_personality: matches[1] || matches[2] || matches[3] || matches[4] || matches[5] })
    },
    {
      intent: 'personality_query',
      patterns: [
        /^(?:can you customize how you talk|how you talk to me|customize your tone)$/i,
        /^(?:what personality do you have|what personality are you|what is your personality|whats your personality)$/i,
        /^(?:what tone do you have|what tone are you|what is your tone|whats your tone)$/i,
        /^(?:what personality do you have right now|what tone do you have turned on)$/i,
        /^(?:what mode are you in|current mode|current personality|current tone)$/i,
        /\b(?:personality|tone|style)\b.*\b(?:setting|mode|right now|currently|turned on|have)\b/i,
        /\b(?:what)\b.*\b(?:personality|tone)\b/i,
      ],
      params: () => ({})
    },
    {
      intent: 'remember_fact',
      patterns: [
        /^(?:remember\s+(?:that\s+)?)(.+)$/i,
        /^(?:make\s+a\s+note\s+(?:that\s+)?)(.+)$/i,
        /^(?:i\s+prefer\s+)(.+)$/i,
        /^(?:keep\s+in\s+mind\s+(?:that\s+)?)(.+)$/i
      ],
      params: (matches: string[]) => ({ fact: matches[1] || matches[2] || matches[3] || matches[4] })
    },
    {
      intent: 'recall_yesterday',
      patterns: [
        /^(?:what\s+was\s+i\s+working\s+on\s+yesterday|what\s+did\s+we\s+do\s+yesterday)$/i,
        /^(?:what\s+happened\s+yesterday|recap\s+yesterday)$/i,
        /^yesterday$/i
      ],
      params: () => ({})
    },
    {
      intent: 'clarify_context',
      patterns: [
        /^(?:that\s+lead|the\s+lead|the\s+one\s+from|the\s+guy|the\s+girl)\.?\.?\.?$/i,
        /^(?:him|her|them|it|the\s+task|the\s+contact)\.?\.?\.?$/i,
        /^(?:what\s+about\s+(?:them|him|her|it|this|that))\??$/i
      ],
      params: () => ({})
    },
    {
      intent: 'hot_leads',
      patterns: [
        /^what are my (\d+) highest scored leads$/i,
        /^show my top (\d+) leads$/i,
        /^top (\d+) leads$/i,
        /^(?:what are my top leads|what are my top 5 leads|top leads|show my best leads|hot leads)$/i,
        /^(?:who should i call|best leads|deals to close|who is hot)$/i,
        /^(?:highest scored|best scoring)\s+leads$/i
      ],
      params: (matches: string[]) => {
        const num = parseInt(matches[1] || matches[2] || matches[3] || '5');
        return { score_min: 0, limit: num };
      }
    },
    {
      intent: 'send_email',
      patterns: [
        /^(?:can you email (.*) for me|send an email to (.*)|email (.*))$/i,
        /^(?:write an email to (.*)|compose email to (.*))$/i
      ],
      params: (matches: string[]) => ({ target: matches[1] || matches[2] || matches[3] })
    },
    {
      intent: 'tasks_due',
      patterns: [
        /^(?:what are my tasks due today|tasks due|what is due|overdue tasks|my schedule today)$/i,
        /^(?:what do i have to do today|list my tasks due)$/i,
        /^(?:do i have any tasks due|do i have anything due|anything due today|any tasks due)$/i,
        /^(?:what's due|whats due|tasks due today|due today)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'memory_recall',
      patterns: [
        /^(?:what memories|what do you remember|what memories do you have|what memories do you have saved)$/i,
        /^(?:what do you know about me|recall memory|show my actions)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'test_query',
      patterns: [
        /^(?:test|ping|are you working|system check|testing)$/i
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
        /^(?:text|textt|txt|message|tell|shoot a text to|send message to|can you text)\s+([a-zA-Z0-9\s]+)$/i,
        /^(?:send a text|send sms|write a message|can you text someone for me|text someone|sms someone)$/i
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
      intent: 'calendar_setup',
      patterns: [
        /^(?:add something to my calendar|schedule an event|create a calendar entry|add to calendar)$/i,
        /^(?:schedule|book)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ title: matches[1]?.trim() })
    },
    {
      intent: 'sms_reply_check',
      patterns: [
        /^(?:did anyone reply|did they respond|check for new messages|any replies from leads)$/i,
        /^(?:did)\s+([a-zA-Z\s]+)\s+(?:reply|respond|text back)$/i
      ],
      params: (matches: string[]) => ({ name: matches[1]?.trim() })
    },
    {
      intent: 'email_campaign',
      patterns: [
        /^(?:send email campaign|bulk email|start email blast|blast emails)$/i,
        /\b(?:email campaign|campaign wizard)\b/i
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
    },
    {
      intent: 'joke',
      patterns: [
        /^(?:tell me a joke|make me laugh|humor me|tell a joke|joke)$/i,
      ],
      params: () => ({})
    },
    {
      intent: 'time_query',
      patterns: [
        /^(?:what time is it|what is the time|current time|what is the date|today's date|what day is it)$/i,
      ],
      params: () => ({})
    },
    {
      intent: 'user_fact',
      patterns: [
        /^(?:my name is|i am|call me)\s+([a-zA-Z\s]+)$/i,
        /^(?:remember that|i like|i love)\s+(.*)$/i,
        /^(?:my favorite color is|my birthday is)\s+(.*)$/i
      ],
      params: (matches: string[]) => {
        if (normalized.match(/^(?:my name is|i am|call me)/i)) {
          return { type: 'name', value: matches[1].trim() };
        }
        return { type: 'preference', fact: matches[1] || matches[0] };
      }
    },
    {
      intent: 'mood_check',
      patterns: [
        /^(?:am i doing good|how am i doing|am i failing|is my business ok|how are things looking)$/i,
      ],
      params: () => ({})
    },
    {
      intent: 'motivation',
      patterns: [
        /^(?:encourage me|need motivation|give me a quote|tough day|motivate me|inspire me)$/i,
      ],
      params: () => ({})
    },
    // --- REAL ESTATE DOMAIN EXPERT HANDLERS ---
    {
      intent: 'list_learned',
      patterns: [
        /^what have i taught you$/i,
        /^show learned commands$/i,
        /^what did you learn$/i,
        /^list my phrases$/i,
        /^what have you remembered$/i,
        /^what have you learned$/i,
        /^show what i taught you$/i,
        /^my custom commands$/i,
      ],
      params: () => ({})
    },
  ];

  // STAGE 2: Multi-Candidate Intent Scoring
  let candidates: { intent: Intent; params: any; score: number; matchedBy: string }[] = [];

  // Check learned intents (Supabase)
  const userId = useStore.getState().currentUser?.id;
  if (userId) {
    const learnedIntent = await getLearnedIntent(userId, normalized);
    if (learnedIntent) {
      const intentObj = intents.find(i => i.name === learnedIntent.mapped_intent);
      if (intentObj) {
        candidates.push({
          intent: intentObj,
          params: { ...learnedIntent.params },
          score: 100,
          matchedBy: 'learned_exact'
        });
      }
    }
  }

  // Score all handlers
  for (const h of handlers) {
    const { score, params } = scoreIntent(h, normalized, memory);
    if (score > 30) {
      const intentObj = intents.find(i => i.name === h.intent);
      if (intentObj) {
        candidates.push({
          intent: intentObj,
          params,
          score,
          matchedBy: score === 100 ? 'regex_match' : 'pattern_overlap'
        });
      }
    }
  }

  // STAGE 3: Semantic Density Fallback
  if (candidates.length === 0 || candidates.every(c => c.score < 80)) {
    const fuzzyMatch = fuzzyIntentMatch(normalized, intents);
    if (fuzzyMatch) {
      candidates.push({
        intent: fuzzyMatch.intent,
        params: fuzzyMatch.params,
        score: fuzzyMatch.confidence,
        matchedBy: 'semantic_fallback'
      });
    }
  }

  // STAGE 4: Final Candidate Selection
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (best && best.score >= 30) {
    debugLog('STRATEGIST', `Winning Intent: ${best.intent.name} (Score: ${best.score}, Method: ${best.matchedBy})`);
    
    // NEW: Conversational Slot Filling & Subject Resolution
    const updatedParams: any = { ...best.params };
    const required = best.intent.required_params || [];
    const missing: string[] = [];

    // Resolve context for missing params before declaring them missing
    for (const r of required) {
      if (!updatedParams[r]) {
        // Try to resolve from context stack
        const resolved = resolveEntitiesFromContext(r)[0]; 
        if (resolved) {
          updatedParams[r] = resolved.name;
          if (r === 'leadName') updatedParams.leadId = resolved.id;
          debugLog('CONTEXT', `Auto-resolved missing ${r} to "${resolved.name}" from context.`);
        } else {
          missing.push(r);
        }
      }
    }

    // If still missing required params, mark as partial
    if (missing.length > 0) {
      debugLog('PARTIAL', `Missing required params for ${best.intent.name}: ${missing.join(', ')}`);
      return {
        intent: best.intent,
        params: updatedParams,
        confidence: best.score,
        isPartial: true,
        missingParams: missing,
        needsAgentLoop: false,
        matchedBy: 'partial_match_slot_filling',
        reasoning: `Matched "${best.intent.name}" but I'm missing the ${missing[0]}. I should ask for it.`
      } as any;
    }

    return {
      intent: best.intent,
      params: updatedParams,
      confidence: best.score,
      originalText: input,
      needsAgentLoop,
      matchedBy: best.matchedBy,
      reasoning: best.score === 100 
        ? `Direct strategist match for "${best.intent.name}".` 
        : `Semantic overlap of ${best.score}% detected with "${best.intent.name}" intent.`
    };
  }

  // STAGE 5: Typo Suggestion
  const inputWords = normalized.split(/\s+/);
  if (inputWords.length <= 3) {
    const keywords = ['lead', 'task', 'sms', 'text', 'calendar', 'weather', 'motivation', 'help'];
    for (const kw of keywords) {
      for (const word of inputWords) {
        if (word.length >= 4 && getLevenshteinDistance(word, kw) === 1) {
          debugLog('TYPO', `Suggested: ${kw} for ${word}`);
          return {
            intent: intents.find(i => i.name === 'typo_suggestion')!,
            params: { suggestion: kw },
            confidence: 100,
            needsAgentLoop: false,
            matchedBy: 'typo_detection'
          };
        }
      }
    }
  }

  debugLog('NO_MATCH', `No intent reached threshold for: "${input}"`);
  return null;
  } catch (error) {
    console.error('[💩 OS Bot] Crash in recognizeIntent:', error);
    return null;
  }
}
