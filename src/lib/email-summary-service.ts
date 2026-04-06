import { supabase } from './supabase';
import { sendEmail } from './email';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    const yesterday = subDays(new Date(), 1);
    const start = startOfDay(yesterday).toISOString();
    const end = endOfDay(yesterday).toISOString();

    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end);

    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', start)
      .lte('completed_at', end);

    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'done')
      .lte('due_date', end);

    const stats: SummaryStats = {
      newLeads: newLeads || 0,
      completedTasks: completedTasks || 0,
      pendingTasks: pendingTasks || 0,
      activeWorkflows: 0
    };

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h1 style="color: #6366f1;">Your Daily OS Summary</h1>
        <p>Hi ${profile.full_name || 'there'}, here is what happened in your WholeScale OS yesterday:</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${stats.newLeads}</div>
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">New Leads</div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.completedTasks}</div>
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Tasks Completed</div>
          </div>
        </div>

        <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
          <h3 style="margin-top: 0;">Action Items</h3>
          <p>You have <strong>${stats.pendingTasks}</strong> pending tasks that need your attention.</p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          You are receiving this because Daily Summaries are enabled in your OS Settings.
        </p>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Daily OS Summary - ${format(yesterday, 'MMM d, yyyy')}`,
      html: html,
      mode: 'system'
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'summary',
      title: 'Daily Summary Sent',
      message: `We've sent your daily summary to ${profile.email}.`,
      data: stats
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
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    const lastWeek = subWeeks(new Date(), 1);
    const start = startOfWeek(lastWeek).toISOString();
    const end = endOfWeek(lastWeek).toISOString();

    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end);

    const { data: closedDealsData } = await supabase
      .from('deal_profits')
      .select('net_profit')
      .gte('closed_date', start)
      .lte('closed_date', end)
      .eq('closed_by', userId);

    const revenue = closedDealsData?.reduce((sum: number, d: any) => sum + (d.net_profit || 0), 0) || 0;
    const closedDeals = closedDealsData?.length || 0;

    const stats: SummaryStats = {
      newLeads: newLeads || 0,
      completedTasks: 0,
      pendingTasks: 0,
      activeWorkflows: 0,
      revenue,
      closedDeals
    };

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h1 style="color: #6366f1;">Weekly Performance Report</h1>
        <p>Hi ${profile.full_name || 'there'}, here is your performance for the past week:</p>
        
        <table width="100%" cellpadding="10" style="margin: 30px 0;">
          <tr>
            <td width="33%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #6366f1;">$${revenue.toLocaleString()}</div>
              <div style="font-size: 10px; color: #64748b;">REVENUE</div>
            </td>
            <td width="33%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #10b981;">${closedDeals}</div>
              <div style="font-size: 10px; color: #64748b;">DEALS CLOSED</div>
            </td>
            <td width="33%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #f59e0b;">${newLeads}</div>
              <div style="font-size: 10px; color: #64748b;">NEW LEADS</div>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          Weekly Summaries are sent every Monday to keep you on track.
        </p>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Weekly Performance - ${format(lastWeek, 'MMMM do')}`,
      html: html,
      mode: 'system'
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'summary',
      title: 'Weekly Report Sent',
      message: `Profit: $${revenue.toLocaleString()} | Deals: ${closedDeals}`,
      data: stats
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

export async function sendDealAlert(userId: string, leadId: string, type: 'closed' | 'offer' | 'contract') {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    
    let isEnabled = false;
    let subject = '';
    let emoji = '';

    if (type === 'closed') { isEnabled = !!prefs?.deal_closed_alerts_enabled; subject = 'Deal Closed!'; emoji = '💰'; }
    else if (type === 'offer') { isEnabled = !!prefs?.offer_made_alert_enabled; subject = 'New Offer Made'; emoji = '📑'; }
    else if (type === 'contract') { isEnabled = !!prefs?.contract_signed_alert_enabled; subject = 'Contract Signed!'; emoji = '🖋️'; }

    if (!isEnabled) return;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();

    if (!profile?.email || !lead) return;

    await sendEmail({
      to: profile.email,
      subject: `${emoji} ${subject}: ${lead.name}`,
      html: `<h1>${subject}</h1><p>Action on lead: <strong>${lead.name}</strong></p><p>${lead.address || ''}</p>`,
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
      html: `<p>${type === 'new' ? 'A new lead has entered your OS.' : 'A lead has reached a high score!'}</p><h3>${lead.name}</h3><p>Score: ${lead.deal_score}/100</p>`,
      mode: 'system'
    });
  } catch (err) { console.error('Lead alert error:', err); }
}

export async function sendTaskAlert(userId: string, taskId: string, type: 'reminder' | 'overdue') {
  try {
    if (!supabase) return;
    const { data: prefs } = await supabase.from('user_os_messages_preferences').select('*').eq('user_id', userId).single();
    if (type === 'reminder' && !prefs?.task_reminders_enabled) return;
    if (type === 'overdue' && !prefs?.task_overdue_alert_enabled) return;

    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single();

    if (profile?.email && task) {
      await sendEmail({
        to: profile.email,
        subject: type === 'overdue' ? `🚨 Task Overdue: ${task.title}` : `⏰ Task Reminder: ${task.title}`,
        html: `<h2>${type === 'overdue' ? 'URGENT: Task Overdue' : 'Upcoming Task'}</h2><p>${task.title}</p>`,
        mode: 'system'
      });
    }
  } catch (err) { console.error('Task alert error:', err); }
}
