/**
 * Local AI Task Executor
 * Maps AI intents to actual platform actions.
 */

import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
}

export async function executeTask(intent: string, entities: any): Promise<TaskResponse> {
  const store = useStore.getState();

  switch (intent) {
    case 'show_dashboard':
      window.location.hash = '#/dashboard';
      return { success: true, message: 'Navigating to Dashboard.' };

    case 'show_leads':
      window.location.hash = '#/leads';
      return { success: true, message: 'Opening your Leads.' };

    case 'show_tasks':
      window.location.hash = '#/tasks';
      return { success: true, message: 'Viewing your Tasks.' };

    case 'create_lead':
      try {
        const result = await store.addLead({
          name: entities.name || 'New Lead',
          email: entities.email || '',
          phone: entities.phone || '',
          status: 'new',
          source: 'other',
          propertyAddress: entities.company || '', // Using company as address if provided, or empty
          propertyType: 'single-family',
          estimatedValue: 0,
          bedrooms: 0,
          bathrooms: 0,
          sqft: 0,
          offerAmount: 0,
          lat: 30.2672,
          lng: -97.7431,
          notes: `Created via Local AI. Company: ${entities.company || 'N/A'}`,
          assignedTo: store.currentUser?.id || 'system',
          probability: 50,
          engagementLevel: 1,
          timelineUrgency: 1,
          competitionLevel: 1,
          documents: [],
        });
        return { 
          success: result.success, 
          message: result.success ? `Successfully created lead: ${entities.name}.` : 'Failed to create lead.',
          data: entities
        };
      } catch (e) {
        return { success: false, message: 'Failed to create lead.' };
      }

    case 'create_task':
      try {
        store.addTask({
          title: entities.title || 'New Task',
          description: '',
          assignedTo: store.currentUser?.id || 'system',
          dueDate: entities.dueDate || new Date().toISOString().split('T')[0],
          priority: entities.priority || 'medium',
          status: 'todo',
          createdBy: store.currentUser?.id || 'system'
        });
        return { success: true, message: `Task "${entities.title}" added to your list.`, data: entities };
      } catch (e) {
        return { success: false, message: 'Failed to create task.' };
      }

    case 'send_sms':
      try {
        const res = await sendSMS(entities.target || entities.phone, entities.message);
        return { 
          success: res.success, 
          message: res.success ? `SMS sent to ${entities.target}.` : `Failed to send SMS: ${res.message}`,
          data: { phone: res.formattedPhone }
        };
      } catch (e) {
        return { success: false, message: 'SMS service error.' };
      }

    case 'search_leads':
      // Navigation with search parameter – current UI might not support it, but we can go to leads
      window.location.hash = '#/leads';
      return { success: true, message: `Searching for leads matching "${entities.query}"...` };

    case 'update_lead_status':
      const lead = store.leads.find(l => l.name?.toLowerCase().includes(entities.leadName?.toLowerCase()));
      if (lead) {
        store.updateLeadStatus(lead.id, entities.status, store.currentUser?.id || 'system');
        return { success: true, message: `Updated ${lead.name} to ${entities.status}.` };
      }
      return { success: false, message: `Could not find lead named ${entities.leadName}.` };

    case 'add_note':
      const noteLead = store.leads.find(l => l.name?.toLowerCase().includes(entities.leadName?.toLowerCase()));
      if (noteLead && store.addTimelineEntry) {
        store.addTimelineEntry(noteLead.id, {
          type: 'note',
          content: entities.note,
          user: store.currentUser?.id || 'system',
          timestamp: new Date().toISOString()
        });
        return { success: true, message: `Note added to ${noteLead.name}.` };
      }
      return { success: false, message: `Could not find lead named ${entities.leadName}.` };


    case 'remind_me':
      store.addTask({
        title: `Reminder: ${entities.task}`,
        description: `Triggered at ${entities.time}`,
        assignedTo: store.currentUser?.id || 'system',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'high',
        status: 'todo',
        createdBy: store.currentUser?.id || 'system'
      });
      return { success: true, message: `Reminder set: ${entities.task}.` };

    case 'what_is_my_schedule':
      window.location.hash = '#/tasks';
      return { success: true, message: 'Navigating to your schedule.' };

    case 'help':
      return {
        success: true,
        message: 'I can help you with:\n- Creating leads and tasks\n- Sending messages\n- Searching your database\n- Navigating the platform\n- Managing your schedule'
      };

    default:
      return { success: false, message: 'Unknown local task.' };
  }
}

