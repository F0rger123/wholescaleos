/**
 * Local AI Response Generator
 * Generates natural language responses based on intent and task result.
 */

import { useStore } from '../../store/useStore';

export function generateResponse(intent: string, result: any): string {
  const store = useStore.getState();
  const userName = store.currentUser?.name?.split(' ')[0] || 'there';

  if (!result || !result.success && intent !== 'help' && intent !== 'unknown') {
    return `I'm sorry ${userName}, I ran into a bit of trouble with that. ${result?.message || 'Please try rephrasing your request.'}`;
  }

  switch (intent) {
    case 'show_dashboard':
      return `Right away, ${userName}. Loading your dashboard now.`;
    
    case 'show_leads':
      return `Sure thing! Opening your leads database.`;
    
    case 'show_tasks':
      return `Coming right up. Here is your task list and calendar.`;
    
    case 'create_lead':
      return `Done! I've added ${result.data?.name || 'the new lead'} to your database. You can find them in your leads list.`;

    case 'create_task':
      return `Got it. "${result.data?.title}" has been added to your tasks for ${result.data?.dueDate || 'today'}.`;

    case 'send_sms':
      return `Message sent to ${result.data?.phone || 'the contact'}. I've logged this in your communications history.`;

    case 'search_leads':
      return `Searching for "${result.data?.query}"... I've opened the leads page so you can see the results.`;

    case 'update_lead_status':
      return `Success! I've updated the lead status for you. Your pipeline view has been refreshed.`;

    case 'add_note':
      return `I've added that note to the lead's timeline. It's saved for your next follow-up.`;

    case 'remind_me':
      return `Reminder set! I've added "${result.data?.task}" to your tasks so you don't miss it.`;

    case 'what_is_my_schedule':
      return `Here is your agenda for today, ${userName}. You've got this!`;

    case 'help':
      return `I'm your WholeScale Local AI. I can help you with things like:\n- "Create lead John Doe"\n- "Add task Follow up with Sarah due Friday"\n- "Send sms to 555-1234 saying Hello"\n- "Show my dashboard"\n- "Update John's status to Hot"\nHow can I help you right now?`;

    default:
      return `Task completed successfully, ${userName}. Is there anything else I can do for you?`;
  }
}

