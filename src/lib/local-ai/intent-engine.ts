/**
 * OS Bot Intent Engine (v2.0)
 * Handles complex intent recognition and entity extraction locally.
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

  // 3. Create Lead (Enhanced)
  // Patterns: 
  // "add lead John Smith"
  // "add lead John Smith from California"
  // "add lead john.smith@email.com"
  // "add lead 555-1234"
  const leadPatterns = [
    // Full: add lead [Name] from [Location]
    /(?:create|add|new)\s+(?:lead|contact)\s+([^@\d\n]+?)\s+from\s+([^@\d\n]+)/i,
    // Name only: add lead [Name]
    /(?:create|add|new)\s+(?:lead|contact)\s+([^@\d\n]+)$/i,
    // Email: add lead [Email]
    /(?:create|add|new)\s+(?:lead|contact)\s+([\w.@+-]+)$/i,
    // Phone: add lead [Phone]
    /(?:create|add|new)\s+(?:lead|contact)\s+([\d+-]+)$/i
  ];

  for (const pattern of leadPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const entities: any = {};
      const val = match[1]?.trim();
      
      if (val.includes('@')) {
        entities.email = val;
        entities.name = val.split('@')[0];
      } else if (val.match(/^[\d+-]+$/)) {
        entities.phone = val;
        entities.name = 'New Contact';
      } else {
        entities.name = val;
      }

      if (match[2]) {
        entities.location = match[2].trim();
        entities.propertyAddress = entities.location;
      }

      return { intent: 'create_lead', entities, confidence: 0.9 };
    }
  }

  // 4. Create Task (Enhanced)
  // Pattern: create task [Title] tomorrow/today/next week/etc
  const taskPatterns = [
    /(?:create|add|new|set)\s+task\s+(.+?)(?:\s+(tomorrow|today|next week|on Monday|on Tuesday|on Wednesday|on Thursday|on Friday|on Saturday|on Sunday))?$/i,
    /(?:remind|reminder|set reminder)\s+(?:me\s+)?(?:to\s+)?(.+?)(?:\s+(tomorrow|today|next week|on Monday|on Tuesday|on Wednesday|on Thursday|on Friday|on Saturday|on Sunday))?$/i
  ];

  for (const pattern of taskPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        intent: 'create_task',
        entities: {
          title: match[1]?.trim(),
          dueDateRaw: match[2]?.trim() || 'today',
          priority: 'medium'
        },
        confidence: 0.9
      };
    }
  }

  // 5. Send SMS (Enhanced)
  // Pattern: send SMS to [Phone/Name] saying [Message]
  const smsPatterns = [
    /(?:send|message|sms)\s+(?:to\s+)?([\d+-]+|[\w\s]+?)\s+(?:saying|content|message)\s+(.*)/i,
    /(?:text|sms)\s+([\d+-]+|[\w\s]+?)\s+(.*)/i
  ];

  for (const pattern of smsPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        intent: 'send_sms',
        entities: {
          target: match[1]?.trim(),
          message: match[2]?.trim()
        },
        confidence: 0.95
      };
    }
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
  const statusMatch = normalized.match(/(?:update|change)\s+(?:lead\s+)?status\s+(?:to\s+)?(new|hot|warm|cold|closed|contacted|qualified|negotiating|lost|closed-won|closed-lost)\s+(?:for|of)\s+([\w\s]+)/i);
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
  'what_is_my_schedule',
  'help'
];


