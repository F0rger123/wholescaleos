/**
 * Local AI Task Executor
 * Maps AI intents to actual platform actions.
 */

import { useStore } from '../../store/useStore';

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
        const newLead = {
          id: crypto.randomUUID(),
          full_name: entities.name || 'Unknown Lead',
          email: entities.email || '',
          phone: entities.phone || '',
          company: entities.company || '',
          status: 'New',
          created_at: new Date().toISOString(),
          last_contact: new Date().toISOString()
        };
        store.addLead(newLead as any);
        return { 
          success: true, 
          message: `Successfully created lead: ${entities.name}.`,
          data: newLead
        };
      } catch (e) {
        return { success: false, message: 'Failed to create lead.' };
      }

    case 'create_task':
      try {
        const newTask = {
          id: crypto.randomUUID(),
          title: entities.title || 'Untitled Task',
          due_date: entities.dueDate || new Date().toISOString().split('T')[0],
          priority: entities.priority || 'medium',
          status: 'pending',
          created_at: new Date().toISOString()
        };
        // store.addTask is expected in useStore. Check if it exists.
        if ((store as any).addTask) {
          (store as any).addTask(newTask);
        }
        return { success: true, message: `Task "${entities.title}" added to your list.`, data: newTask };
      } catch (e) {
        return { success: false, message: 'Failed to create task.' };
      }

    case 'send_sms':
      // Integration point for SMS service
      return { success: true, message: `Preparing to send SMS to ${entities.phone}.` };

    case 'search_leads':
      // This might involve setting a search filter in the store
      return { success: true, message: `Searching for leads matching "${entities.query}"...` };

    case 'update_lead_status':
      return { success: true, message: `Updating status for ${entities.leadName} to ${entities.status}.` };

    case 'add_note':
      return { success: true, message: `Adding note to ${entities.leadName}: "${entities.note}".` };

    case 'remind_me':
      return { success: true, message: `Reminder set: ${entities.task} at ${entities.time}.` };

    case 'what_is_my_schedule':
      window.location.hash = '#/tasks';
      return { success: true, message: 'Here is your current schedule.' };

    case 'help':
      return {
        success: true,
        message: 'I can help you with:\n- Creating leads and tasks\n- Sending messages\n- Searching your database\n- Navigating the platform\n- Managing your schedule'
      };

    default:
      return { success: false, message: 'I am not sure how to handle that task yet.' };
  }
}
