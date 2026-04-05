import { Node, Edge } from '@xyflow/react';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Lead Gen' | 'AI' | 'Comms' | 'CRM' | 'Email' | 'Sales';
  nodes: Node[];
  edges: Edge[];
}

export const automationTemplates: AutomationTemplate[] = [
  {
    id: 'welcome-sms',
    name: 'New Lead → Send Welcome SMS',
    description: 'Instantly send an AI-powered welcome SMS when a new lead lands in your CRM.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead Created', type: 'trigger', triggerType: 'new_lead', description: 'Triggers on every new lead' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send Welcome SMS', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! 👋 This is {{agent_name}} with WholeScale. I saw you were looking at homes in {{city}}. How can I help?', description: 'Sends automated welcome text' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--t-primary)' } }]
  },
  {
    id: 'task-overdue-notify',
    name: 'Task Overdue → Notify Team',
    description: 'Alert the lead agent or team lead immediately when a critical task becomes overdue.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Task Is Overdue', type: 'trigger', triggerType: 'task_overdue', description: 'Triggers on status = overdue' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Notify Team Lead', type: 'action', actionType: 'notify', message: 'CRITICAL: Task "{{title}}" for lead {{name}} is OVERDUE.', description: 'Sends push notification' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'high-score-assign',
    name: 'High Lead Score → Assign to Top Agent',
    description: 'Automatically route high-intent leads (Score > 80) to your best closing agent.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Lead Score >= 80', type: 'trigger', triggerType: 'high_score', threshold: 80, description: 'Triggers on hot leads' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Assign to Closer', type: 'action', actionType: 'assign_lead', agentId: 'top-closer-uuid', description: 'Route to senior agent' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Notify Agent', type: 'action', actionType: 'notify', message: 'You have been assigned a HOT lead: {{name}} (Score: {{deal_score}})', description: 'Alert the new owner' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-opened-followup',
    name: 'Email Opened → Send Follow-up',
    description: 'Captilize on engagement by sending an SMS follow-up the moment an email is opened.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Email Opened', type: 'trigger', triggerType: 'email_opened', description: 'Triggers on open event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send SMS Nudge', type: 'sms', actionType: 'send_sms', message: 'Hey {{name}}, just following up on that email. Did you have any questions?', description: 'Immediate SMS nudge' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'sms-auto-reply',
    name: 'SMS Received → Auto-Reply',
    description: 'Ensure 24/7 responsiveness with an immediate auto-reply to incoming texts.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'SMS Received', type: 'trigger', triggerType: 'sms_received', description: 'Incoming text event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Immediate Reply', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! I am currently in a meeting but received your message. I will call you back shortly.', description: 'Sends OOO reply' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'viewing-directions',
    name: 'Viewing Scheduled → Send Directions',
    description: 'Automatically send property directions to the lead when a viewing is scheduled.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Viewing Scheduled', type: 'trigger', triggerType: 'new_event', description: 'Triggers on calendar sync' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send Directions', type: 'sms', actionType: 'send_sms', message: 'Confirmed! Here are the directions to {{address}}: https://maps.google.com/?q={{address}}', description: 'Sends Google Maps link' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'offer-accepted-tasks',
    name: 'Offer Accepted → Closing Tasks',
    description: 'When an offer is accepted, automatically generate the closing task checklist.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Status = Negotiating', type: 'trigger', triggerType: 'status_change', status: 'negotiating', description: 'Offer accepted trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Add Inspection Task', type: 'action', actionType: 'add_task', taskTitle: 'Schedule Home Inspection - {{name}}', description: 'Standard closing step 1' } },
      { id: '3', type: 'automation', position: { x: 250, y: 250 }, data: { label: 'Add Title Task', type: 'action', actionType: 'add_task', taskTitle: 'Open Title for {{address}}', description: 'Standard closing step 2' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'revive-lead',
    name: 'No Activity 3 Days → Revive Lead',
    description: 'Revive cold leads after 3 days of no activity with a polite check-in nudge.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'No Action 3 Days', type: 'trigger', triggerType: 'inactivity', days: 3, description: 'Idle lead detection' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Check-in Email', type: 'email', actionType: 'send_email', subject: 'Thinking of you!', body: 'Hi {{name}}, just checking in to see if you still have interest in real estate in {{city}}.', description: 'Soft nurture nudge' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'unsubscribe-lost',
    name: 'Lead Unsubscribed → Change to Lost',
    description: 'Automatically mark a lead as "Lost" if they unsubscribe from communications.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Lead Unsubscribed', type: 'trigger', triggerType: 'unsubscribed', description: 'Opt-out event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Mark as Closed Lost', type: 'action', actionType: 'update_status', status: 'closed-lost', description: 'Removes from active pipeline' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'fb-lead-tag',
    name: 'Facebook Lead → Tag & Notify',
    description: 'Instantly tag and notify the team when a new lead arrives from Facebook Ads.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Facebook Lead', type: 'trigger', triggerType: 'facebook_lead', description: 'Webhook from FB Ads' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Notify On-Call Agent', type: 'action', actionType: 'notify', message: 'NEW FACEBOOK LEAD: {{name}} is requesting info on {{address}}!', description: 'Speed to lead alert' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'referral-request-automated',
    name: 'Closed Won → Automated Referral Request',
    description: 'When a deal closes, send a polite referral and review request email.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Status = Closed Won', type: 'trigger', triggerType: 'status_change', status: 'closed-won', description: 'Triggers on final closing' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Review Request', type: 'email', actionType: 'send_email', subject: 'Congratulations, {{name}}!', message: 'Hi {{name}}, it was a pleasure working with you. If you have a moment, could you leave us a review?', description: 'Sends thank you + link' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'high-value-alert',
    name: 'High Value ($1M+) → Desktop Alert',
    description: 'Get an immediate notification for luxury-tier properties over $1,000,000.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Value > $1,000,000', type: 'trigger', triggerType: 'new_lead', description: 'Triggers on luxury leads' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Luxury Alert', type: 'action', actionType: 'notify', message: '💰 LUXURY LEAD: {{name}} has a property valued at {{property_value}}!', description: 'Team-wide luxury nudge' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'zillow-sms-auto',
    name: 'Zillow Lead → Immediate SMS Follow-up',
    description: 'Ensure speed-to-lead by instantly texting Zillow leads as they arrive.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Source = Zillow', type: 'trigger', triggerType: 'new_lead', description: 'Zillow webhook trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Zillow Reply', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! 👋 I just received your request from Zillow for the property on {{address}}. Are you available for a quick chat?', description: 'Targeted lead source reply' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'inbound-sms-task',
    name: 'SMS Received → Lead Action Required Task',
    description: 'Automatically create a high-priority task for the agent when a lead texts back.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'SMS Received', type: 'trigger', triggerType: 'sms_received', description: 'Inbound message event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Reply Task', type: 'action', actionType: 'add_task', taskTitle: 'Reply to SMS from {{name}}', description: 'Action item for agent', priority: 'high' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'long-term-nurture',
    name: 'Monthly Market Update → Smart Nurture',
    description: 'Keep your leads warm with automated property market updates and check-ins.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Monthly Trigger', type: 'trigger', triggerType: 'monthly_run', description: 'Scheduled recurring run' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Market Update', type: 'email', actionType: 'send_email', subject: 'Monthly Real Estate Update for {{city}}', message: 'Hi {{name}}, here is what happened in the {{city}} market this month...', description: 'Educational content email' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'offer-rejected-reengage',
    name: 'Offer Rejected → Re-engagement Flow',
    description: 'When an offer falls through, start a new engagement sequence to stay in the game.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Status = Closed Lost', type: 'trigger', triggerType: 'status_change', status: 'closed-lost', description: 'Failed deal trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Nudge SMS', type: 'sms', actionType: 'send_sms', message: 'Sorry we couldn\'t make it work this time, {{name}}. I\'ll keep an eye out for other properties that fit your criteria!', description: 'Graceful follow-up' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'ai-lead-qualification',
    name: 'New Lead → AI Neural Analysis',
    description: 'Use WholeScale AI to instantly analyze and score leads based on neural patterns.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead Created', type: 'trigger', triggerType: 'new_lead', description: 'Initial entry' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Risk Analysis', type: 'ai', actionType: 'notify', message: 'AI Analysis: {{name}} has a 85% probability of closing based on historical data.', description: 'Neural score update' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'google-sync-notify',
    name: 'Google Event → Lead Alert',
    description: 'Synchronize your Google Calendar and alert your team the moment a lead books a viewing.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Calendar Event', type: 'trigger', triggerType: 'new_event', description: 'Google sync event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Team Alert', type: 'action', actionType: 'notify', message: 'NEW VIEWING: A lead has scheduled a property tour on {{date}}.', description: 'Immediate calendar alert' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'document-signed-closing',
    name: 'Document Signed → Prepare Closing',
    description: 'Instantly notify your legal team when a critical closing document is signed.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Doc Signed', type: 'trigger', triggerType: 'doc_signed', description: 'Docusign/SignWell webhook' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Notify Legal', type: 'email', actionType: 'send_email', subject: 'ACTION REQUIRED: Closing Documents Signed', message: 'Legal Team, the documents for {{name}} ({{address}}) have been signed and are ready for review.', description: 'Internal team nudge' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'facebook-lead-immediate',
    name: 'FB Ad Lead → Hot Lead Tagging',
    description: 'Instantly tag and categorize leads from Facebook Advertising campaigns.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'FB Lead Form', type: 'trigger', triggerType: 'facebook_lead', description: 'Facebook Ads webhook' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Tag & Route', type: 'action', actionType: 'assign_lead', agentId: 'fb-specialist', description: 'Auto-tag as "Social Lead"' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  }
];
