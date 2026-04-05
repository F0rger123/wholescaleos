import { AgentTemplate } from '../lib/default-templates';

export const AGENT_EMAIL_TEMPLATES: AgentTemplate[] = [
  {
    id: 'agent-welcome-lead',
    name: 'Welcome Lead (The Premium Intro)',
    subject: 'Welcome to the Family, {{name}}! 🚀',
    category: 'Sales',
    tags: ['welcome', 'new-lead'],
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
    id: 'DAILY_SUMMARY_REPORT',
    name: 'Daily Agent Summary',
    subject: 'Your Daily Performance Snapshot 📊',
    category: 'Reports',
    tags: ['summary', 'daily'],
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900;">Daily Summary</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Great work today! Here's your performance snapshot.</p>
        </div>
        <div style="padding: 32px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Revenue</p>
              <h2 style="margin: 8px 0 0 0; font-size: 24px; color: #059669;">{{revenue}}</h2>
            </div>
            <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Deals Closed</p>
              <h2 style="margin: 8px 0 0 0; font-size: 24px; color: #111827;">{{deals}}</h2>
            </div>
          </div>
          <div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800;">Activity Summary</h3>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">New Leads</span>
              <span style="font-weight: 700; color: #111827;">+{{newLeads}}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b;">Tasks Completed</span>
              <span style="font-weight: 700; color: #111827;">{{tasksCompleted}}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0;">
              <span style="color: #64748b;">Calendar Events</span>
              <span style="font-weight: 700; color: #111827;">{{events}}</span>
            </div>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 16px; background: #6366f1; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900;">View Dashboard</a>
        </div>
      </div>
    `
  },
  {
    id: 'WEEKLY_SUMMARY_REPORT',
    name: 'Weekly Agent Summary',
    subject: 'Your Weekly Performance Report 📈',
    category: 'Reports',
    tags: ['summary', 'weekly'],
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div style="background: #111827; padding: 48px; text-align: left; color: white;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">Weekly Recap</h1>
          <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 18px;">You absolute legend. Here's your weekly win list.</p>
        </div>
        <div style="padding: 40px;">
          <div style="background: #f8fafc; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 32px;">
             <p style="margin: 0; font-size: 14px; font-weight: 900; color: #6366f1; text-transform: uppercase; letter-spacing: 1px;">TOTAL REVENUE</p>
             <h1 style="margin: 8px 0 0 0; font-size: 48px; font-weight: 900; color: #111827;">{{revenue}}</h1>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
            <div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 16px;">
              <p style="margin: 0; font-size: 12px; color: #065f46; font-weight: 800;">DEALS WON</p>
              <h2 style="margin: 4px 0 0 0; font-size: 32px; color: #047857;">{{won}}</h2>
            </div>
            <div style="text-align: center; padding: 24px; background: #fff1f2; border-radius: 16px;">
              <p style="margin: 0; font-size: 12px; color: #9f1239; font-weight: 800;">DEALS LOST</p>
              <h2 style="margin: 4px 0 0 0; font-size: 32px; color: #be123c;">{{lost}}</h2>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
             <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                   <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 600;">Conversion Rate</p>
                   <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 900; color: #111827;">{{conversion}}%</p>
                </div>
                <div style="height: 40px; width: 40px; background: #6366f1; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900;">%</div>
             </div>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 20px; background: #6366f1; color: white; text-align: center; text-decoration: none; border-radius: 16px; font-weight: 900; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);">Open Performance Insights</a>
        </div>
      </div>
    `
  },
  {
    id: 'DEAL_CLOSED_NOTIFICATION',
    name: 'Deal Closed Alert',
    subject: 'KA-CHING! Link in bio... just kidding, you CLOSED one! 💰',
    category: 'Alerts',
    tags: ['deal', 'closed'],
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden; text-align: center;">
        <div style="background: #059669; padding: 60px 40px; color: white;">
          <div style="font-size: 64px; margin-bottom: 16px;">🎊</div>
          <h1 style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: -1px;">Deal Closed!</h1>
          <p style="margin: 12px 0 0 0; font-size: 20px; opacity: 0.9;">{{lead_name}} is officially a счастливый клиент!</p>
        </div>
        <div style="padding: 48px;">
          <h2 style="font-size: 14px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">DEAL DETAILS</h2>
          <div style="background: #f0fdf4; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #065f46;">{{address}}</p>
            <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: #047857;">{{revenue}} Revenue</p>
          </div>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Another one for the books. Your hard work in <strong>{{area}}</strong> is paying off. Keep the momentum going!</p>
          <a href="#" style="display: block; width: 100%; padding: 18px; background: #059669; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 800;">View Deal in CRM</a>
        </div>
      </div>
    `
  },
  {
    id: 'OFFER_SUBMITTED_NOTIFICATION',
    name: 'Offer Submitted Alert',
    subject: 'Offer Out: Fingers crossed for {{lead_name}}! 🤞',
    category: 'Alerts',
    tags: ['offer', 'submitted'],
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #3b82f6; padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Offer Submitted</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">The paperwork is in for {{address}}.</p>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 32px;">You've officially submitted an offer on behalf of <strong>{{lead_name}}</strong>. Great job moving this deal forward.</p>
          <div style="background: #eff6ff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; margin-bottom: 32px;">
            <p style="margin: 0; font-weight: 700; color: #1e40af;">What's Next?</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #1e40af;">Expect a response within 24-48 hours. Don't forget to follow up with the listing agent tomorrow.</p>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 16px; background: #111827; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900;">View Offer Details</a>
        </div>
      </div>
    `
  },
  {
    id: 'CALENDAR_DIGEST_REPORT',
    name: 'Calendar Digest',
    subject: 'Rise and Shine! Here\'s your schedule for today ☕',
    category: 'Reports',
    tags: ['calendar', 'digest'],
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="padding: 40px; background: #fdf2f8;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #be185d;">Good Morning!</h1>
          <p style="margin: 4px 0 0 0; color: #9d174d; font-weight: 600;">You have {{events}} events scheduled for today.</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-size: 12px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">YOUR SCHEDULE</h2>
          <div style="margin-bottom: 32px;">
            <p style="color: #4b5563; font-size: 16px; line-height: 1.8;">{{eventList}}</p>
          </div>
          <div style="padding: 24px; background: #fdf4ff; border-radius: 16px; border: 1px solid #f5d0fe; color: #86198f;">
            <p style="margin: 0; font-weight: 700;">Agent Pro-Tip:</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;">Review your materials at least 15 minutes before your first showing to stay ahead of the game.</p>
          </div>
          <a href="#" style="display: block; width: 100%; padding: 18px; margin-top: 32px; background: #be185d; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: 900;">Open Full Calendar</a>
        </div>
      </div>
    `
  }
];
