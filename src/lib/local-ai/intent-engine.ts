/**
 * OS Bot Intent Engine (v3.0)
 * Handles complex intent recognition, entity extraction, and CRM contact mapping.
 */

export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

/**
 * Try to resolve a contact name to a phone number from the CRM leads list.
 * This is called when the user says "text Luke" or "send sms to John".
 */
function resolveContactFromLeads(name: string, leads: any[]): { phone?: string; fullName?: string } {
  if (!leads || leads.length === 0) return {};
  
  try {
    let lowerName = name.toLowerCase().trim();
    
    // Remove filler words common in speech-to-text
    lowerName = lowerName.replace(/\b(for me|real quick|please|about|regarding|someone named|can you|the lead|my contact)\b/gi, '').trim();
    
    if (!lowerName) return {};
    
    // Try exact match first, then partial match
    const exactMatch = leads.find((l: any) => 
      l.name?.toLowerCase() === lowerName ||
      l.name?.toLowerCase().split(' ')[0] === lowerName // first name match
    );
    
    if (exactMatch) {
      return { 
        phone: exactMatch.phone || exactMatch.phoneNumber || undefined, 
        fullName: exactMatch.name 
      };
    }
    
    // Fuzzy: partial name contains
    const partialMatch = leads.find((l: any) =>
      l.name?.toLowerCase().includes(lowerName) ||
      lowerName.includes(l.name?.toLowerCase().split(' ')[0])
    );
    
    if (partialMatch) {
      return { 
        phone: partialMatch.phone || partialMatch.phoneNumber || undefined, 
        fullName: partialMatch.name 
      };
    }
  } catch (err) {
    console.error('[IntentEngine] Failed to resolve contact:', err);
  }
  return {};
}

export function recognizeIntent(text: string, leads: any[] = []): IntentResult {
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

  // 5. Send SMS (Enhanced with CRM contact mapping)
  const smsPatterns = [
    // "text [Name/Phone] saying [Message]"
    /(?:send\s+(?:sms|text|message)\s+to|text|message|sms)\s+(\+?[\d\s-]{7,})\s+(?:saying|content|message|with)\s+(.*)/i,
    // "text [Name] saying [Message]"
    /(?:send\s+(?:sms|text|message)\s+to|text|sms|message)\s+([\w\s]+?)\s+(?:saying|content|message|with)\s+(.*)/i,
    // "text [Name] for me" (no explicit message)
    /(?:text|message|sms)\s+([\w\s]+?)\s+(?:for\s+me|real quick|about\s+.+)/i,
    // "text [Phone] [Message]" (no keyword like 'saying')
    /(?:send\s+(?:sms|text|message)\s+to|text|sms)\s+(\+?[\d\s-]{7,})\s+(.*)/i,
    // "text [Name] [Message]" (shortest match, must have at least some text after name)
    /(?:send\s+(?:sms|text|message)\s+to|text|sms|message)\s+([\w]+)\s+([\w].*)/i
  ];

  for (const pattern of smsPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const targetRaw = match[1]?.trim();
      const messageRaw = match[2]?.trim() || '';
      
      const entities: any = {
        target: targetRaw,
        message: messageRaw
      };
      
      // Determine if target is a phone or a name
      const isPhone = /^[\d\s+()-]{7,}$/.test(targetRaw);
      
      if (isPhone) {
        entities.phone = targetRaw.replace(/[\s()-]/g, '');
      } else {
        // Try to resolve the name to a phone number from CRM
        const contact = resolveContactFromLeads(targetRaw, leads);
        if (contact.phone) {
          entities.phone = contact.phone;
          entities.resolvedName = contact.fullName || targetRaw;
          entities.crmResolved = true;
        } else {
          entities.contactName = targetRaw;
          entities.crmResolved = false;
        }
      }
      
      return {
        intent: 'send_sms',
        entities,
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
