/**
 * OS Bot Response Generator (v6.0)
 * Generates high-impact, professional responses for property management & CRM.
 * Enhanced with Conversational Variety and Sentiment-Awareness.
 */

import { useStore } from '../../store/useStore';
import { getAIContext } from './memory-store';

export interface ResponseResult {
  text: string;
  intent: string;
  systemLog?: string;
}

export function generateResponse(intent: string, result: any): string {
  const store = useStore.getState();
  const userName = store.currentUser?.name?.split(' ')[0] || 'Agent';
  const { sentiment } = getAIContext(store.currentUser);

  // PASS-THROUGH INTENTS: These intents return their own rich messages from task-executor
  const passThroughIntents = [
    'greeting', 
    'help', 
    'capabilities', 
    'get_lead_info', 
    'lead_query', 
    'task_query',
    'update_lead_status',
    'add_note',
    'set_preference',
    'small_talk',
    'automation_query',
    'bot_origin',
    'philosophical',
    'feedback',
    'system_status',
    'clarify_previous',
    'ambiguous',
    'cancel_confirmation',
    'weather_query',
    'get_preferences'
  ];

  if (passThroughIntents.includes(intent) && result.success && result.message) {
    let msg = result.message;
    
    // Inject sentiment-based flair
    if (sentiment === 'happy') {
      msg = `🌟 ${msg}`;
    } else if (sentiment === 'urgent') {
      msg = `⚡ ${msg}`;
    }

    return applyToneAndPersonality(msg, store.aiTone, store.aiPersonality);
  }

  // Handle Ambiguity Case specifically
  if (intent === 'ambiguous') {
    return generateAmbiguityMessage(result);
  }

  // Handle errors
  if (!result || !result.success) {
    if (intent === 'unknown') {
      return `I'm not quite sure how to handle that specific request yet, **${userName}**. However, I'm currently optimized to help you with:\n\n` +
             `- 👤 **Leads**: "Add lead John", "Mark John as qualified"\n` +
             `- 📅 **Tasks**: "Remind me to call Sarah tomorrow", "Show my tasks"\n` +
             `- 💬 **Messaging**: "Text Luke: How are we looking for the 5th?"\n` +
             `- 📊 **CRM Info**: "How many leads do I have?", "Show my agenda"\n\n` +
             `Try one of those, or ask "What can you do?" for a full tour!`;
    }
    return `I encountered an issue while trying to process that **${intent.replace('_', ' ')}** request. ${result?.message || 'Please check your connection and try again.'}`;
  }

  const data = result.data || {};

  // Professional Templates (v6.0 - More Varied)
  const templates: Record<string, string[]> = {
    navigate: [
      `Right away, **${userName}**. I've opened that up for you.`,
      `Taking you there now. Everything is synchronized.`,
      `Opening the requested dashboard.`,
      `Done. You're now viewing your ${data.path || 'requested'} page.`
    ],
    send_sms: [
      result.message,
      `✅ **SMS Sent**: Delivered to **${data.contactName || 'the recipient'}**.`,
      `Message broadcasted. I'll log the reply as soon as it arrives.`,
      `Sent! Your communication is now recorded in the CRM.`
    ],
    create_lead: [
      `👤 **Lead Captured**: **${data.name || 'New Lead'}** has been added to your CRM.`,
      `New lead **${data.name || 'New Lead'}** is now in your pipeline. Success!`,
      `Success! **${data.name || 'The prospect'}** is now registered.`
    ],
    add_task: [
      `📅 **Task Scheduled**: "*${data.title || 'New Task'}*" for **${data.dueDate || 'today'}**.`,
      `Task added to your queue: "*${data.title || 'New Task'}*"`,
      `Got it! I've set a reminder for "*${data.title || 'New Task'}*".`
    ],
    complete_task: [
      `✅ **Task Completed**: Great progress, **${userName}**!`,
      `Marked as done. Keep that momentum going!`,
      `Task cleared. Your list is shrinking!`
    ]
  };

  const variations = templates[intent];
  let response = variations 
    ? variations[Math.floor(Math.random() * variations.length)]
    : (result.message || `Action completed successfully, **${userName}**. What's next?`);

  // PERSONALIZATION & TONE (v7.0)
  return applyToneAndPersonality(response, store.aiTone, store.aiPersonality);
}

/**
 * Applies tone and personality transformations to the raw response.
 * Enhanced to follow custom talking behavior instructions more robustly.
 */
