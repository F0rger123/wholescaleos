import { Node, Edge } from '@xyflow/react';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Lead Gen' | 'AI' | 'Comms' | 'CRM' | 'Email';
  nodes: Node[];
  edges: Edge[];
}

export const automationTemplates: AutomationTemplate[] = [
  {
    id: 'zillow-funnel',
    name: 'Zillow Concierge Funnel',
    description: 'Instant AI response and CRM sync for new Zillow leads with high-intent detection.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Zillow Webhook', type: 'trigger', description: 'New lead from Zillow' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Intent Check', type: 'ai', description: 'Is buyer ready?' } },
      { id: '3', type: 'automation', position: { x: 100, y: 300 }, data: { label: 'Hot SMS Response', type: 'sms', description: 'Priority follow-up' } },
      { id: '4', type: 'automation', position: { x: 400, y: 300 }, data: { label: 'Drip Email', type: 'action', description: 'Standard nurturing' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--t-primary)' } },
      { id: 'e2-3', source: '2', target: '3', label: 'High Intent', style: { stroke: 'var(--t-success)' } },
      { id: 'e2-4', source: '2', target: '4', label: 'General', style: { stroke: 'var(--t-border)' } }
    ]
  },
  {
    id: 'fb-ads',
    name: 'Facebook Ad Automation',
    description: 'Sync Facebook Lead Ads to CRM and tag by interest automatically.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'FB Lead Ad', type: 'trigger', description: 'New Facebook Ad lead' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Tag by Campaign', type: 'action', description: 'Add CRM tags' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'AI Intro Email', type: 'ai', description: 'Personalized intro' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'ai-valuation',
    name: 'Home Valuation Flow',
    description: 'AI calculates property value and schedules a consultation for sellers.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Valuation Request', type: 'trigger', description: 'User submits address' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Value Engine', type: 'ai', description: 'Fetch comps and calculate' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Send Report', type: 'action', description: 'SMS value report' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'cold-reengagement',
    name: 'Cold Lead Re-engagement',
    description: 'Auto-detect dead leads and send AI re-engagement SMS to revive interest.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Idle for 30 Days', type: 'trigger', description: 'No activity detected' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Tone Match', type: 'ai', description: 'Check past history' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Re-engage SMS', type: 'sms', description: 'Sent at 10 AM' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'listing-alert',
    name: 'Smart Listing Alerts',
    description: 'Send match alerts based on AI preference learning from browsing behavior.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Listing', type: 'trigger', description: 'MLS Update' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Match Analysis', type: 'ai', description: 'Check against lead likes' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Push Alert', type: 'action', description: 'Send text with link' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'open-house-survey',
    name: 'Open House Follow-up',
    description: 'Immediate SMS survey and CRM logging after open house check-in.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Open House QR', type: 'trigger', description: 'New attendee scan' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Immediate SMS', type: 'sms', description: "Thanks for coming!" } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: '24h Feedback AI', type: 'ai', description: 'Analyze sentiment' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'new-construction-flow',
    name: 'New Construction Interest',
    description: 'Specific tagging and educational drip for leads interested in new builds.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Build Search', type: 'trigger', description: 'Website search filter' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Add "New-Builder" Tag', type: 'action', description: 'CRM Classification' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Builder Guide Email', type: 'email', description: 'Dynamic PDF send' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'failed-listing-recovery',
    name: 'Failed Listing Recovery',
    description: 'Hyper-personalized outreach for expired or canceled MLS listings.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Listing Expired', type: 'trigger', description: 'MLS Data Sync' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Script Gen', type: 'ai', description: "Why it didn't sell" } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Seller SMS', type: 'sms', description: 'Immediate empathetic touch' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'investor-roi-alert',
    name: 'Investor ROI Alert',
    description: 'Automatic CAP rate calculation and delivery for multi-family leads.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Multi-Family', type: 'trigger', description: 'Listing matching criteria' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI ROI Audit', type: 'ai', description: 'Estimate cash flow' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Investor SMS', type: 'sms', description: 'Deal alert with numbers' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'post-close-loop',
    name: 'Post-Close Referral Loop',
    description: 'Long-term client appreciation and referral request cycle.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Closing Date + 1yr', type: 'trigger', description: 'Anniversary Trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Personal Note', type: 'ai', description: 'Reflect on home stay' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Video Greeting Email', type: 'email', description: 'Referral request' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  }
];
