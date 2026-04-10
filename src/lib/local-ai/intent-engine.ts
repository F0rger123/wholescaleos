import { Intent, intents } from '../ai/intents';
import { spellCheck, getLevenshteinDistance } from './spell-checker';
import { resolveEntityFromContext, getMemory, setActiveState, setTopic, getLearnedFact } from './memory-store';
import { getLearnedIntent, getAllLearnedIntents, findSimilarLearnedPhrase } from './learning-service';
import { useStore } from '../../store/useStore';

export interface ParsedIntent {
  intent: Intent;
  params: Record<string, any>;
  confidence: number;
  originalText?: string;
  isAmbiguous?: boolean;
  isConfirming?: boolean;
  suggestion?: string;
  needsAgentLoop: boolean;
}

/**
 * Strips filler words and common phrases to help regex matching
 */
export function normalizeInput(input: string): string {
  const fillers = [
    /^(?:can you|please|could you|would you|hey os bot|os bot|bot|assistant|can you please|could you please)\s+/i,
    /^(?:i want to|i need to|i'd like to|let's|tell me|show me|can you tell me|do you know|remember that)\s+/i,
    /^(?:am i|is my|are you|how are|how is|i am having a|i'm having a|give me)\s+/i,
    /\bsir$|\bma'am$/i,
    /\s+(?:please|now|right now|immediately|for me|thank you|thanks|buddy|friend|bot)$/i,
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

/**
 * Detects if the input requires multi-step reasoning or tool chaining.
 */
export function detectMultiStep(input: string): boolean {
  // Only trigger for phrases that strongly indicate a chain of actions
  const multiStepIndicators = [
    /\band then\b/i,
    /\bafter that\b/i,
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

export async function recognizeIntent(input: string): Promise<ParsedIntent | null> {
  const memory = getMemory();
  const lowerOrig = input.toLowerCase().trim();
  const needsAgentLoop = detectMultiStep(input);
  
  // Check for custom facts/memory first
  if (lowerOrig === "what's my name" || lowerOrig === "whats my name" || lowerOrig === "what is my name") {
    const name = getLearnedFact('name');
    if (name) {
      return {
        intent: { name: 'small_talk', action: 'small_talk', patterns: [], template: `Your name is ${name}.` },
        params: { text: `Your name is ${name}.` },
        confidence: 100,
        needsAgentLoop
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
         confidence: 100,
         needsAgentLoop
       };
    }
  }

  const checked = spellCheck(input);
  const normalizedOrig = checked.toLowerCase().trim();
  const normalized = normalizeInput(normalizedOrig);
  const activeEntity = resolveEntityFromContext(normalized);

  console.log(`[🤖 OS Bot] Normalized: "${normalized}" | Active Entity: ${activeEntity?.name || 'none'}`);

  const keywords = [
    // CRM keywords
    'lead', 'leads', 'task', 'tasks', 'sms', 'text', 'message', 'calendar', 
    'hot', 'hot leads', 'top leads', 'update', 'status', 'add', 'create',
    // Greetings
    'hello', 'hi', 'hey', 'yo', 'whats up', 'good morning', 'good afternoon',
    // Small talk
    'okay', 'ok', 'k', 'thanks', 'thank you', 'thx', 'stop', 'wait', 
    'cancel', 'nevermind', 'nvm', 'bye', 'goodbye', 'later', 'cya',
    'lol', 'haha', 'hehe', 'nice', 'cool', 'great', 'awesome', 'perfect',
    'huh', 'what', 'hmm', 'umm', 'pardon', 'excuse me',
    'how are you', 'how you doing', 'whats new', 'how goes it',
    // Other
    'motivation', 'mood', 'quote', 'joke', 'help'
  ];
  for (const kw of keywords) {
    if (normalized === kw || normalized === kw + 's') {
      const intent = intents.find(i => 
        i.patterns.some(p => typeof p === 'string' ? p.toLowerCase() === kw || p.toLowerCase() === kw + 's' : false)
      );
      if (intent) return { intent: intent, params: {}, confidence: 100, needsAgentLoop };
    }
  }

  // Check Confirmation logic (Yes/No)
  if (memory.activeState?.type === 'AWAITING_INTENT_CONFIRMATION') {
    if (normalized.match(/^(?:yes|yep|yup|yeah|sure|do it|ok|okay|confirm)$/i)) {
      return { 
        intent: memory.activeState.data.intent, 
        params: memory.activeState.data.params || {}, 
        confidence: 100,
        isConfirming: true,
        needsAgentLoop
      };
    }
    if (normalized.match(/^(?:no|nope|nah|nevermind|stop|cancel|wrong)$/i)) {
      return { 
        intent: { name: 'cancel_confirmation', patterns: [], action: 'cancel', template: 'No problem.' }, 
        params: {}, 
        confidence: 100,
        needsAgentLoop
      };
    }
  }

  // 1. CHECK MULTI-TURN STATE
  if (memory.activeState?.type === 'AWAITING_SMS_RECIPIENT') {
    const intentObj = intents.find(i => i.name === 'send_sms_partial');
    if (intentObj) {
      return { 
        intent: intentObj, 
        params: { target: input }, 
        confidence: 100,
        needsAgentLoop
      };
    }
  }

  if (memory.activeState?.type === 'AWAITING_SMS_MESSAGE') {
    const target = memory.activeState.data?.target || activeEntity?.name || 'someone';
    const intentObj = intents.find(i => i.name === 'send_sms');
    if (intentObj) {
      setActiveState(null);
      return { 
        intent: intentObj, 
        params: { target, message: input, is_followup: true }, 
        confidence: 100,
        needsAgentLoop
      };
    }
  }

  // 1.1 CALENDAR MULTI-TURN
  if (memory.activeState?.type === 'AWAITING_CALENDAR_TITLE') {
    const intentObj = intents.find(i => i.name === 'calendar_setup');
    if (intentObj) {
      return { intent: intentObj, params: { title: input, step: 'DATE' }, confidence: 100, needsAgentLoop };
    }
  }

  if (memory.activeState?.type === 'AWAITING_CALENDAR_DATE') {
    const intentObj = intents.find(i => i.name === 'calendar_setup');
    if (intentObj) {
      return { intent: intentObj, params: { date: input, step: 'TIME' }, confidence: 100, needsAgentLoop };
    }
  }

  if (memory.activeState?.type === 'AWAITING_CALENDAR_TIME') {
    const intentObj = intents.find(i => i.name === 'calendar_setup');
    if (intentObj) {
      return { intent: intentObj, params: { time: input, step: 'COMPLETE' }, confidence: 100, needsAgentLoop };
    }
  }

  // 2. PRIORITY REGEX HANDLERS
  const handlers = [
    {
      intent: 'small_talk',
      patterns: [
        /^(okay|ok|k|got it|thanks|thank you|thx|ty|appreciate it|nice|great|awesome|cool|perfect|good|fine|alr|alright|sure|bet|sounds good)$/i,
        /^(stop|wait|hold up|hold on|pause|cancel|nevermind|nvm|nah|no thanks)$/i,
        /^(bye|goodbye|see you|see ya|later|cya|peace|im out|got gotta go)$/i,
        /^(lol|haha|hehe|lmao|nice one|good one|funny)$/i,
        /^(huh|what|hmm|umm|pardon|excuse me|come again|say what|what did you say|say that again|repeat that)$/i,
        /^(how are you|how you doing|how goes it|whats up|what's up|whats new|how are things|how do you do)$/i,
        /^(good morning|morning|good afternoon|afternoon|good evening|evening)$/i,
        /^(tell me a joke|make me laugh|joke|funny|humor me)$/i,
        /^(what do you think|your opinion|thoughts)$/i,
        /^(who are you|what are you|introduce yourself)$/i
      ],
      params: (matches: string[]) => ({ text: matches[0].toLowerCase().trim() })
    },
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
      intent: 'help_commands',
      patterns: [
        /^(?:help|help me|show commands|what are your commands|list commands|options|command list)\??$/i
      ],
      params: () => ({})
    },
    {
      intent: 'list_leads',
      patterns: [
        /^(?:leads|show leads|list leads|my leads|view leads)$/i,
        /^(?:show all leads|list all leads|get leads|show leeds|list leeds)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'capabilities',
      patterns: [
        /^(?:what\s+can\s+you\s+(do|help\s+with|offer)?\??)$/i,
        /^(?:what\s+are\s+your\s+capabilities\??)$/i,
        /^(?:capabilities|features|help)\??$/i,
        /^(?:list\s+(?:your\s+)?capabilities\??)$/i,
        /^(?:who\s+built\s+you|who\s+are\s+you|what\s+are\s+you)$/i
      ],
      params: () => ({})
    },
    {
      intent: 'personality_query',
      patterns: [
        /^(?:can you customize how you talk|change your personality|how you talk to me)$/i,
        /^(?:be more professional|be sassy|be funny|cursing mode|customize your tone)$/i,
        /\b(?:personality|tone|style)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'hot_leads',
      patterns: [
        /^(?:what are my top leads|what are my top 5 leads|top leads|show my best leads|hot leads)$/i,
        /^(?:who should i call|best leads|deals to close|who is hot)$/i,
        /^(?:what are my (\d+)\s+highest\s+scored\s+leads|show\s+my\s+top\s+(\d+)\s+leads|top\s+(\d+)\s+leads)$/i,
        /^(?:what are my top|show top)\s+(\d+)\s+leads$/i,
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
        /^(?:test|ping|are you working|system check)$/i
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
      intent: 'capabilities',
      patterns: [
        /^(?:help|what can you|what can you do|capabilities|features|show commands|options)$/i,
        /^(?:what can you do for me|what can you help me with|what are your capabilities|list your capabilities)$/i,
        /^(?:what capabilities|list capabilities|show capabilities)$/i,
        /\b(?:help|capabilities)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'hot_leads',
      patterns: [
        /^(?:what are my top leads|show me my top leads|what are my best leads|list my hot leads)$/i,
        /^(?:top 5 leads|best leads|hot leads|show hot leads)$/i,
        /\b(?:top leads|best leads|hot leads)\b/i
      ],
      params: () => ({ score_min: 80 })
    },
    {
      intent: 'memory_recall',
      patterns: [
        /^(?:what memories|what do you remember|what memories do you have|what do you know about me)$/i,
        /^(?:recall memory|show my actions|what have we discussed|what happened)$/i,
        /\b(?:memories|remember)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'test_query',
      patterns: [
        /^(?:test|testing|system test|is it working|ping)$/i
      ],
      params: () => ({})
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
        /\b(?:joke|funny)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'time_query',
      patterns: [
        /^(?:what time is it|what is the time|current time|what is the date|today's date|what day is it)$/i,
        /\b(?:time|date|clock)\b/i
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
        /\b(?:doing|failing|business)\b/i
      ],
      params: () => ({})
    },
    {
      intent: 'motivation',
      patterns: [
        /^(?:encourage me|need motivation|give me a quote|tough day|motivate me|inspire me)$/i,
        /\b(?:motivation|quote|inspire|tough)\b/i
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

          return { intent: intentObj, params, confidence: 100, needsAgentLoop };
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
      originalText: input,
      needsAgentLoop
    };
  }

  // 3.5 CHECK LEARNED INTENTS (from Supabase)
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  
  if (userId) {
    // Check exact learned intent first
    const learnedIntent = await getLearnedIntent(userId, normalized);
    if (learnedIntent) {
      const intentObj = intents.find(i => i.name === learnedIntent.mapped_intent);
      if (intentObj) {
        console.log(`[🤖 OS Bot] Using learned intent: "${normalized}" → ${learnedIntent.mapped_intent}`);
        return {
          intent: intentObj,
          params: { ...learnedIntent.params },
          confidence: learnedIntent.confidence,
          originalText: input,
          needsAgentLoop: detectMultiStep(input)
        };
      }
    }
    
    // Check all learned intents for similar phrases
    const allLearned = await getAllLearnedIntents(userId);
    const similar = findSimilarLearnedPhrase(normalized, allLearned);
    if (similar) {
      const intentObj = intents.find(i => i.name === similar.mapped_intent);
      if (intentObj) {
        console.log(`[🤖 OS Bot] Using similar learned intent: "${normalized}" ≈ "${similar.phrase}" → ${similar.mapped_intent}`);
        return {
          intent: intentObj,
          params: { ...similar.params },
          confidence: Math.floor((similar.confidence ?? 100) * 0.9), // Slightly lower confidence for similar match
          originalText: input,
          needsAgentLoop: detectMultiStep(input)
        };
      }
    }
  }

  // 4. TYPO SUGGESTIONS AS LAST RESORT
  const inputWords = normalized.split(/\s+/);
  
  for (const keyword of keywords) {
    for (const word of inputWords) {
      if (word.length < 3 && keyword.length >= 3) continue;
      
      const distance = getLevenshteinDistance(word, keyword);
      if (distance > 0 && distance <= 2) {
        const confidence = 100 - (distance * 20);
        if (confidence > 70) {
          const suggestedText = normalized.replace(word, keyword);
          return {
            intent: { name: 'typo_suggestion', action: 'small_talk', patterns: [], template: `I think you meant '${keyword}'?` },
            params: { text: `I think you meant '${keyword}'?`, suggestedText, keyword },
            confidence: 100,
            suggestion: keyword,
            needsAgentLoop
          };
        }
      }
    }
  }

  return null;
}
