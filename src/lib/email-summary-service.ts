import { supabase } from './supabase';
import { sendEmail } from './email';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface SummaryStats {
  newLeads: number;
  completedTasks: number;
  pendingTasks: number;
  activeWorkflows: number;
}

export async function generateDailySummary(userId: string) {
  try {
    if (!supabase) return;

    // 1. Fetch User Preferences
    const { data: prefs } = await supabase
      .from('user_os_messages_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!prefs?.daily_summary_enabled) return;

    // 2. Fetch User Profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    // 3. Gather Stats for the last 24h
    const yesterday = subDays(new Date(), 1);
    const start = startOfDay(yesterday).toISOString();
    const end = endOfDay(yesterday).toISOString();

    // New Leads
    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end);

    // Completed Tasks
    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', start)
      .lte('completed_at', end);

    // Pending Tasks
    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'done')
      .lte('due_date', end);

    const stats: SummaryStats = {
      newLeads: newLeads || 0,
      completedTasks: completedTasks || 0,
      pendingTasks: pendingTasks || 0,
      activeWorkflows: 0 // Fetch from user_automations if needed
    };

    // 4. Construct Email HTML
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h1 style="color: #6366f1;">Your Daily OS Summary</h1>
        <p>Hi ${profile.full_name || 'there'}, here is what happened in your WholeScale OS yesterday:</p>
        
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin: 30px 0;">
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
          <a href="${window.location.origin}/tasks" style="display: inline-block; background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Tasks</a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          You are receiving this because Daily Summaries are enabled in your OS Settings.
        </p>
      </div>
    `;

    // 5. Send Email
    await sendEmail({
      to: profile.email,
      subject: `Daily OS Summary - ${format(yesterday, 'MMM d, yyyy')}`,
      html: html
    });

    // 6. Log as OS Message
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'summary',
      title: 'Daily Summary Sent',
      message: `We've sent your daily summary to ${profile.email}. You had ${stats.newLeads} new leads yesterday.`,
      data: stats
    });

    return stats;
  } catch (error) {
    console.error('Error generating daily summary:', error);
    throw error;
  }
}
