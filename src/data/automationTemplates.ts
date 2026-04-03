import { Node, Edge } from '@xyflow/react';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Lead Gen' | 'AI' | 'Comms' | 'CRM';
  nodes: Node[];
  edges: Edge[];
}

export const automationTemplates: AutomationTemplate[] = [
  {
    id: 'zillow-funnel',
    name: 'Zillow Concierge Funnel',
    description: 'Instant AI response and CRM sync for new Zillow leads.',
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
    description: 'Sync Facebook Lead Ads to CRM and tag by interest.',
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
    description: 'AI calculates property value and schedules consultation.',
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
    description: 'Auto-detect dead leads and send AI re-engagement SMS.',
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
    description: 'Send match alerts based on AI preference learning.',
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
    description: 'Immediate SMS survey and CRM logging after open houses.',
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
    id: 'task-round-robin',
    name: 'Round Robin Assignment',
    description: 'Rotate leads among team members based on availability.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Any New Lead', type: 'trigger', description: 'Global trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Check Availability', type: 'action', description: 'Query team status' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Assign & Notify', type: 'action', description: 'Update CRM owner' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'website-form',
    name: 'Website Form Handler',
    description: 'Process website contact forms with AI categorization.',
    category: 'Lead Gen',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Site Form Submit', type: 'trigger', description: 'Standard contact form' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Category', type: 'ai', description: 'Buyer, Seller, or Other?' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Route to Desk', type: 'action', description: 'Alert relevant agent' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'referral-thank-you',
    name: 'Referral Rewards Flow',
    description: 'Track referrals and auto-send gift card notifications.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Deal Closed', type: 'trigger', description: 'Referral source tagged' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Verify Source', type: 'action', description: 'Identify referrer' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Send Thanks', type: 'sms', description: 'Referral bonus alert' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'morning-brief',
    name: 'AI Morning Briefing',
    description: 'AI summarizes morning tasks and high-priority leads.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Daily at 8 AM', type: 'trigger', description: 'Time-based trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Summarize CRM', type: 'ai', description: 'Analyze last 24h' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Send Overview', type: 'action', description: 'Push briefing to agent' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'showing-confirmed',
    name: 'Showing Confirmation',
    description: 'Auto-verify showings with sellers and notify buyers.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Showing Requested', type: 'trigger', description: 'New request in calendar' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'SMS to Seller', type: 'sms', description: 'Request confirmation' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Confirm to Buyer', type: 'sms', description: 'Booking finalized' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'price-drop-bot',
    name: 'Price Drop Notifier',
    description: 'AI notifies all matching prospects when price drops.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Price Reduced', type: 'trigger', description: 'Listing price change' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Identify Matches', type: 'ai', description: 'Query saved searches' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Blast Update', type: 'action', description: 'Personalized SMS/Email' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'doc-signer-followup',
    name: 'DocuSign Follow-up',
    description: 'Remind clients to sign pending contracts via AI SMS.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Doc Sent', type: 'trigger', description: 'Envelope created' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: '24h No-Sign Wait', type: 'action', description: 'Delay node' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Urgent Reminder', type: 'sms', description: "Need your signature!" } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'anniversary-flow',
    name: 'Deal Anniversary Bot',
    description: 'Build long-term loyalty with yearly home anniversary texts.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Closing Anniversary', type: 'trigger', description: 'Date-based event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Check Home Value', type: 'ai', description: 'New equity estimate' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Loyalty SMS', type: 'sms', description: "Happy Home-versary!" } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'lead-garbage-collector',
    name: 'Lead Garbage Collector',
    description: 'Archive fake leads or spam detected by AI intent scan.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Incoming Sync', type: 'trigger', description: 'Any ingestion' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Spam Filter', type: 'ai', description: 'Detect bots/fake #s' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Auto-Archive', type: 'action', description: 'Move to Junk' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'mortgage-partner-sync',
    name: 'Lender Lead Sync',
    description: 'Push pre-qualified leads directly to mortgage partners.',
    category: 'CRM',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Pre-Qual Tagged', type: 'trigger', description: 'Manual or AI tag' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Push to Lender', type: 'action', description: 'Webhook to mortgage CRM' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Confirm to Lead', type: 'sms', description: "Lender will call you!" } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'rent-to-own-funnel',
    name: 'Rent-to-Own Qualifier',
    description: 'AI determines if prospects qualify for lease-purchase.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Rental Inquiry', type: 'trigger', description: 'Inquiry on rental' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Qualifier', type: 'ai', description: 'Check credit/income vars' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Sales Route', type: 'action', description: 'Convert to buyer lead' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'review-requester',
    name: 'Google Review Requester',
    description: 'Auto-request reviews from happy clients after closing.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Deal Outcome: Won', type: 'trigger', description: 'Closing status' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Sentiment Check', type: 'ai', description: 'Is client happy?' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Request Review', type: 'sms', description: 'Link to Google My Business' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'holiday-blasts',
    name: 'Holiday Marketing Blast',
    description: 'Seasonally appropriate AI messages for the database.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Holiday Calendar', type: 'trigger', description: 'Event-based' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Creative Copy', type: 'ai', description: 'Generate festive text' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Broadcast SMS', type: 'action', description: 'Send to all' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'late-night-responder',
    name: 'Late Night AI Buffer',
    description: 'AI handles leads that come in between 10 PM and 7 AM.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead [Night]', type: 'trigger', description: 'Condition: 10PM-7AM' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Night Assistant', type: 'ai', description: 'Buffer and set expectations' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Schedule Call', type: 'action', description: 'Set task for morning' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  }
];
