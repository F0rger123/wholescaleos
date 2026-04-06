import { Node, Edge } from '@xyflow/react';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Lead Gen' | 'AI' | 'Comms' | 'CRM' | 'Sales';
  nodes: Node[];
  edges: Edge[];
}

export const automationTemplates: AutomationTemplate[] = [
  {
    id: 'lead-speed-to-lead',
    name: 'New Lead → Instant SMS Follow-up',
    description: 'Ensure 100% response rate by texting new leads within seconds.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead Created', type: 'trigger', triggerType: 'new_lead', description: 'Triggers on any new entry' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Speed Response', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! This is {{agent_name}}. I received your inquiry about real estate. Are you looking to buy or sell soon?', description: 'Instant SMS' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--t-primary)' } }]
  },
  {
    id: 'ai-lead-analyzer',
    name: 'High Lead Score → Priority Notification',
    description: 'Alert the team immediately when a lead reaches a deal score of 80+.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Score >= 80', type: 'trigger', triggerType: 'high_score', threshold: 80, description: 'Neural Score Trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Alert Manager', type: 'action', actionType: 'notify', message: '🔥 HOT LEAD: {{name}} has a deal score of {{deal_score}}!', description: 'Team Alert' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'status-closed-review',
    name: 'Deal Closed → Review Request',
    description: 'Automatically send a Google review request when a deal is won.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Status = Closed Won', type: 'trigger', triggerType: 'status_change', status: 'closed-won', description: 'Triggers on final closing' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send Review SMS', type: 'sms', actionType: 'send_sms', message: 'Congrats on your closing, {{name}}! Would you mind sharing your experience here: {{review_link}}?', description: 'Success Follow-up' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'task-overdue-alert',
    name: 'Task Overdue → Slack/Chat Notification',
    description: 'Keep the team accountable by broadcasting overdue tasks to a chat channel.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Task Overdue', type: 'trigger', triggerType: 'task_overdue', description: 'Triggers on deadline miss' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Broadast to Team', type: 'action', actionType: 'send_chat', message: '⚠️ OVERDUE: Task "{{title}}" for lead {{name}} was missed.', description: 'Channel Alert' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'sms-auto-replier',
    name: 'SMS Received → Out of Office Reply',
    description: 'Acknowledge incoming texts immediately even after hours.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'SMS Received', type: 'trigger', triggerType: 'sms_received', description: 'Inbound Message' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'OOO Reply', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! I am currently in a meeting but I received your text. I will get back to you shortly.', description: 'Immediate Reply' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'calendar-sync-followup',
    name: 'Meeting Scheduled → SMS Reminder',
    description: 'Reduce no-shows by texting leads 1 hour before scheduled viewings.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Calendar Event', type: 'trigger', triggerType: 'new_event', description: 'Google Calendar Sync' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send Reminder', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}, just a reminder for our meeting today at {{time}}! See you soon.', description: 'Appointment Nudge' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'lead-reengagement',
    name: 'Status = Cold → Re-engagement Email',
    description: 'Nurture cold leads with a value-driven real estate market update.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Status = Cold', type: 'trigger', triggerType: 'status_change', status: 'cold', description: 'Idle Lead Detection' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Nurture Email', type: 'email', actionType: 'send_email', subject: 'The market is shifting, {{name}}!', message: 'Hi {{name}}, I thought you might want to see the latest property values in your area...', description: 'Nurture Flow' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'high-value-luxury',
    name: 'Luxury Lead ($1M+) → Concierge Workflow',
    description: 'Automate a luxury experience for properties over $1,000,000.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Value > $1M', type: 'trigger', triggerType: 'new_lead', description: 'Luxury Tier Detection' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Assign to Sr. Agent', type: 'action', actionType: 'assign_lead', description: 'Concierge Routing' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Send Luxury Intro', type: 'email', actionType: 'send_email', subject: 'Exclusive Service for {{address}}', message: 'Hi {{name}}, we provide a bespoke service for properties of your caliber...', description: 'High-end Intro' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'fb-ads-route',
    name: 'Facebook Lead → Auto-Tag & Route',
    description: 'Instantly tag and categorize leads from social media campaigns.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Source = Facebook', type: 'trigger', triggerType: 'facebook_lead', description: 'Social Media Webhook' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Tag "Social Lead"', type: 'action', actionType: 'update_status', status: 'new', description: 'Categorization' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'neural-qualification',
    name: 'New Lead → AI Neural Analysis',
    description: 'Use OS Bot to qualify and score leads the moment they arrive.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead', type: 'trigger', triggerType: 'new_lead', description: 'Initial CRM Entry' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'OS Bot Analysis', type: 'ai', actionType: 'notify', message: 'Artificial Intelligence has qualified {{name}} as a HIGH-INTENT buyer.', description: 'Neutral Scoring' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  }
];
