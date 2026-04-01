export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'sales' | 'marketing' | 'support' | 'onboarding' | 'legal';
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'cash-offer-proposal',
    name: 'Cash Offer Proposal',
    subject: 'Official Cash Offer for {{address}}',
    content: `Hi {{name}},

I've finished my research on {{address}} and I'm ready to move forward.

Based on the current market and the condition of the property, my official cash offer is {{offer_amount}}.

Here's why this is a great deal for you:
- No commissions or closing costs (I pay them all)
- No repairs needed (I buy "As-Is")
- Close on your timeline (as fast as 7 days)
- No walkthroughs or open houses

Please let me know by {{expiry_date}} if you'd like to proceed.

Best,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'motivated-seller-outreach',
    name: 'Motivated Seller Outreach',
    subject: 'Quick question about {{address}}',
    content: `Hi {{name}},

My name is {{sender_name}} and I'm a local investor here in {{city}}. 

I was driving by {{address}} earlier today and it really caught my eye. Are you by any chance the owner?

If you've ever considered selling, I'd love to make you a no-obligation cash offer. I'm looking for a project in this exact neighborhood.

Would you be open to a quick 5-minute chat?

Warmly,
{{sender_name}}`,
    category: 'marketing'
  },
  {
    id: 'investor-relations-new-deal',
    name: 'Investor Deal: {{address}}',
    subject: '[NEW DEAL] {{profit_potential}}% ROI Opportunity in {{city}}',
    content: `Hi {{investor_name}},

I just locked up a killer wholesale deal at {{address}} that I think fits your criteria perfectly.

Quick numbers:
- Purchase Price: {{wholesale_price}}
- ARV: {{arv}}
- Estimated Repairs: {{rehab_estimate}}
- Potential Profit: {{projected_profit}}

This one won't last long. I've attached the photos and a full comps report.

Are you interested in taking a look this afternoon?

Best,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'lead-followup-day-1',
    name: 'Lead Follow-up (Day 1)',
    subject: 'Did you get my message?',
    content: `Hi {{name}},

Just following up on the message I sent yesterday regarding {{address}}. 

I know things can get busy, but I wanted to make sure you saw my offer. I'm genuinely interested in the property and I'm ready to make the process as easy as possible for you.

Give me a shout when you have a moment!

Best,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'lead-followup-week-2',
    name: 'Lead Follow-up (Week 2)',
    subject: 'Still thinking about selling {{address}}?',
    content: `Hi {{name}},

It's been about two weeks since we last spoke. I'm checking back in to see if you've given any more thought to my offer for {{address}}.

Prices in {{neighborhood}} are currently at a peak, so it's a great time to pull equity out if you're ready.

I'm still here if you have any questions or want to see a revised offer.

