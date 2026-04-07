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
  const { sentiment } = getAIContext();

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
    'small_talk'
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

  // Handle errors
  if (!result || !result.success) {
    if (intent === 'unknown') {
      return `I'm not quite sure how to handle that request yet, **${userName}**. I'm currently optimized for **Leads, Tasks, Emails, and SMS**. Try rephrasing?`;
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
 */
function applyToneAndPersonality(text: string, tone: string, personality: string): string {
  let result = text;
  const t = (tone || 'Professional').toLowerCase();
  const p = (personality || '').toLowerCase();

  // Tone Adjustments
  if (t === 'friendly') {
    // Add emojis and enthusiasm
    if (!result.match(/[!✨🌟]/)) {
      result = result.replace(/\.$/, '!');
      const emojis = ['✨', '🌟', '🚀', '✅', '🤘'];
      result = `${result} ${emojis[Math.floor(Math.random() * emojis.length)]}`;
    }
  } else if (t === 'direct') {
    // Strip conversational filler for speed/efficiency
    result = result.replace(/^(Right away|Got it|Taking you there|Success|Done|Ok),? /i, '')
                  .replace(/ (Success|Done|Ok|Right away)!?$/i, '')
                  .replace(/\.? Everything is synchronized\.?/, '')
                  .replace(/\.? I've opened that up for you\.?/, '');
    
    // Ensure it's not empty after stripping
    if (!result.trim()) result = text;
  } else if (t === 'professional') {
    // Standard professional phrasing (No active changes usually needed as templates are pro)
    result = result.replace(/Done\./g, 'Completed.')
                  .replace(/Got it!/g, 'Request acknowledged.');
  }

  // Multi-trait personality injection (Keyword-based)
  if (p.includes('pirate')) {
    result = `Arrr! ${result.replace(/Yes/g, 'Aye').replace(/\./g, ', matey!')}`;
  } else if (p.includes('concise') || p.includes('short')) {
    result = result.split('.')[0] + '.';
  } else if (p.includes('humor') || p.includes('funny')) {
    const quips = [' (I make this look easy, right?)', ' (Efficiency is my middle name.)', ' (Mission accomplished!)'];
    result = `${result}${quips[Math.floor(Math.random() * quips.length)]}`;
  }

  return result;
}
