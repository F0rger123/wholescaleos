import { useStore } from '../../store/useStore';
import { Intent } from '../ai/intents';
import { getAIContext } from './memory-store';

export function generateResponse(
  intent: Intent, 
  result: any, 
  userText: string, 
  suggestedText?: string
): string {
  const store = useStore.getState();
  const context = getAIContext();
  const aiName = store.aiName || 'OS Bot';
  const tone = store.aiTone || 'Professional';
  const personality = store.aiPersonality || 'Default';
  const userName = store.currentUser?.name?.split(' ')[0] || 'Agent';

  // Branding prefix
  const prefix = `🤖 ${aiName}: `;

  // 1. Handle Typo Suggestions specifically
  if (intent.name === 'typo_suggestion' || (intent as any).name === 'typo_suggestion') {
     const keyword = result.keyword || 'that';
     return `${prefix}I think you meant **'${keyword}'** in your message "${userText}"? I can help! Just let me know if you want me to proceed with "${suggestedText}".`;
  }

  // 2. Handle Weather specifically (as requested)
  if (intent.name === 'weather_query') {
    return `${prefix}I can't check the weather, but I can help you manage leads, tasks, and send SMS. Try asking me to 'text John saying hello' or 'show me my tasks'.`;
  }

  // 3. Handle Greetings
  if (intent.name === 'greeting') {
     return `${prefix}${result.message}`;
  }

  // 4. Handle Task execution results
  let message = result?.message || intent.template || "I've processed your request.";

  // Personality adjustments using context.sentiment
  const sentiment = context.sentiment || 'neutral';
  
  if (sentiment === 'frustrated') {
    message = `I understand this can be frustrating. ${message} I'm here to help fix this.`;
  } else if (sentiment === 'happy') {
    message = `${message} Great to see everything moving forward! ✨`;
  }

  if (personality.toLowerCase() === 'enthusiastic') {
    message = message.replace(/\./g, '!') + " 🚀 Let's crush this!";
  } else if (personality.toLowerCase() === 'direct') {
    message = message.replace(/,/g, '.').split('\n')[0]; // Shorten
  } else if (personality.toLowerCase() === 'friendly') {
    message = `Hi ${userName}! ${message} Hope that helps! 😊`;
  }

  // Add tone markers
  if (tone.toLowerCase() === 'casual') {
    message = message.replace('I have', "I've").replace('You have', "You've").replace('Hello', 'Hey');
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
