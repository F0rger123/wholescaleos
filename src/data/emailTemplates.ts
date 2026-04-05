import { AgentTemplate } from '../lib/default-templates';

export const AGENT_EMAIL_TEMPLATES: AgentTemplate[] = [
  {
    id: 'agent-welcome-lead',
    name: 'Welcome Lead (The Premium Intro)',
    subject: 'Welcome to the Family, {{name}}! 🚀',
    category: 'Sales',
    tags: ['welcome', 'new-lead'],
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; color: #111827; padding: 0; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <img src="{{header_image}}" style="width: 100%; height: 240px; object-fit: cover; display: block;" />
        <div style="padding: 40px; text-align: center;">
          <h2 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; margin: 0 0 16px 0;">Welcome, {{name}}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">We're thrilled to assist you with your real estate journey in <strong>{{area}}</strong>. Our mission is to make your transition as smooth as possible.</p>
          <div style="background: #f9fafb; padding: 24px; border-radius: 16px; margin-bottom: 32px; text-align: left; border-left: 4px solid #6366f1;">
            <p style="margin: 0; font-weight: 700; font-size: 14px; text-transform: uppercase; color: #6366f1;">Next Steps:</p>
            <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #374151;">
              <li>Confirm your search criteria</li>
              <li>Schedule a 10-minute discovery call</li>
              <li>Get access to our off-market inventory</li>
            </ul>
          </div>
          <a href="#" style="display: inline-block; padding: 16px 40px; background: #6366f1; color: white; text-decoration: none; border-radius: 12px; font-weight: 900; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);">Get Started Today</a>
          <p style="margin-top: 40px; font-size: 14px; color: #9ca3af;">Best regards,<br><strong style="color: #111827;">{{agent_name}}</strong></p>
        </div>
      </div>
    `
  },
  {
    id: 'agent-property-alert',
    name: 'Property Alert (The Modern Grid)',
    subject: 'New Listing Alert: Check out this gem in {{area}}! ✨',
    category: 'Sales',
    tags: ['alert', 'listing'],
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6199f7a096?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #0f172a; color: #ffffff; padding: 0; border-radius: 32px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="position: relative;">
          <img src="{{header_image}}" style="width: 100%; height: 300px; object-fit: cover; display: block;" />
          <div style="position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.2);">
            <span style="font-size: 12px; font-weight: 900; letter-spacing: 1px;">JUST LISTED</span>
          </div>
        </div>
        <div style="padding: 40px;">
          <h3 style="font-size: 24px; font-weight: 800; margin: 0 0 8px 0;">{{address}}</h3>
          <p style="font-size: 20px; color: #3b82f6; font-weight: 900; margin-bottom: 24px;">Price: $425,000</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 32px;">
            <div style="background: #1e293b; padding: 12px; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase;">Beds</p>
              <p style="margin: 4px 0 0 0; font-weight: 700;">4</p>
            </div>
            <div style="background: #1e293b; padding: 12px; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase;">Baths</p>
              <p style="margin: 4px 0 0 0; font-weight: 700;">3</p>
            </div>
            <div style="background: #1e293b; padding: 12px; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase;">SqFt</p>
              <p style="margin: 4px 0 0 0; font-weight: 700;">2,450</p>
            </div>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 18px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Schedule a Private Tour</a>
        </div>
      </div>
    `
  },
  {
    id: 'agent-market-update',
    name: 'Market Update (The Statistical)',
    subject: 'Monthly Trends: What\'s happening in {{area}}? 📈',
    category: 'Marketing',
    tags: ['market-update', 'report'],
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: #111827; padding: 40px; text-align: center;">
          <h2 style="color: #6366f1; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Market Report</h2>
          <h1 style="color: white; font-size: 28px; font-weight: 900; margin: 0;">{{area}} Real Estate Trends</h1>
        </div>
        <div style="padding: 40px;">
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">Inventory is at record lows right now! This means your property might be worth <strong>15% more</strong> than it was last year.</p>
          <div style="margin-bottom: 32px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600;">Avg. Sale Price</span>
              <span style="color: #059669; font-weight: 900;">$545,000 (+4.2%) ↑</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600;">Avg. Days on Market</span>
              <span style="color: #ef4444; font-weight: 900;">12 Days (-5.1%) ↓</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0;">
              <span style="color: #64748b; font-weight: 600;">Total Inventory</span>
              <span style="color: #111827; font-weight: 900;">145 Units</span>
            </div>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 16px; background: #6366f1; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900;">Get Your Custom Evaluation</a>
        </div>
      </div>
    `
  },
  {
    id: 'agent-open-house',
    name: 'Open House Inv (The Social)',
    subject: 'You\'re Invited: Champagne Open House at {{address}}! 🥂',
    category: 'Marketing',
    tags: ['open-house', 'invitation'],
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <img src="{{header_image}}" style="width: 100%; height: 350px; object-fit: cover; display: block;" />
        <div style="padding: 40px; text-align: center;">
          <div style="display: inline-block; padding: 4px 12px; background: #fdf2f8; color: #db2777; border-radius: 99px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Exclusive Event</div>
          <h2 style="font-size: 32px; font-weight: 900; margin: 0 0 8px 0; color: #1e293b;">Join Us Saturday</h2>
          <p style="font-size: 16px; color: #64748b; margin-bottom: 32px;">Experience this stunning residence in person. Refreshments will be served.</p>
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 20px; padding: 30px; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">{{address}}</p>
            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 900; color: #db2777;">June 15th | 1:00 PM — 4:00 PM</p>
          </div>
          <a href="#" style="display: inline-block; padding: 16px 40px; background: #1e293b; color: white; text-decoration: none; border-radius: 12px; font-weight: 900;">Add to My Calendar</a>
        </div>
      </div>
    `
  },
  {
    id: 'agent-offer-sent',
    name: 'Offer Sent (The Professional)',
    subject: 'Official Offer Submitted: {{address}} 📄',
    category: 'Sales',
    tags: ['offer', 'confirmation'],
    imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; padding: 40px;">
        <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 24px;">📝</div>
        <h2 style="font-size: 28px; font-weight: 900; margin: 0 0 12px 0;">Offer Submitted.</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">Hi {{name}}, we have officially submitted our offer for <strong>{{address}}</strong>. Our terms are highly competitive and designed to stand out.</p>
        <div style="background: #f9fafb; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="width: 24px; height: 24px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">✓</span>
            <span style="font-weight: 600;">Full Cash Offer</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span style="width: 24px; height: 24px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">✓</span>
            <span style="font-weight: 600;">14-Day Close Timeline</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="width: 24px; height: 24px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px;">✓</span>
            <span style="font-weight: 600;">As-Is Selection</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #6b7280;">I will keep you notified immediately as soon as we hear back from the listing agent.</p>
      </div>
    `
  },
  {
    id: 'agent-offer-accepted',
    name: 'Offer Accepted (The Celebration)',
    subject: 'CONGRATULATIONS! Your offer was accepted! 🎉',
    category: 'Sales',
    tags: ['accepted', 'congratulations'],
    imageUrl: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #10b981; padding: 60px 40px; border-radius: 32px; text-align: center; color: white;">
        <h1 style="font-size: 64px; margin: 0 0 20px 0;">🥂</h1>
        <h2 style="font-size: 42px; font-weight: 900; letter-spacing: -2px; margin: 0 0 16px 0;">It's Official!</h2>
        <h3 style="font-size: 20px; font-weight: 600; opacity: 0.9; margin-bottom: 40px;">The offer for <strong>{{address}}</strong> was accepted!</h3>
        <div style="background: rgba(255,255,255,0.2); padding: 24px; border-radius: 20px; backdrop-filter: blur(10px); margin-bottom: 40px;">
          <p style="margin: 0; font-size: 16px; font-weight: 700;">We're officially under contract. Time to open escrow and get moving!</p>
        </div>
        <a href="#" style="background: white; color: #10b981; padding: 18px 44px; border-radius: 12px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">View Transaction Timeline</a>
      </div>
    `
  },
  {
    id: 'agent-closing-soon',
    name: 'Closing Soon (The Logistics)',
    subject: 'Closing Timeline: Important Dates for {{address}} 📅',
    category: 'Operations',
    tags: ['closing', 'logistics'],
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bbbda5366391?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #111827; padding: 30px; text-align: center;">
          <h2 style="color: #6366f1; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Operations Update</h2>
          <h1 style="color: white; font-size: 24px; font-weight: 900; margin: 0;">Road to Closing</h1>
        </div>
        <div style="padding: 40px;">
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 32px;">Hi {{name}}, we're making great progress on <strong>{{address}}</strong>. Here are the key milestones ahead:</p>
          <div style="position: relative; padding-left: 40px;">
            <div style="position: absolute; left: 16px; top: 0; bottom: 0; width: 2px; background: #f1f5f9;"></div>
            <div style="margin-bottom: 24px; position: relative;">
               <div style="position: absolute; left: -32px; top: 0; width: 14px; height: 14px; background: #10b981; border: 4px solid #ffffff; border-radius: 50%;"></div>
               <p style="margin: 0; font-weight: 700; color: #111827;">Inspection Completed</p>
               <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">May 12th</p>
            </div>
            <div style="margin-bottom: 24px; position: relative;">
               <div style="position: absolute; left: -32px; top: 0; width: 14px; height: 14px; background: #6366f1; border: 4px solid #ffffff; border-radius: 50%;"></div>
               <p style="margin: 0; font-weight: 700; color: #111827;">Appraisal Ordered</p>
               <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">May 18th (Expected)</p>
            </div>
            <div style="position: relative;">
               <div style="position: absolute; left: -32px; top: 0; width: 14px; height: 14px; background: #e2e8f0; border: 4px solid #ffffff; border-radius: 50%;"></div>
               <p style="margin: 0; font-weight: 700; color: #94a3b8;">Final Signing & Keys</p>
               <p style="margin: 4px 0 0 0; font-size: 14px; color: #94a3b8;">June 1st</p>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'agent-review-request',
    name: 'Thank You + Review (The 5-Star)',
    subject: 'We loved working with you, {{name}}! ⭐⭐⭐⭐⭐',
    category: 'Operations',
    tags: ['review', 'feedback'],
    imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2923216?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; padding: 48px; text-align: center;">
        <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">You're officially a homeowner!</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">It was an absolute pleasure assisting you with <strong>{{address}}</strong>. Our business grows on positive word of mouth from clients like you.</p>
        <div style="margin-bottom: 32px;">
          <div style="font-size: 32px; color: #fbbf24; letter-spacing: 8px; margin-bottom: 24px;">★ ★ ★ ★ ★</div>
          <p style="font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Care to share your experience?</p>
        </div>
        <a href="#" style="display: block; width: 100%; padding: 18px; background: #111827; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Leave a Google Review</a>
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">It only takes 30 seconds and helps us more than you know!</p>
      </div>
    `
  },
  {
    id: 'agent-referral-request',
    name: 'Referral Request (The Networker)',
    subject: 'A small favor... and a reward for you! 🤝',
    category: 'Marketing',
    tags: ['referral', 'marketing'],
    imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border-radius: 24px; padding: 48px; text-align: center;">
        <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 24px;">🤝</div>
        <h2 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; margin: 0 0 16px 0;">Who's Next?</h2>
        <p style="font-size: 16px; line-height: 1.6; opacity: 0.8; margin-bottom: 32px;">I'm currently opening my calendar for new clients in <strong>{{area}}</strong>. If you know anyone looking to buy, sell, or invest, I'd love to provide them with the same VIP service you received.</p>
        <div style="background: #ffffff; color: #111827; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
           <p style="margin: 0; font-weight: 900; text-transform: uppercase; font-size: 12px; color: #6366f1;">REFERRAL REWARD</p>
           <p style="margin: 12px 0 0 0; font-size: 20px; font-weight: 800;">Receive $500 as a thank you for every successfully closed referral!</p>
        </div>
        <a href="#" style="display: inline-block; padding: 16px 40px; background: #6366f1; color: white; text-decoration: none; border-radius: 12px; font-weight: 900;">Send Me a Name</a>
      </div>
    `
  },
  {
    id: 'agent-holiday-greeting',
    name: 'Holiday Greeting (The Warm)',
    subject: 'Warmest wishes from our family to yours! 🎄',
    category: 'Marketing',
    tags: ['holiday', 'marketing'],
    imageUrl: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden; text-align: center;">
        <img src="{{header_image}}" style="width: 100%; height: 350px; object-fit: cover; display: block;" />
        <div style="padding: 48px;">
          <h2 style="font-size: 36px; font-weight: 900; letter-spacing: -2px; margin: 0 0 16px 0; color: #1e293b;">Happy Holidays!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #64748b; margin-bottom: 32px;">Hi {{name}}, wishing you a wonderful holiday season filled with joy and prosperity. We're grateful to be part of your journey this year.</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 32px;" />
          <p style="font-size: 14px; font-style: italic; color: #94a3b8;">"May your home be filled with laughter and your heart with peace."</p>
          <p style="margin-top: 32px; font-size: 16px; font-weight: 700; color: #111827;">Warmly,<br>{{agent_name}}</p>
        </div>
      </div>
    `
  },
  {
    id: 'agent-anniversary',
    name: 'Home Anniversary (The Celebration)',
    subject: 'Happy 1-Year House-versary! 🏠🍰',
    category: 'Marketing',
    tags: ['anniversary', 'loyalty'],
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; padding: 48px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <h1 style="font-size: 48px; margin-bottom: 24px;">🏠</h1>
        <h2 style="font-size: 32px; font-weight: 900; margin: 0 0 16px 0;">Happy Anniversary!</h2>
        <p style="font-size: 18px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">Hi {{name}}, can you believe it's been a whole year since you moved into <strong>{{address}}</strong>? We hope you've been building wonderful memories.</p>
        <div style="background: #fdf2f2; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
          <p style="margin: 0; font-weight: 800; color: #be185d;">Average Equity Gained in your area: +$42,000 ✨</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">Curious about what your home is worth today? Reply "VALUE" and I'll send you a fresh report!</p>
      </div>
    `
  },
  {
    id: 'agent-price-reduction',
    name: 'Price Reduction (The Urgent)',
    subject: 'PRICE REDUCED: {{address}} is now a steal! 🔥',
    category: 'Sales',
    tags: ['price-drop', 'urgent'],
    imageUrl: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #ef4444; padding: 12px; text-align: center;">
          <span style="color: white; font-weight: 900; letter-spacing: 2px; font-size: 12px;">HUGE SAVINGS</span>
        </div>
        <img src="{{header_image}}" style="width: 100%; height: 280px; object-fit: cover; display: block;" />
        <div style="padding: 40px; text-align: center;">
          <h2 style="font-size: 28px; font-weight: 900; margin: 0 0 8px 0; color: #1e293b;">Significant Price Drop</h2>
          <p style="font-size: 16px; color: #64748b; margin-bottom: 24px;">The seller of <strong>{{address}}</strong> has just authorized a major price reduction. This is now the best value in <strong>{{area}}</strong>.</p>
          <div style="background: #fef2f2; padding: 24px; border-radius: 20px; border: 1px solid #fecaca; margin-bottom: 32px;">
             <span style="display: block; font-size: 14px; text-decoration: line-through; color: #9ca3af; margin-bottom: 4px;">Original: $485,000</span>
             <span style="display: block; font-size: 42px; font-weight: 900; color: #ef4444;">Now: $450,000</span>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 18px; background: #ef4444; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Request a Walkthrough</a>
        </div>
      </div>
    `
  },
  {
    id: 'agent-new-listing',
    name: 'New Listing (The Hero)',
    subject: 'Just Listed: The home you\'ve been waiting for! 🏠',
    category: 'Sales',
    tags: ['new-listing', 'sales'],
    imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
        <img src="{{header_image}}" style="width: 100%; height: 400px; object-fit: cover; display: block;" />
        <div style="padding: 40px;">
          <div style="background: #ede9fe; color: #6366f1; padding: 6px 12px; border-radius: 8px; display: inline-block; font-size: 10px; font-weight: 900; letter-spacing: 1px; margin-bottom: 20px;">NEW LISTING</div>
          <h2 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; margin: 0 0 8px 0;">Stunning Modern Retreat</h2>
          <p style="font-size: 18px; color: #6b7280; font-weight: 500; margin-bottom: 24px;">{{address}}</p>
          <div style="height: 1px; background: #f1f5f9; margin-bottom: 24px;"></div>
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">This architectural masterpiece features floor-to-ceiling windows, a gourmet kitchen, and panoramic views of <strong>{{area}}</strong>. Truly a one-of-a-kind opportunity.</p>
          <div style="display: flex; gap: 16px;">
            <a href="#" style="flex: 1; padding: 18px; background: #6366f1; color: white; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 900;">View Full Gallery</a>
            <a href="#" style="flex: 1; padding: 18px; background: #111827; color: white; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 900;">Ask a Question</a>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'agent-buyer-consultation',
    name: 'Consultation Confirmation (The Expert)',
    subject: 'Confirmed: Our Consultation for {{area}} ☕',
    category: 'Sales',
    tags: ['consultation', 'confirmation'],
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; padding: 48px;">
        <h2 style="font-size: 28px; font-weight: 900; margin: 0 0 16px 0;">Coffee is on me! ☕</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">Hi {{name}}, I'm looking forward to our strategy session tomorrow. We'll go over your goals, the current market in <strong>{{area}}</strong>, and mapping out your success plan.</p>
        <div style="background: #f8fafc; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
           <p style="margin: 0; font-size: 14px; font-weight: 900; color: #64748b; text-transform: uppercase;">APPOINTMENT DETAILS</p>
           <p style="margin: 12px 0 0 0; font-size: 18px; font-weight: 700;">Tomorrow at 10:00 AM</p>
           <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Starbucks on 4th & Main (or via Zoom)</p>
        </div>
        <p style="font-size: 14px; color: #94a3b8;">If anything changes, please let me know at least 2 hours in advance. Talk soon!</p>
      </div>
    `
  },
  {
    id: 'agent-seller-followup',
    name: 'Seller Follow-up (The Persistent)',
    subject: 'Still thinking about selling {{address}}? 🏠',
    category: 'Sales',
    tags: ['follow-up', 'seller'],
    imageUrl: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?auto=format&fit=crop&q=80&w=800&h=450',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="padding: 40px; text-align: left;">
          <h2 style="font-size: 32px; font-weight: 900; letter-spacing: -1px; margin: 0 0 16px 0;">Thinking ahead...</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 32px;">Hi {{name}}, I know life gets busy, but I wanted to keep <strong>{{address}}</strong> on your radar. With the current low inventory, homes in your neighborhood are selling for <strong>record premiums</strong>.</p>
          <div style="background: #fdf2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 32px;">
             <p style="margin: 0; font-weight: 800; color: #991b1b;">Active Buyers in your zip code: 42</p>
             <p style="margin: 4px 0 0 0; font-size: 14px; color: #991b1b;">Waiting for a home exactly like yours.</p>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 18px; background: #111827; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900; text-transform: uppercase;">Get an Instant Value Report</a>
        </div>
        <img src="{{header_image}}" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
      </div>
    `
  }
];
