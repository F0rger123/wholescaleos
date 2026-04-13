/**
 * Content Generation Engine
 * Generates SMS, Emails, and Scripts locally using templates.
 */

interface Variables {
  leadName?: string;
  propertyAddress?: string;
  userName?: string;
  offerAmount?: number;
  arv?: number;
  timeOfDay?: string;
}

export const TEMPLATES = {
  sms: {
    absentee: [
      "Hi {leadName}, my local records show you own {propertyAddress}. I'm an investor looking for another project in the area. Would you be open to an all-cash offer?",
      "Hey {leadName}, {userName} here. I was driving by {propertyAddress} and wanted to see if you've ever considered selling it? I buy as-is and cover all closing costs.",
      "Hello {leadName}, I'm looking to buy a house near {propertyAddress} and yours caught my eye. Any interest in receiving a no-obligation cash offer this week?"
    ],
    followUp: [
      "Hi {leadName}, checking back in on {propertyAddress}. Are you still considering selling? The market is hot right now.",
      "Hey {leadName}, {userName} again. Let me know if you've given any more thought to my cash offer for {propertyAddress}. I'm ready to close whenever you are."
    ],
    negotiating: [
      "Hi {leadName}, based on the repairs needed at {propertyAddress}, I can be at ${offerAmount} net to you. Let me know if we can make this work.",
      "{leadName}, I ran the numbers again on {propertyAddress}. The highest I can go while keeping margins safe is ${offerAmount}. Does that sound fair?"
    ]
  },
  email: {
    cold: `Subject: Quick Inquiry regarding {propertyAddress}

Hi {leadName},

My name is {userName} and I am a local real estate investor in the area. 

I was recently reviewing public records and noticed you are the owner of {propertyAddress}. I am actively looking for my next investment project and your property caught my attention.

If you have ever considered selling, I would love to make you a competitive, all-cash offer. 

When you sell to us:
- You pay ZERO agent commissions
- We pay ALL closing costs
- You make ZERO repairs (we buy 100% As-Is)
- We close on your timeline

Even if you aren't ready to sell today, I'd love to connect. Please reply to this email or call/text me anytime.

Best,
{userName}
`,
    offer: `Subject: Cash Offer for {propertyAddress}

Hi {leadName},

It was great connecting with you about {propertyAddress}.

Based on our conversation and my analysis of the neighborhood, I am prepared to offer you ${offerAmount} in cash for the property.

As a reminder, this offer means:
- No Realtor fees (saves you 6%)
- We cover closing costs (saves you ~2%)
- No repairs or cleaning needed
- Fast closing

If you accept, I can send over a simple 1-page purchase agreement today. Let me know what you think.

Thanks,
{userName}
`
  },
  script: {
    coldCall: `[RING RING]
    
YOU: Hello, is this {leadName}?

LEAD: Yes, who is this?

YOU: Hi {leadName}, my name is {userName}. I'm giving you a quick call because I'm a local investor looking to buy another property in the area, and I was calling to see if you would consider an all-cash offer on your property at {propertyAddress}?

IF YES: "Great! Can you tell me a little bit about the condition of the house? Has the roof or HVAC been replaced recently?"

IF NO: "I completely understand. If anything changes in the future, do you mind if I check back in with you in a few months?"

IF HOW MUCH: "Well, we buy properties entirely as-is and cover all closing costs. To give you a fair number, I'd need to know a bit about the condition. When were the kitchen and bathrooms last updated?"`
  }
};

/**
 * Replaces placeholders in a template with actual variable values.
 */
function fillTemplate(template: string, vars: Variables): string {
  let result = template;
  result = result.replace(/{leadName}/g, vars.leadName || 'there');
  result = result.replace(/{propertyAddress}/g, vars.propertyAddress || 'your property');
  result = result.replace(/{userName}/g, vars.userName || 'I');
  result = result.replace(/{offerAmount}/g, vars.offerAmount ? vars.offerAmount.toLocaleString() : '[Offer Amount]');
  result = result.replace(/{arv}/g, vars.arv ? vars.arv.toLocaleString() : '[ARV]');
  return result;
}

/**
 * Generates content based on a type and context.
 */
export function generateContent(type: 'sms_absentee' | 'sms_followup' | 'sms_negotiating' | 'email_cold' | 'email_offer' | 'script_coldcall', vars: Variables): string {
  switch (type) {
    case 'sms_absentee':
      return fillTemplate(TEMPLATES.sms.absentee[Math.floor(Math.random() * TEMPLATES.sms.absentee.length)], vars);
    case 'sms_followup':
      return fillTemplate(TEMPLATES.sms.followUp[Math.floor(Math.random() * TEMPLATES.sms.followUp.length)], vars);
    case 'sms_negotiating':
      return fillTemplate(TEMPLATES.sms.negotiating[Math.floor(Math.random() * TEMPLATES.sms.negotiating.length)], vars);
    case 'email_cold':
      return fillTemplate(TEMPLATES.email.cold, vars);
    case 'email_offer':
      return fillTemplate(TEMPLATES.email.offer, vars);
    case 'script_coldcall':
      return fillTemplate(TEMPLATES.script.coldCall, vars);
    default:
      return "I'm sorry, I don't have a template for that specific request.";
  }
}
