import { AgentTemplate } from '../lib/default-templates';

export const PRO_CAMPAIGN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'campaign-revival-7day',
    name: '7-Day Lead Revival',
    subject: 'Wait, did I lose you? ({{name}})',
    body: `Hi {{name}},\n\nI haven't heard back from you regarding {{address}}. I completely understand that life gets busy!\n\nI just wanted to see if you're still interested in selling, or if you've already found a solution. Either way, just let me know so I can update my records.\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #6366f1;">Checking in on {{address}}</h2>
        <p>Hi {{name}},</p>
        <p>I haven't heard back from you regarding your property. I completely understand that life gets busy!</p>
        <p>I just wanted to see if you're still interested in selling, or if you've already found a solution. Either way, just let me know so I can update my records.</p>
        <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-left: 4px solid #6366f1;">
          <strong>Quick question:</strong> Are you still looking to close by the end of the month?
        </div>
        <p style="margin-top: 20px;">Best regards,<br/><strong>{{agent_name}}</strong></p>
      </div>
    `,
    category: 'Sales',
    tags: ['campaign', 'revival', 'pro']
  },
  {
    id: 'campaign-listing-blast',
    name: 'New Listing Announcement',
    subject: 'JUST LISTED: Stunning Property in {{area}}',
    body: `Hi {{name}},\n\nWe just listed a beautiful new property at {{address}}! \n\nThis home features incredible upgrades and is situated in one of the most sought-after neighborhoods in {{area}}.\n\nView full details here: {{listing_url}}\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">JUST LISTED!</h1>
        </div>
        <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi {{name}},</p>
          <p>We're excited to announce a brand new listing at <strong>{{address}}</strong>.</p>
          <div style="margin: 20px 0; background: #f1f5f9; border-radius: 8px; overflow: hidden;">
            <div style="padding: 20px;">
              <h3 style="margin: 0 0 10px 0;">Property Highlights:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Prime location in {{area}}</li>
                <li>Recently renovated kitchen</li>
                <li>Spacious backyard oasis</li>
              </ul>
            </div>
          </div>
          <p style="text-align: center;">
            <a href="{{listing_url}}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Listing Photos</a>
          </p>
          <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">
            WholeScale OS • {{agent_name}} • {{agent_phone}}
          </p>
        </div>
      </div>
    `,
    category: 'Marketing',
    tags: ['campaign', 'listing', 'pro']
  },
  {
    id: 'campaign-investor-alert',
    name: 'Investor Deal Alert',
    subject: 'INVESTOR SPECIAL: Off-Market in {{area}} (High Yield)',
    body: `Hi {{name}},\n\nI've got a fresh off-market deal at {{address}} that fits your criteria perfectly.\n\nEstimated ARV: {{arv}}\nRepairs: {{repairs}}\nAsking: {{price}}\n\nReply 'YES' to see the full analysis.\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: 'Courier New', Courier, monospace; line-height: 1.4; color: #000; background: #f1f5f9; padding: 20px;">
        <div style="background: white; padding: 30px; border: 2px solid #000; box-shadow: 10px 10px 0px #000;">
          <h2 style="text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px;">Deal Alert: {{address}}</h2>
          <p>Team,</p>
          <p>We've secured an exclusive off-market contract in <strong>{{area}}</strong>. This is a heavy-duty fix-and-flip or buy-and-hold opportunity.</p>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr style="background: #000; color: #fff;">
              <th style="padding: 10px; text-align: left;">METRIC</th>
              <th style="padding: 10px; text-align: right;">VALUE</th>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ccc;">Estimated ARV</td>
              <td style="padding: 10px; border-bottom: 1px solid #ccc; text-align: right;"><strong>{{arv}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ccc;">Repair Estimate</td>
              <td style="padding: 10px; border-bottom: 1px solid #ccc; text-align: right;"><strong>{{repairs}}</strong></td>
            </tr>
            <tr style="font-size: 18px; background: #fffbeb;">
              <td style="padding: 10px;"><strong>ASKING PRICE</strong></td>
              <td style="padding: 10px; text-align: right; color: #b45309;"><strong>{{price}}</strong></td>
            </tr>
          </table>
          <p><strong>Note:</strong> Closing is set for 14 days. Cash or hard money only.</p>
          <p style="margin-top: 30px;">Reply to this email to request the lockbox code.<br/>- {{agent_name}}</p>
        </div>
      </div>
    `,
    category: 'Sales',
    tags: ['campaign', 'investor', 'pro']
  },
  {
    id: 'campaign-market-update',
    name: 'Quarterly Market Value Update',
    subject: 'Is your home at {{address}} worth more now?',
    body: `Hi {{name}},\n\nThe market in {{area}} has shifted significantly over the last 90 days. I've updated the valuation for {{address}}.\n\nYour new estimated range is {{valuation_range}}.\n\nWould you like a more detailed breakdown?\n\nBest,\n{{agent_name}}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 40px 0;">
          <h1 style="color: #6366f1; margin: 0;">Market Analysis</h1>
          <p style="color: #64748b; font-size: 18px;">Property: {{address}}</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
          <p style="margin-top: 0;">Hi {{name}}, after reviewing recent sales in {{area}}, here is your property's updated market position:</p>
          <div style="margin: 30px 0;">
            <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Current Estimated Value Range</span>
            <div style="font-size: 36px; font-weight: 800; color: #1e293b; margin: 10px 0;">{{valuation_range}}</div>
            <div style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">
              ▲ UP 4.2% since last report
            </div>
          </div>
          <p style="font-size: 14px; color: #64748b;">Demand remains high for properties like yours. If you've been thinking about selling, now might be the optimal time.</p>
          <a href="{{valuation_url}}" style="display: inline-block; margin-top: 20px; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Get Detailed Report</a>
        </div>
      </div>
    `,
    category: 'Marketing',
    tags: ['campaign', 'market-update', 'pro']
  }
];
