import { AgentTemplate } from '../lib/default-templates';

export const AGENT_EMAIL_TEMPLATES: AgentTemplate[] = [
  // --- LEAD GENERATION ---
  {
    id: 'agent-intro-buyer',
    name: 'Buyer Introduction',
    subject: 'Assisting with your home search in {{area}}',
    body: `Hi {{name}},\n\nI noticed you were looking at properties in {{area}}. I've got a few off-market opportunities that might fit exactly what you're looking for.\n\nAre you free for a quick 5-minute chat tomorrow?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #4f46e5; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; text-transform: uppercase; letter-spacing: 2px;">New Property Alert</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>I noticed you were looking at properties in <strong>{{area}}</strong>. I've got a few off-market opportunities that might fit exactly what you're looking for.</p>
          <p>These homes aren't on the MLS yet, so you'd be the first to see them.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="#" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Off-Market Picks</a>
          </div>
          <p>Are you free for a quick 5-minute chat tomorrow to discuss your search?</p>
          <p>Best regards,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['buyer', 'intro']
  },
  {
    id: 'agent-intro-seller',
    name: 'Seller Introduction',
    subject: 'Question about your property at {{address}}',
    body: `Hi {{name}},\n\nI'm a local specialist in {{area}} and I'm currently working with several buyers looking for homes in your neighborhood. I came across {{address}} and was wondering if you'd ever considered an off-market offer?\n\nWe can often close very quickly with no commissions.\n\nLet me know if you'd be open to a conversation.\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #111; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: #6366f1; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Confidential Inquiry</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>I'm a local specialist in <strong>{{area}}</strong> and I'm currently working with several pre-approved buyers looking for homes exactly like yours in your neighborhood.</p>
          <p>I came across <strong>{{address}}</strong> and was wondering if you'd ever considered an off-market offer?</p>
          <p><strong>The Benefits:</strong></p>
          <ul>
            <li>No public showings or open houses</li>
            <li>No agent commissions (save 6%)</li>
            <li>Close on your timeline (as fast as 14 days)</li>
          </ul>
          <p>Let me know if you'd be open to a confidential conversation about what your home could be worth in today's market.</p>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['seller', 'intro']
  },
  {
    id: 'agent-followup-1',
    name: 'Day 1 Follow-up',
    subject: 'Checking in on our conversation',
    body: `Hi {{name}},\n\nJust wanted to make sure you received my previous message. I'm truly interested in {{address}} and would love to see if we can make something work that benefits both of us.\n\nTalk soon,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
          <p>Hi {{name}},</p>
          <p>Just wanted to make sure you received my previous message regarding <strong>{{address}}</strong>.</p>
          <p>I know life gets busy, but I'm truly interested in the property and would love to see if we can put together a deal that works for everyone.</p>
          <p>Do you have 2 minutes for a quick text or call this afternoon?</p>
          <p>Talk soon,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['followup']
  },
  {
    id: 'agent-zombie-revival',
    name: 'Zombie Lead Revival',
    subject: 'Still interested in selling {{address}}?',
    body: `Hi {{name}},\n\nIt's been a while since we talked about {{address}}. I'm still very interested in the property. Is it still available, or have your plans changed?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>It's been a few months since we connected about your property at <strong>{{address}}</strong>.</p>
          <p>I'm still very active in the neighborhood and am still interested in that specific location. Is the property still available, or have your plans for the year changed?</p>
          <p>No pressure at all — just checking in to see where you're at.</p>
          <p>Best regards,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['followup', 'revival']
  },
  {
    id: 'agent-price-reduction',
    name: 'Price Reduction Alert',
    subject: 'Significant Price Drop: {{address}}',
    body: `Hi {{name}},\n\nWe just authorized a major price reduction on {{address}}. It's now listed at {{price}}.\n\nThis is currently the best value in the {{area}} market. Let me know if you want to schedule a walkthrough.\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #ef4444; padding: 15px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; text-transform: uppercase; font-size: 18px;">🔥 PRICE REDUCED 🔥</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>I wanted you to be the first to know: We just authorized a <strong>major price reduction</strong> on <strong>{{address}}</strong>.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="display: block; text-decoration: line-through; color: #9ca3af; font-size: 14px;">Original Price</span>
            <span style="font-size: 28px; font-weight: 900; color: #ef4444;">{{price}}</span>
          </div>
          <p>This is now the best value in the <strong>{{area}}</strong> market. I expect multiple offers by the end of the week.</p>
          <p>Would you like to schedule a walkthrough tomorrow before the public open house?</p>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Marketing',
    tags: ['price-drop']
  },
  {
    id: 'agent-cash-offer',
    name: 'Cash Offer Proposal',
    subject: 'Official Cash Offer for {{address}}',
    body: `Hi {{name}},\n\nWe've completed our evaluation of {{address}} and are prepared to make a solid cash offer. \n\nKey Benefits:\n- No Inspections required\n- We pay all closing costs\n- Close in 10-14 days\n\nWould you like to review the full agreement today?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #059669; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Cash Offer Proposal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>We've completed our evaluation of <strong>{{address}}</strong> and are prepared to move forward with a solid cash offer.</p>
          <div style="margin: 25px 0; background: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7;">
            <h4 style="margin-top: 0; color: #065f46;">Why this is the easiest way to sell:</h4>
            <ul style="margin-bottom: 0;">
              <li><strong>As-Is Purchase:</strong> No repairs or cleaning needed</li>
              <li><strong>Zero Fees:</strong> We pay all closing costs & commissions</li>
              <li><strong>Fast Close:</strong> Funds in your account in 10-14 days</li>
            </ul>
          </div>
          <p>Would you like to review the full agreement today? I can send over a DocuSign link immediately.</p>
          <p>Best regards,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['offer', 'cash']
  },
  {
    id: 'agent-creative-finance',
    name: 'Creative Finance Solution',
    subject: 'A customized way to sell {{address}}',
    body: `Hi {{name}},\n\nIf a traditional cash offer doesn't meet your net proceeds goal, I have some creative solutions like Seller Financing or Subject-To that can get you a higher price while saving you money on capital gains.\n\nInterested in hearing how this could work for you?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background: linear-gradient(to bottom, #ffffff, #f3f4f6);">
          <p>Hi {{name}},</p>
          <p>I know you're looking for a specific net number for <strong>{{address}}</strong>. If a traditional cash offer isn't reaching that goal, I have several <strong>Creative Finance</strong> solutions that can bridge the gap.</p>
          <p><strong>We can explore:</strong></p>
          <ul>
            <li><strong>Seller Financing:</strong> Get monthly passive income + interest</li>
            <li><strong>Subject-To:</strong> We take over your existing payments & equity</li>
            <li><strong>Novation:</strong> We partner to renovate and sell for max profit</li>
          </ul>
          <p>These strategies often result in 15-20% higher net proceeds for the seller. Interested in hearing which one fits your situation best?</p>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['offer', 'creative']
  },
  {
    id: 'agent-closing-instr',
    name: 'Closing Day Logistics',
    subject: 'Closing Day Instructions for {{address}}',
    body: `Hi {{name}},\n\nWe are all set for closing on {{address}}! \n\nReminder Checklist:\n1. Bring your Photo ID\n2. Bring all keys and remotes\n3. Bring any final docs requested by the title company\n\nSee you at the closing table!\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #4f46e5; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0;">It's Closing Day! 🔑</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>Congratulations! We are officially all set for closing on <strong>{{address}}</strong>.</p>
          <p><strong>Quick Reminder Checklist:</strong></p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="margin: 0; padding-left: 20px;">
              <li>Bring a valid Government Photo ID</li>
              <li>Bring all house keys, mailbox keys, and garage remotes</li>
              <li>Bring any final docs requested by the title company</li>
              <li>Ensure your wire transfer was initiated (if applicable)</li>
            </ul>
          </div>
          <p>I'll be there waiting for you at the title office. See you at the closing table!</p>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Operations',
    tags: ['closing', 'instructions']
  },
  {
    id: 'agent-post-closing',
    name: 'Post-Closing Satisfaction',
    subject: 'Congratulations! How was your experience?',
    body: `Hi {{name}},\n\nCongratulations on the successful closing of {{address}}! \n\nI wanted to check in and see how the process was for you. Your feedback is incredibly valuable to me and my team.\n\nThanks again for trusting me with your real estate journey.\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6; text-align: center;">
        <div style="padding: 40px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff;">
          <h1 style="color: #4f46e5; margin-bottom: 10px;">Congratulations! 🥂</h1>
          <p style="font-size: 18px;">The keys are officially in your hands for <strong>{{address}}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p>Hi {{name}},</p>
          <p>It has been an absolute pleasure assisting you with this journey. I wanted to check in and see how the move is going and if there's anything else I can do to help you settle in.</p>
          <p>Your satisfaction is my top priority. If you have 30 seconds, I'd love to hear about your experience working with me.</p>
          <div style="margin: 30px 0;">
            <a href="#" style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Leave Feedback</a>
          </div>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Operations',
    tags: ['closing', 'feedback']
  },
  {
    id: 'agent-market-update',
    name: 'Monthly Market Report',
    subject: 'What\'s happening in the {{area}} market?',
    body: `Hi {{name}},\n\nInventory is at record lows in {{area}} right now! This means your property at {{address}} might be worth significantly more than it was last year.\n\nWould you like a free, 5-minute valuation report?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #1e293b; padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; text-transform: uppercase; letter-spacing: 3px;">Market Update</h2>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 5px;">{{area}} | {{date}}</p>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>Inventory is at record lows in <strong>{{area}}</strong> right now! For homeowners, this is an incredible opportunity. High demand and low supply mean your property at <strong>{{address}}</strong> might be worth significantly more than it was even 12 months ago.</p>
          <div style="margin: 30px 0; padding: 20px; border: 2px dashed #e2e8f0; border-radius: 12px; text-align: center;">
            <p style="margin-top: 0; font-weight: bold;">Current Estimated Value Range:</p>
            <p style="font-size: 24px; color: #4f46e5; font-weight: 900;">$325k - $360k</p>
            <a href="#" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Request Detailed Valuation</a>
          </div>
          <p>Would you like a more precise report based on recent internal sales in your specific block?</p>
          <p>Best regards,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Marketing',
    tags: ['market-update']
  },
  {
    id: 'agent-referral-ask',
    name: 'Referral Request',
    subject: 'A quick favor?',
    body: `Hi {{name}},\n\nI really enjoyed working with you on {{address}}. If you know anyone else looking to buy or sell in the near future, I'd love to provide them with the same high level of service.\n\nI even offer a referral commission for any successfully closed deals you send my way!\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6; text-align: center;">
        <div style="padding: 40px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="width: 60px; hieght: 60px; background: #4f46e5; border-radius: 50%; margin: 0 auto 20px; display: inline-block; padding: 15px;">
            <span style="color: white; font-size: 30px;">🤝</span>
          </div>
          <h2 style="margin: 0; color: #111;">A Quick Favor?</h2>
          <p>Hi {{name}},</p>
          <p>I really enjoyed helping you with <strong>{{address}}</strong>. My business relies on positive word-of-mouth from clients like you.</p>
          <p>If you know anyone else looking to buy, sell, or invest in <strong>{{area}}</strong>, I'd love the opportunity to provide them with the same level of service.</p>
          <p style="background: #fefce8; padding: 15px; border-radius: 8px; color: #854d0e; font-weight: bold;">
            Bonus: I offer a referral reward for every lead that results in a successful closing!
          </p>
          <p>Thank you for your support!</p>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Marketing',
    tags: ['referral']
  },
  {
    id: 'agent-expired-listing',
    name: 'Expired Listing Outreach',
    subject: 'About your listing at {{address}}',
    body: `Hi {{name}},\n\nI noticed that your listing at {{address}} recently expired. Selling a home can be frustrating, especially when it doesn't move as quickly as expected.\n\nI specialize in selling homes that other agents couldn't. My approach includes targeted online marketing, off-market buyer networks, and creative pricing strategies.\n\nWould you be open to a no-obligation conversation about a fresh approach?`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #dc2626; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; text-transform: uppercase;">Fresh Strategy Required</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>I noticed that your listing at <strong>{{address}}</strong> recently expired. It's frustrating when a home doesn't sell, but it usually comes down to one of three factors: Exposure, Presentation, or Pricing Strategy.</p>
          <p><strong>My Approach is Different:</strong></p>
          <ul>
            <li><strong>Digital Domination:</strong> Targeting high-intent buyers on FB/IG/Google</li>
            <li><strong>Off-Market Network:</strong> Access to 500+ private investors in {{area}}</li>
            <li><strong>Professional Staging:</strong> High-end lifestyle photography that pops</li>
          </ul>
          <p>I specialize in selling homes that other agents couldn't. Would you be open to a no-obligation, 10-minute audit of your previous listing to see what we can do differently?</p>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['expired-listing', 'outreach']
  },
  {
    id: 'agent-investment-opp',
    name: 'Investment Opportunity',
    subject: 'New investment property in {{area}}',
    body: `Hi {{name}},\n\nI just came across a deal in {{area}} that I think would be perfect for your portfolio:\n\n- Address: {{address}}\n- Estimated ARV: {{price}}\n- Current Condition: Needs light cosmetic rehab\n- Cash Flow Potential: Strong rental demand in this zip code\n\nWant me to send over the full analysis and comps?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #111; padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: #fbbf24; margin: 0; text-transform: uppercase;">Investor Alert: Deal of the Week</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>I just found a property in <strong>{{area}}</strong> that fits your specific buy-box perfectly:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #fbbf24; margin: 20px 0;">
            <p style="margin: 0;"><strong>Property:</strong> {{address}}</p>
            <p style="margin: 5px 0;"><strong>Estimated ARV:</strong> {{price}}</p>
            <p style="margin: 0;"><strong>Strategy:</strong> Fix & Flip or BRRRR candidate</p>
          </div>
          <p>The numbers look strong for a high-single-digit CAP rate or a quick $40k-$60k spread on a flip.</p>
          <p>Want me to send over the full ROI analysis and rental comps?</p>
          <div style="margin: 25px 0;">
            <a href="#" style="background: #fbbf24; color: #111; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Unlock Full Deal Analysis</a>
          </div>
          <p>Best,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Marketing',
    tags: ['investor', 'opportunity']
  },
  {
    id: 'agent-pre-foreclosure',
    name: 'Pre-Foreclosure Outreach',
    subject: 'Important options for {{address}}',
    body: `Hi {{name}},\n\nI'm reaching out because I understand the stress that comes with difficult financial situations. If you're exploring your options for {{address}}, I may be able to help.`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff;">
          <div style="background: #fff7ed; padding: 15px; border-radius: 8px; border-left: 4px solid #f97316; margin-bottom: 25px;">
             <strong>Time Sensitive Update regarding {{address}}</strong>
          </div>
          <p>Hi {{name}},</p>
          <p>I'm reaching out because I understand the stress that comes with difficult financial situations. If you're exploring your options for your property at <strong>{{address}}</strong>, I want you to know you have more paths forward than you might think.</p>
          <p><strong>I specialize in helping homeowners avoid foreclosure with:</strong></p>
          <ul>
            <li><strong>Quick Cash Sale:</strong> We can close before the trustee sale date.</li>
            <li><strong>Subject-To:</strong> We take over payments, solving the immediate debt issue.</li>
            <li><strong>Loan Modification:</strong> Assistance with re-negotiating with your lender.</li>
          </ul>
          <p>Everything we discuss is 100% confidential and free of charge. Would you like to sit down and explore which path protects your credit and equity best?</p>
          <p>Best regards,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['pre-foreclosure', 'distressed']
  },
  {
    id: 'agent-fsbo-intro',
    name: 'FSBO Introduction',
    subject: 'Saw your For Sale By Owner listing at {{address}}',
    body: `Hi {{name}},\n\nI saw your FSBO listing for {{address}} and wanted to reach out. I respect the decision to sell on your own — it can definitely save you money.`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <div style="padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff;">
          <p>Hi {{name}},</p>
          <p>I saw your <strong>For Sale By Owner</strong> listing for <strong>{{address}}</strong> and wanted to reach out. I respect the decision to sell on your own — in this market, it's definitely a viable option to save on commissions.</p>
          <p>I focus exclusively on <strong>{{area}}</strong> and I have a pool of pre-approved buyers who have missed out on local bids recently. If you'd be open to a simple buyer referral (one-time minimal commission), I could bring these buyers through your home.</p>
          <p>No listings, no long-term contracts — just a buyer for your home.</p>
          <p>Interested in a quick tour so I can describe the layout to my buyers?</p>
          <p>Best regards,<br><strong>{{agent_name}}</strong></p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['fsbo', 'intro']
  }
];