function applyToneAndPersonality(text: string, tone: string, personality: string): string {
  let result = text;
  const store = useStore.getState();
  const t = (tone || 'Professional').toLowerCase();
  const p = (personality || '').toLowerCase();
  
  // 1. DYNAMIC NAME OVERRIDE (e.g., "Call me Commander")
  let userDisplayName = store.currentUser?.name?.split(' ')[0] || 'Agent';
  const nameMatch = personality.match(/call me ([a-zA-Z\s]+)/i);
  if (nameMatch && nameMatch[1]) {
    userDisplayName = nameMatch[1].trim();
    // Replace any existing "Agent" or original name with the new override
    result = result.replace(new RegExp(`\\b${store.currentUser?.name?.split(' ')[0] || 'Agent'}\\b`, 'gi'), userDisplayName);
  }

  // 2. TONE TRANSFORMATIONS (Standard)
  if (t === 'friendly') {
    if (!result.match(/[!✨🌟]/)) {
      result = result.replace(/\.$/, '!');
      const emojis = ['✨', '🌟', '🚀', '✅', '🤘'];
      result = `${result} ${emojis[Math.floor(Math.random() * emojis.length)]}`;
    }
  } else if (t === 'direct') {
    result = result.replace(/^(Right away|Got it|Taking you there|Success|Done|Ok),? /i, '')
                  .replace(/ (Success|Done|Ok|Right away)!?$/i, '')
                  .replace(/\.? Everything is synchronized\.?/, '')
                  .replace(/\.? I've opened that up for you\.?/, '');
    if (!result.trim()) result = text;
  } else if (t === 'professional') {
    result = result.replace(/Done\./g, 'Completed.')
                  .replace(/Got it!/g, 'Request acknowledged.');
  }

  // 3. PERSONALITY MODULES (Keyword-based)
  
  // PIRATE 🏴‍☠️
  if (p.includes('pirate')) {
    result = `Arrr! ${result.replace(/Yes/g, 'Aye').replace(/\./g, ', matey!').replace(/Hello/g, 'Ahoy')}`;
  } 
  
  // SASSY/WITTY 💅
  else if (p.includes('sassy') || p.includes('witty')) {
    const snark = [' Obviously.', ' You\'re welcome, by the way.', ' Easy peasy.', ' I really am a genius.', ' Don\'t mention it.'];
    result = result.replace(/\.$/, '') + snark[Math.floor(Math.random() * snark.length)];
    if (!result.includes('💅')) result += ' 💅';
  }

  // ROBOT/TECHNICAL 🤖
  else if (p.includes('robot') || p.includes('bot') || p.includes('mechanical')) {
    result = `[STATUS: READY] > ${result.toUpperCase().replace(/\./g, ' //')} [END CTRL]`;
  }

  // GENTLEMAN/FORMAL 🎩
  else if (p.includes('formal') || p.includes('gentleman') || p.includes('lady')) {
    result = result.replace(new RegExp(`\\b${userDisplayName}\\b`, 'gi'), `Sir ${userDisplayName}`)
                   .replace(/Done\./g, 'It has been attended to with the utmost priority.')
                   .replace(/!/g, '.');
  }

  // CONCISE/MINIMAL
  if (p.includes('concise') || p.includes('short') || p.includes('minimal')) {
    const firstSentence = result.split(/[\.\!\?]/)[0];
    if (firstSentence) result = firstSentence + '.';
  }

  // HUMOR/QUIPS
  if (p.includes('humor') || p.includes('funny')) {
    const quips = [' (I make this look easy, right?)', ' (Efficiency is my middle name.)', ' (Mission accomplished!)'];
    result = `${result}${quips[Math.floor(Math.random() * quips.length)]}`;
  }

  // EMOJI OVERLOAD
  if (p.includes('emoji') || p.includes('sparkle')) {
    result = `✨ ${result.split(' ').join(' 🪄 ')} 🌈`;
  }

  // 4. CUSTOM PREFIX / SUFFIX (Looking for specific instruction patterns)
  // Example: "Prefix: [Sir]" or "Suffix: [At your service]"
  const prefixMatch = personality.match(/prefix:\s*\[(.*?)\]/i);
  if (prefixMatch && prefixMatch[1]) {
    result = `${prefixMatch[1]} ${result}`;
  }

  const suffixMatch = personality.match(/suffix:\s*\[(.*?)\]/i);
  if (suffixMatch && suffixMatch[1]) {
    result = `${result} ${suffixMatch[1]}`;
  }

  return result;
}

/**
 * Specifically generates a "Did you mean?" message for ambiguous intents.
 */
export function generateAmbiguityMessage(result: any): string {
  const store = useStore.getState();
  const intentName = result.intent.name.replace(/_/g, ' ');
  const confidence = Math.round(result.confidence);
  
  const templates = [
    `I'm about ${confidence}% sure you want to **${intentName}**. Is that correct?`,
    `I think you're asking about **${intentName}** (Confidence: ${confidence}%). Should I proceed?`,
    `Wait, did you mean **${intentName}**? Just making sure before I take action.`,
    `I've got a ${confidence}% match for **${intentName}**. Is that what you're looking for?`
  ];
  
  const baseMessage = templates[Math.floor(Math.random() * templates.length)];
  return applyToneAndPersonality(baseMessage, store.aiTone, store.aiPersonality);
}
