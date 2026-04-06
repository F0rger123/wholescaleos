/**
 * OS Bot Intent Engine (v5.0 - Professional CRM Edition)
 * Optimized for real estate wholesaling and high-speed property management.
 */

export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

/**
 * Enhanced Entity Extraction logic with context-aware anchors
 */
const ENTITY_REGEX = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g,
  date: /\b(tomorrow|today|tonight|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?)\b/gi,
  time: /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock)?|at \d{1,2}(?::\d{2})?)\b/gi,
  price: /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
};

function extractEntities(text: string): Record<string, any> {
  const entities: any = {};
  
  const emails = text.match(ENTITY_REGEX.email);
  if (emails) entities.email = emails[0];
  
  const phones = text.match(ENTITY_REGEX.phone);
  if (phones) entities.phone = phones[0].replace(/[^\d+]/g, '');
  
  const dates = text.match(ENTITY_REGEX.date);
  if (dates) entities.date = dates[0].toLowerCase();
  
  const times = text.match(ENTITY_REGEX.time);
  if (times) entities.time = times[0].toLowerCase();

  const prices = text.match(ENTITY_REGEX.price);
  if (prices) entities.price = parseFloat(prices[0].replace(/[$,]/g, ''));
  
  return entities;
}

/**
 * Intelligent Lead Name Extractor
 * Attempts to pull the name relative to keywords like "add lead" or "create lead"
 */
function extractLeadName(text: string): string | null {
  const normalized = text.toLowerCase();
  const anchors = ["add lead", "create lead", "new lead", "add person"];
  
  for (const anchor of anchors) {
    if (normalized.includes(anchor)) {
      const remaining = text.substring(normalized.indexOf(anchor) + anchor.length).trim();
      // Stop at "from", "at", "saying", "@", or digits
      const namePart = remaining.split(/\b(from|at|saying|for|with|in)\b|(?=@|\d)/i)[0].trim();
      if (namePart && namePart.length > 2) return namePart;
    }
  }
  return null;
}

/**
 * Intelligent Location Extractor
 * Pulls location after "from" or "at"
 */
function extractLocation(text: string): string | null {
  const fromMatch = text.match(/\b(?:from|at|in|near)\s+([^,.]+?)(?=\b(?:at|on|for|with|by|to)\b|$)/i);
  return fromMatch ? fromMatch[1].trim() : null;
}

function resolveContactFromLeads(name: string, leads: any[]): { phone?: string; fullName?: string; email?: string; id?: string } {
  if (!leads || leads.length === 0 || !name) return {};
  
  const lowerName = name.toLowerCase().trim();
  const exactMatch = leads.find((l: any) => 
    l.name?.toLowerCase() === lowerName ||
    l.name?.toLowerCase().split(' ')[0] === lowerName
  );
  
  if (exactMatch) {
    return { 
      id: exactMatch.id,
      phone: exactMatch.phone || exactMatch.phoneNumber, 
      fullName: exactMatch.name,
      email: exactMatch.email
    };
  }
  
  const partialMatch = leads.find((l: any) => l.name?.toLowerCase().includes(lowerName));
  if (partialMatch) {
    return { 
      id: partialMatch.id,
      phone: partialMatch.phone || partialMatch.phoneNumber, 
      fullName: partialMatch.name,
      email: partialMatch.email
    };
  }
  
  return {};
}

