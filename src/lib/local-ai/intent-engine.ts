/**
 * Local AI Intent Engine
 * Handles intent recognition and entity extraction locally.
 */

export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

export function recognizeIntent(text: string): IntentResult {
  const normalized = text.toLowerCase().trim();

  // 1. Navigation / Show
  if (normalized.match(/^(show|go to|take me to|open)\s+(dashboard|home)/)) {
    return { intent: 'show_dashboard', entities: {}, confidence: 0.95 };
  }
  if (normalized.match(/^(show|go to|take me to|open)\s+(leads|contacts|prospects)/)) {
    return { intent: 'show_leads', entities: {}, confidence: 0.95 };
  }
  if (normalized.match(/^(show|go to|take me to|open)\s+(tasks|todo|calendar|schedule)/)) {
    return { intent: 'show_tasks', entities: {}, confidence: 0.95 };
  }

  // 2. Create Lead
  const leadMatch = normalized.match(/(?:create|add|new)\s+(?:lead|contact)\s+([\w\s]+)(?:\s+email\s+([\w.@+-]+))?(?:\s+phone\s+([\d+-]+))?(?:\s+company\s+([\w\s]+))?/);
  if (leadMatch) {
    return {
      intent: 'create_lead',
      entities: {
        name: leadMatch[1]?.trim(),
        email: leadMatch[2],
        phone: leadMatch[3],
        company: leadMatch[4]?.trim()
      },
      confidence: 0.9
    };
  }

  // 3. Create Task
  const taskMatch = normalized.match(/(?:create|add|new)\s+task\s+([\w\s]+)(?:\s+due\s+([\w\s\d,/-]+))?(?:\s+priority\s+(low|medium|high))?/);
  if (taskMatch) {
    return {
      intent: 'create_task',
      entities: {
        title: taskMatch[1]?.trim(),
        dueDate: taskMatch[2]?.trim(),
        priority: taskMatch[3] || 'medium'
      },
      confidence: 0.9
    };
  }

  // 4. Send SMS
  const smsMatch = normalized.match(/(?:send|message|sms)\s+(?:to\s+)?([\d+-]+)\s+(?:saying\s+)?(.*)/);
  if (smsMatch) {
    return {
      intent: 'send_sms',
      entities: {
        phone: smsMatch[1],
        message: smsMatch[2]?.trim()
      },
      confidence: 0.9
    };
  }

  // 5. Search Leads
  const searchMatch = normalized.match(/(?:search|find|find lead|look up)\s+([\w\s]+)/);
  if (searchMatch) {
    return {
      intent: 'search_leads',
      entities: { query: searchMatch[1]?.trim() },
      confidence: 0.85
    };
  }

  // 6. Update Lead Status
  const statusMatch = normalized.match(/(?:update|change)\s+(?:lead\s+)?status\s+(?:to\s+)?(new|hot|warm|cold|closed)\s+(?:for\s+)?([\w\s]+)/);
  if (statusMatch) {
    return {
      intent: 'update_lead_status',
      entities: {
        status: statusMatch[1],
        leadName: statusMatch[2]?.trim()
      },
      confidence: 0.85
    };
  }

  // 7. Add Note
  const noteMatch = normalized.match(/(?:add|write)\s+note\s+(?:to\s+)?([\w\s]+)\s+(?:saying\s+)?(.*)/);
  if (noteMatch) {
    return {
      intent: 'add_note',
      entities: {
        leadName: noteMatch[1]?.trim(),
        note: noteMatch[2]?.trim()
      },
      confidence: 0.85
    };
  }

  // 8. Remind Me
  const remindMatch = normalized.match(/(?:remind|reminder|set reminder)\s+(?:me\s+)?(?:to\s+)?(.*)\s+(?:at|on|tomorrow|today|in)\s+(.*)/);
  if (remindMatch) {
    return {
      intent: 'remind_me',
      entities: {
        task: remindMatch[1]?.trim(),
        time: remindMatch[2]?.trim()
      },
      confidence: 0.85
    };
  }

  // 9. What is my schedule
  if (normalized.match(/^(what is|show|tell me|view)\s+(my|today's|this week's)\s+(schedule|calendar|agenda|plans)/)) {
    return { intent: 'what_is_my_schedule', entities: {}, confidence: 0.95 };
  }

  // 10. Help
  if (normalized.match(/^(help|what can you do|how do I use|available commands)/)) {
    return { intent: 'help', entities: {}, confidence: 0.95 };
  }

  return { intent: 'unknown', entities: {}, confidence: 0 };
}
export const LOCAL_INTENTS = [
  'create_lead',
  'create_task',
  'send_sms',
  'show_dashboard',
  'show_leads',
  'show_tasks',
  'search_leads',
  'update_lead_status',
  'add_note',
  'remind_me',
  'what_is_my_schedule',
  'help'
];
