import { useStore, calculateDealScore } from '../../store/useStore';
import { sendSMS as sendSMSBase } from '../sms-service';
import { AIContextManager } from './context';
import { UserLearningManager } from './user-learning';

export interface ActionResponse {
  success: boolean;
  data: any;
  message?: string;
}

export const actionHandlers = {
  queryLeads: (params: { 
    score_min?: number, 
    source?: string, 
    timeframe?: 'week' | 'month',
    location?: string,
    unresponsiveDays?: number
  }): ActionResponse => {
    const { leads } = useStore.getState();
    const scoreMin = params.score_min || 0;
    
    let filteredLeads = leads.filter(lead => {
      // 1. Score filter
      const score = calculateDealScore(lead);
      if (score < scoreMin) return false;

      // 2. Source filter
      if (params.source && !lead.source.toLowerCase().includes(params.source.toLowerCase())) return false;

      // 3. Timeframe filter (created this week/month)
      if (params.timeframe) {
        const now = new Date();
        const created = new Date(lead.createdAt);
        const diff = now.getTime() - created.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (params.timeframe === 'week' && days > 7) return false;
        if (params.timeframe === 'month' && days > 30) return false;
      }

      // 4. Location filter (Address, City, Zip)
      if (params.location) {
        const loc = params.location.toLowerCase();
        const match = (lead.propertyAddress || "").toLowerCase().includes(loc) || 
                      (lead.city || "").toLowerCase().includes(loc) || 
                      (lead.state || "").toLowerCase().includes(loc) || 
                      (lead.zip || "").toLowerCase().includes(loc);
        if (!match) return false;
      }

      // 5. Unresponsive filter
      if (params.unresponsiveDays) {
        if (!lead.lastContact) return true; // Never contacted = unresponsive
        const last = new Date(lead.lastContact);
        const diff = new Date().getTime() - last.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < params.unresponsiveDays) return false;
      }

      return true;
    });

    // Record interaction
    UserLearningManager.recordCommandUse('queryLeads');

    // Update context if we found leads
    if (filteredLeads.length === 1) {
      AIContextManager.setLastLead(filteredLeads[0].id, filteredLeads[0].name);
    }

    const list = filteredLeads.map(l => l.name).join(", ");
    
    return {
      success: true,
      data: {
        count: filteredLeads.length,
        list: list || "None found",
        source: params.source,
        location: params.location,
        unresponsiveDays: params.unresponsiveDays
      }
    };
  },

  createTask: (params: { description: string, dueDate?: string }): ActionResponse => {
    const { addTask, currentUser } = useStore.getState();
    if (!params.description) return { success: false, data: null, message: "Missing description" };

    const newTask: any = {
      title: params.description.length > 30 ? params.description.substring(0, 30) + '...' : params.description,
      description: params.description,
      dueDate: params.dueDate || new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      priority: 'medium',
      status: 'todo',
      assignedTo: currentUser?.id || 'system',
      createdBy: currentUser?.id || 'system',
    };

    addTask(newTask);

    return {
      success: true,
      data: {
        description: params.description
      }
    };
  },

  listTasks: (): ActionResponse => {
    const { tasks } = useStore.getState();
    const pendingTasks = tasks.filter(t => t.status !== 'done');
    const list = pendingTasks.map(t => t.title).join(", ");

    return {
      success: true,
      data: {
        count: pendingTasks.length,
        list: list || "No pending tasks"
      }
    };
  },

  sendSMS: async (params: { number: string, message: string }): Promise<ActionResponse> => {
    if (!params.number || !params.message) return { success: false, data: null, message: "Missing number or message" };
    
    const result = await sendSMSBase(params.number, params.message);
    
    return {
      success: result.success,
      data: {
        number: params.number
      },
      message: result.message
    };
  },

  getOnlineTeam: (): ActionResponse => {
    const { team } = useStore.getState();
    const onlineMembers = team.filter(m => m.presenceStatus === 'online');
    const list = onlineMembers.map(m => m.name).join(", ");

    return {
      success: true,
      data: {
        list: list || "No one online"
      }
    };
  },

  getCalendar: (): ActionResponse => {
    // For now, let's just return tasks due today as "calendar"
    const { tasks } = useStore.getState();
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = tasks.filter(t => t.dueDate.startsWith(today));
    const list = todaysTasks.map(t => t.title).join(", ");

    return {
      success: true,
      data: {
        list: list || "Nothing scheduled for today"
      }
    };
  },

  updateLeadStatus: (params: { leadName: string, status: string }): ActionResponse => {
    const { leads, updateLeadStatus, currentUser } = useStore.getState();
    const leadName = params.leadName?.toLowerCase();
    
    const lead = leads.find(l => l.name.toLowerCase().includes(leadName));
    if (!lead) return { success: false, data: null, message: "Lead not found" };

    // Normalize status
    const statusMap: Record<string, any> = {
      'new': 'new',
      'contacted': 'contacted',
      'qualified': 'qualified',
      'negotiating': 'negotiating',
      'won': 'closed-won',
      'closed-won': 'closed-won',
      'lost': 'closed-lost',
      'closed-lost': 'closed-lost'
    };
    
    const normalizedStatus = statusMap[params.status.toLowerCase()] || params.status;
    updateLeadStatus(lead.id, normalizedStatus as any, currentUser?.name || 'AI Assistant');

    return {
      success: true,
      data: {
        leadName: lead.name,
        status: normalizedStatus
      }
    };
  },

  createLead: (params: { name: string }): ActionResponse => {
    const { addLead } = useStore.getState();
    if (!params.name) return { success: false, data: null, message: "Missing lead name" };

    addLead({
      name: params.name,
      email: '',
      phone: '',
      status: 'new',
      source: 'other',
      propertyAddress: '',
      propertyType: 'single-family',
      estimatedValue: 0,
      bedrooms: 0,
      bathrooms: 0,
      sqft: 0,
      offerAmount: 0,
      lat: 0,
      lng: 0,
      notes: 'Created via AI Assistant',
      assignedTo: '',
      probability: 40,
      engagementLevel: 3,
      timelineUrgency: 3,
      competitionLevel: 3,
      documents: []
    });

    return {
      success: true,
      data: {
        name: params.name
      }
    };
  },

  getLeadDetails: (params: { name: string }): ActionResponse => {
    const { leads } = useStore.getState();
    const name = params.name?.toLowerCase();
    const lead = leads.find(l => l.name.toLowerCase().includes(name));
    
    if (!lead) return { success: false, data: null, message: "Lead not found" };

    const details = `${lead.name} (${lead.status}) - Address: ${lead.propertyAddress || 'N/A'}, Phone: ${lead.phone || 'N/A'}`;

    return {
      success: true,
      data: {
        name: lead.name,
        details: details
      }
    };
  },

  completeTask: (params: { title: string }): ActionResponse => {
    const { tasks, updateTask } = useStore.getState();
    const title = params.title?.toLowerCase();
    const task = tasks.find(t => t.title.toLowerCase().includes(title));
    
    if (!task) return { success: false, data: null, message: "Task not found" };

    updateTask(task.id, { status: 'done', completedAt: new Date().toISOString() });

    return {
      success: true,
      data: {
        title: task.title
      }
    };
  },

  deleteTask: (params: { title: string }): ActionResponse => {
    const { tasks, deleteTask } = useStore.getState();
    const title = params.title?.toLowerCase();
    const task = tasks.find(t => t.title.toLowerCase().includes(title));
    
    if (!task) return { success: false, data: null, message: "Task not found" };

    deleteTask(task.id);

    return {
      success: true,
      data: {
        title: task.title
      }
    };
  },

  getFollowUps: (): ActionResponse => {
    const { leads } = useStore.getState();
    const urgent = leads
      .filter(l => {
        const score = calculateDealScore(l);
        return score >= 70 && l.status !== 'closed-won' && l.status !== 'closed-lost';
      })
      .slice(0, 5);

    const list = urgent.map(l => l.name).join(", ");
    
    return {
      success: true,
      data: {
        count: urgent.length,
        list: list || "No urgent follow-ups today"
      }
    };
  },

  getPipelineStats: (params: { timeframe?: string, status?: string }): ActionResponse => {
    const { leads } = useStore.getState();
    let targetLeads = leads.filter(l => l.status !== 'closed-lost');
    
    if (params.status) {
      targetLeads = targetLeads.filter(l => l.status.toLowerCase().includes(params.status!.toLowerCase()));
    }

    const totalValue = targetLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    const avgScore = targetLeads.reduce((sum, l) => sum + calculateDealScore(l), 0) / (targetLeads.length || 1);

    const details = `Pipeline [${params.status || 'Active'}]: $${totalValue.toLocaleString()} | Avg Deal Score: ${Math.round(avgScore)} | Count: ${targetLeads.length}`;

    return {
      success: true,
      data: {
        details,
        totalValue,
        count: targetLeads.length
      }
    };
  },

  getAnalytics: (): ActionResponse => {
    const { leads } = useStore.getState();
    const won = leads.filter(l => l.status === 'closed-won');
    const conversionRate = leads.length > 0 ? (won.length / leads.length) * 100 : 0;
    
    // Simplistic "best source" logic
    const sources: Record<string, number> = {};
    won.forEach(l => {
      sources[l.source] = (sources[l.source] || 0) + 1;
    });
    const bestSource = Object.entries(sources).sort((a,b) => b[1] - a[1])[0]?.[0] || "N/A";

    const details = `Conversion Rate: ${conversionRate.toFixed(1)}% | Best Source: ${bestSource}`;

    return {
      success: true,
      data: {
        details,
        conversionRate,
        bestSource
      }
    };
  },

  updateAIPreferences: async (params: { style?: string, hours?: string }): Promise<ActionResponse> => {
    if (params.style) {
      await UserLearningManager.setResponseStyle(params.style as any);
    }
    const details = params.style ? `Style set to ${params.style}` : "Preferences updated";

    return {
      success: true,
      data: { details }
    };
  },

  getDailySummary: (): ActionResponse => {
    const { leads, tasks } = useStore.getState();
    const hotLeads = leads.filter(l => calculateDealScore(l) >= 80);
    const dueTasks = tasks.filter(t => t.status !== 'done' && new Date(t.dueDate) <= new Date());

    const details = `You have ${hotLeads.length} hot leads and ${dueTasks.length} tasks due today. Let's get to work!`;

    return {
      success: true,
      data: { details }
    };
  },

  trainAI: async (params: { phrase: string, meaning: string }): Promise<ActionResponse> => {
    if (!params.phrase || !params.meaning) return { success: false, data: null, message: "Missing phrase or meaning" };
    
    await UserLearningManager.addTraining(params.phrase, params.meaning);
    
    return {
      success: true,
      data: {
        phrase: params.phrase,
        meaning: params.meaning
      }
    };
  }
};