export function recognizeIntent(text: string, leads: any[] = []): IntentResult {
  const normalized = text.toLowerCase().trim();
  const entities = extractEntities(text);
  
  // 1. Navigation / Show (Prioritized)
  if (normalized.match(/\b(show|open|view|go to|take me to|navigate to)\b.*\b(tasks|todo|reminders|items)\b/)) {
    if (normalized.includes('completed')) return { intent: 'show_completed_tasks', entities, confidence: 0.95 };
    return { intent: 'show_tasks', entities, confidence: 0.95 };
  }
  if (normalized.match(/\b(show|open|view|go to|take me to|navigate to)\b.*\b(calendar|schedule|agenda|events|today)\b/)) {
    return { intent: 'show_calendar', entities, confidence: 0.95 };
  }
  if (normalized.match(/\b(show|open|view|go to|take me to|navigate to)\b.*\b(leads|contacts|database|crm|pipeline)\b/)) {
    return { intent: 'show_leads', entities, confidence: 0.95 };
  }
  if (normalized.match(/\b(show|open|view|go to|take me to|navigate to)\b.*\b(dashboard|home|main)\b/)) {
    return { intent: 'show_dashboard', entities, confidence: 0.95 };
  }
  if (normalized.match(/\b(show|open|view|go to|take me to|navigate to)\b.*\b(settings|profile|account)\b/)) {
    return { intent: 'show_settings', entities, confidence: 0.95 };
  }

  // 2. Send SMS (Enhanced with Contact Lookup)
  const smsMatch = normalized.match(/(?:text|message|sms)\s+([\w\s]+?)\s+(?:saying|content|message|with|that)\s+(.*)/i) ||
                  normalized.match(/(?:send\s+sms\s+to|send\s+text\s+to)\s+([\w\s]+?)\s+(?:saying|content|message|with|that)\s+(.*)/i);
  if (smsMatch) {
    const target = smsMatch[1].trim();
    const contact = resolveContactFromLeads(target, leads);
    return {
      intent: 'send_sms',
      entities: {
        ...entities,
        phone: contact.phone || entities.phone || target,
        contactName: contact.fullName || target,
        leadId: contact.id,
        message: smsMatch[2].trim()
      },
      confidence: 0.95
    };
  }

  // 3. Create Lead (Major Overhaul)
  if (normalized.match(/\b(create|add|new)\s+lead\b/i)) {
    const name = extractLeadName(text);
    const location = extractLocation(text);
    return {
      intent: 'create_lead',
      entities: {
        ...entities,
        name: name || entities.email || 'New Opportunity',
        location: location || entities.address || '',
        notes: `Extracted via OS Bot from: "${text}"`
      },
      confidence: 0.95
    };
  }

  // 4. Create Task / Reminder (Enhanced Date/Time Integration)
  const taskMatch = normalized.match(/(?:create|add|new|set|remind\s+me\s+to)\s+(?:task|reminder)?\s?(.+?)(?:\s+(tomorrow|today|at|on\s+[\w\s]+))?$/i);
  if (taskMatch || normalized.includes('remind me to')) {
    const taskPhrase = taskMatch ? taskMatch[1].trim() : normalized.replace('remind me to', '').trim();
    // Clean phrase of date/time info if we grabbed it in entities
    let cleanedTitle = taskPhrase.split(/\b(tomorrow|today|at|on)\b/i)[0].trim();
    
    return {
      intent: 'create_task',
      entities: {
        ...entities,
        title: cleanedTitle,
        dueDate: entities.date || 'today',
        dueTime: entities.time || null
      },
      confidence: 0.9
    };
  }

  // 5. Email Compose (Context Focused)
  const emailMatch = normalized.match(/(?:email|mail)\s+([\w\s@.]+?)\s+(?:about|regarding|that|with)\s+(.*)/i);
  if (emailMatch) {
    const target = emailMatch[1].trim();
    const contact = resolveContactFromLeads(target, leads);
    return {
      intent: 'email_compose',
      entities: {
        ...entities,
        email: contact.email || entities.email || target,
        contactName: contact.fullName || target,
        subject: emailMatch[2].trim()
      },
      confidence: 0.9
    };
  }

  // 6. Complete / Manage Tasks
  if (normalized.match(/\b(mark|complete|done|finish)\b.*\btask\b/)) {
    return { intent: 'complete_task', entities, confidence: 0.9 };
  }
  if (normalized.match(/\b(show|view|see)\b.*\bcompleted\b.*\b(tasks|items)\b/)) {
    return { intent: 'show_completed_tasks', entities, confidence: 0.95 };
  }

  // 7. General Knowledge / Help
  if (normalized.match(/^(help|what can you do|how do i use|tell me about|what is)/) || normalized === 'help') {
    return { intent: 'help', entities: {}, confidence: 0.95 };
  }

  return { intent: 'unknown', entities: {}, confidence: 0 };
}

export const LOCAL_INTENTS = [
  'create_lead',
  'create_task',
  'send_sms',
  'email_compose',
  'show_leads',
  'show_tasks',
  'show_completed_tasks',
  'show_calendar',
  'show_dashboard',
  'show_settings',
  'complete_task',
  'help'
];
