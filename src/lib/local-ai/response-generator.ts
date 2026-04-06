/**
 * OS Bot Response Generator
 * Generates natural language responses based on intent and task result.
 */

import { useStore } from '../../store/useStore';

export function generateResponse(intent: string, result: any): string {
  const store = useStore.getState();
  const userName = store.currentUser?.name?.split(' ')[0] || 'there';

  if (!result || (!result.success && !['help', 'unknown', 'general_response'].includes(intent))) {
    const errorMsgs = [
      `I'm sorry ${userName}, I hit a snag with that. ${result?.message || 'Try rephrasing?'}`,
      `Ouch, something went wrong. ${result?.message || 'Could you try that again?'}`,
      `I couldn't quite complete that, ${userName}. ${result?.message || ''}`
    ];
    return errorMsgs[Math.floor(Math.random() * errorMsgs.length)];
  }

  const successMsgs: Record<string, string[]> = {
    show_dashboard: [
      `Right away, ${userName}. Loading your dashboard now.`,
      `Opening the dashboard for you.`,
      `Here's a bird's eye view of your business.`
    ],
    show_leads: [
      `Sure thing! Opening your leads database.`,
      `Heading over to the CRM.`,
      `Let's look at those prospects.`
    ],
    show_tasks: [
      `Coming right up. Here is your task list and calendar.`,
      `Opening your agenda for you.`,
      `Let's see what's on your plate.`
    ],
    create_lead: [
      `Done! I've added ${result.data?.name || 'the new lead'} to your database.`,
      `Lead created successfully. Time to follow up!`,
      `Got it. ${result.data?.name || 'The lead'} is now in your pipeline.`
    ],
    create_task: [
      `Got it. "${result.data?.title}" has been added to your tasks.`,
      `Task created! I'll remind you about "${result.data?.title}".`,
      `Added to your to-do list.`
    ],
    send_sms: [
      `Message sent! I've logged this in your communications history.`,
      `SMS delivered to ${result.data?.phone || 'the contact'}.`,
      `Sent! Check the communications tab for the log.`
    ],
    search_leads: [
      `Searching for "${result.data?.query}"... Found some matches for you.`,
      `Looking up "${result.data?.query}" in your database.`,
      `Here is what I found for "${result.data?.query}".`
    ],
    update_lead_status: [
      `Success! I've updated the lead status for you.`,
      `Status changed. Your pipeline has been refreshed.`,
      `Updated! Momentum is key.`
    ],
    what_is_my_schedule: [
      `Here is your agenda for today, ${userName}. You've got this!`,
      `Checking your schedule... looks like a productive day!`,
      `Here's what your day looks like.`
    ]
  };

  if (intent === 'help') {
    return `I'm **OS Bot**, your built-in AI assistant. I'm faster, free, and deeply integrated.

Try saying:
- "Add lead John Smith from Austin"
- "Create task Call John tomorrow"
- "Send SMS to 555-1234 saying Hello"
- "Show my dashboard"
- "Update John's status to Qualified"

How can I help you right now?`;
  }

  if (intent === 'unknown') {
    return `I'm not exactly sure how to do that yet, ${userName}. Could you try rephrasing? I'm good with leads, tasks, and SMS!`;
  }

  const variations = successMsgs[intent];
  if (variations) {
    return variations[Math.floor(Math.random() * variations.length)];
  }

  return `Task completed successfully, ${userName}. What else can I do for you?`;
}


