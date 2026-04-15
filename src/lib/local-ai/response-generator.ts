import { useStore } from '../../store/useStore';
import { Intent } from '../ai/intents';
import { getMemory, getLearnedFact } from './memory-store';

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

const defaultEndings = [
  ' What\'s next?',
  ' Ready for your next command.',
  ' Anything else on your mind?',
  ' What should we tackle next?',
  ' I am here if you need more help.',
];

/**
 * Contextual follow-up question generator based on intent and conversation state.
 */
function generateFollowUp(intent: string, entities: any, _context: any): string | null {
  const memory = getMemory();

  // Real estate calculations - ask for missing data
  if (intent === 'real_estate_action' && entities.action === 'calculate_deal') {
    if (!entities.arv) return "What's the After Repair Value (ARV) you're working with?";
    if (!entities.purchase) return "What's the purchase price?";
    if (!entities.repairs) return "What are the estimated repair costs?";
  }

  // Lead management - ask for clarification if needed
  if (intent === 'crm_action') {
    if (entities.action === 'send_sms' && !entities.message) {
      return "What message would you like me to send?";
    }
    if (entities.action === 'update_status' && !entities.status) {
      return "What status should I update them to?";
    }
  }

  // Check if we should resume interrupted workflow
  if (memory.conversationState?.interruptedWorkflow && Math.random() > 0.7) {
    return `By the way, we were working on ${memory.conversationState.interruptedWorkflow}. Want to continue that?`;
  }

  return null;
}

/**
 * Educational explanation generator for real estate concepts.
 */
function addEducationalContext(intent: string, response: string): string {
  if (intent !== 'real_estate_action') return response;

  const memory = getMemory();
  const userPrefs = memory.userPreferences;

  // Add context based on user's experience level
  if (userPrefs?.riskTolerance === 'low' || userPrefs?.investmentGoals?.includes('education')) {
    const educationalAdditions = [
      "\n\n💡 **Pro Tip:** Always run the numbers multiple ways before making an offer.",
      "\n\n📚 **Remember:** The best deals are found off-market through direct marketing.",
      "\n\n🎯 **Key Insight:** Focus on motivated sellers, not just discounted properties.",
      "\n\n⚡ **Quick Tip:** Speed matters - the first qualified offer often wins."
    ];
    return response + pick(educationalAdditions, 'edu_tip');
  }

  return response;
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
    // If frustrated, keep it extremely brief and direct, bypass normal personality
    return `${base} I understand. Let's get this done. What's the next specific step?`;
  }

  if (p === 'professional') {
    const openings = ['Assuredly.', 'Understood.', 'Confirmed.', 'Proceeding.'];
    const endings = [
      ' Let me know if you need anything else.',
      ' Standing by for further requests.',
      ' What else can I assist with?',
      ' Shall I proceed with the next task?',
    ];
    return `${pick(openings, 'prof_open')} ${base}${pick(endings, 'prof')}`;
  }

  if (p === 'maven' || p === 'expert') {
    const openings = [
      "Let's look at the numbers.",
      "Here's the strategic breakdown.",
      "Analyzing this from a high-ROI perspective.",
      "Focusing on the deal mechanics here."
    ];
    const endings = [
      " This aligns with current market velocity. 📈",
      " Strategic moves only. What's the next step?",
      " This is how we scale. Ready for more?",
      " Data-driven results. Let's keep dominating. 🏆"
    ];
    return `${pick(openings, 'maven_open')} ${base}${pick(endings, 'maven')}`;
  }

  if (p === 'sassy') {
    const endings = [
      " Easy work. 😏",
      " You know I got you. 💅",
      " Handled. What's the next power move?",
      " Done and done. Next? 🔥",
      " Boom. What else you got?",
    ];
    return `${base}${pick(endings, 'sassy')}`;
  }

  if (p === 'funny') {
    const additions = [
      " 🚀 Another win in the books!",
      " 😂 If only all problems were this easy.",
      " Virtual high-five! 🖐️",
      " You owe me a virtual coffee for that one. ☕",
    ];
    return `${base}${pick(additions, 'funny')}`;
  }

  if (p === 'casual') {
    const openings = ["Gotcha.", "On it.", "Done deal.", "Sure thing."];
    const endings = [
      " No sweat! What's next? 👊",
      " Easy peasy. Got more for me?",
      " Sorted. Hit me with the next one.",
    ];
    return `${pick(openings, 'casual_open')} ${base}${pick(endings, 'casual')}`;
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

  // Handle style preference (concise)
  const stylePref = getMemory().learnedFacts?.style_preference;
  if (stylePref === 'concise' && base.length > 50) {
    // If user prefers concise and message is long, just return base
    return base;
  }

  return `${base}${pick(defaultEndings, 'default')}`;
};

