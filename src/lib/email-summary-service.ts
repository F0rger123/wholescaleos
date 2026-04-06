import { supabase } from './supabase';
import { sendEmail } from './email';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface SummaryStats {
  newLeads: number;
  completedTasks: number;
  pendingTasks: number;
  activeWorkflows: number;
  revenue?: number;
  closedDeals?: number;
}

// ─── DAILY SUMMARY ──────────────────────────────────────────────────────────

export async function generateDailySummary(userId: string) {
  try {
    if (!supabase) return;

    const { data: prefs } = await supabase
      .from('user_os_messages_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!prefs?.daily_summary_enabled) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    // Today's Activity (not yesterday - user wants REAL, LATEST data)
    const today = startOfDay(new Date()).toISOString();
    const now = new Date().toISOString();

    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .gte('created_at', today)
      .lte('created_at', now);

    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'done')
      .gte('completed_at', today)
      .lte('completed_at', now);

    const { data: wonDeals } = await supabase
      .from('deal_profits')
      .select('net_profit')
      .eq('closed_by', userId)
      .gte('closed_date', today)
      .lte('closed_date', now);

    const revenue = wonDeals?.reduce((sum: number, d: any) => sum + (d.net_profit || 0), 0) || 0;

    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .neq('status', 'done')
      .lte('due_date', now);

    const stats: SummaryStats = {
      newLeads: newLeads || 0,
      completedTasks: completedTasks || 0,
      pendingTasks: pendingTasks || 0,
      activeWorkflows: 0,
      revenue: revenue || 0,
      closedDeals: wonDeals?.length || 0
    };

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; background: #fcfcfd;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin-bottom: 5px;">Daily OS Digest</h1>
          <p style="color: #64748b; font-size: 14px;">${format(new Date(), 'EEEE, MMMM do')}</p>
        </div>

        <p>Hi ${profile.full_name || profile.name || 'there'}, here's what's happening today in your WholeScale pipeline:</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 30px 0;">
          <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #eef2f6; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 28px; font-weight: bold; color: #6366f1;">${stats.newLeads}</div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">New Leads</div>
          </div>
          <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #eef2f6; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 28px; font-weight: bold; color: #10b981;">${stats.completedTasks}</div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Completed</div>
          </div>
          <div style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #eef2f6; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">$${revenue.toLocaleString()}</div>
            <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Revenue</div>
          </div>
        </div>

        <div style="background: #6366f1; color: white; padding: 25px; border-radius: 20px; margin-bottom: 30px; text-align: center;">
          <h3 style="margin-top: 0; opacity: 0.9;">Focus Needed</h3>
          <p style="font-size: 18px; margin-bottom: 0;">You have <strong>${stats.pendingTasks}</strong> tasks remaining to conquer today.</p>
        </div>

        <div style="text-align: center; padding: 20px; border-top: 1px solid #eef2f6;">
          <p style="font-size: 12px; color: #94a3b8;">
            Preferences synced with your WholeScale OS. <a href="https://wholescaleos.com/messages" style="color: #6366f1;">Manage Alert Center</a>
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `OS Daily Insights: ${format(new Date(), 'MMM d')}`,
      html: html,
      mode: 'system'
    });

    return stats;
  } catch (error) {
    console.error('Error generating daily summary:', error);
    throw error;
  }
}

// ─── WEEKLY PERFORMANCE ──────────────────────────────────────────────────────

