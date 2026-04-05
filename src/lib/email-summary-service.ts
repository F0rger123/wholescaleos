import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { AGENT_EMAIL_TEMPLATES } from '../data/emailTemplates';

export const emailSummaryService = {
  /**
   * Generates a daily summary report for the current user.
   */
  async generateDailySummary(userId: string) {
    const { leads, tasks, calendarEvents, mergedGoogleEvents, currentUser } = useStore.getState();
    if (!currentUser || currentUser.id !== userId) return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. Revenue & Deals (last 24h)
    const dailyDeals = leads.filter(l => 
      l.status === 'closed-won' && 
      new Date(l.updatedAt || l.updated_at || "").getTime() >= startOfToday.getTime()
    );
    const dailyRevenue = dailyDeals.reduce((sum, l) => sum + (Number(l.propertyValue || l.estimatedValue || 0) * 0.03), 0);

    // 2. New Leads (last 24h)
    const newLeadsCount = leads.filter(l => 
      new Date(l.createdAt || l.created_at || "").getTime() >= startOfToday.getTime()
    ).length;

    // 3. Tasks Completed (last 24h)
    const tasksCompletedCount = tasks.filter(t => 
      t.status === 'done' && 
      t.completed_at && new Date(t.completed_at).getTime() >= startOfToday.getTime()
    ).length;

    // 4. Upcoming Events (Today)
    const todayEvents = [
      ...calendarEvents,
      ...mergedGoogleEvents
    ].filter(e => {
      const start = new Date(e.start);
      return start >= startOfToday && start <= endOfToday;
    });

    return {
      revenue: dailyRevenue,
      deals: dailyDeals.length,
      newLeads: newLeadsCount,
      tasksCompleted: tasksCompletedCount,
      events: todayEvents.length,
      eventList: todayEvents.map(e => e.title).join(', ')
    };
  },

  /**
   * Generates a weekly summary report.
   */
  async generateWeeklySummary(userId: string) {
    const { leads, currentUser } = useStore.getState();
    if (!currentUser || currentUser.id !== userId) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyDeals = leads.filter(l => 
      l.status === 'closed-won' && 
      new Date(l.updatedAt || l.updated_at || "").getTime() >= weekAgo.getTime()
    );
    const weeklyRevenue = weeklyDeals.reduce((sum, l) => sum + (Number(l.propertyValue || l.estimatedValue || 0) * 0.03), 0);
    
    const wonCount = weeklyDeals.length;
    const lostCount = leads.filter(l => 
      l.status === 'closed-lost' && 
      new Date(l.updatedAt || l.updated_at || "").getTime() >= weekAgo.getTime()
    ).length;

    const newLeads = leads.filter(l => 
      new Date(l.createdAt || l.created_at || "").getTime() >= weekAgo.getTime()
    );
    
    const conversionRate = newLeads.length > 0 ? (wonCount / newLeads.length) * 100 : 0;

    return {
      revenue: weeklyRevenue,
      won: wonCount,
      lost: lostCount,
      conversion: conversionRate.toFixed(1),
      newLeads: newLeads.length
    };
  },

  /**
   * Sends the requested report via the automation engine.
   */
  async sendReport(userId: string, type: 'daily' | 'weekly' | 'calendar') {
    const { currentUser, sendAutomationEmail } = useStore.getState();
    if (!currentUser || currentUser.id !== userId) return;

    let subject = '';
    let reportData: any = null;
    let templateId = '';

    if (type === 'daily') {
      reportData = await this.generateDailySummary(userId);
      subject = `Daily Performance Summary - ${new Date().toLocaleDateString()}`;
      templateId = 'DAILY_SUMMARY_REPORT';
    } else if (type === 'weekly') {
      reportData = await this.generateWeeklySummary(userId);
      subject = `Weekly Performance Summary - Week of ${new Date().toLocaleDateString()}`;
      templateId = 'WEEKLY_SUMMARY_REPORT';
    } else if (type === 'calendar') {
      reportData = await this.generateDailySummary(userId); // Reuse daily for now
      subject = `Today's Schedule: ${new Date().toLocaleDateString()}`;
      templateId = 'CALENDAR_DIGEST_REPORT';
    }

    if (!reportData) return;

    // In a real app, we'd inject this data into the HTML template.
    // For this demo, we'll format a nice message.
    const content = `
      <h1>${subject}</h1>
      ${type === 'daily' ? `
        <p><strong>Revenue:</strong> $${reportData.revenue.toLocaleString()}</p>
        <p><strong>Deals Closed:</strong> ${reportData.deals}</p>
        <p><strong>New Leads:</strong> ${reportData.newLeads}</p>
        <p><strong>Tasks Completed:</strong> ${reportData.tasksCompleted}</p>
        <p><strong>Events Today:</strong> ${reportData.events} (${reportData.eventList || 'None'})</p>
      ` : type === 'weekly' ? `
        <p><strong>Weekly Revenue:</strong> $${reportData.revenue.toLocaleString()}</p>
        <p><strong>Deals Won:</strong> ${reportData.won}</p>
        <p><strong>Deals Lost:</strong> ${reportData.lost}</p>
        <p><strong>New Leads:</strong> ${reportData.newLeads}</p>
        <p><strong>Conversion Rate:</strong> ${reportData.conversion}%</p>
      ` : `
        <p><strong>Upcoming Events:</strong> ${reportData.events}</p>
        <p>${reportData.eventList || 'No events scheduled for today.'}</p>
      `}
    `;

    // We'll use a specific "Internal Report" lead or just send it to the user.
    // For now, we'll attach it to the user's "Primary Lead" or a dummy ID.
    await sendAutomationEmail(userId, subject, content);
    
    // Update last sent date in settings
    this.updateLastSent(userId, type);
  },

  async updateLastSent(userId: string, type: 'daily' | 'weekly') {
    const { updateProfile, currentUser } = useStore.getState();
    if (!currentUser) return;
    
    const settings = currentUser.settings || {};
    const automatedReports = settings.automated_reports || {};
    
    const key = type === 'daily' ? 'lastDailySent' : 'lastWeeklySent';
    
    updateProfile(userId, {
      settings: {
        ...settings,
        automated_reports: {
          ...automatedReports,
          [key]: new Date().toISOString()
        }
      }
    });
  }
};
