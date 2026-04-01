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
  },
  {
    id: 'seller-pain-points',
    name: 'Solving Property Headaches',
    subject: 'Relieving the stress of {{address}}',
    body: `Hi {{name}},\n\nI understand that owning property like {{address}} can sometimes be more of a burden than an asset. Whether it's repairs, difficult tenants, or just wanting to move on, we specialize in making the process easy.\n\nWe buy as-is, which means you don't have to lift a finger for cleaning or repairs. Would you like a no-obligation cash offer this week?\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'distressed']
  },
  {
    id: 'buyer-rebranding',
    name: 'Exclusive VIP Buyer List',
    subject: 'VIP Access: New Off-Market Deals in {{area}}',
    body: `Hi {{name}},\n\nI'm adding a few serious investors to my VIP list for {{area}}. These are deals that never hit the MLS and often have at least 20% equity built-in.\n\nAre you looking to add more rentals or flips to your portfolio right now?\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['buyer', 'investor']
  },
  {
    id: 'follow-up-1',
    name: 'Day 1 Follow-up',
    subject: 'Checking in',
    body: `Hi {{name}},\n\nJust wanted to make sure you received my previous message. I'm truly interested in {{address}} and would love to see if we can make something work that benefits both of us.\n\nTalk soon,\n{{agent_name}}`,
    category: 'email',
    tags: ['followup']
  },
  {
    id: 'pre-foreclosure-help',
    name: 'Foreclosure Assistance',
    subject: 'Options for {{address}}',
    body: `Hi {{name}},\n\nI saw that there might be some challenges with {{address}} recently. I wanted to reach out not just as a buyer, but as someone who can help you navigate your options to save your credit or walk away with cash.\n\nTime is of the essence, so let's chat today if possible.\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'pre-foreclosure']
  },
  {
    id: 'absentee-owner',
    name: 'Absentee Owner Outreach',
    subject: 'Your property at {{address}}',
    body: `Hi {{name}},\n\nI'm a local resident in {{area}} and noticed your property at {{address}} looks like it might be vacant or a rental. If you've ever thought about selling and moving that equity into something else, I'd love to make you an offer.\n\nNo fees, no stress.\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'absentee']
  },
  {
    id: 'probate-compassion',
    name: 'Probate/Inheritance Offer',
    subject: 'Condolences and Assistance with {{address}}',
    body: `Hi {{name}},\n\nI want to offer my condolences for your loss. I know handling an estate can be overwhelming. If you're looking to simplify the process by selling {{address}} without the hassle of a traditional listing, we are here to help.\n\nWe handle everything, even the remaining belongings if needed.\n\nWarmly,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'probate']
  },
  {
    id: 'creative-finance',
    name: 'Creative Finance Pitch',
    subject: 'A different way to sell {{address}}',
    body: `Hi {{name}},\n\nI noticed you have a great property at {{address}}. If a traditional cash offer doesn't meet your price goals, I have some creative solutions like Seller Financing or Subject-To that might get you exactly what you're looking for while saving on taxes.\n\nInterested in hearing how it works?\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'creative-finance']
  },
  {
    id: 'sms-low-ball-rejection',
    name: 'SMS: Rejection Re-engage',
    subject: 'SMS',
    body: `Hi {{name}}, I totally understand our last offer wasn't what you expected. Prices have shifted a bit in {{area}}—would you be open to a quick re-evaluation?`,
    category: 'sms',
    tags: ['re-engage', 'negation']
  },
  {
    id: 'referral-ask',
    name: 'Referral Request',
    subject: 'Quick favor?',
    body: `Hi {{name}},\n\nIt was great working with you! If you know anyone else in {{area}} looking to sell their home fast and for a fair price, I'd love to help them out too. \n\nI even offer a referral fee for any deal we close!\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['referral']
  },
  {
    id: 'holiday-greeting',
    name: 'Holiday Touch-base',
    subject: 'Happy Holidays from WholeScale!',
    body: `Hi {{name}},\n\nWishing you a wonderful holiday season! I hope you're enjoying your time. If you have any real estate goals for the new year, I'm here to help.\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['marketing', 'holiday']
  },
  {
    id: 'market-update',
    name: 'Local Market Update',
    subject: 'What\'s happening in {{area}} real estate',
    body: `Hi {{name}},\n\nInventory is low and demand is high in {{area}} right now! This means your property at {{address}} might be worth more than you think. \n\nWant a quick 24-hour valuation?\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['marketing', 'update']
  },
  {
    id: 'closing-day-prep',
    name: 'Closing Day Instructions',
    subject: 'Important: Closing Day for {{address}}',
    body: `Hi {{name}},\n\nWe are all set for closing on {{address}}! Here's what you need to bring:\n1. Photo ID\n2. Keys/remotes\n3. Any final documents requested by the title company.\n\nSee you there!\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['closing', 'instruction']
  },
  {
    id: 'post-closing-followup',
    name: 'Post-Closing Satisfaction',
    subject: 'How did we do?',
    body: `Hi {{name}},\n\nNow that we've closed on {{address}}, I wanted to see how the experience was for you. Your feedback helps us improve and ensures we're providing the best service possible.\n\nThanks again for trusting us!\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['closing', 'feedback']
  },
  {
    id: 'landlord-fatigue',
    name: 'Tired Landlord Offer',
    subject: 'Tired of being a landlord?',
    body: `Hi {{name}},\n\nManaging rentals in {{area}} can be a full-time job. If you're tired of the "3 Ts"—Tenants, Toilets, and Trash—I'd love to take {{address}} off your hands for a fair cash price.\n\nLet me know if you're ready to retire your landlord hat.\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['seller', 'landlord']
  },
  {
    id: 'zombie-lead-revival',
    name: 'Zombie Lead Revival',
    subject: 'Still interested in selling {{address}}?',
    body: `Hi {{name}},\n\nIt's been a while since we talked about {{address}}. I'm still very interested in the property. Is it still available, or have your plans changed?\n\nBest,\n{{agent_name}}`,
    category: 'email',
    tags: ['followup', 'revival']
  },
  {
    id: 'sms-appointment-reminder',
    name: 'SMS: Appointment Reminder',
    subject: 'SMS',
    body: `Hi {{name}}, just a reminder for our walkthrough of {{address}} today at {{time}}. Looking forward to it! - {{agent_name}}`,
    category: 'sms',
    tags: ['reminder', 'appointment']
  }
];
