import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';
import { trackLead, setActiveEntity, setActiveState, getMemory } from './memory-store';

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
}

export async function executeTask(action: string, entities: any): Promise<TaskResponse> {
  const store = useStore.getState();

  switch (action) {
    case 'navigate':
      const path = entities.path?.toLowerCase();
      const routes: Record<string, string> = {
        'lead': '#/leads',
        'leads': '#/leads',
        'task': '#/tasks',
        'tasks': '#/tasks',
        'calendar': '#/calendar',
        'dashboard': '#/dashboard',
        'settings': '#/settings',
        'inbox': '#/inbox',
        'message': '#/os-messages',
        'messages': '#/os-messages',
        'summary': '#/os-messages',
        'summaries': '#/os-messages',
        'ai': '#/ai-bot',
        'training': '#/ai-training'
      };
      if (routes[path]) {
        window.location.hash = routes[path];
        return { success: true, message: `Navigating to ${path}.` };
      }
      return { success: false, message: `I don't know how to navigate to "${path}".` };

    case 'createLead':
      try {
        const result = await store.addLead({
          name: entities.name || 'New Opportunity',
          email: entities.email || '',
          phone: entities.phone || '',
          status: 'new',
          source: 'ai_bot',
          propertyAddress: entities.location || '',
          propertyType: 'single-family',
          estimatedValue: 0,
          bedrooms: 0,
          bathrooms: 0,
          sqft: 0,
          offerAmount: 0,
          lat: 30.2672,
          lng: -97.7431,
          notes: `Created via OS Bot.`,
          assignedTo: store.currentUser?.id || 'system',
          probability: 50,
          engagementLevel: 1,
          timelineUrgency: 1,
          competitionLevel: 1,
          documents: [],
        });
        
        if (result.success && result.id) {
          trackLead(result.id, entities.name);
        }

        return { 
          success: result.success, 
          message: result.success ? `✅ Created lead for ${entities.name}.` : 'Failed to create lead.'
        };
      } catch (e) {
        return { success: false, message: 'Lead creation error.' };
      }

    case 'createTask':
      try {
        store.addTask({
          title: entities.title || 'New Task',
          description: entities.notes || '',
          assignedTo: store.currentUser?.id || 'system',
          dueDate: entities.dueDate || new Date().toISOString().split('T')[0],
          priority: 'medium',
          status: 'todo',
          createdBy: store.currentUser?.id || 'system',
          leadId: undefined
        });
        return { success: true, message: `✅ Task "${entities.title}" added.` };
      } catch (e) {
        return { success: false, message: 'Task creation error.' };
      }

    case 'sendSMS':
      try {
        let target = entities.target;
        const memory = getMemory();
        
        // Handle multi-turn target resolution
        if (!target && memory.activeState?.type === 'AWAITING_SMS_MESSAGE') {
          target = memory.activeState.data?.target;
        }

        if (!target) return { success: false, message: "Who should I text?" };
        
        const lead = store.leads.find(l => l.name.toLowerCase().includes(target.toLowerCase()));
        const phone = lead?.phone || target;
        
        if (!phone.replace(/\D/g, '').length && !lead) {
            return { success: false, message: `I found ${target}, but they don't have a phone number.` };
        }

        const res = await sendSMS(phone, entities.message);
        if (res.success && lead) {
            setActiveEntity(lead.id, lead.name, 'lead');
            setActiveState(null); // Clear state
        }

        return { 
          success: res.success, 
          message: res.success ? `✅ SMS sent to ${lead?.name || target}.` : `Failed: ${res.message}`
        };
      } catch (e: any) {
        return { success: false, message: e.message || 'SMS service error.' };
      }

    case 'sendSMSPartial':
      setActiveState('AWAITING_SMS_MESSAGE', { target: entities.target });
      return { 
        success: true, 
        message: entities.target 
          ? `Sure! What would you like to say to ${entities.target}?` 
          : "I can help with that. Who would you like to text?" 
      };

    case 'queryLeads': {
      const leads = store.leads;
      const count = leads.length;
      const hotLeads = leads.filter(l => (l.dealScore || 0) >= 80).length;
      const statusCounts = leads.reduce((acc: any, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {});

      let msg = `You have ${count} leads in your database.`;
      if (hotLeads > 0) msg += ` ${hotLeads} are marked as 'Hot' (score > 80).`;
      if (statusCounts['closed-won']) msg += ` You've closed ${statusCounts['closed-won']} deals!`;
      
      return { success: true, message: msg };
    }

    case 'queryTasks': {
      const tasks = store.tasks.filter(t => t.status !== 'done');
      const overdue = tasks.filter(t => new Date(t.dueDate) < new Date()).length;
      
      let msg = `You have ${tasks.length} active tasks.`;
      if (overdue > 0) msg += ` ${overdue} are currently overdue! ⚠️`;
      else msg += ` Everything is on track.`;
      
      return { success: true, message: msg };
    }

    case 'getCalendar': {
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = store.calendarEvents?.filter(e => e.start?.includes(today)) || [];
      
      if (todayEvents.length === 0) {
        return { success: true, message: "Your calendar is clear for today!" };
      }

      return { 
        success: true, 
        message: `You have ${todayEvents.length} events today. Your next one is "${todayEvents[0].title}" starting soon.` 
      };
    }

    case 'greeting':
      return { 
        success: true, 
        message: "Hello! I'm 🤖 OS Bot, your intelligent real estate assistant. I'm connected to your CRM and can help you manage leads, send text messages, create tasks, and more. How can I help you today?" 
      };

    case 'capabilities':
      return { 
        success: true, 
        message: "I'm a native WholeScale OS feature! I can:\n- 🎯 **Manage Leads**: Create, update, or delete leads.\n- 💬 **Send SMS**: Text your leads directly using your connected number.\n- 📅 **Task & Calendar**: Create reminders or check your daily schedule.\n- 📊 **Query Data**: Ask me how many hot leads or overdue tasks you have.\n- 🧭 **Navigation**: Ask me to open any page like 'Go to Calendar'." 
      };

    case 'help':
      return { 
        success: true, 
        message: "Here are some things you can try saying:\n- 'Show me my hot leads'\n- 'Text John saying I have an update on the property'\n- 'Create a task to call Sarah on Friday'\n- 'Go to the team dashboard'\n- 'What's on my calendar today?'" 
      };

    default:
      return { success: false, message: `Action "${action}" triggered, but logic is still being connected.` };
  }
}
