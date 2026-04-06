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
    id: 'welcome-sms',
    name: 'New Lead → Send Welcome SMS',
    description: 'Instantly greet new leads with a personalized text message.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead Created', type: 'trigger', triggerType: 'new_lead', description: 'Triggers on any new entry' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Welcome SMS', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! This is {{agent_name}}. Thanks for your interest in WholeScale. How can I help today?', description: 'Instant SMS' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--t-primary)' } }]
  },
  {
    id: 'task-overdue-notify',
    name: 'Task Overdue → Notify Team',
    description: 'Keep the team accountable by broadcasting overdue tasks.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Task Overdue', type: 'trigger', triggerType: 'task_overdue', description: 'Triggers on deadline miss' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Alert Manager', type: 'action', actionType: 'notify', message: '⚠️ ALERT: Task "{{title}}" for lead {{name}} is overdue!', description: 'System Notification' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'deal-won-chat',
    name: 'Deal Won → Post to Team Chat',
    description: 'Celebrate wins by automatically sharing closing details in chat.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Status = Closed Won', type: 'trigger', triggerType: 'status_change', status: 'closed-won', description: 'Triggers on final closing' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Post to Chat', type: 'action', actionType: 'send_chat', message: '🎉 DEAL CLOSED! Property: {{address}} | Value: {{value}} | Agent: {{agent_name}}', description: 'Team Celebration' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'high-score-assign',
    name: 'Lead Score > 80 → Assign to Top Agent',
    description: 'Ensure your best leads are handled by your best closers.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Score >= 80', type: 'trigger', triggerType: 'high_score', threshold: 80, description: 'Neural Score Trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Route to Master', type: 'action', actionType: 'assign_lead', description: 'Priority Routing' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'sms-auto-reply',
    name: 'SMS Received → Auto-Reply',
    description: 'Never miss a beat with instant automated acknowledgments.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'SMS Received', type: 'trigger', triggerType: 'sms_received', description: 'Inbound Message' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Echo Reply', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! I am currently away but I received your text. I will get back to you shortly.', description: 'Immediate Reply' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'email-opened-followup',
    name: 'Email Opened → Send Follow-up',
    description: 'Strike while the iron is hot by texting when an email is read.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Email Opened', type: 'trigger', triggerType: 'email_opened', description: 'Recipient read message' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Nudge SMS', type: 'sms', actionType: 'send_sms', message: 'Hey {{name}}, just following up on that email I sent you earlier. Do you have a quick minute?', description: 'Warm Lead Follow-up' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'event-reminder',
    name: 'Calendar Event Created → Send Reminder',
    description: 'Reduce no-shows with automated meeting reminders.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Calendar Event', type: 'trigger', triggerType: 'new_event', description: 'Google Calendar Sync' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send Reminder', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}, just a reminder for our meeting today at {{time}}! See you soon.', description: 'Appointment Nudge' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'inactive-nurture',
    name: 'Lead Inactive 7 Days → Move to Nurture',
    description: 'Prevent leads from slipping through the cracks.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: '7 Days Idle', type: 'trigger', triggerType: 'status_change', status: 'cold', description: 'Inactive Detection' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Update to Nurture', type: 'action', actionType: 'update_status', status: 'nurture', description: 'Move to Nurture' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'contract-signed-update',
    name: 'Contract Signed → Update Deal Stage',
    description: 'Keep your pipeline accurate in real-time.',
    category: 'Sales',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Contract Signed', type: 'trigger', triggerType: 'status_change', status: 'negotiating', description: 'E-signer Callback' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Move to Under Contract', type: 'action', actionType: 'update_status', status: 'contract', description: 'Pipeline Advance' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  },
  {
    id: 'monthly-report-mgr',
    name: 'Monthly Report → Email to Manager',
    description: 'Automate your executive reporting workflow.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'End of Month', type: 'trigger', triggerType: 'status_change', status: 'closed', description: 'Monthly Cycle' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Summary Report', type: 'email', actionType: 'send_email', subject: 'Monthly Performance Summary', message: 'The AI has compiled your performance report for last month...', description: 'Executive Summary' } }
    ],
    edges: [{ id: 'e1-2', source: '1', target: '2', animated: true }]
  }
];