export function generateResponse(
  intentOrName: Intent | string,
  result: any,
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
  if (context.lastTopic && context.activeTopic && context.lastTopic !== context.activeTopic) {
    if (!result?.clean && intentName !== 'greeting' && intentName !== 'small_talk') {
      const transitions = [
        `By the way, moving over to ${context.activeTopic} now. `,
        `Switching gears to ${context.activeTopic}... `,
        `Alright, let's look at ${context.activeTopic}. `,
        `Pivoting to ${context.activeTopic}. `,
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
    const factType = result?.type || 'fact';
    if (factType === 'name') {
      message = `Got it! I'll call you ${result.value} from now on.`;
    } else {
      message = "I've noted that down for you.";
    }
  }

  // Add contextual follow-up questions
  const followUp = generateFollowUp(intentName, result?.data, context);
  if (followUp && !result?.clean) {
    message += `\n\n❓ ${followUp}`;
  }

  // Add educational context for real estate queries
  if (!result?.clean) {
    message = addEducationalContext(intentName, message);
  }

  // Personalize with Name if known
  const userName = getLearnedFact('name');
  if (userName && !result?.clean && Math.random() > 0.4 && intentName !== 'greeting') {
    const nameWrappers = [
      `${userName}, `,
      `Got it, ${userName}. `,
      `Sure thing, ${userName}. `,
      `Alright ${userName}, `,
    ];
    prefix += pick(nameWrappers, 'name_wrapper');
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

export function mergeResponses(
  results: { intent: Intent; result: any; segment: string }[],
  personality: string,
  aiName: string
): string {
  if (results.length === 0) return `🤖 ${aiName}: I'm not sure how to help with that.`;
  if (results.length === 1) {
    return generateResponse(results[0].intent, results[0].result, results[0].segment);
  }

  // Specialized merging for Lead Info + Proactive Suggestion
  const leadInfoIdx = results.findIndex(r => r.intent.name === 'lead_context_query' || r.intent.name === 'get_lead_info');
  const suggestionIdx = results.findIndex(r => r.intent.name === 'proactive_suggestion');

  if (leadInfoIdx !== -1 && suggestionIdx !== -1) {
    const info = results[leadInfoIdx];
    const suggestion = results[suggestionIdx];

    // Get lead name to deduplicate
    const leadName = info.intent.params?.name || info.result.name;
    let suggestionMsg = suggestion.result.message;

    // If suggestion starts with the lead name in bold, make it more natural
    if (leadName) {
      const boldNamePattern = new RegExp(`\\*\\*${leadName}\\*\\*`, 'gi');
      if (boldNamePattern.test(suggestionMsg)) {
        suggestionMsg = suggestionMsg.replace(boldNamePattern, 'they').trim();
        // Capitalize first letter if it was at the start
        suggestionMsg = suggestionMsg.charAt(0).toUpperCase() + suggestionMsg.slice(1);
      }
    }

    let mergedMessage = info.result.message.trim();
    if (!mergedMessage.endsWith('.') && !mergedMessage.endsWith('!') && !mergedMessage.endsWith('?')) {
      mergedMessage += '.';
    }

    // Add a natural transition
    const transition = suggestionMsg.toLowerCase().includes('recommend') || suggestionMsg.toLowerCase().includes('should')
      ? ` Based on that, `
      : ` Also, `;

    mergedMessage += transition + suggestionMsg;

    // Apply personality once at the end
    const prefix = `🤖 ${aiName}: `;
    const finalMessage = applyPersonality(mergedMessage.replace('✅ ', ''), personality, 'compound_intent', '');
    return `${prefix}${finalMessage}`;
  }

  // Default merging: Join with transitions
  let combinedMessage = "";
  results.forEach((r, i) => {
    let msg = r.result.message || "";
    msg = msg.replace('✅ ', '').trim();

    if (i > 0) {
      const transitions = [" Additionally, ", " Also, ", " Separately, ", " Furthermore, "];
      combinedMessage += transitions[i % transitions.length];
    }

    combinedMessage += msg;
  });

  const prefix = `🤖 ${aiName}: `;
  const finalMessage = applyPersonality(combinedMessage, personality, 'compound_intent', '');
  return `${prefix}${finalMessage}`;
}

/**
 * Generate a contextual clarification question when entities are missing.
 */
export function generateClarificationQuestion(intent: string, missingEntities: string[]): string {
  const questions: Record<string, string[]> = {
    'calculate_deal': [
      "I need a few more details to run the numbers. What's the [missing]?",
      "To give you an accurate analysis, please provide the [missing].",
      "Can you tell me the [missing] so I can calculate this properly?"
    ],
    'send_sms': [
      "Who would you like me to send that to?",
      "What's the phone number or lead name?",
      "Should I send that to a specific lead?"
    ],
    'update_status': [
      "What status should I update them to?",
      "Which stage of the pipeline should they move to?",
      "What's the new status for this lead?"
    ]
  };

  const actionKey = intent.split('_').slice(1).join('_');
  const actionQuestions = questions[actionKey] || questions['calculate_deal'];

  const missing = (missingEntities[0] || 'more details').replace('_', ' ');
  return pick(actionQuestions, 'clarify').replace('[missing]', missing);
}

/**
 * Intelligent fuzzy-matched Command Suggestions
 */
export function fuzzySuggestCommands(input: string): string {
  const commands = [
    { trigger: 'lead', suggestion: "Show my hot leads", description: "view your top-scoring opportunities" },
    { trigger: 'deal', suggestion: "Analyze property as flip", description: "run a quick deal analysis" },
    { trigger: 'task', suggestion: "Show my tasks", description: "check what's on your to-do list" },
    { trigger: 'calendar', suggestion: "What's on my schedule today", description: "view your appointments" },
    { trigger: 'text', suggestion: "Send SMS to [Lead Name]", description: "outreach to a specific lead" },
    { trigger: 'help', suggestion: "Capabilities", description: "see everything I can help with" },
    { trigger: 'status', suggestion: "Mark [Lead] as Qualified", description: "update your pipeline" },
  ];

  const inputLower = input.toLowerCase();
  const match = commands.find(c => inputLower.includes(c.trigger));

  if (match) {
    return `I'm not exactly sure about "${input}", but did you want to **${match.suggestion}**?\n\nI can help you ${match.description}.`;
  }

  return `I didn't quite catch that. Try asking for "hot leads", "my schedule", or "analyze a deal". You can also say "**help**" to see everything I can do.`;
}
