export interface IntentResult {
  intent: string;
  confidence: number;
  data?: any;
  response?: string;
}

export const LOCAL_INTENTS = [
  'create_lead',
  'create_task',
  'send_sms',
  'update_status',
  'navigate',
  'general_response',
  'show_hot_leads',
  'get_analytics'
];

export function detectIntent(prompt: string): IntentResult {
  const cleanPrompt = prompt.toLowerCase().trim();

  // 1. Check Custom Training Rules First
  try {
    const savedRules = localStorage.getItem('ai_training_rules');
    const customRules = savedRules ? JSON.parse(savedRules) : [];
    
    // Exact match for custom rules gives highest confidence (0.99)
    for (const rule of customRules) {
      if (cleanPrompt.includes(rule.trigger.toLowerCase())) {
        return applyRuleAction(rule.action, cleanPrompt);
      }
    }
  } catch (e) {
    console.error('Error parsing custom training rules', e);
  }

  // 2. Complex Regex patterns for core CRM features
  
  // Create Lead: "add a lead named john doe" or "create lead for 123 main st"
  const createLeadMatch = cleanPrompt.match(/(?:add|create|new) (?:a )?lead (?:named |for )?(.*)/);
  if (createLeadMatch && createLeadMatch[1]) {
    const dataStr = createLeadMatch[1];
    return {
      intent: 'create_lead',
      confidence: 0.85,
      data: { name: extractNameOrAddress(dataStr) }
    };
  }

  // Create Task: "remind me to call bob tomorrow" or "create task to sign contract"
  const createTaskMatch = cleanPrompt.match(/(?:remind me to|create (?:a )?task to|add (?:a )?task to) (.*)/);
  if (createTaskMatch && createTaskMatch[1]) {
    return {
      intent: 'create_task',
      confidence: 0.85,
      data: { title: createTaskMatch[1] }
    };
  }

  // Send SMS: "text john hello" or "send sms to 555-5555 saying hi"
  const sendSmsMatch = cleanPrompt.match(/(?:text|send (?:an )?sms to|message) ([^ ]+) (?:saying |that )?(.*)/);
  if (sendSmsMatch && sendSmsMatch[1] && sendSmsMatch[2]) {
    return {
      intent: 'send_sms',
      confidence: 0.9,
      data: { target: sendSmsMatch[1], message: sendSmsMatch[2] }
    };
  }

  // Navigate: "go to dashboard" or "open settings"
  const navMatch = cleanPrompt.match(/(?:go to|open|show me) (dashboard|leads|tasks|calendar|settings|analytics|sms)/);
  if (navMatch && navMatch[1]) {
    const dest = navMatch[1];
    let path = '/';
    if (dest !== 'dashboard') path = `/${dest}`;
    return {
      intent: 'navigate',
      confidence: 0.9,
      data: { path }
    };
  }

  // Update Status: "mark john as qualified"
  const updateMatch = cleanPrompt.match(/(?:mark|set|update) (.*) as (new|contacted|qualified|negotiating|closed-won|closed-lost)/);
  if (updateMatch && updateMatch[1] && updateMatch[2]) {
    return {
      intent: 'update_status',
      confidence: 0.8,
      data: { targetName: updateMatch[1], newStatus: updateMatch[2] }
    };
  }

  // Analytics/Reporting
  if (cleanPrompt.includes('analytics') || cleanPrompt.includes('report') || cleanPrompt.includes('performance')) {
    return { intent: 'get_analytics', confidence: 0.8 };
  }
  
  if (cleanPrompt.includes('hot lead') || cleanPrompt.includes('best lead')) {
    return { intent: 'show_hot_leads', confidence: 0.85 };
  }

  // 3. Very fuzzy fallback matching
  if (cleanPrompt.includes('lead')) return { intent: 'navigate', confidence: 0.5, data: { path: '/leads' } };
  if (cleanPrompt.includes('task')) return { intent: 'navigate', confidence: 0.5, data: { path: '/tasks' } };
  
  // 4. Default Unknown
  return {
    intent: 'unknown',
    confidence: 0.1
  };
}

function applyRuleAction(action: string, prompt: string): IntentResult {
  let mappedIntent = 'general_response';

  if (action === 'navigate_tasks') return { intent: 'navigate', confidence: 0.99, data: { path: '/tasks' } };
  if (action === 'navigate_settings') return { intent: 'navigate', confidence: 0.99, data: { path: '/settings' } };
  if (action === 'navigate_calendar') return { intent: 'navigate', confidence: 0.99, data: { path: '/calendar' } };
  if (action === 'navigate_dashboard') return { intent: 'navigate', confidence: 0.99, data: { path: '/' } };
  if (action === 'navigate_leads') return { intent: 'navigate', confidence: 0.99, data: { path: '/leads' } };
  if (action === 'navigate_sms') return { intent: 'navigate', confidence: 0.99, data: { path: '/sms' } };
  if (action === 'navigate_analytics') return { intent: 'navigate', confidence: 0.99, data: { path: '/analytics' } };
  if (action === 'show_hot_leads') return { intent: 'show_hot_leads', confidence: 0.99 };
  if (action === 'create_task') return { intent: 'create_task', confidence: 0.95, data: { title: prompt } };
  if (action === 'send_sms') return { intent: 'send_sms', confidence: 0.95, data: { target: 'Unknown' } };

  return { intent: mappedIntent, confidence: 0.99, data: { rawAction: action } };
}

function extractNameOrAddress(str: string) {
  // Simple heuristic: if it has numbers, it's probably an address
  if (/\d/.test(str)) return str;
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