export async function generateWeeklySummary(userId: string) {
  try {
    if (!supabase) return;

    const { data: prefs } = await supabase
      .from('user_os_messages_preferences')
      .select('weekly_summary_enabled')
      .eq('user_id', userId)
      .single();

    if (!prefs?.weekly_summary_enabled) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    // Last 7 days
    const thisWeekStart = subDays(new Date(), 7).toISOString();
    const now = new Date().toISOString();

    // Previous 7 days for comparison
    const lastWeekStart = subDays(new Date(), 14).toISOString();
    const lastWeekEnd = thisWeekStart;

    // Fetch this week
    const { count: curLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).gte('created_at', thisWeekStart).lte('created_at', now);
    const { data: curWon } = await supabase.from('deal_profits').select('net_profit').eq('closed_by', userId).gte('closed_date', thisWeekStart).lte('closed_date', now);
    
    // Fetch last week
    const { count: prevLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).gte('created_at', lastWeekStart).lte('created_at', lastWeekEnd);
    const { data: prevWon } = await supabase.from('deal_profits').select('net_profit').eq('closed_by', userId).gte('closed_date', lastWeekStart).lte('closed_date', lastWeekEnd);

    const curRev = curWon?.reduce((s: number, d: any) => s + (d.net_profit || 0), 0) || 0;
    const prevRev = prevWon?.reduce((s: number, d: any) => s + (d.net_profit || 0), 0) || 0;
    
    const leadGrowth = prevLeads && prevLeads > 0 ? ((curLeads - prevLeads) / prevLeads) * 100 : 100;
    const revGrowth = prevRev && prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 100;
    
    const conversionRate = curLeads && curLeads > 0 ? (curWon?.length || 0) / curLeads : 0;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px; border-radius: 24px 24px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Weekly Performance</h1>
          <p style="opacity: 0.9; margin-top: 5px;">${format(subDays(new Date(), 7), 'MMM d')} - ${format(new Date(), 'MMM d, yyyy')}</p>
        </div>

        <div style="padding: 30px; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 24px 24px;">
          <div style="display: flex; gap: 20px; margin-bottom: 30px;">
            <div style="flex: 1; padding: 20px; background: #f8fafc; border-radius: 16px; text-align: center;">
              <div style="color: #6366f1; font-size: 24px; font-weight: bold;">$${curRev.toLocaleString()}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 600;">REVENUE</div>
              <div style="font-size: 11px; color: ${revGrowth >= 0 ? '#10b981' : '#ef4444'}; margin-top: 5px;">
                ${revGrowth >= 0 ? '↑' : '↓'} ${Math.abs(revGrowth).toFixed(1)}% vs last week
              </div>
            </div>
            <div style="flex: 1; padding: 20px; background: #f8fafc; border-radius: 16px; text-align: center;">
              <div style="color: #6366f1; font-size: 24px; font-weight: bold;">${curLeads}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 600;">LEADS</div>
              <div style="font-size: 11px; color: ${leadGrowth >= 0 ? '#10b981' : '#ef4444'}; margin-top: 5px;">
                ${leadGrowth >= 0 ? '↑' : '↓'} ${Math.abs(leadGrowth).toFixed(1)}% vs last week
              </div>
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 25px; border-radius: 16px; text-align: center;">
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 10px;">AVERAGE CONVERSION RATE</div>
            <div style="font-size: 36px; font-weight: 900; color: #1e293b;">${(conversionRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Weekly Performance Summary - ${format(new Date(), 'MMM d')}`,
      html: html,
      mode: 'system'
    });
  } catch (err) {
    console.error('Weekly summary error:', err);
  }
}

// ─── MONTHLY PERFORMANCE ─────────────────────────────────────────────────────

export async function generateMonthlyPerformanceReport(userId: string) {
  try {
    if (!supabase) return;

    const { data: prefs } = await supabase
      .from('user_os_messages_preferences')
      .select('monthly_performance_report_enabled')
      .eq('user_id', userId)
      .single();

    if (!prefs?.monthly_performance_report_enabled) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    const lastMonth = subMonths(new Date(), 1);
    const start = startOfMonth(lastMonth).toISOString();
    const end = endOfMonth(lastMonth).toISOString();

    const { data: deals } = await supabase
      .from('deal_profits')
      .select('net_profit')
      .gte('closed_date', start)
      .lte('closed_date', end)
      .eq('closed_by', userId);

    const revenue = deals?.reduce((sum: number, d: any) => sum + (d.net_profit || 0), 0) || 0;
    const count = deals?.length || 0;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #333; background: #020617; color: #fff; border-radius: 24px;">
        <h1 style="color: #6366f1; margin-bottom: 8px;">Monthly Performance Brief</h1>
        <p style="color: #94a3b8;">${format(lastMonth, 'MMMM yyyy')}</p>
        
        <div style="margin: 40px 0; background: #0f172a; padding: 30px; border-radius: 20px; border: 1px solid #1e293b; text-align: center;">
          <div style="font-size: 48px; font-weight: 900; color: #10b981;">$${revenue.toLocaleString()}</div>
          <div style="font-size: 14px; color: #64748b; letter-spacing: 2px;">TOTAL PROFIT</div>
        </div>

        <div style="display: flex; justify-content: space-between; gap: 20px;">
          <div style="flex: 1; text-align: center; border: 1px solid #1e293b; padding: 20px; border-radius: 16px;">
            <div style="font-size: 24px; font-weight: bold;">${count}</div>
            <div style="font-size: 10px; color: #64748b;">DEALS CLOSED</div>
          </div>
          <div style="flex: 1; text-align: center; border: 1px solid #1e293b; padding: 20px; border-radius: 16px;">
            <div style="font-size: 24px; font-weight: bold;">${count > 0 ? '$' + (revenue/count).toLocaleString() : '$0'}</div>
            <div style="font-size: 10px; color: #64748b;">AVG DEAL PROFIT</div>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Monthly OS Briefing - ${format(lastMonth, 'MMMM')}`,
      html: html,
      mode: 'system'
    });
  } catch (err) {
    console.error('Monthly report error:', err);
  }
}

