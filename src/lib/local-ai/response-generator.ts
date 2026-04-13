import { useStore } from '../../store/useStore';
import { Intent } from '../ai/intents';
import { getAIContext } from './memory-store';

/**
 * Response Suffixes — these trailing phrases are stripped before personality
 * is applied, to prevent stacking (e.g. "What's next? You're all set.").
 */
const TRAILING_SUFFIX_PATTERN = /\s*(?:What(?:'s| is) next\??|Anything else\??|What else\??|You're all set\.?|Ready when you are\.?|What would you like to do\??|What can I do\??|Got your back!?\s*👊?)\s*$/i;

/**
 * Strips any trailing "What's next?" / "Anything else?" / "You're all set."
 * so that personality formatting can add its own ending cleanly.
 */
function stripTrailingSuffixes(msg: string): string {
  // Run twice to catch double-stacked suffixes
  let cleaned = msg.replace(TRAILING_SUFFIX_PATTERN, '').trim();
  cleaned = cleaned.replace(TRAILING_SUFFIX_PATTERN, '').trim();
  return cleaned;
}

/**
 * Picks a random item from an array ensuring we don't repeat the last choice for variety.
 */
function pick<T>(arr: T[], key: string = 'general'): T {
  const lastPicked = localStorage.getItem(`os_bot_last_picked_${key}`);
  const available = arr.filter(x => (x as unknown as string) !== lastPicked);
  const pool = available.length > 0 ? available : arr;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  if (typeof choice === 'string') {
    localStorage.setItem(`os_bot_last_picked_${key}`, choice);
  }
  return choice;
}

/**
 * Applies personality style to a response.
 * Rules:
 * - Small talk / greeting responses are NEVER personality-wrapped (they already have tone).
 * - Personality is applied exactly ONCE.
 * - Professional mode does NOT add emojis or casual filler.
 * - Debug logs show which personality is being applied.
 */
const applyPersonality = (
  msg: string,
  personality: string,
  intentName: string,
  _customPrompt?: string
): string => {
  const p = personality.toLowerCase();

  // Debug: always log which personality is being applied
  console.log(`[🎭 Personality] Intent: "${intentName}" | Personality: "${personality}" | Raw: "${p}"`);

  // Skip personality wrapping for intents that already have natural tone
  const skipPersonality = [
    'small_talk', 'greeting', 'joke', 'cancel_confirmation',
    'typo_suggestion', 'test_query', 'repeat_last'
  ];
  if (skipPersonality.includes(intentName)) {
    console.log(`[🎭 Personality] Skipping — intent "${intentName}" has natural tone`);
    return msg;
  }

  // Strip any existing trailing suffixes before adding personality ones
  const base = stripTrailingSuffixes(msg);

  // Sentiment Shift
  const memory = getMemory();
  const sentiment = memory.sentiment;
  if (sentiment === 'frustrated') {
    const empatheticEndings = [
      ' Let me know if I can help clear things up.',
      ' I know this can be frustrating. What specifically can I assist with?',
      ' Take your time, I am here to help.',
      ' Let\'s get this sorted out together.',
    ];
    return `${base}${pick(empatheticEndings, 'frustrated')}`;
  }

  if (p === 'professional') {
    // Clean, no-emoji, business tone
    const endings = [
      ' Let me know if you need anything else.',
      ' Ready for your next instruction.',
      ' Standing by for further requests.',
      ' What else can I assist with?',
      ' Shall I proceed with anything else?',
      ' At your service.',
      ' Anything else on the agenda?',
    ];
    return `${base}${pick(endings, 'prof')}`;
  }

  if (p === 'sassy') {
    const endings = [
      " Easy work. 😏",
      " You know I got you. 💅",
      " Handled. What's the next power move?",
      " Done and done. Next? 🔥",
      " Boom. What else you got?",
      " Slayed it. 💁‍♀️",
      " No sweat, babe. Next?",
    ];
    return `${base}${pick(endings, 'sassy')}`;
  }

  if (p === 'funny') {
    const additions = [
      " 🚀 Another win in the books!",
      " 😂 If only all problems were this easy.",
      " Virtual high-five! 🖐️",
      " You owe me a virtual coffee for that one. ☕",
      " And they said AI couldn't be helpful! 🤖",
      " I'd take a bow but I'm made of code. 🎭",
      " My circuits are tingling with pride!",
    ];
    return `${base}${pick(additions, 'funny')}`;
  }

  if (p === 'casual') {
    const endings = [
      " No sweat! What's next? 👊",
      " Easy peasy. Got more for me?",
      " All good! What else?",
      " Sorted. Hit me with the next one.",
      " Done deal. What's the move?",
      " Piece of cake. What else?",
      " Got it handled! 🤙",
    ];
    return `${base}${pick(endings, 'casual')}`;
  }

  if (p === 'cursing') {
    const cursed = [
      " Hell yeah, handled.",
      " Let's keep this $#!% moving.",
      " Done. No messing around.",
      " Knocked that out. What's next, boss?",
      " Boom. What else you need?",
      " Damn right I got that done.",
      " No BS, just results.",
    ];
    return `${base} ${pick(cursed, 'cursing')}`;
  }

  // Default — add a light conversational ending
  const defaultEndings = [
    '',
    ' Anything else I can help with?',
    ' What would you like to do next?',
    ' Let me know if you need more.',
    '',
  ];
  return `${base}${pick(defaultEndings, 'default')}`;
};

export function generateResponse(
  intentOrName: Intent | string,
  result: Record<string, unknown>,
  userText: string,
  suggestedText?: string
): string {
  // CRITICAL: Always read personality FRESH from the store, never cache it
  const store = useStore.getState();
  const context = getMemory();
  const aiName = store.aiName || 'OS Bot';
  const personality = store.aiPersonality || 'Default';

  // Debug: log the personality being used for this response
  console.log(`[🎭 Personality] generateResponse called | Store personality: "${personality}" | aiTone: "${store.aiTone}"`);

  // Late Night Awareness
  const hour = new Date().getHours();
  let prefix = `🤖 ${aiName}: `;
  if ((hour >= 22 || hour <= 4) && Math.random() > 0.7 && !result?.clean) {
    prefix = `🤖 ${aiName}: (Burning the midnight oil, I see. 🌙) `;
  }

  // Normalize intent name
  const intentName = typeof intentOrName === 'string' ? intentOrName : intentOrName.name;

  // Topic Transitions
  if (memory.lastTopic && memory.activeTopic && memory.lastTopic !== memory.activeTopic) {
    if (!result?.clean && intentName !== 'greeting' && intentName !== 'small_talk') {
      const transitions = [
        `By the way, moving over to ${memory.activeTopic} now. `,
        `Switching gears to ${memory.activeTopic}... `,
        `Alright, let's look at ${memory.activeTopic}. `,
        `Pivoting to ${memory.activeTopic}. `,
      ];
      prefix += pick(transitions, 'transition');
    }
  }

  // 0. Handle virtual intents
  if (intentName === 'ambiguous') {
    return generateUnknownResponse(userText, (result?.intent as Record<string, unknown>)?.name as string || result?.suggestion as string);
  }

  if (intentName === 'none' || intentName === 'unknown') {
    return generateUnknownResponse(userText);
  }

  let message = (result?.message as string) || (typeof intentOrName !== 'string' ? intentOrName.template : '') || "I've processed your request.";

  // 1. Handle Typo Suggestions specifically (no personality applied)
  if (intentName === 'typo_suggestion') {
    const keyword = (result?.keyword as string) || 'that';
    message = `I think you meant **'${keyword}'** — want me to try "${suggestedText}" instead?`;
  }
  else if (intentName === 'weather_query') {
    message = `I can't check the weather, but I can help you manage leads, tasks, and send SMS. Try 'show my leads' or 'text John hello'.`;
  }
  else if (intentName === 'greeting' || intentName === 'small_talk') {
    const customGreeting = localStorage.getItem('user_custom_greeting');
    if (customGreeting && intentName === 'greeting') {
      message = customGreeting;
    } else if (!result?.message) {
      message = `Hello! I'm OS Bot, your intelligent real estate assistant. How can I help you today?`;
    }
  }
  else if (intentName === 'test_query') {
    message = `OS Bot is working properly!`;
  }
  else if (intentName === 'change_greeting') {
    const newGreeting = (result?.newGreeting as string) || (result?.message as string) || '';
    if (newGreeting) {
      localStorage.setItem('user_custom_greeting', newGreeting);
      message = `I've changed my greeting to '${newGreeting}'`;
    } else {
      message = `What would you like my new greeting to be? Try: 'Change greeting to [your greeting]'`;
    }
  }
  else if (intentName === 'user_fact' && !result?.message) {
    message = "I've noted that down.";
  }

  // Standardize the message — remove stale ✅ prefix (executor adds its own)
  message = message.replace('✅ ', '');

  // If the result is marked clean (raw data), skip personality
  if (result?.clean) return `${prefix}${message}`;

  // Apply Personality ONCE, with intent awareness
  message = applyPersonality(message, personality, intentName, store.aiCustomPrompt);

  return `${prefix}${message}`;
}

export function generateErrorResponse(error: string): string {
  const store = useStore.getState();
  const aiName = store.aiName || 'OS Bot';
  const personality = store.aiPersonality || 'Default';
  
  console.log(`[🎭 Personality] Error response | Personality: "${personality}"`);
  
  const base = `I ran into an issue: ${error}. Want to try a different command?`;
  if (personality.toLowerCase() === 'professional') {
    return `🤖 ${aiName}: ${base} I can assist with leads, tasks, and messages.`;
  }
  return `🤖 ${aiName}: ${base} I can help with leads, tasks, and messages.`;
}

export function generateUnknownResponse(input: string, suggestion?: string): string {
  const store = useStore.getState();
  const aiName = store.aiName || 'OS Bot';
  const prefix = `🤖 ${aiName}: `;
  const memory = getMemory();

  if (suggestion) {
    return `${prefix}I'm not exactly sure what you mean by "${input}". Did you mean **"${suggestion}"**?`;
  }

  if (memory.lastTopic) {
    const contextualFallback = [
      `I didn't quite catch that. Were you trying to check on your ${memory.lastTopic}?`,
      `Hmm, I'm not understanding "${input}". We were just talking about ${memory.lastTopic} — want to go back to that?`,
      `Not sure what that means. If you still want to manage your ${memory.lastTopic}, just let me know!`,
    ];
    return `${prefix}${pick(contextualFallback, 'unknown_context')}`;
  }

  const fallbacks = [
    `Hmm, I'm not sure what "${input}" means. I'm best with leads, tasks, and SMS — try 'show my leads' or 'help' for a full list.`,
    `I didn't quite catch that. Try rephrasing, or say 'help' to see what I can do!`,
    `That's outside my wheelhouse for now. I'm great at managing your CRM — try 'leads', 'tasks', or 'text [name]'.`,
    `Not sure I follow. Want to try one of these? 'show tasks', 'top leads', 'text someone', or just say 'help'.`,
    `I'm still learning! For now, I handle leads, tasks, SMS, and calendar. Type 'help' to see the full command list.`,
  ];

  return `${prefix}${pick(fallbacks, 'unknown')}`;
}
