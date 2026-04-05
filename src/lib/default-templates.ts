import { AGENT_EMAIL_TEMPLATES } from '../data/emailTemplates';
import { PRO_CAMPAIGN_TEMPLATES } from '../data/campaignTemplates';

export interface AgentTemplate {
  id: string;
  name: string;
  subject: string;
  body?: string; // Markdown/Plain text for quick replies
  html?: string; // Rich HTML for campaigns
  category: 'email' | 'sms' | 'chat' | 'Marketing' | 'Sales' | 'Product' | 'Onboarding' | 'Operations';
  category_label?: string;
  description?: string;
  tags: string[];
  imageUrl?: string;
}

export { AGENT_EMAIL_TEMPLATES, PRO_CAMPAIGN_TEMPLATES };

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
  },
  {
    id: 'tpl_welcome',
    name: 'Branded Welcome',
    subject: 'Welcome to WholeScale OS, {{name}}! 🚀',
    category: 'Onboarding',
    description: 'A premium welcome email with platform highlights.',
    tags: ['onboarding', 'welcome'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #0a0a0c; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #1f1f23;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -1px; font-style: italic; text-transform: uppercase; margin: 0;">WholeScale <span style="color: #8b5cf6;">OS</span></h1>
        </div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">Welcome aboard, {{name}}!</h2>
        <p style="color: #a1a1aa; line-height: 1.6; font-size: 16px;">We're thrilled to have you join the most powerful property acquisition platform in the game. Here's how to get started:</p>
        <div style="background: #161618; padding: 24px; border-radius: 16px; margin: 30px 0;">
          <ul style="margin: 0; padding-left: 20px; color: #d4d4d8;">
            <li style="margin-bottom: 12px;">Import your first leads via URL or PDF</li>
            <li style="margin-bottom: 12px;">Setup your Team Hub and invite collaborators</li>
            <li style="margin-bottom: 12px;">Link your Stripe account for effortless billing</li>
          </ul>
        </div>
        <a href="https://wholescaleos.com/dashboard" style="display: block; width: 100%; padding: 16px; background: #8b5cf6; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Launch Dashboard</a>
        <p style="text-align: center; color: #52525b; font-size: 12px; margin-top: 40px;">© 2026 WholeScale OS. All rights reserved.</p>
      </div>
    `
  },
  {
    id: 'tpl_feature',
    name: 'Feature Update',
    subject: 'New Feature: AI Lead Scraping is Here! ✨',
    category: 'Product',
    description: 'Highlight new platform capabilities.',
    tags: ['product', 'update'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px;">
        <div style="display: inline-block; padding: 4px 12px; background: #ede9fe; color: #8b5cf6; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">New Release</div>
        <h2 style="font-size: 36px; font-weight: 900; letter-spacing: -2px; margin: 0 0 20px 0;">AI Scraping has arrived.</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Stop wasting time on manual entry. Our new AI engine can now extract property data directly from any URL or PDF document with 99% accuracy.</p>
        <img src="https://images.unsplash.com/photo-1551288049-bbbda5366391?auto=format&fit=crop&q=80&w=800&h=400" style="width: 100%; border-radius: 16px; margin: 30px 0;" />
        <div style="border-left: 4px solid #8b5cf6; padding-left: 20px; margin: 30px 0;">
          <p style="font-weight: 700; margin: 0;">"The AI import saved our team 20+ hours in the first week alone."</p>
          <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">— Sarah Jenkins, Pro Agency User</p>
        </div>
        <a href="https://wholescaleos.com/imports" style="display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Explore Feature</a>
      </div>
    `
  },
  {
    id: 'tpl_promo',
    name: 'Flash Sale',
    subject: 'Flash Sale: 40% OFF Pro & Team Tiers 💸',
    category: 'Marketing',
    description: 'High-conversion sales template.',
    tags: ['marketing', 'promo'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: linear-gradient(135deg, #4f46e5, #9333ea); color: #ffffff; padding: 50px; border-radius: 24px; text-align: center;">
        <h3 style="text-transform: uppercase; letter-spacing: 3px; font-size: 14px; font-weight: 900; margin-bottom: 20px;">Limited Time Offer</h3>
        <h1 style="font-size: 64px; font-weight: 900; margin: 0; line-height: 0.8;">40% OFF</h1>
        <p style="font-size: 18px; margin: 30px 0; opacity: 0.9;">Upgrade to Pro or Team this week and lock in our lowest price ever.</p>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 16px; backdrop-filter: blur(10px); margin-bottom: 30px;">
          <p style="margin: 0; font-weight: 700;">Use Code: <span style="background: #ffffff; color: #4f46e5; padding: 4px 10px; border-radius: 4px;">GROWTH2024</span></p>
        </div>
        <a href="https://wholescaleos.com/pricing" style="display: inline-block; padding: 18px 40px; background: #ffffff; color: #4f46e5; text-decoration: none; border-radius: 99px; font-weight: 900; text-transform: uppercase; box-shadow: 0 10px 20px rgba(0,0,0,0.2);">Claim Discount</a>
      </div>
    `
  },
  {
    id: 'tpl_abandoned_lead',
    name: 'Abandoned Lead Follow-up',
    subject: 'Still interested in {{address}}? 🤔',
    category: 'Sales',
    description: 'Re-engage leads that haven\'t been contacted recently.',
    tags: ['sales', 'followup'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Checking in...</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hi {{name}}, I noticed we haven't connected in a while regarding the property at <strong>{{address}}</strong>. Are you still looking to sell or move forward with an offer?</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 16px; margin: 30px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 700;">Market Alert:</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Inventory is currently low in your area, meaning now is a prime time to get a competitive value for your property.</p>
        </div>
        <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 16px; background: #4f46e5; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Reply to Message</a>
      </div>
    `
  },
  {
    id: 'tpl_open_house',
    name: 'Open House Invitation',
    subject: 'You\'re Invited: Open House at {{address}} 🏠',
    category: 'Marketing',
    description: 'Promote upcoming open houses to your lead list.',
    tags: ['marketing', 'open-house'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #0f172a; color: #ffffff; padding: 40px; border-radius: 24px; text-align: center;">
        <div style="display: inline-block; padding: 4px 12px; background: #3b82f6; color: #ffffff; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">VIP Invitation</div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">Open House Alert</h2>
        <p style="color: #94a3b8; margin-bottom: 30px;">Join us this weekend for an exclusive tour of this incredible property.</p>
        <div style="background: #1e293b; padding: 30px; border-radius: 24px; margin-bottom: 30px; border: 1px solid #334155;">
          <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">{{address}}</h3>
          <p style="color: #3b82f6; font-weight: 900; font-size: 18px; margin: 0;">Saturday 12pm - 4pm</p>
        </div>
        <a href="https://wholescaleos.com/calendar" style="display: block; width: 100%; padding: 16px; background: #ffffff; color: #0f172a; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">RSVP Now</a>
      </div>
    `
  },
  {
    id: 'tpl_survey',
    name: 'Client Survey',
    subject: 'How did we do? Tell us your feedback! ⭐',
    category: 'Operations',
    description: 'Post-closing feedback request.',
    tags: ['operations', 'survey'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 32px; border: 1px solid #e2e8f0; text-align: center;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Your opinion matters.</h2>
        <p style="color: #64748b; line-height: 1.6; font-size: 16px;">We recently closed the deal on <strong>{{address}}</strong> and we'd love to know how your experience was working with WholeScale OS.</p>
        <div style="margin: 40px 0; font-size: 30px; letter-spacing: 10px;">⭐ ⭐ ⭐ ⭐ ⭐</div>
        <a href="https://wholescaleos.com/settings" style="display: block; width: 100%; padding: 18px; background: #0f172a; color: #ffffff; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 900; text-transform: uppercase;">Take 2-Min Survey</a>
      </div>
    `
  },
  {
    id: 'tpl_revenue_share',
    name: 'Revenue Share Request',
    subject: 'Join our Revenue Share network and earn! 💸',
    category: 'Marketing',
    description: 'Invite users to become revenue share partners.',
    tags: ['marketing', 'revenue-share'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f8fafc; color: #0f172a; padding: 40px; border-radius: 24px; border: 1px dashed #cbd5e1; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 20px;">🤝</div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 15px;">Revenue Share Program.</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">We believe in sharing the rewards of our growth. Join our revenue share network by bringing your contacts to the platform and earn a lifetime commission on their usage!</p>
        <div style="background: #ffffff; border-radius: 20px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 30px;">
          <p style="margin: 0; font-weight: 800; font-size: 14px; color: #64748b; text-transform: uppercase;">Your Partner Link:</p>
          <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 18px; color: #3b82f6; font-weight: bold;">wholescaleos.com/share/{{name}}</p>
        </div>
        <a href="https://wholescaleos.com/dashboard/billing?tab=revenue-share" style="display: block; width: 100%; padding: 16px; background: #3b82f6; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Become a Partner</a>
      </div>
    `
  },
  {
    id: 'tpl_market_update',
    name: 'Market Update',
    subject: 'Monthly Market Trends: What\'s your home worth? 📈',
    category: 'Marketing',
    description: 'Provide value to leads with market insights.',
    tags: ['marketing', 'update'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 20px;">Market Trend Report: {{name}}</h2>
        <p style="color: #4b5563; margin-bottom: 30px;">The real estate market is shifting. Here are the current trends in your area:</p>
        <table width="100%" cellPadding="15" cellSpacing="0" style="margin-bottom: 30px; border-collapse: separate; border-spacing: 20px 0;">
          <tr>
            <td style="background: #f9fafb; border-radius: 12px; text-align: center; width: 50%;">
              <p style="margin: 0; font-size: 10px; font-weight: 900; color: #6b7280; text-transform: uppercase;">Avg Sale Price</p>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; color: #059669;">+4.2% ↑</p>
            </td>
            <td style="background: #f9fafb; border-radius: 12px; text-align: center; width: 50%;">
              <p style="margin: 0; font-size: 10px; font-weight: 900; color: #6b7280; text-transform: uppercase;">Inventory</p>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; color: #dc2626;">-12.5% ↓</p>
            </td>
          </tr>
        </table>
        <a href="https://wholescaleos.com/map" style="display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">View Local Trends</a>
      </div>
    `
  },
  {
    id: 'tpl_new_listing',
    name: 'New Listing Alert',
    subject: 'Just Listed: New Investment Property! 🔥 {{address}}',
    category: 'Sales',
    description: 'Alert buyers or sellers about new listings.',
    tags: ['sales', 'listing'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 0; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800&h=450" style="width: 100%; display: block;" />
        <div style="padding: 30px;">
          <div style="display: inline-block; padding: 4px 10px; background: #dcfce7; color: #166534; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">New Listing</div>
          <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 10px 0;">{{address}}</h2>
          <p style="font-size: 20px; font-weight: 900; color: #3b82f6; margin: 0 0 20px 0;">Asking: $245,000</p>
          <div style="height: 1px; background: #f1f5f9; margin: 20px 0;"></div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">Incredible off-market opportunity with high equity potential. Motivated seller. Needs minor cosmetic updates. ARV estimated at $380,000.</p>
          <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 16px; background: #3b82f6; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Review Full Deal Package</a>
        </div>
      </div>
    `
  },
  {
    id: 'tpl_off_market',
    name: 'Off-Market Deal',
    subject: 'SECRET DEAL: Off-Market Project in {{city}} 🤫',
    category: 'Sales',
    description: 'High-urgency template for off-market wholesale deals.',
    tags: ['sales', 'wholesale'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #000000; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #333;">
        <div style="color: #f59e0b; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; margin-bottom: 10px;">Exclusive Wholesale Opportunity</div>
        <h2 style="font-size: 32px; font-weight: 900; margin: 0 0 20px 0; line-height: 1.1;">Off-Market Deep Discount.</h2>
        <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">We just secured a highly motivated seller at <strong>{{address}}</strong>. This property is NOT on the MLS and won't last 24 hours.</p>
        <div style="background: #111; padding: 25px; border-radius: 16px; border: 1px solid #222; margin: 30px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #222; pb-3;">
            <span style="color: #71717a;">Buy Price</span>
            <span style="font-weight: 900; color: #34d399;">$185,000</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #222; pb-3;">
            <span style="color: #71717a;">Est. Rehab</span>
            <span style="font-weight: 900;">$45,000</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #71717a;">ARV</span>
            <span style="font-weight: 900; color: #60a5fa;">$315,000</span>
          </div>
        </div>
        <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 18px; background: #ffffff; color: #000000; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Unlock Address & Photos</a>
      </div>
    `
  },
  {
    id: 'tpl_cash_offer',
    name: 'Cash Offer Proposal',
    subject: 'We want to buy {{address}} for cash 💸',
    category: 'Sales',
    description: 'Professional cash offer template for sellers.',
    tags: ['sales', 'offer'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Formal Cash Offer.</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hi {{name}}, we've completed our initial walkthrough of <strong>{{address}}</strong> and we're prepared to make a solid cash offer with an aggressive closing timeline.</p>
        <div style="background: #fdf2f2; border-left: 5px solid #ef4444; padding: 25px; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0; color: #ef4444; font-weight: 900; text-transform: uppercase; font-size: 12px;">Immediate Benefits</p>
          <ul style="margin: 15px 0 0 0; color: #7f1d1d; font-size: 14px; padding-left: 20px;">
            <li style="margin-bottom: 8px;">No Inspections or Appraisals</li>
            <li style="margin-bottom: 8px;">We pay ALL closing costs</li>
            <li style="margin-bottom: 8px;">Close in as little as 10 days</li>
            <li>Buy "As-Is" (No repairs needed)</li>
          </ul>
        </div>
        <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 18px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">View Full Offer Details</a>
      </div>
    `
  },
  {
    id: 'tpl_buyer_checkin',
    name: 'Buyer Check-in',
    subject: 'Quick Q: What are you looking for in {{city}}? 🎯',
    category: 'Sales',
    description: 'Qualification template for new buyers.',
    tags: ['sales', 'qualification'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f9fafb; color: #111; padding: 40px; border-radius: 24px; border: 1px solid #d1d5db; text-align: center;">
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 20px;">Refining your search.</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi {{name}}, I want to make sure I only send you the absolute best deals in <strong>{{city}}</strong> that fit your specific buy box. Can you take 30 seconds to update your preferences?</p>
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin: 30px 0;">
          <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 16px;">
            <div style="font-size: 24px;">🏢</div>
            <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; margin-top: 10px;">Residential</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 16px;">
            <div style="font-size: 24px;">🏪</div>
            <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; margin-top: 10px;">Commercial</div>
          </div>
        </div>
        <a href="https://wholescaleos.com/settings" style="display: block; width: 100%; padding: 16px; background: #4f46e5; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Update Buy Box</a>
      </div>
    `
  },
  {
    id: 'tpl_closing_coord',
    name: 'Closing Coordination',
    subject: 'Updates on your closing for {{address}} 🗓️',
    category: 'Operations',
    description: 'Keep clients informed during the escrow process.',
    tags: ['operations', 'escrow'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 20px;">Closing Status Update.</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi {{name}}, here is a quick overview of the current status for the closing of <strong>{{address}}</strong>. We're on track!</p>
        <div style="margin: 30px 0;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="width: 24px; height: 24px; border-radius: 12px; background: #10b981; color: #fff; text-align: center; line-height: 24px; font-size: 12px;">✓</div>
            <div style="margin-left: 15px; font-weight: 700;">Earnest Money Deposited</div>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="width: 24px; height: 24px; border-radius: 12px; background: #60a5fa; color: #fff; text-align: center; line-height: 24px; font-size: 12px;">→</div>
            <div style="margin-left: 15px; font-weight: 700;">Title Commitment Search</div>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 24px; height: 24px; border-radius: 12px; background: #e5e7eb; color: #999; text-align: center; line-height: 24px; font-size: 12px;">○</div>
            <div style="margin-left: 15px; font-weight: 700; color: #999;">Final Signing Scheduled</div>
          </div>
        </div>
        <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">View Timeline Details</a>
      </div>
    `
  },
  {
    id: 'tpl_price_reduction',
    name: 'Price Reduction',
    subject: 'PRICE DROP: Now ${{price}} for {{address}} 📉',
    category: 'Sales',
    description: 'Announce a motivated price drop to buyers.',
    tags: ['sales', 'price-drop'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #eef2ff; color: #000000; padding: 40px; border-radius: 24px; text-align: center;">
        <div style="display: inline-block; padding: 4px 12px; background: #4f46e5; color: #fff; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 20px;">Price Drop Alert</div>
        <h2 style="font-size: 36px; font-weight: 900; margin: 0 0 10px 0;">New Asking Price.</h2>
        <div style="font-size: 48px; font-weight: 900; color: #4f46e5; margin-bottom: 20px;">\${{price}}</div>
        <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">The seller of <strong>{{address}}</strong> is highly motivated and has just authorized a significant price reduction. This deal is now back to having 30%+ equity potential.</p>
        <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 18px; background: #4f46e5; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Run ROI Numbers</a>
      </div>
    `
  },
  {
    id: 'tpl_valuation',
    name: 'Property Valuation',
    subject: 'Your custom property report for {{address}} 📊',
    category: 'Marketing',
    description: 'Send a "free" valuation report to capture seller interest.',
    tags: ['marketing', 'valuation'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 20px;">Expert Valuation Report.</h2>
        <p style="color: #4b5563; line-height: 1.6;">Hi {{name}}, we've updated the market valuation for your property at <strong>{{address}}</strong> based on the latest neighborhood closings.</p>
        <div style="margin: 30px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 20px 0;">
          <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b;">Current Estimated Range</p>
          <div style="font-size: 28px; font-weight: 900; margin: 10px 0;">$315,000 — $342,000</div>
          <p style="margin: 0; font-size: 10px; color: #94a3b8;">*Estimation based on WholeScale OS AI Market Intelligence.</p>
        </div>
        <a href="https://wholescaleos.com/leads" style="display: block; width: 100%; padding: 16px; background: #000000; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">View Comp Analysis</a>
      </div>
    `
  },
  {
    id: 'tpl_referral_agent',
    name: 'Agent Referral Program',
    subject: 'Agent Referral: How to earn with WholeScale OS 🔗',
    category: 'Marketing',
    description: 'Target real estate agents for your referral network.',
    tags: ['marketing', 'referral'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f0f7ff; color: #1e3a8a; padding: 40px; border-radius: 24px; border: 1px solid #bfdbfe; text-align: center;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 15px;">Partnership Invitation.</h2>
        <p style="color: #1e40af; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Hi {{name}}, do you have pocket listings or leads that don't fit the MLS? Our network of 10,000+ investors is ready to close cash deals fast. Refer a deal and earn!</p>
        <div style="background: #ffffff; padding: 25px; border-radius: 20px; margin-bottom: 30px; border: 1px solid #dbeafe;">
          <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 900;">25% Referral Split</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">On every successfully closed wholesale assignment generated from your leads.</p>
        </div>
        <a href="https://wholescaleos.com/share" style="display: block; width: 100%; padding: 16px; background: #1d4ed8; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Register as Partner</a>
      </div>
    `
  },
  {
    id: 'tpl_seller_followup',
    name: 'Seller Inquiry Follow-up',
    subject: 'Still looking to sell {{address}}? 🏠',
    category: 'Sales',
    description: 'Automated follow-up for initial seller inquiries.',
    tags: ['sales', 'followup'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 20px;">Next steps...</h2>
        <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hi {{name}}, just a quick follow-up to our conversation about <strong>{{address}}</strong>. We're still very interested in providing a cash solution for this property.</p>
        <div style="background: #fdf2f8; padding: 20px; border-radius: 16px; margin: 30px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #be185d;">Fast-Track Process:</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #be185d;">Reply to this email or click below to schedule a 10-minute property review call.</p>
        </div>
        <a href="https://wholescaleos.com/calendar" style="display: block; width: 100%; padding: 16px; background: #be185d; color: #ffffff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Schedule Property Review</a>
      </div>
    `
  },
  {
    id: 'tpl_success_story',
    name: 'Wholesale Success Story',
    subject: 'Success Story: Closed {{city}} deal in 14 days! 🏆',
    category: 'Marketing',
    description: 'Social proof template to build trust with leads.',
    tags: ['marketing', 'success'],
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #000; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">Another win in {{city}}.</h2>
        <p style="color: #64748b; font-size: 16px; margin-bottom: 30px;">We just helped a client liquidate a distressed asset in record time. Here's how we did it using the WholeScale OS network.</p>
        <div style="background: #111; color: #fff; padding: 30px; border-radius: 24px; margin-bottom: 30px;">
          <div style="font-size: 12px; color: #a1a1aa; text-transform: uppercase; font-weight: 900; margin-bottom: 5px;">Actual Profit</div>
          <div style="font-size: 36px; font-weight: 900; color: #34d399;">$24,500</div>
        </div>
        <p style="font-style: italic; color: #475569; margin-bottom: 30px;">"The speed of the platform allowed us to find the right buyer in hours, not days."</p>
        <a href="https://wholescaleos.com/map" style="display: block; width: 100%; padding: 16px; background: #000; color: #fff; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">See Where We're Buying</a>
      </div>
    `
  }
];
