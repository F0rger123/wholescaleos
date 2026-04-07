import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import * as emailSummaryService from '../lib/email-summary-service';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Custom hook to handle client-side scheduling of automation digests and alerts.
 * This runs on app boot and periodically checks if scheduled emails should be sent.
 */
export function useAutomationScheduler() {
  const { currentUser, isAuthenticated } = useStore();
  const lastCheckTime = useRef<number>(0);
  const sentToday = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || !isSupabaseConfigured) return;

    const checkScheduledTasks = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const hour = now.getHours();
      const day = now.getDay(); // 0 is Sunday, 1 is Monday...

      // Avoid running too frequently (max once per 5 minutes)
      if (Date.now() - lastCheckTime.current < 5 * 60 * 1000) return;
      lastCheckTime.current = Date.now();

      console.log(`[AutomationScheduler] Checking tasks at ${now.toLocaleTimeString()}...`);

      try {
        // 1. Task Reminders (Run every 15-30 mins window)
        await emailSummaryService.checkTaskReminders(currentUser.id);

        // 2. Calendar Digest (7 AM)
        if (hour >= 7 && sentToday.current['calendar'] !== todayStr) {
          await emailSummaryService.generateCalendarDigest(currentUser.id);
          sentToday.current['calendar'] = todayStr;
          console.log('[AutomationScheduler] Calendar Digest triggered');
        }

        // 3. Daily Summary (8 AM)
        if (hour >= 8 && sentToday.current['daily'] !== todayStr) {
          await emailSummaryService.generateDailySummary(currentUser.id);
          sentToday.current['daily'] = todayStr;
          console.log('[AutomationScheduler] Daily Summary triggered');
        }

        // 4. Weekly Performance (Monday 9 AM)
        if (day === 1 && hour >= 9 && sentToday.current['weekly'] !== todayStr) {
          await emailSummaryService.generateWeeklySummary(currentUser.id);
          sentToday.current['weekly'] = todayStr;
          console.log('[AutomationScheduler] Weekly Summary triggered');
        }

        // 5. Monthly Performance (1st of month)
        if (now.getDate() === 1 && hour >= 10 && sentToday.current['monthly'] !== todayStr) {
          await emailSummaryService.generateMonthlyPerformanceReport(currentUser.id);
          sentToday.current['monthly'] = todayStr;
          console.log('[AutomationScheduler] Monthly Performance triggered');
        }

      } catch (err) {
        console.error('[AutomationScheduler] Error checking scheduled tasks:', err);
      }
    };

    // Run immediately on boot
    checkScheduledTasks();

    // Set up periodic check (every 10 minutes)
    const interval = setInterval(checkScheduledTasks, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id]);

  return null;
}
