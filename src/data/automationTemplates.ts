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
  },

  // ── EMAIL AUTOMATION TEMPLATES ───────────────────────────────────────────────
  {
    id: 'email-new-lead-followup',
    name: 'New Lead Email Follow-up',
    description: 'Sends a personalized welcome email within 5 minutes of a new lead entering the CRM.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'New Lead Created', type: 'trigger', description: 'Fires when lead status = New' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: '5-Min Delay', type: 'delay', description: 'Wait to avoid seeming robotic' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Send Welcome Email', type: 'action', description: 'Personalized intro using lead name and property' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--t-primary)' } },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-abandoned-cart',
    name: 'Abandoned Inquiry Recovery',
    description: 'Re-engage leads who started but never completed a property inquiry form.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Form Abandoned', type: 'trigger', description: 'Partial form submission detected' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: '1-Hour Delay', type: 'delay', description: 'Give time to return naturally' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Recovery Email', type: 'action', description: 'Friendly nudge with property photos' } },
      { id: '4', type: 'automation', position: { x: 250, y: 450 }, data: { label: 'Log to CRM', type: 'database', description: 'Mark as re-engaged' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true }
    ]
  },
  {
    id: 'email-post-closing',
    name: 'Post-Closing Thank You',
    description: 'Automated thank-you email sequence after a deal closes, requesting a review.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Deal Closed-Won', type: 'trigger', description: 'Status changed to Won' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Thank You Email', type: 'action', description: 'Congratulations + next steps' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: '7-Day Delay', type: 'delay', description: 'Wait for satisfaction' } },
      { id: '4', type: 'automation', position: { x: 250, y: 450 }, data: { label: 'Review Request', type: 'action', description: 'Google review link email' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true }
    ]
  },
  {
    id: 'email-drip-nurture',
    name: 'Email Drip Nurture Series',
    description: '5-email nurture series over 30 days for leads not yet ready to commit.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Lead Added to Drip', type: 'trigger', description: 'Manual or auto-enrollment' } },
      { id: '2', type: 'automation', position: { x: 250, y: 120 }, data: { label: 'Email 1: Value Prop', type: 'action', description: 'Introduce your services' } },
      { id: '3', type: 'automation', position: { x: 250, y: 240 }, data: { label: '7-Day Wait', type: 'delay', description: 'Spacing for best engagement' } },
      { id: '4', type: 'automation', position: { x: 250, y: 360 }, data: { label: 'Email 2: Case Study', type: 'action', description: 'Share a success story' } },
      { id: '5', type: 'automation', position: { x: 250, y: 480 }, data: { label: 'Email 3: CTA Offer', type: 'action', description: 'Free consultation offer' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true },
      { id: 'e4-5', source: '4', target: '5', animated: true }
    ]
  },
  {
    id: 'email-welcome-sequence',
    name: 'Welcome Email Sequence',
    description: 'Multi-step onboarding emails for new contacts entering your database.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Contact Created', type: 'trigger', description: 'New contact via any source' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Welcome Email', type: 'action', description: 'Brand intro + what to expect' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: '3-Day Wait', type: 'delay', description: 'Let them explore' } },
      { id: '4', type: 'automation', position: { x: 250, y: 450 }, data: { label: 'Resource Guide Email', type: 'action', description: 'Buying/selling guide PDF' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true }
    ]
  },
  {
    id: 'email-birthday',
    name: 'Birthday Greeting Email',
    description: 'Auto-sends a birthday email to clients on their special day.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Birthday Trigger', type: 'trigger', description: 'Date matches contact birthday' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Personalize', type: 'ai', description: 'Generate warm birthday message' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Send Birthday Email', type: 'action', description: 'Festive template with discount' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-market-update',
    name: 'Monthly Market Update Email',
    description: 'Automated monthly market report email to your entire database.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: '1st of Month', type: 'trigger', description: 'Monthly schedule trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Market Analysis', type: 'ai', description: 'Generate stats and insights' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Broadcast Email', type: 'action', description: 'Send to all active contacts' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-open-house-invite',
    name: 'Open House Email Invite',
    description: 'Targeted email invitations for upcoming open house events.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Open House Scheduled', type: 'trigger', description: 'Calendar event created' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Filter by Area', type: 'condition', description: 'Match leads by zip code' } },
      { id: '3', type: 'automation', position: { x: 100, y: 300 }, data: { label: 'Send Invite Email', type: 'action', description: 'Property photos + RSVP CTA' } },
      { id: '4', type: 'automation', position: { x: 400, y: 300 }, data: { label: 'Skip Inactive', type: 'action', description: 'Do not email cold leads' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', label: 'Match', style: { stroke: 'var(--t-success)' } },
      { id: 'e2-4', source: '2', target: '4', label: 'No Match', style: { stroke: 'var(--t-border)' } }
    ]
  },
  {
    id: 'email-just-sold',
    name: 'Just Sold Announcement',
    description: 'Broadcast a "Just Sold" email to generate social proof and new leads.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Deal Closed-Won', type: 'trigger', description: 'Won status detected' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Generate Announcement', type: 'ai', description: 'Create just-sold copy with stats' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Email Blast', type: 'action', description: 'Send to neighbors + sphere' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-pre-approval',
    name: 'Pre-Approval Nudge Email',
    description: 'Gentle email nudge for leads who expressed buying interest but lack pre-approval.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Buyer Lead Tagged', type: 'trigger', description: 'Intent = Buy, No pre-approval' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: '2-Day Wait', type: 'delay', description: 'Allow natural engagement' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Pre-Approval Email', type: 'action', description: 'Lender partner intro + benefits' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-appraisal-complete',
    name: 'Appraisal Complete Notification',
    description: 'Email alert when appraisal results are in, with next steps for the client.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Appraisal Logged', type: 'trigger', description: 'Appraisal doc uploaded' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'Send Results Email', type: 'action', description: 'Summary + next steps' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Update CRM Stage', type: 'database', description: 'Move to Negotiating' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-anniversary-checkin',
    name: 'Home Anniversary Check-in',
    description: 'Annual email on the purchase anniversary with equity update.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Purchase Anniversary', type: 'trigger', description: 'Date-based annual event' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: 'AI Equity Estimate', type: 'ai', description: 'Calculate current home value' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Anniversary Email', type: 'action', description: 'Happy home-versary + equity report' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'email-referral-request',
    name: 'Referral Request Series',
    description: 'Automated email sequence asking for referrals after a successful transaction.',
    category: 'Email',
    nodes: [
      { id: '1', type: 'automation', position: { x: 250, y: 0 }, data: { label: 'Deal Closed-Won', type: 'trigger', description: 'Closed status trigger' } },
      { id: '2', type: 'automation', position: { x: 250, y: 150 }, data: { label: '14-Day Wait', type: 'delay', description: 'Wait for settle-in period' } },
      { id: '3', type: 'automation', position: { x: 250, y: 300 }, data: { label: 'Request Email', type: 'action', description: 'Review + Referral link' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true }
    ]
  },
  {
    id: 'complex-seller-scoring',
    name: 'Advanced Seller Scoring',
    description: 'Complex AI-driven lead scoring and routing for high-value seller prospects.',
    category: 'AI',
    nodes: [
      { id: '1', type: 'automation', position: { x: 400, y: 0 }, data: { label: 'Seller Inquiry', type: 'trigger', description: 'Inbound seller lead' } },
      { id: '2', type: 'automation', position: { x: 400, y: 150 }, data: { label: 'AI Motivation Scan', type: 'ai', description: 'Scan for distress/urgency' } },
      { id: '3', type: 'automation', position: { x: 400, y: 300 }, data: { label: 'Score Check', type: 'condition', description: 'Is Score > 80?' } },
      { id: '4', type: 'automation', position: { x: 200, y: 450 }, data: { label: 'Priority Call', type: 'action', description: 'Auto-dial for agent' } },
      { id: '5', type: 'automation', position: { x: 600, y: 450 }, data: { label: 'Nurture SMS', type: 'sms', description: 'Warm intro' } },
      { id: '6', type: 'automation', position: { x: 200, y: 600 }, data: { label: 'Admin Alert', type: 'action', description: 'Slack #priority-leads' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', label: 'Match', style: { stroke: 'var(--t-success)' } },
      { id: 'e3-5', source: '3', target: '5', label: 'Low', style: { stroke: 'var(--t-border)' } },
      { id: 'e4-6', source: '4', target: '6', animated: true }
    ]
  },
  {
    id: 'open-house-multi-channel',
    name: 'Open House Omni-Channel',
    description: 'Follow up with open house attendees via SMS, Email, and CRM task creation.',
    category: 'Comms',
    nodes: [
      { id: '1', type: 'automation', position: { x: 300, y: 0 }, data: { label: 'Guest Registered', type: 'trigger', description: 'QR Scan or manual entry' } },
      { id: '2', type: 'automation', position: { x: 100, y: 150 }, data: { label: 'Immediate SMS', type: 'sms', description: 'Digital property brochure' } },
      { id: '3', type: 'automation', position: { x: 500, y: 150 }, data: { label: 'Send Welcome Email', type: 'action', description: 'Full property details' } },
      { id: '4', type: 'automation', position: { x: 300, y: 300 }, data: { label: '24h Follow-up AI', type: 'ai', description: 'Check feedback response' } },
      { id: '5', type: 'automation', position: { x: 300, y: 450 }, data: { label: 'Create CRM Task', type: 'action', description: 'Personal call reminder' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e1-3', source: '1', target: '3', animated: true },
      { id: 'e2-4', source: '2', target: '4', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true },
      { id: 'e4-5', source: '4', target: '5', animated: true }
    ]
  }
];
