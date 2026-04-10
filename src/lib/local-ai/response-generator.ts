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
     const customGreeting = localStorage.getItem('user_custom_greeting');
     if (customGreeting) {
       return `${prefix}${customGreeting}`;
     }
     return `${prefix}Hello! I'm 🤖 OS Bot, your intelligent real estate assistant. How can I help you today?`;
  }

  // 4. Handle HELP
  if (intent.name === 'help' || intent.name === 'capabilities') {
    return `${prefix}Here are some things I can do LOCAL (100% offline):
- **Leads**: "Add John as a lead", "Show my hot leads"
- **Tasks**: "Create task: Call John tomorrow", "Show my tasks"
- **SMS**: "Text John saying Hello!", "Send message to 555-0101"
- **Navigation**: "Go to calendar", "Show me the dashboard"
- **Customization**: "Change your greeting to Ready to work?"`;
  }

  // 5. Handle TEST
  if (intent.name === 'test_query') {
    return `${prefix}OS Bot is working properly!`;
  }

  // 6. Handle CHANGE GREETING
  if (intent.name === 'change_greeting') {
    const newGreeting = result.newGreeting || result.message || '';
    if (newGreeting) {
      localStorage.setItem('user_custom_greeting', newGreeting);
      return `${prefix}✅ I've changed my greeting to '${newGreeting}'`;
    }
    return `${prefix}What would you like my new greeting to be? Try: 'Change greeting to [your greeting]'`;
  }

  // 7. Handle Task execution results
  let message = result?.message || intent.template || "I've processed your request.";

  // Personality adjustments
  const p = personality.toLowerCase();
  const cPrompt = store.aiCustomPrompt;

  // Standardize the message
  message = message.replace('✅ ', '');

  if (p === 'custom' && cPrompt) {
    message = `${message}\n\n[Custom Prompt Apply: ${cPrompt}]`;
  } else if (p === 'sassy') {
    const sassyPrefixes = ["Look, I did it.", "Fine, here.", "Don't say I never did anything for you.", "Done. Next?"];
    const sassySuffixes = [" Happy now?", " Try not to break anything.", " 🙄", " Honestly, you're welcome.", " You're lucky I like you."];
    message = `${sassyPrefixes[Math.floor(Math.random() * sassyPrefixes.length)]} ${message}${sassySuffixes[Math.floor(Math.random() * sassySuffixes.length)]}`;
  } else if (p === 'funny') {
    const funnyAdditions = [" 🤡 Work mode: ON.", " 🚀 To the moon!", " 🎩 Classy.", " 👊 Boom."];
    message = `${message}${funnyAdditions[Math.floor(Math.random() * funnyAdditions.length)]}`;
  } else if (p === 'casual') {
    message = `Hey ${userName}, ${message.toLowerCase()} Got you covered! 👊`;
  } else if (p === 'cursing' || p === 'adult' || p.includes('cursing')) {
    const cursedAdditions = [
      " Let's f***ing go!", 
      " Absolute beast mode.", 
      " Get that s*** handled.", 
      " No f***ing around today.", 
      " 🚀 Let's get this bread."
    ];
    message = `${message} ${cursedAdditions[Math.floor(Math.random() * cursedAdditions.length)]}`;
  } else if (p === 'professional') {
    message = `Acknowledged. ${message} Please let me know if you require further assistance with your CRM data.`;
  }

  // Sentiment adjustments (Subtle micro-enhancements)
  const sentiment = context.sentiment || 'neutral';
  if (sentiment === 'frustrated') {
    message = `I understand. ${message} I'm here to ensure this workflow remains efficient.`;
  } else if (sentiment === 'happy') {
    message = `${message} Exceptional work! ✨`;
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
