/**
 * Local AI Response Generator
 * Generates natural language responses based on intent and task result.
 */

import { getUserPreferences } from './memory-store';

export function generateResponse(intent: string, result: any): string {
  const prefs = getUserPreferences();
  const name = prefs.name || 'User';

  switch (intent) {
    case 'show_dashboard':
      return `Done ${name}! Navigating to your dashboard.`;
    
    case 'show_leads':
      return `Right away. Opening your leads database.`;
    
    case 'show_tasks':
      return `Sure. Taking you to your tasks and calendar.`;
    
    case 'create_lead':
      if (result.success) {
        return `I've successfully created a new lead for ${result.data?.full_name}. Anything else you need for them?`;
      }
      return `I encountered an issue creating that lead. Please check the details and try again.`;

    case 'create_task':
      if (result.success) {
        return `Task "${result.data?.title}" has been added to your schedule. I'll make sure you're reminded!`;
      }
      return `I couldn't add that task. Is there a different way you'd like me to phrased it?`;

    case 'send_sms':
      return `Message sent to ${result.data?.phone || 'the contact'}. I've logged it in the activity history.`;

    case 'search_leads':
      return `I'm searching your database for matching leads. One moment...`;

    case 'update_lead_status':
      return `Lead status updated. Your pipeline has been refreshed.`;

    case 'add_note':
      return `Note added. I've archived that for your next follow-up.`;

    case 'remind_me':
      return `Reminder set! I'll ping you at ${result.data?.time || 'the scheduled time'}.`;

    case 'what_is_my_schedule':
      return `Here is your agenda. You have some high-priority items to address today!`;

    case 'help':
      return `I am your local AI assistant. I can help you manage leads, tasks, and navigate the platform without any external dependencies. Just ask!`;

    default:
      return `Task completed. Is there anything else I can assist you with, ${name}?`;
  }
}