// ─── CALENDAR DIGEST ──────────────────────────────────────────────────────────

export async function generateCalendarDigest(userId: string) {
  try {
    if (!supabase) return;

    const { data: prefs } = await supabase
      .from('user_os_messages_preferences')
      .select('calendar_digest_enabled')
      .eq('user_id', userId)
      .single();

    if (!prefs?.calendar_digest_enabled) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: true });

    if (!events || events.length === 0) return;

    const eventList = events.map((e: any) => `
      <div style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: bold; color: #6366f1;">${format(new Date(e.start_time), 'h:mm a')}</div>
        <div style="font-size: 14px;">${e.title}</div>
      </div>
    `).join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
        <h2 style="color: #6366f1;">Your Schedule for Today</h2>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          ${eventList}
        </div>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Daily Calendar Digest - ${format(today, 'MMM d')}`,
      html: html,
      mode: 'system'
    });
  } catch (err) {
    console.error('Calendar digest error:', err);
  }
}

// ─── INDIVIDUAL ALERTS ────────────────────────────────────────────────────────

export async function sendOfferAlert(userId: string, leadId: string, type: 'made' | 'accepted') {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    
    if (type === 'made' && !prefs?.offer_made_alert_enabled) return;
    if (type === 'accepted' && !prefs?.offer_accepted_alert_enabled) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();

    if (!profile?.email || !lead) return;

    const emoji = type === 'made' ? '📑' : '🤝';
    const statusText = type === 'made' ? 'Offer Submitted' : 'Offer Accepted!';

    await sendEmail({
      to: profile.email,
      subject: `${emoji} ${statusText}: ${lead.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px;">
          <div style="font-size: 40px; margin-bottom: 20px;">${emoji}</div>
          <h2 style="color: #1e293b; margin-top: 0;">${statusText}</h2>
          <p style="font-size: 16px; color: #475569;">Great news! An update on lead <strong>${lead.name}</strong>:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <div style="font-weight: bold; margin-bottom: 5px;">${lead.address || 'Property Lead'}</div>
            <div style="color: #64748b; font-size: 14px;">Value: $${(lead.property_value || 0).toLocaleString()}</div>
          </div>
          <a href="https://wholescaleos.com/leads/${leadId}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 25px; border-radius: 10px; text-decoration: none; font-weight: bold;">View Lead Details</a>
        </div>
      `,
      mode: 'system'
    });
  } catch (err) { console.error('Offer alert error:', err); }
}

export async function sendContractAlert(userId: string, leadId: string) {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    if (!prefs?.contract_signed_alert_enabled) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();

    if (!profile?.email || !lead) return;

    await sendEmail({
      to: profile.email,
      subject: `🖋️ Contract Signed: ${lead.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 40px; background: #fdfdfd; border: 2px solid #6366f1; border-radius: 30px; text-align: center;">
          <h1 style="color: #6366f1; font-size: 32px;">It's Official! 🖋️</h1>
          <p style="font-size: 18px; color: #1e293b;">Contract has been signed for <strong>${lead.name}</strong></p>
          
          <div style="text-align: left; background: white; border: 1px solid #eef2f6; padding: 25px; border-radius: 20px; margin: 30px 0;">
            <h4 style="margin-top: 0; color: #6366f1;">Closing Checklist</h4>
            <ul style="padding-left: 20px; color: #475569; line-height: 1.8;">
              <li>Upload signed contract to Documents</li>
              <li>Schedule property inspection</li>
              <li>Coordinate with Title Company</li>
              <li>Update deal status to Under Contract</li>
            </ul>
          </div>
          
          <a href="https://wholescaleos.com/leads/${leadId}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 35px; border-radius: 12px; text-decoration: none; font-weight: 900; letter-spacing: 1px;">GO TO DEAL</a>
        </div>
      `,
      mode: 'system'
    });
  } catch (err) { console.error('Contract alert error:', err); }
}

export async function sendDealAlert(userId: string, leadId: string, type: 'closed') {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    if (type === 'closed' && !prefs?.deal_closed_alerts_enabled) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single();

    if (!profile?.email || !lead) return;

    await sendEmail({
      to: profile.email,
      subject: `💰 Deal Closed: ${lead.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; background: #ecfdf5; border-radius: 32px; padding: 50px; text-align: center; border: 1px solid #10b981;">
          <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
          <h1 style="color: #065f46; margin: 0; font-size: 36px;">Congratulations!</h1>
          <p style="color: #047857; font-size: 18px; margin-top: 10px;">You just closed a deal with <strong>${lead.name}</strong>.</p>
          
          <div style="margin: 40px 0; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <div style="color: #64748b; font-size: 12px; font-weight: bold; letter-spacing: 2px;">DEAL SUMMARY</div>
            <div style="font-size: 40px; font-weight: 900; color: #1e293b; margin: 15px 0;">$${(lead.offer_amount || 0).toLocaleString()}</div>
            <p style="margin-bottom: 0; font-size: 14px; color: #475569;">${lead.address || 'Verified Address'}</p>
          </div>
          
          <p style="color: #047857; font-size: 14px;">Check your earnings dashboard for the final commission breakdown.</p>
        </div>
      `,
      mode: 'system'
    });
  } catch (err) { console.error('Deal alert error:', err); }
}

export async function sendLeadAlert(userId: string, leadId: string, type: 'new' | 'high-score') {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    
    if (type === 'new' && !prefs?.new_lead_alerts_enabled) return;
    if (type === 'high-score' && !prefs?.lead_score_high_alert_enabled) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();

    if (!profile?.email || !lead) return;

    await sendEmail({
      to: profile.email,
      subject: type === 'new' ? `✨ New Lead: ${lead.name}` : `🔥 Hot Lead Alert: ${lead.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #6366f1;">${type === 'new' ? 'New Lead Incoming' : 'High Performance Lead Detected'}</h2>
          <p>${type === 'new' ? 'A new lead has entered your OS.' : 'A lead has reached a strategic deal score!'}</p>
          <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 20px 0;">
            <div style="font-size: 20px; font-weight: bold;">${lead.name}</div>
            <div style="color: #64748b; margin-top: 5px;">${lead.email || 'No email'} | ${lead.phone || 'No phone'}</div>
            <div style="margin-top: 15px; display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 100px; font-size: 12px; font-weight: bold;">
              SCORE: ${lead.deal_score || 0}/100
            </div>
          </div>
          <a href="https://wholescaleos.com/leads/${leadId}" style="text-decoration: none; color: #6366f1; font-weight: bold;">View Full Profile →</a>
        </div>
      `,
      mode: 'system'
    });
  } catch (err) { console.error('Lead alert error:', err); }
}

export async function checkLeadInactivity(userId: string) {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('lead_inactivity_alert_enabled').eq('user_id', userId).single();
    if (!prefs?.lead_inactivity_alert_enabled) return;

    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    const { data: staleLeads } = await supabase
      .from('leads')
      .select('name, last_contact')
      .eq('assigned_to', userId)
      .lt('last_contact', sevenDaysAgo)
      .limit(5);

    if (!staleLeads || staleLeads.length === 0) return;

    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();
    if (!profile?.email) return;

    const list = staleLeads.map((l: any) => `<li><strong>${l.name}</strong> (Stale since ${format(new Date(l.last_contact), 'MMM d')})</li>`).join('');

    await sendEmail({
      to: profile.email,
      subject: `🧊 Stale Leads Alert - 7 days inactivity`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 30px; border: 1px solid #eef2f6; border-radius: 20px; background: #f8fafc;">
          <h2 style="color: #64748b;">Leads are getting cold...</h2>
          <p>These 5 leads haven't been contacted in over a week. Reach out now to keep the momentum:</p>
          <ul style="line-height: 2; color: #1e293b;">${list}</ul>
          <a href="https://wholescaleos.com/leads" style="display: inline-block; margin-top: 20px; color: #6366f1; font-weight: bold;">Go to Pipeline →</a>
        </div>
      `,
      mode: 'system'
    });
  } catch (err) { console.error('Inactivity check error:', err); }
}

