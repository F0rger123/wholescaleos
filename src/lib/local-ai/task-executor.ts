/**
 * OS Bot Task Executor (v5.0)
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
      return { success: true, message: 'Opening your Leads database.' };

    case 'show_tasks':
      window.location.hash = '#/tasks';
      return { success: true, message: 'Viewing your active Tasks.' };

    case 'show_completed_tasks':
      // The Tasks page has a filter/tab for completed. We'll navigate there.
      window.location.hash = '#/tasks';
      // Potential to set a store filter here if needed:
      // store.setTaskFilter('completed');
      return { success: true, message: 'Showing your completed tasks.' };

    case 'show_calendar':
      window.location.hash = '#/calendar';
      return { success: true, message: 'Opening your Schedule.' };

    case 'show_settings':
      window.location.hash = '#/settings';
      return { success: true, message: 'Opening AI & System Settings.' };

    case 'create_lead':
      try {
        const result = await store.addLead({
          name: entities.name || 'New Opportunity',
          email: entities.email || '',
          phone: entities.phone || '',
          status: 'new',
          source: 'ai_bot',
          propertyAddress: entities.location || '',
          propertyType: 'single-family',
          estimatedValue: entities.price || 0,
          bedrooms: 0,
          bathrooms: 0,
          sqft: 0,
          offerAmount: 0,
          lat: 30.2672,
          lng: -97.7431,
          notes: entities.notes || `Created via OS Bot.`,
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
          data: { id: result.id, ...entities }
        };
      } catch (e) {
        return { success: false, message: 'Lead creation service error.' };
      }

    case 'create_task':
      try {
        store.addTask({
          title: entities.title || 'New Task',
          description: entities.notes || '',
          assignedTo: store.currentUser?.id || 'system',
          dueDate: entities.dueDate || new Date().toISOString().split('T')[0],
          priority: entities.priority || 'medium',
          status: 'todo',
          createdBy: store.currentUser?.id || 'system',
          leadId: entities.leadId || null
        });
        return { success: true, message: `Task "${entities.title}" added to your list.`, data: entities };
      } catch (e) {
        return { success: false, message: 'Failed to add task.' };
      }

    case 'send_sms':
      try {
        const phone = entities.phone || entities.target;
        if (!phone) throw new Error('No phone number provided');
        const res = await sendSMS(phone, entities.message);
        return { 
          success: res.success, 
          message: res.success ? `SMS sent to ${entities.contactName || phone}.` : `Failed: ${res.message}`,
          data: { phone: res.formattedPhone }
        };
      } catch (e: any) {
        return { success: false, message: e.message || 'SMS service error.' };
      }

    case 'email_compose':
      // Open the compose modal via state if possible, or navigate
      window.location.hash = '#/inbox';
      // We'll store the draft state in local storage for the inbox to pick up
      localStorage.setItem('pending_ai_email', JSON.stringify({
        to: entities.email,
        subject: entities.subject,
        body: entities.message || ''
      }));
      return { success: true, message: `Opening email compose for ${entities.contactName || entities.email}.` };

    case 'complete_task':
      // find the most recent task matching part of titles or just the first one
      const recentTask = store.tasks.find(t => t.status === 'todo');
      if (recentTask) {
        store.completeTask(recentTask.id);
        return { success: true, message: `Marked "${recentTask.title}" as complete.` };
      }
      return { success: false, message: 'No active tasks found to complete.' };

    case 'help':
      return {
        success: true,
        message: 'I am OS Bot. I can:\n- Add leads with locations (e.g. "add lead John from Austin")\n- Create tasks with dates ("create task Call Mike tomorrow")\n- Send SMS ("text Sarah saying hello")\n- Compose emails ("email Mary about the contract")\n- Navigate ("show my tasks", "view calendar")\n- Mark items done ("mark task as complete")'
      };

    default:
      return { success: false, message: 'Intent recognized but no executor found.' };
  }
}

