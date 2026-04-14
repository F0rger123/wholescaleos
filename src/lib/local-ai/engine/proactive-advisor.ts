import { useStore } from '../../../store/useStore';
import { TaskResponse } from '../task-executor';

/**
 * Proactively analyzes the CRM health and returns strategic suggestions.
 */
export class ProactiveAdvisor {

  static analyze(): TaskResponse | null {
    const store = useStore.getState();
    const leads = store.leads || [];
    const tasks = store.tasks || [];

    // 1. Check for stale "Hot" leads
    const staleHotLead = leads.find(l => 
      ['negotiating', 'qualified'].includes(l.status) && 
      (!l.updatedAt || new Date(l.updatedAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (staleHotLead) {
      return {
        success: true,
        message: `I noticed **${staleHotLead.name}** hasn't been updated in a week. They're a high-priority lead — want me to draft a follow-up text?`,
        data: { leadId: staleHotLead.id, action: 'send_sms', target: staleHotLead.name },
        reasoning: ["Detected high-priority lead with no activity for > 7 days."]
      };
    }

    // 2. Check for overdue tasks
    const overdueTask = tasks.find(t => 
      t.status === 'todo' && t.dueDate && new Date(t.dueDate).getTime() < Date.now()
    );

    if (overdueTask) {
      return {
        success: true,
        message: `You have an overdue task: "**${overdueTask.title}**". Should we reschedule it for tomorrow?`,
        data: { taskId: overdueTask.id, action: 'update_task', title: overdueTask.title },
        reasoning: ["Detected uncompleted task past its due date."]
      };
    }

    // 3. Low Pipeline Value Warning
    const activeLeads = leads.filter(l => !['closed-won', 'closed-lost', 'junk'].includes(l.status));
    if (activeLeads.length < 5) {
      return {
        success: true,
        message: "Your active pipeline is looking a bit thin. This would be a great time to import some new leads from your marketing list.",
        data: { action: 'navigate', path: 'leads' },
        reasoning: ["Pipeline volume is below optimal threshold (< 5 active leads)."]
      };
    }

    return null;
  }
}
