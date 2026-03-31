export interface AgentTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'email' | 'sms' | 'chat';
  tags: string[];
}

export const DEFAULT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'intro-buyer',
    name: 'Intro to Buyer',
    subject: 'Working on your home search',
    body: `Hi {{name}},\n\nI noticed you were looking at properties in {{area}}. I've got a few off-market opportunities that might fit exactly what you're looking for.\n\nAre you free for a quick 5-minute chat tomorrow?\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['buyer', 'intro']
  },
  {
    id: 'intro-seller',
    name: 'Intro to Seller',
    subject: 'Question about {{address}}',
    body: `Hi {{name}},\n\nI'm a local investor and I'm currently looking for a property in your neighborhood. I came across {{address}} and was wondering if you'd ever considered an off-market offer?\n\nWe can close in as little as 10 days, all cash, no commissions.\n\nLet me know if you'd be open to a conversation.\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'intro', 'investor']
  },
  {
    id: 'sms-followup',
    name: 'SMS Quick Follow-up',
    subject: 'SMS',
    body: `Hi {{name}}, it's {{agent_name}}. Just following up on my email about {{address}}. Did you get a chance to see it?`,
    category: 'sms',
    tags: ['followup', 'quick']
  },
  {
    id: 'offer-followup',
    name: 'Offer Presentation',
    subject: 'Official Offer for {{address}}',
    body: `Hi {{name}},\n\nAttached is our official purchase agreement for {{address}}. \n\nKey Terms:\n- Purchase Price: {{offer_amount}}\n- Closing Date: {{closing_date}}\n- Inspection: {{inspection_period}} days\n\nPlease review and let me know if you have any questions.\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['offer', 'contract']
  }
];