Cheers,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'closing-coordination-seller',
    name: 'Closing Coordination (Seller)',
    subject: 'Next Steps: Closing for {{address}}',
    content: `Hi {{name}},

Congratulations! We are officially under contract for {{address}}.

To ensure a smooth closing on {{closing_date}}, here's what the title company needs from you:
1. A clear copy of your ID
2. Mortgage payoff information (if applicable)
3. Direct deposit instructions for your proceeds

The title agent, {{title_agent_name}}, will be reaching out shortly with the formal documents.

I'm here for anything you need!

Best,
{{sender_name}}`,
    category: 'legal'
  },
  {
    id: 'probate-inheritance-help',
    name: 'Probate/Inheritance Assistance',
    subject: 'Help with the estate at {{address}}',
    content: `Dear {{name}},

I want to extend my deepest condolences for your recent loss. I know that handling an estate can be an overwhelming task during this difficult time.

If you are looking to simplify things by selling the property at {{address}} without the stress of repairs or a long market listing, I would love to help. 

I buy properties in any condition and can work around your schedule to make the transition as smooth as possible.

Warmly,
{{sender_name}}`,
    category: 'support'
  },
  {
    id: 'abandoned-lead-revival',
    name: 'Abandoned Lead Revival',
    subject: 'Checking back in',
    content: `Hi {{name}},

I was looking through my notes and realized we haven't touched base in a while regarding {{address}}.

Is the property still available, or have you already moved forward with a different plan?

I'm still interested in making a deal work if the timing is right for you now.

Best,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'referral-request',
    name: 'Referral Request',
    subject: 'Quick favor?',
    content: `Hi {{name}},

It was truly a pleasure working with you on the sale of {{address}}!

As you know, my business grows primarily through word-of-mouth. If you know anyone else in {{city}} who needs to sell a property quickly and fairly, would you mind introducing us?

I offer a {{referral_fee}} referral bonus for any deal we successfully close!

Thanks again,
{{sender_name}}`,
    category: 'marketing'
  },
  {
    id: 'pre-foreclosure-options',
    name: 'Pre-Foreclosure Options',
    subject: 'Urgent: Options for {{address}}',
    content: `Hi {{name}},

I'm reaching out because I saw that {{address}} might be facing some challenges with the bank. I wanted to let you know that you have options beyond just letting the property go to foreclosure.

I specialize in helping homeowners in your exact situation by:
- Negotiating short sales
- Providing an immediate cash buyout to save your credit
- Helping with relocation costs

Time is very important right now. Can we talk today?

Sincerely,
{{sender_name}}`,
    category: 'support'
  },
  {
    id: 'absentee-owner-outreach',
    name: 'Absentee Owner Outreach',
    subject: 'Your property at {{address}}',
    content: `Hi {{name}},

I'm a local resident in {{city}} and I noticed your property at {{address}} looks like it might be vacant or being used as a rental. 

If you've ever thought about selling and moving that equity into a different investment, I'd love to make you a fair cash offer. I can close quickly and you won't have to deal with tenants, repairs, or commissions.

Are you open to a conversation?

Best,
{{sender_name}}`,
    category: 'marketing'
  },
  {
    id: 'creative-finance-pitch',
    name: 'Creative Finance Pitch',
    subject: 'A different way to sell {{address}}',
    content: `Hi {{name}},

I noticed you have a great property at {{address}}. If a traditional cash offer doesn't meet your price goals, I have some creative solutions like Seller Financing or Subject-To that might get you exactly what you're looking for while saving on taxes.

These methods often allow me to pay a higher price than a standard cash buyer.

Would you be interested in hearing how it works?

Best,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'tired-landlord-offer',
    name: 'Tired Landlord Offer',
    subject: 'Tired of being a landlord?',
    content: `Hi {{name}},

Managing rentals in {{city}} can be a full-time headache. If you're tired of the "3 Ts"—Tenants, Toilets, and Trash—I'd love to take {{address}} off your hands.

I buy properties with tenants in place, so you don't even have to worry about evictions or vacancies.

Let me know if you're ready to retire your landlord hat.

Best,
{{sender_name}}`,
    category: 'marketing'
  },
  {
    id: 'local-market-update',
    name: 'Local Market Update',
    subject: 'What\'s happening in {{city}} real estate',
    content: `Hi {{name}},

Inventory is low and demand is high in {{neighborhood}} right now! This means your property at {{address}} might be worth significantly more than it was even six months ago.

Would you like a quick, no-obligation valuation of what your property could sell for in today's market?

Reply "YES" and I'll send it over.

Best,
{{sender_name}}`,
    category: 'marketing'
  },
  {
    id: 'holiday-greeting-touchbase',
    name: 'Holiday Greeting',
    subject: 'Happy Holidays from WholeScale!',
    content: `Hi {{name}},

Wishing you a wonderful holiday season! I hope you're enjoying some well-deserved time with family and friends. 

If you have any real estate goals or questions for the new year, I'm here to help you hit the ground running.

Warmly,
{{sender_name}}`,
    category: 'marketing'
  },
  {
    id: 'appointment-reminder-email',
    name: 'Appointment Reminder',
    subject: 'Reminder: Our meeting for {{address}}',
    content: `Hi {{name}},

Just a quick reminder about our scheduled walkthrough/meeting for {{address}} on {{appointment_date}} at {{appointment_time}}.

I'm looking forward to meeting you and seeing the property! 

If anything changes, please let me know.

Best,
{{sender_name}}`,
    category: 'support'
  },
  {
    id: 'post-closing-satisfaction',
    name: 'Post-Closing Satisfaction',
    subject: 'How did we do?',
    content: `Hi {{name}},

Now that we've officially closed on {{address}}, I wanted to reach out and see how the experience was for you. 

My goal is always to make the process as stress-free as possible. Would you mind sharing a quick testimonial or letting me know if there's anything we could have done better?

Thanks again for your trust!

Best,
{{sender_name}}`,
    category: 'support'
  },
  {
    id: 'rejection-reengage',
    name: 'Rejection Re-engage',
    subject: 'Quick re-evaluation for {{address}}',
    content: `Hi {{name}},

I totally understand that my previous offer for {{address}} wasn't what you were hoping for. 

Markets shift quickly, and I've recently adjusted my criteria for {{neighborhood}}. Would you be open to a quick re-evaluation of the property? I'd love to see if we can find a middle ground that works for both of us.

Best,
{{sender_name}}`,
    category: 'sales'
  },
  {
    id: 'vip-buyer-list-invite',
    name: 'VIP Buyer List Invite',
    subject: 'VIP Access: New Off-Market Deals in {{city}}',
    content: `Hi {{name}},

I'm adding a select group of regular investors to my VIP list for {{city}}. 

These members get 24-hour early access to all my off-market deals before they are sent to the general list. These are properties with deep equity and high ROI potential.

Would you like to be added to the inner circle?

Best,
{{sender_name}}`,
    category: 'marketing'
  }
];
