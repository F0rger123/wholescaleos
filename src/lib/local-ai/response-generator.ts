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
 * Picks a random item from an array for response variety.
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Applies personality style to a response.
 * Rules:
 * - Small talk / greeting responses are NEVER personality-wrapped (they already have tone).
 * - Personality is applied exactly ONCE.
 * - Professional mode does NOT add emojis or casual filler.
 */
const applyPersonality = (
  msg: string,
  personality: string,
  intentName: string,
  _customPrompt?: string
): string => {
  const p = personality.toLowerCase();

  // Skip personality wrapping for intents that already have natural tone
  const skipPersonality = [
    'small_talk', 'greeting', 'joke', 'cancel_confirmation',
    'typo_suggestion', 'test_query'
  ];
  if (skipPersonality.includes(intentName)) return msg;

  // Strip any existing trailing suffixes before adding personality ones
  const base = stripTrailingSuffixes(msg);

  if (p === 'professional') {
    // Clean, no-emoji, business tone
    const endings = [
      'Let me know if you need anything else.',
      'Ready for your next instruction.',
      'Standing by for further requests.',
      'What else can I assist with?',
      'Shall I proceed with anything else?',
    ];
    return `${base} ${pick(endings)}`;
  }

  if (p === 'sassy') {
    const endings = [
      " Easy work. 😏",
      " You know I got you. 💅",
      " Handled. What's the next power move?",
      " Done and done. Next? 🔥",
      " Boom. What else you got?",
    ];
    return `${base}${pick(endings)}`;
  }

  if (p === 'funny') {
    const additions = [
      " 🚀 Another win in the books!",
      " 😂 If only all problems were this easy.",
      " Virtual high-five! 🖐️",
      " You owe me a virtual coffee for that one. ☕",
      " And they said AI couldn't be helpful! 🤖",
    ];
    return `${base}${pick(additions)}`;
  }

  if (p === 'casual') {
    const endings = [
      " No sweat! What's next? 👊",
      " Easy peasy. Got more for me?",
      " All good! What else?",
      " Sorted. Hit me with the next one.",
      " Done deal. What's the move?",
    ];
    return `${base}${pick(endings)}`;
  }

  if (p === 'cursing') {
    const cursed = [
      " Hell yeah, handled.",
      " Let's keep this $#!% moving.",
      " Done. No messing around.",
      " Knocked that out. What's next, boss?",
      " Boom. What else you need?",
    ];
    return `${base} ${pick(cursed)}`;
  }

  // Default — add a light conversational ending
  const defaultEndings = [
    '',
    ' Anything else I can help with?',
    ' What would you like to do next?',
    ' Let me know if you need more.',
    '',
  ];
  return `${base}${pick(defaultEndings)}`;
};

export function generateResponse(
  intentOrName: Intent | string,
  result: Record<string, unknown>,
  userText: string,
  suggestedText?: string
): string {
  const store = useStore.getState();
  const _context = getAIContext();
  const aiName = store.aiName || 'OS Bot';
  const personality = store.aiPersonality || 'Default';

  // Branding prefix
  const prefix = `🤖 ${aiName}: `;

  // Normalize intent name
  const intentName = typeof intentOrName === 'string' ? intentOrName : intentOrName.name;

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
  return `🤖 ${aiName}: I ran into an issue: ${error}. Want to try a different command? I can help with leads, tasks, and messages.`;
}

export function generateUnknownResponse(input: string, suggestion?: string): string {
  const store = useStore.getState();
  const aiName = store.aiName || 'OS Bot';
  const prefix = `🤖 ${aiName}: `;

  if (suggestion) {
    return `${prefix}I'm not exactly sure what you mean by "${input}". Did you mean **"${suggestion}"**?`;
  }

  const fallbacks = [
    `Hmm, I'm not sure what "${input}" means. I'm best with leads, tasks, and SMS — try 'show my leads' or 'help' for a full list.`,
    `I didn't quite catch that. Try rephrasing, or say 'help' to see what I can do!`,
    `That's outside my wheelhouse for now. I'm great at managing your CRM — try 'leads', 'tasks', or 'text [name]'.`,
    `Not sure I follow. Want to try one of these? 'show tasks', 'top leads', 'text someone', or just say 'help'.`,
    `I'm still learning! For now, I handle leads, tasks, SMS, and calendar. Type 'help' to see the full command list.`,
  ];

  return `${prefix}${pick(fallbacks)}`;
}
