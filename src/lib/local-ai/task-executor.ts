import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';
import { trackLead, setActiveEntity } from './memory-store';

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
        'leads': '#/leads',
        'tasks': '#/tasks',
        'calendar': '#/calendar',
        'dashboard': '#/dashboard',
        'settings': '#/settings',
        'inbox': '#/inbox'
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
          message: result.success ? `✅ Created lead for ${entities.name}.` : 'Failed to create lead.',
          data: { id: result.id }
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
        const target = entities.target;
        if (!target) throw new Error('No contact specified');
        
        // Find lead by name first
        const lead = store.leads.find(l => l.name.toLowerCase().includes(target.toLowerCase()));
        const phone = lead?.phone || target;
        
        if (!phone.replace(/\D/g, '').length && !lead) {
            return { success: false, message: `I found ${target}, but they don't have a phone number.` };
        }

        const res = await sendSMS(phone, entities.message);
        if (res.success && lead) {
            setActiveEntity(lead.id, lead.name, 'lead');
        }

        return { 
          success: res.success, 
          message: res.success ? `✅ SMS sent to ${lead?.name || target}.` : `Failed: ${res.message}`
        };
      } catch (e: any) {
        return { success: false, message: e.message || 'SMS service error.' };
      }

    case 'sendSMSPartial':
      return { success: true, message: entities.target ? `What would you like to say to ${entities.target}?` : "Who would you like to text?" };

    case 'queryLeads':
      const leadCount = store.leads.length;
      const recentNames = store.leads.slice(0, 3).map(l => l.name).join(', ');
      return { 
          success: true, 
          message: `You have ${leadCount} leads in your pipeline. Recent ones include: ${recentNames}.` 
      };

    case 'queryTasks':
      const taskCount = store.tasks.filter(t => t.status === 'todo').length;
      return { 
          success: true, 
          message: `You have ${taskCount} active tasks remaining for today.` 
      };

    case 'getCalendar':
        // Mock calendar response using localStorage or store if available
        return {
            success: true,
            message: "📅 Checking your schedule... You have 3 appointments today. Next one is at 2:00 PM."
        };

    default:
      return { success: false, message: `Intent "${action}" recognized but no executor found.` };
  }
}