export async function sendBirthdayGreeting(userId: string) {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('client_birthday_greeting_enabled').eq('user_id', userId).single();
    if (!prefs?.client_birthday_greeting_enabled) return;

    const todayStr = format(new Date(), 'MM-dd');
    const { data: birthdayLeads } = await supabase
      .from('leads')
      .select('name, email')
      .eq('assigned_to', userId)
      .filter('birthday', 'not.is', null);

    // Filter by MM-dd (Supabase doesn't have a direct month-day extractor without SQL functions)
    const matched = (birthdayLeads || []).filter((l: any) => l.birthday.includes(todayStr));

    for (const lead of matched) {
      if (!lead.email) continue;
      await sendEmail({
        to: lead.email,
        subject: `🎂 Happy Birthday, ${lead.name}!`,
        html: `<h1>Happy Birthday!</h1><p>Dear ${lead.name}, wishing you a fantastic day from all of us at WholeScale!</p>`,
        mode: 'system'
      });
    }
  } catch (err) { console.error('Birthday error:', err); }
}

export async function sendTaskAlert(userId: string, taskId: string, type: 'reminder' | 'overdue') {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    if (type === 'reminder' && !prefs?.task_reminders_enabled) return;
    if (type === 'overdue' && !prefs?.task_overdue_alert_enabled) return;

    const { data: task } = await supabase.from('tasks').select('*, leads(name)').eq('id', taskId).single();
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();

    if (profile?.email && task) {
      await sendEmail({
        to: profile.email,
        subject: type === 'overdue' ? `🚨 Task Overdue: ${task.title}` : `⏰ Upcoming Task: ${task.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 25px; border-radius: 16px; border: 1px solid ${type === 'overdue' ? '#fee2e2' : '#e0e7ff'}; background: ${type === 'overdue' ? '#fef2f2' : '#fcfdff'};">
            <h3 style="color: ${type === 'overdue' ? '#ef4444' : '#6366f1'}; margin-top: 0;">${type === 'overdue' ? 'URGENT Alert' : 'Task Reminder'}</h3>
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${task.title}</p>
            ${task.leads?.name ? `<p style="margin-top: 0; color: #64748b;">Lead: ${task.leads.name}</p>` : ''}
            <div style="margin-top: 20px; font-size: 14px; color: #475569;">
              <strong>Due:</strong> ${format(new Date(task.due_date), 'h:mm a')}
            </div>
            <a href="https://wholescaleos.com/tasks" style="display: inline-block; margin-top: 25px; background: #6366f1; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">View in OS</a>
          </div>
        `,
        mode: 'system'
      });
    }
  } catch (err) { console.error('Task alert error:', err); }
}
