import { useStore } from '../../store/useStore';
import { Intent } from '../ai/intents';
import { getAIContext } from './memory-store';

export function generateResponse(
  intentOrName: Intent | string, 
  result: any, 
  userText: string, 
  suggestedText?: string
): string {
  const store = useStore.getState();
  const context = getAIContext();
  const aiName = store.aiName || 'OS Bot';
  const personality = store.aiPersonality || 'Default';
  const userName = store.currentUser?.name?.split(' ')[0] || 'Agent';

  // Branding prefix
  const prefix = `🤖 ${aiName}: `;

  // Normalize intent name
  const intentName = typeof intentOrName === 'string' ? intentOrName : intentOrName.name;

  // 0. Handle virtual intents primarily used in gemini.ts
  if (intentName === 'ambiguous') {
    return generateUnknownResponse(userText, result?.intent?.name || result?.suggestion);
  }

  if (intentName === 'none' || intentName === 'unknown') {
    return generateUnknownResponse(userText);
  }

  // 1. Handle Typo Suggestions specifically
  if (intentName === 'typo_suggestion') {
     const keyword = result.keyword || 'that';
     return `${prefix}I think you meant **'${keyword}'** in your message "${userText}"? I can help! Just let me know if you want me to proceed with "${suggestedText}".`;
  }

  // 2. Handle Weather specifically (as requested)
  if (intentName === 'weather_query') {
    return `${prefix}I can't check the weather, but I can help you manage leads, tasks, and send SMS. Try asking me to 'text John saying hello' or 'show me my tasks'.`;
  }

  // 3. Handle Greetings
  if (intentName === 'greeting' || intentName === 'small_talk') {
     const customGreeting = localStorage.getItem('user_custom_greeting');
     if (customGreeting && intentName === 'greeting') {
       return `${prefix}${customGreeting}`;
     }
     return `${prefix}Hello! I'm 🤖 OS Bot, your intelligent real estate assistant. How can I help you today?`;
  }

  // 5. Handle TEST
  if (intentName === 'test_query') {
    return `${prefix}OS Bot is working properly!`;
  }

  // 6. Handle CHANGE GREETING
  if (intentName === 'change_greeting') {
    const newGreeting = result.newGreeting || result.message || '';
    if (newGreeting) {
      localStorage.setItem('user_custom_greeting', newGreeting);
      return `${prefix}✅ I've changed my greeting to '${newGreeting}'`;
    }
    return `${prefix}What would you like my new greeting to be? Try: 'Change greeting to [your greeting]'`;
  }

  // 7. Handle JOKES
  if (intentName === 'joke') {
    return `${prefix}${result.message}`;
  }

  // 8. Handle TIME/DATE
  if (intentName === 'time_query') {
    return `${prefix}${result.message}`;
  }

  // 9. Handle USER FACTS
  if (intentName === 'user_fact') {
    const factText = result.message || "I've noted that down.";
    return `${prefix}${factText}`;
  }

  // 10. Handle MOOD & MOTIVATION
  if (intentName === 'mood_check' || intentName === 'motivation') {
    return `${prefix}${result.message}`;
  }

  // 11. Handle Task execution results
  let message = result?.message || (typeof intentOrName !== 'string' ? intentOrName.template : '') || "I've processed your request.";

  // Standardize the message
  message = message.replace('✅ ', '');

  if (result.clean) return `${prefix}${message}`;

  // Personality adjustments
  const p = personality.toLowerCase();
  const cPrompt = store.aiCustomPrompt;

  if (p === 'custom' && cPrompt) {
    message = `${message}\n\n[Personality: ${cPrompt}]`;
  } else if (p === 'sassy') {
    const sassySuffixes = [" 😏", " You're all set.", " Next?"];
    message = `${message}${sassySuffixes[Math.floor(Math.random() * sassySuffixes.length)]}`;
  } else if (p === 'funny') {
    const funnyAdditions = [" 😂", " 🚀", " 😂 You owe me a virtual coffee."];
    message = `${message}${funnyAdditions[Math.floor(Math.random() * funnyAdditions.length)]}`;
  } else if (p === 'casual') {
    message = `Hey ${userName}, all set! ${message.toLowerCase()} Got your back! 👊`;
  } else if (p === 'cursing') {
    const cursedAdditions = [
      " Hell yeah, handled.", 
      " Let's get this $#!% moving.", 
      " Done. No messing around today.", 
      " 🚀 Ready for whatever's next."
    ];
    message = `${message} ${cursedAdditions[Math.floor(Math.random() * cursedAdditions.length)]}`;
  } else if (p === 'professional') {
    // Professional: formal language, NO emojis, complete sentences.
    message = `Acknowledged. ${message}`;
  }

  // Sentiment adjustments (Subtle micro-enhancements)
  const sentiment = context.sentiment || 'neutral';
  if (sentiment === 'frustrated') {
    message = `${message} I'm here to ensure this workflow remains efficient.`;
  } else if (sentiment === 'happy') {
    message = `${message} Exceptional work!`; // Remove ✨ for all until specifically allowed or professional? 
                                               // Actually, the user says Professional = NO emojis. 
                                               // So I'll keep them out of professional.
  }

  // Final assembly
  return `${prefix}${message}`;
}

export function generateErrorResponse(error: string): string {
  const store = useStore.getState();
  const aiName = store.aiName || 'OS Bot';
  return `🤖 ${aiName}: I apologize, but I encountered an issue: ${error}. I can help with leads, tasks, and messages if you'd like to try a different command!`;
}

export function generateUnknownResponse(input: string, suggestion?: string): string {
  const store = useStore.getState();
  const aiName = store.aiName || 'OS Bot';
  const prefix = `🤖 ${aiName}: `;

  if (suggestion) {
    return `${prefix}I'm not exactly sure what you mean by "${input}". Did you mean **"${suggestion}"**?`;
  }

  const fallbacks = [
    `I'm not exactly sure how to help with "${input}". I specialize in leads, tasks, and SMS. Try asking to 'show my leads' or 'text a contact'.`,
    `I didn't quite catch that. Could you rephrase? I'm great at managing your CRM data and calendar!`,
    `That's a bit outside my current field of expertise. I can help you navigate the OS, manage your pipeline, or send texts. What's our next objective?`
  ];
  
  return `${prefix}${fallbacks[Math.floor(Math.random() * fallbacks.length)]}`;
}
