import { useStore } from '../../store/useStore';
import { Intent } from '../ai/intents';
import { getAIContext } from './memory-store';

const applyPersonality = (msg: string, personality: string, customPrompt?: string): string => {
  const p = personality.toLowerCase();
  
  if (p === 'custom' && customPrompt) {
    return `${msg}\n\n[Personality: ${customPrompt}]`;
  }
  if (p === 'sassy') {
    const suffixes = [" 😏", " You're all set.", " Next?"];
    return `${msg}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }
  if (p === 'funny') {
    const additions = [" 😂", " 🚀", " 😂 You owe me a virtual coffee."];
    return `${msg}${additions[Math.floor(Math.random() * additions.length)]}`;
  }
  if (p === 'casual') {
    return `Hey, all set! ${msg.toLowerCase()} Got your back! 👊`;
  }
  if (p === 'cursing') {
    const cursed = [" Hell yeah, handled.", " Let's get this $#!% moving.", " Done. No messing around."];
    return `${msg} ${cursed[Math.floor(Math.random() * cursed.length)]}`;
  }
  if (p === 'professional') {
    return `Acknowledged. ${msg}`;
  }
  
  return msg;
};

export function generateResponse(
  intentOrName: Intent | string, 
  result: any, 
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

  // 0. Handle virtual intents primarily used in gemini.ts
  if (intentName === 'ambiguous') {
    return generateUnknownResponse(userText, result?.intent?.name || result?.suggestion);
  }

  if (intentName === 'none' || intentName === 'unknown') {
    return generateUnknownResponse(userText);
  }

  let message = result?.message || (typeof intentOrName !== 'string' ? intentOrName.template : '') || "I've processed your request.";

  // 1. Handle Typo Suggestions specifically
  if (intentName === 'typo_suggestion') {
     const keyword = result.keyword || 'that';
     message = `I think you meant **'${keyword}'** in your message "${userText}"? I can help! Just let me know if you want me to proceed with "${suggestedText}".`;
  }
  else if (intentName === 'weather_query') {
    message = `I can't check the weather, but I can help you manage leads, tasks, and send SMS. Try asking me to 'text John saying hello' or 'show me my tasks'.`;
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
    const newGreeting = result.newGreeting || result.message || '';
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

  // Standardize the message
  message = message.replace('✅ ', '');

  if (result?.clean) return `${prefix}${message}`;

  // Apply Personality
  message = applyPersonality(message, personality, store.aiCustomPrompt);

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
