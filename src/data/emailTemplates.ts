import { AgentTemplate } from '../lib/default-templates';

export const AGENT_EMAIL_TEMPLATES: AgentTemplate[] = [
  // --- LEAD GENERATION ---
  {
    id: 'agent-intro-buyer',
    name: 'Buyer Introduction',
    subject: 'Assisting with your home search in {{area}}',
    body: `Hi {{name}},\n\nI noticed you were looking at properties in {{area}}. I've got a few off-market opportunities that might fit exactly what you're looking for.\n\nAre you free for a quick 5-minute chat tomorrow?\n\nBest,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['buyer', 'intro']
  },
  {
    id: 'agent-intro-seller',
    name: 'Seller Introduction',
    subject: 'Question about your property at {{address}}',
    body: `Hi {{name}},\n\nI'm a local specialist in {{area}} and I'm currently working with several buyers looking for homes in your neighborhood. I came across {{address}} and was wondering if you'd ever considered an off-market offer?\n\nWe can often close very quickly with no commissions.\n\nLet me know if you'd be open to a conversation.\n\nBest,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['seller', 'intro']
  },

  // --- FOLLOW-UP ---
  {
    id: 'agent-followup-1',
    name: 'Day 1 Follow-up',
    subject: 'Checking in on our conversation',
    body: `Hi {{name}},\n\nJust wanted to make sure you received my previous message. I'm truly interested in {{address}} and would love to see if we can make something work that benefits both of us.\n\nTalk soon,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['followup']
  },
  {
    id: 'agent-zombie-revival',
    name: 'Zombie Lead Revival',
    subject: 'Still interested in selling {{address}}?',
    body: `Hi {{name}},\n\nIt's been a while since we talked about {{address}}. I'm still very interested in the property. Is it still available, or have your plans changed?\n\nBest,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['followup', 'revival']
  },
  {
    id: 'agent-price-reduction',
    name: 'Price Reduction Alert',
    subject: 'Significant Price Drop: {{address}}',
    body: `Hi {{name}},\n\nWe just authorized a major price reduction on {{address}}. It's now listed at {{price}}.\n\nThis is currently the best value in the {{area}} market. Let me know if you want to schedule a walkthrough.\n\nBest,\n{{agent_name}}`,
    category: 'Marketing',
    tags: ['price-drop']
  },

  // --- OFFERS ---
  {
    id: 'agent-cash-offer',
    name: 'Cash Offer Proposal',
    subject: 'Official Cash Offer for {{address}}',
    body: `Hi {{name}},\n\nWe've completed our evaluation of {{address}} and are prepared to make a solid cash offer. \n\nKey Benefits:\n- No Inspections required\n- We pay all closing costs\n- Close in 10-14 days\n\nWould you like to review the full agreement today?\n\nBest,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['offer', 'cash']
  },
  {
    id: 'agent-creative-finance',
    name: 'Creative Finance Solution',
    subject: 'A customized way to sell {{address}}',
    body: `Hi {{name}},\n\nIf a traditional cash offer doesn't meet your net proceeds goal, I have some creative solutions like Seller Financing or Subject-To that can get you a higher price while saving you money on capital gains.\n\nInterested in hearing how this could work for you?\n\nBest,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['offer', 'creative']
  },

  // --- OPERATIONS ---
  {
    id: 'agent-closing-instr',
    name: 'Closing Day Logistics',
    subject: 'Closing Day Instructions for {{address}}',
    body: `Hi {{name}},\n\nWe are all set for closing on {{address}}! \n\nReminder Checklist:\n1. Bring your Photo ID\n2. Bring all keys and remotes\n3. Bring any final docs requested by the title company\n\nSee you at the closing table!\n\nBest,\n{{agent_name}}`,
    category: 'Operations',
    tags: ['closing', 'instructions']
  },
  {
    id: 'agent-post-closing',
    name: 'Post-Closing Satisfaction',
    subject: 'Congratulations! How was your experience?',
    body: `Hi {{name}},\n\nCongratulations on the successful closing of {{address}}! \n\nI wanted to check in and see how the process was for you. Your feedback is incredibly valuable to me and my team.\n\nThanks again for trusting me with your real estate journey.\n\nBest,\n{{agent_name}}`,
    category: 'Operations',
    tags: ['closing', 'feedback']
  },

  // --- MARKETING ---
  {
    id: 'agent-market-update',
    name: 'Monthly Market Report',
    subject: 'What\'s happening in the {{area}} market?',
    body: `Hi {{name}},\n\nInventory is at record lows in {{area}} right now! This means your property at {{address}} might be worth significantly more than it was last year.\n\nWould you like a free, 5-minute valuation report?\n\nBest,\n{{agent_name}}`,
    category: 'Marketing',
    tags: ['market-update']
  },
  {
    id: 'agent-referral-ask',
    name: 'Referral Request',
    subject: 'A quick favor?',
    body: `Hi {{name}},\n\nI really enjoyed working with you on {{address}}. If you know anyone else looking to buy or sell in the near future, I'd love to provide them with the same high level of service.\n\nI even offer a referral commission for any successfully closed deals you send my way!\n\nBest,\n{{agent_name}}`,
    category: 'Marketing',
    tags: ['referral']
  },
  {
    id: 'agent-open-house',
    name: 'Open House Invite',
    subject: 'You\'re Invited: Open House at {{address}}',
    body: `Hi {{name}},\n\nI'm hosting an exclusive open house this Saturday from 12 PM - 3 PM at {{address}}.\n\nStop by for a tour and some light refreshments. Hope to see you there!\n\nBest,\n{{agent_name}}`,
    category: 'Marketing',
    tags: ['open-house']
  },

  // --- MISC ---
  {
    id: 'agent-appointment-reminder',
    name: 'Appointment Reminder',
    subject: 'Reminder: Our walkthrough at {{address}}',
    body: `Hi {{name}},\n\nJust a quick reminder about our property walkthrough at {{address}} scheduled for {{time}} today.\n\nLooking forward to seeing you then!\n\nBest,\n{{agent_name}}`,
    category: 'Operations',
    tags: ['reminder']
  },
  {
    id: 'agent-contract-sent',
    name: 'Contract Document Sent',
    subject: 'Action Required: Contract for {{address}}',
    body: `Hi {{name}},\n\nI've just sent over the draft contract for {{address}} via DocuSign. Please review and sign when you have a moment.\n\nLet me know if you have any questions about the terms.\n\nBest,\n{{agent_name}}`,
    category: 'Sales',
    tags: ['contract']
  },
  {
    id: 'agent-valuation-report',
    name: 'Property Valuation Report',
    subject: 'Your Custom Valuation Report for {{address}}',
    body: `Hi {{name}},\n\nAs promised, here is your custom property valuation report for {{address}}. Based on recent comparable sales in {{area}}, your estimated value is in the range of $325k - $350k.\n\nWould you like to discuss the details over a brief call?\n\nBest,\n{{agent_name}}`,
    category: 'Marketing',
    tags: ['valuation']
  }
];
