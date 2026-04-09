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
    id: 'new-lead-sequence',
    name: 'New Lead Follow-up (3-Step)',
    description: 'A comprehensive multi-channel welcome sequence for new leads.',
    category: 'Lead Gen',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'New Lead Created', type: 'trigger', triggerType: 'new_lead' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Welcome SMS', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}! This is {{agent_name}}. Thanks for your interest in WholeScale. I\'ll be in touch shortly!' } },
      { id: 'd1', type: 'automation', position: { x: 400, y: 300 }, data: { label: 'Wait 1 Hour', type: 'action', actionType: 'delay', duration: 3600 } },
      { id: 'a2', type: 'automation', position: { x: 400, y: 450 }, data: { label: 'Initial Email', type: 'email', actionType: 'send_email', subject: 'Welcome to WholeScale', message: 'Hello {{name}},\n\nI wanted to personally reach out and welcome you. Let me know if you have any questions!\n\nBest,\n{{agent_name}}' } },
      { id: 'd2', type: 'automation', position: { x: 400, y: 600 }, data: { label: 'Wait 24 Hours', type: 'action', actionType: 'delay', duration: 86400 } },
      { id: 'a3', type: 'automation', position: { x: 400, y: 750 }, data: { label: 'Task: Follow up', type: 'action', actionType: 'add_task', taskTitle: 'Call {{name}} - Day 2 Follow up', priority: 'high' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 'a1', target: 'd1', animated: true },
      { id: 'e3', source: 'd1', target: 'a2', animated: true },
      { id: 'e4', source: 'a2', target: 'd2', animated: true },
      { id: 'e5', source: 'd2', target: 'a3', animated: true }
    ]
  },
  {
    id: 'lead-inactive-alert',
    name: 'Lead Inactive Alert (7 Days)',
    description: 'Get notified when a lead has had no contact for 7 days.',
    category: 'CRM',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: '7 Days No Contact', type: 'trigger', triggerType: 'inactivity' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Alert Manager', type: 'action', actionType: 'notify', message: '⚠️ Lead {{name}} has been inactive for 7 days. Action required!' } },
      { id: 'a2', type: 'automation', position: { x: 150, y: 150 }, data: { label: 'SMS Re-engage', type: 'sms', actionType: 'send_sms', message: 'Hey {{name}}, it\'s been a week! Just checking in to see if you\'re still interested in our services.' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 't1', target: 'a2', animated: true }
    ]
  },
  {
    id: 'deal-won-celebration',
    name: 'Deal Won Celebration',
    description: 'Celebrate closed deals with client SMS and team notifications.',
    category: 'Sales',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'Status = Closed Won', type: 'trigger', triggerType: 'status_change', status: 'closed-won' } },
      { id: 'a1', type: 'automation', position: { x: 150, y: 150 }, data: { label: 'Client Congratulations', type: 'sms', actionType: 'send_sms', message: 'Congratulations {{name}}! We are thrilled to have officially closed your deal. Welcome to the family!' } },
      { id: 'a2', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Post to Team Chat', type: 'action', actionType: 'send_chat', message: '🎉 DEAL WON! {{name}} has officially closed. Great job everyone!', channelId: 'general' } },
      { id: 'a3', type: 'automation', position: { x: 650, y: 150 }, data: { label: 'Notify Manager', type: 'action', actionType: 'notify', message: '🏆 New Deal Won: {{name}} has been closed successfully.' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 't1', target: 'a2', animated: true },
      { id: 'e3', source: 't1', target: 'a3', animated: true }
    ]
  },
  {
    id: 'offer-submitted-notify',
    name: 'Offer Submitted Notification',
    description: 'Alert the team immediately when an offer is submitted.',
    category: 'Sales',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'Offer Submitted', type: 'trigger', triggerType: 'offer_submitted' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Notify Assignee', type: 'action', actionType: 'notify', message: '📄 New Offer: An offer has been submitted for {{name}}.' } },
      { id: 'a2', type: 'automation', position: { x: 650, y: 150 }, data: { label: 'Email Receipt', type: 'email', actionType: 'send_email', subject: 'Offer Received - WholeScale', message: 'Hello {{name}},\n\nWe have received your offer and our team is currently reviewing it. We will get back to you shortly!' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 't1', target: 'a2', animated: true }
    ]
  },
  {
    id: 'task-overdue-reminder',
    name: 'Task Overdue Reminder',
    description: 'Automated nudge for agents when tasks go past their due date.',
    category: 'CRM',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'Task Overdue', type: 'trigger', triggerType: 'task_overdue' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Push Notification', type: 'action', actionType: 'notify', message: '🚨 URGENT: Your task "{{title}}" is now overdue. Please update it.' } },
      { id: 'a2', type: 'automation', position: { x: 150, y: 150 }, data: { label: 'Nudge SMS', type: 'sms', actionType: 'send_sms', message: 'Hey! Just a quick nudge that your task "{{title}}" is overdue. Let me know if you need help!' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 't1', target: 'a2', animated: true }
    ]
  },
  {
    id: 'monthly-perf-report',
    name: 'Monthly Performance Report',
    description: 'Automatically generate and send a summary report to the manager.',
    category: 'AI',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: '1st of the Month', type: 'trigger', triggerType: 'monthly_run' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'AI Synthesis', type: 'action', actionType: 'notify', message: 'Generating monthly performance report...' } },
      { id: 'a2', type: 'automation', position: { x: 400, y: 300 }, data: { label: 'Email Report', type: 'email', actionType: 'send_email', subject: 'WholeScale OS: Monthly Performance Summary', message: 'Your monthly performance metrics are now available. Total Deals: {{total_deals}}, New Leads: {{new_leads}}.' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 'a1', target: 'a2', animated: true }
    ]
  },
  {
    id: 'client-birthday-greeting',
    name: 'Client Birthday Greeting',
    description: 'Never miss a client birthday with automated personalized greetings.',
    category: 'Comms',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'Client Birthday', type: 'trigger', triggerType: 'birthday' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Send Birthday SMS', type: 'sms', actionType: 'send_sms', message: 'Happy Birthday {{name}}! 🎂 Wishing you a fantastic day ahead. - {{agent_name}}' } },
      { id: 'a2', type: 'automation', position: { x: 650, y: 150 }, data: { label: 'Task: Call Client', type: 'action', actionType: 'add_task', taskTitle: 'Birthday Call: {{name}}', priority: 'low' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 't1', target: 'a2', animated: true }
    ]
  },
  {
    id: 'referral-request-sequence',
    name: 'Referral Request Sequence',
    description: 'A 2-step sequence to request referrals after a successful deal.',
    category: 'Sales',
    nodes: [
      { id: 't1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'Deal Completed', type: 'trigger', triggerType: 'referral_request' } },
      { id: 'a1', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'Initial Request SMS', type: 'sms', actionType: 'send_sms', message: 'Hi {{name}}, it was a pleasure working with you! If you know anyone looking to buy or sell, I\'d love to help.' } },
      { id: 'd1', type: 'automation', position: { x: 400, y: 300 }, data: { label: 'Wait 3 Days', type: 'action', actionType: 'delay', duration: 259200 } },
      { id: 'a2', type: 'automation', position: { x: 400, y: 450 }, data: { label: 'Follow up Email', type: 'email', actionType: 'send_email', subject: 'Your feedback matters', message: 'Hello {{name}},\n\nJust checking in again. We value your referrals. If you have anyone in mind, feel free to share their contact info!' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 'a1', target: 'd1', animated: true },
      { id: 'e3', source: 'd1', target: 'a2', animated: true }
    ]
  }
];
