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

  // 1. Help
  if (normalized.match(/^(help|what can you do|how do i use|available commands|help me)/)) {
    return { intent: 'help', entities: {}, confidence: 0.95 };
  }

  // 2. Navigation / Show
  if (normalized.match(/^(show|go to|take me to|open|view)\s+(dashboard|home|main)/)) {
    return { intent: 'show_dashboard', entities: {}, confidence: 0.95 };
  }
  if (normalized.match(/^(show|go to|take me to|open|view)\s+(leads|contacts|prospects|database)/)) {
    return { intent: 'show_leads', entities: {}, confidence: 0.95 };
  }
  if (normalized.match(/^(show|go to|take me to|open|view)\s+(tasks|todo|calendar|schedule|agenda|plans)/)) {
    return { intent: 'show_tasks', entities: {}, confidence: 0.95 };
  }

  // 3. Create Lead
  // Pattern: create lead [Name] email [Email] phone [Phone] company [Company]
  const leadMatch = normalized.match(/(?:create|add|new)\s+(?:lead|contact)\s+([^@\d\n]+?)(?:\s+email\s+([\w.@+-]+))?(?:\s+phone\s+([\d+-]+))?(?:\s+company\s+(.+))?$/i);
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

  // 4. Create Task
  // Pattern: create task [Title] due [Date] priority [Priority]
  const taskMatch = normalized.match(/(?:create|add|new)\s+task\s+([\w\s]+?)(?:\s+due\s+([\w\s\d,/-]+))?(?:\s+priority\s+(low|medium|high|urgent))?$/i);
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

  // 5. Send SMS
  // Pattern: send sms to [Phone/Name] saying [Message]
  const smsMatch = normalized.match(/(?:send|message|sms)\s+(?:to\s+)?([\d+-]+|[\w\s]+?)\s+(?:saying|content|message)\s+(.*)/i);
  if (smsMatch) {
    return {
      intent: 'send_sms',
      entities: {
        target: smsMatch[1]?.trim(),
        message: smsMatch[2]?.trim()
      },
      confidence: 0.9
    };
  }

  // 6. Search Leads
  const searchMatch = normalized.match(/(?:search|find|find lead|look up|search for)\s+([\w\s]+)/i);
  if (searchMatch) {
    return {
      intent: 'search_leads',
      entities: { query: searchMatch[1]?.trim() },
      confidence: 0.85
    };
  }

  // 7. Update Lead Status
  const statusMatch = normalized.match(/(?:update|change)\s+(?:lead\s+)?status\s+(?:to\s+)?(new|hot|warm|cold|closed|contacted|qualified|negotiating|lost)\s+(?:for|of)\s+([\w\s]+)/i);
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

  // 8. Add Note
  const noteMatch = normalized.match(/(?:add|write|save)\s+note\s+(?:to|for)\s+([\w\s]+)\s+(?:saying|content)\s+(.*)/i);
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

  // 9. Remind Me
  const remindMatch = normalized.match(/(?:remind|reminder|set reminder)\s+(?:me\s+)?(?:to\s+)?(.*)\s+(?:at|on|tomorrow|today|in)\s+(.*)/i);
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

  // 10. Schedule check
  if (normalized.match(/^(what is|show|tell me|view)\s+(my|today's|this week's)\s+(schedule|calendar|agenda|plans)/i)) {
    return { intent: 'what_is_my_schedule', entities: {}, confidence: 0.95 };
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

