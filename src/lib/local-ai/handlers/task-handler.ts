import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { useStore } from '../../../store/useStore';
import { trackLead } from '../memory-store';

/**
 * Handles all task-related AI actions: Task creation and listing.
 */
export class TaskHandler extends BaseHandler {
  intent = 'task_action';

  async execute(params: any): Promise<TaskResponse> {
    const { action, title, dueDate, priority, leadId, name } = params;

    switch (action) {
      case 'create_task':
        return this.createTask(title, dueDate, priority, leadId || name);
      case 'list_tasks':
        return this.listTasks();
      default:
        return this.wrapError(`Unknown task action: ${action}`);
    }
  }

  private async createTask(title: string, dueDate: string, priority: string, leadIdentifier: string): Promise<TaskResponse> {
    const store = useStore.getState();
    const query = leadIdentifier?.toLowerCase();
    const lead = query ? store.leads.find(l => 
      l.id === leadIdentifier || 
      l.name.toLowerCase().includes(query) ||
      (l.propertyAddress && l.propertyAddress.toLowerCase().includes(query))
    ) : null;
    
    if (lead) trackLead(lead.id, lead.name);

    if (!title) return this.wrapError("I need a title for the task.");

    store.addTask({
      title,
      description: `Auto-generated for ${lead?.name || 'General'}`,
      status: 'todo',
      priority: (priority?.toLowerCase() as any) || 'medium',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      assignedTo: store.currentUser?.id || 'system',
      createdBy: store.currentUser?.id || 'system',
      leadId: lead?.id
    } as any);

    return this.wrapSuccess(`Added task "${title}" to your list${lead ? ` for ${lead.name}` : ''}.`);
  }

  private async listTasks(): Promise<TaskResponse> {
    const store = useStore.getState();
    const pending = store.tasks.filter(t => t.status === 'todo');
    
    if (pending.length === 0) return this.wrapSuccess("Your task list is clear!");
    
    return this.wrapSuccess(`You have ${pending.length} pending tasks.`, { tasks: pending.slice(0, 5) });
  }
}
