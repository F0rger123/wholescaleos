import { Intent, intents } from '../ai/intents';
import { spellCheck, getLevenshteinDistance } from './spell-checker';
import { resolveEntityFromContext, getMemory, setActiveState, setTopic, getLearnedFact, getLastSuggestion, clearLastSuggestion } from './memory-store';
import { getLearnedIntent, getAllLearnedIntents } from './learning-service';
import { useStore } from '../../store/useStore';
import { expandSynonyms } from './utils/synonym-mapper';

// Debug mode — toggle to true to see detailed intent matching logs
const DEBUG_MODE = true;

function debugLog(stage: string, message: string, data?: unknown) {
  if (!DEBUG_MODE) return;
  console.log(`[🐛 OS Bot Debug][${stage}] ${message}`, data ?? '');
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
  matchedBy?: string; // Debug: which stage matched this intent
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
  
  if (activeState && wordCount <= 3) {
    // If we're waiting for a lead name (e.g. for SMS or Info)
    if (activeState.type === 'awaiting_lead_name' || activeState.type === 'send_sms_partial') {
      const intentObj = intents.find(i => i.name === 'lead_context_query' || i.name === 'send_sms');
      if (intentObj) {
        debugLog('MATCHED', `Contextual bridge: Bridging "${input}" to active state ${activeState.type}`);
        return {
          intent: intentObj,
          params: { ...activeState.data, name: input, leadName: input, target: input },
          confidence: 100,
          originalText: input,
          needsAgentLoop: false,
          matchedBy: 'active_state_bridge'
        };
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
      intent: 'property_analysis',
      patterns: [
        /^(?:analyze|look at|is this a good deal)\??$/i,
        /^(?:analyze|is this a good deal|is it a good deal)\s+(?:this|the|that)?\s+(?:lead|deal|property)$/i,
        /^(?:analyze)\s+(.*)$/i
      ],
      params: (matches: string[]) => ({ target: matches[1]?.trim() })
    },
    {
      intent: 'agent_script',
      patterns: [
        /^(?:give me a|show me a|need a)\s+(.*)\s+script$/i,
        /^(?:what do i say to|how do i handle)\s+(.*)$/i,
        /^(?:cold call|expired|fsbo|objection)\s+script$/i
      ],
      params: (matches: string[]) => ({ category: matches[1]?.trim() })
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
      intent: 'investment_strategy',
      patterns: [
        /^(?:tell me about|how do i|explain)\s+(wholesaling|flipping|brrrr|house hacking|1031 exchange)$/i,
        /^(?:investment strategies|ways to invest)$/i
      ],
      params: (matches: string[]) => ({ strategy: matches[1]?.trim() })
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
    }
  ];

  // Test both the original lowered input AND the normalized version
  const inputsToTest = [lowerOrig, normalized];
  // Remove duplicates
  const uniqueInputs = [...new Set(inputsToTest)];

  for (const h of handlers) {
    for (const testInput of uniqueInputs) {
      for (const pattern of h.patterns) {
        const match = testInput.match(pattern);
        if (match) {
          const intentObj = intents.find(i => i.name === h.intent);
          if (intentObj) {
            const params = h.params(match as string[]) as Record<string, unknown>;
            
            const pronouns = ['him', 'her', 'them', 'it', 'his', 'hers', 'their', 'the lead', 'that lead', 'this lead', 'the contact', 'the task'];
            if (typeof params.target === 'string' && activeEntity && pronouns.includes((params.target as string).toLowerCase())) {
              params.target = activeEntity.name;
            }
            if (typeof params.name === 'string' && activeEntity && pronouns.includes((params.name as string).toLowerCase())) {
              params.name = activeEntity.name;
            }
            if (typeof params.leadName === 'string' && activeEntity && pronouns.includes((params.leadName as string).toLowerCase())) {
              params.leadName = activeEntity.name;
            }

            debugLog('MATCHED', `Regex handler: "${testInput}" matched ${h.intent}`, { pattern: pattern.toString(), params });
            return { intent: intentObj, params, confidence: 100, needsAgentLoop, matchedBy: `regex_handler:${h.intent}` };
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 5: LEARNED INTENTS (from Supabase)
  // Check learned intents BEFORE fuzzy matching / typo suggestions
  // ═══════════════════════════════════════════════════════════════════════
  const userId = useStore.getState().currentUser?.id;
  
  if (userId) {
    debugLog('LEARNED', 'Checking learned intents...');
    
    // Check exact learned intent first
    const learnedIntent = await getLearnedIntent(userId, normalized);
    if (learnedIntent) {
      const intentObj = intents.find(i => i.name === learnedIntent.mapped_intent);
      if (intentObj) {
        debugLog('MATCHED', `Learned intent (exact): "${normalized}" → ${learnedIntent.mapped_intent}`);
        return {
          intent: intentObj,
          params: { ...learnedIntent.params },
          confidence: learnedIntent.confidence,
          originalText: input,
          needsAgentLoop: detectMultiStep(input),
          matchedBy: 'learned_exact'
        };
      }
    }
    
    // Check all learned intents for similar phrases
    const allLearned = await getAllLearnedIntents(userId);
    if (!learnedIntent && allLearned.length > 0) {
      const words = normalized.split(/\s+/);
      for (const learned of allLearned) {
        const learnedWords = learned.phrase.split(/\s+/);
        const overlap = words.filter(w => learnedWords.includes(w)).length;
        const similarity = overlap / Math.max(words.length, learnedWords.length);
        
        if (similarity >= 0.6) {
          const intentObj = intents.find(i => i.name === learned.mapped_intent);
          if (intentObj) {
            debugLog('MATCHED', `Learned intent (similar ${Math.round(similarity*100)}%): "${normalized}" ≈ "${learned.phrase}"`);
            return {
              intent: intentObj,
              params: { ...learned.params },
              confidence: Math.floor((learned.confidence || 100) * similarity),
              originalText: input,
              needsAgentLoop: detectMultiStep(input),
              matchedBy: 'learned_similar'
            };
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 6: FUZZY SCORE-BASED MATCHING
  // Only for longer inputs (3+ words) to avoid false positives on short phrases
  // ═══════════════════════════════════════════════════════════════════════
  if (wordCount >= 3) {
    const scores = intents
      .filter(i => i.name !== 'small_talk' && i.name !== 'greeting') // Don't fuzzy-match small talk
      .map(intent => ({
        intent,
        score: calculateIntentScore(normalized, intent)
      }))
      .sort((a, b) => b.score - a.score);

    const bestMatchResult = scores[0];
    debugLog('FUZZY', `Best fuzzy match: ${bestMatchResult?.intent.name} (score: ${bestMatchResult?.score})`);
    
    if (bestMatchResult && bestMatchResult.score >= 75) {
      debugLog('MATCHED', `Fuzzy match: "${normalized}" → ${bestMatchResult.intent.name} (score: ${bestMatchResult.score})`);
      return {
        intent: bestMatchResult.intent,
        params: {},
        confidence: bestMatchResult.score,
        originalText: input,
        needsAgentLoop: detectMultiStep(input),
        matchedBy: 'fuzzy_score'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 7: TYPO SUGGESTIONS (LAST RESORT)
  // Only suggest typos for words that are very close (distance 1) to known
  // command keywords, and only if the word is at least 4 chars long.
  // ═══════════════════════════════════════════════════════════════════════
  const commandKeywords = [
    'lead', 'leads', 'task', 'tasks', 'sms', 'text', 'message', 'calendar',
    'email', 'schedule', 'pipeline', 'automation', 'workflow', 'dashboard',
    'settings', 'help', 'weather', 'motivation', 'quote', 'joke',
  ];

  const inputWords = normalized.split(/\s+/);
  
  // Only attempt typo correction if input has 1-3 words 
  // (longer phrases should go to clarification, not typo suggestion)
  if (inputWords.length <= 3) {
    for (const keyword of commandKeywords) {
      for (const word of inputWords) {
        // Skip short words and words that are already valid small-talk
        // Require 5+ chars to reduce false positives (was 4)
        if (word.length < 5) continue;
        if (isSmallTalkPhrase(word)) continue;
        
        const distance = getLevenshteinDistance(word, keyword);
        // Only suggest if distance is exactly 1 (very close match)
        if (distance === 1) {
          const suggestedText = normalized.replace(word, keyword);
          debugLog('MATCHED', `Typo suggestion: "${word}" → "${keyword}" (distance: ${distance})`);
          return {
            intent: { name: 'typo_suggestion', action: 'small_talk', patterns: [], template: `I think you meant '${keyword}'?` },
            params: { text: `I think you meant '${keyword}'?`, suggestedText, keyword },
            confidence: 100,
            suggestion: keyword,
            needsAgentLoop,
            matchedBy: 'typo_suggestion'
          };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STAGE 8: GRACEFUL FALLBACK — ASK FOR CLARIFICATION
  // Instead of "I didn't understand", ask the user what they meant.
  // ═══════════════════════════════════════════════════════════════════════
  debugLog('NO_MATCH', `No intent matched for: "${input}"`);
  return null;
  } catch (error) {
    console.error('[💩 OS Bot] Crash in recognizeIntent:', error);
    return null;
  }
}
