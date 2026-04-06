/**
 * OS Bot Response Generator (v4.0)
 * Generates high-impact, professional responses for property management & CRM.
 */

import { useStore } from '../../store/useStore';

export interface ResponseResult {
  text: string;
  intent: string;
  systemLog?: string;
}

export function generateResponse(intent: string, result: any): string {
  const store = useStore.getState();
  const userName = store.currentUser?.name?.split(' ')[0] || 'Agent';

  // Specific "Help" response
  if (intent === 'help') {
    return `### 🤖 OS Bot Capabilities
I'm your built-in intelligence engine, designed for speed and precision.

**Try these commands:**
- 📧 **Email**: "Email Sarah about the contract"
- 💬 **SMS**: "Text John saying the offer is ready"
- 👤 **CRM**: "Add lead Mike Ross from Houston"
- ✅ **Tasks**: "Remind me to follow up tomorrow at 2pm"
- 📅 **Navigation**: "Show my calendar" or "Show my tasks"

How can I assist your business right now, **${userName}**?`;
  }

  // Handle errors
  if (!result || !result.success) {
    if (intent === 'unknown') {
      return `I'm not quite sure how to handle that request yet, **${userName}**. I'm currently optimized for **Leads, Tasks, Emails, and SMS**. Try rephrasing?`;
    }
    return `I encountered an issue while trying to process that **${intent.replace('_', ' ')}** request. ${result?.message || 'Please check your connection and try again.'}`;
  }

  const data = result.data || {};

  // Professional Templates
  const templates: Record<string, string[]> = {
    show_tasks: [
      `Right away, **${userName}**. I've opened your **Agendas & Tasks** view.`,
      `Loading your task list. Your schedule is now synchronized.`,
      `Opening your task manager, **${userName}**.`
    ],
    show_calendar: [
      `Opening your **Google Calendar** integration now.`,
      `Redirecting to your schedule view.`,
      `Here is your current agenda and calendar events.`
    ],
    show_leads: [
      `Accessing the **CRM Lead Database** for you.`,
      `Opening your lead pipeline.`,
      `Let's take a look at your active prospects.`
    ],
    send_sms: [
      `✅ **SMS Sent**: Message delivered to **${data.contactName || data.phone}**.`,
      `Message broadcasted successfully to **${data.contactName || 'the recipient'}**.`,
      `Sent! This interaction has been logged to the lead's timeline.`
    ],
    email_compose: [
      `📧 **Compose Ready**: Opening an email draft for **${data.contactName || data.email}**.`,
      `Email editor opened. Subject: "*${data.subject || 'Follow up'}*"`,
      `Directing you to the email composer for **${data.contactName || 'the contact'}**.`
    ],
    create_lead: [
      `👤 **Lead Captured**: **${data.name}** has been added to your CRM.`,
      `New lead **${data.name}** is now in your pipeline. Success!`,
      `Got it. I've initialized a new lead profile for **${data.name}**.`
    ],
    create_task: [
      `📅 **Task Scheduled**: "*${data.title}*" for **${data.dueDate || 'today'}**.`,
      `Task added to your queue: "*${data.title}*"`,
      `Reminder set! I'll keep you on track for "*${data.title}*".`
    ],
    complete_task: [
      `✅ **Task Completed**: Great progress, **${userName}**!`,
      `Marked as done. Keep that momentum going!`,
      `Task updated to complete. Your list is shrinking!`
    ]
  };

  const variations = templates[intent];
  if (variations) {
    return variations[Math.floor(Math.random() * variations.length)];
  }

  return `Action completed successfully, **${userName}**. What's next on our agenda?`;
}
