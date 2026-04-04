import { IntentResult } from './intent-engine';
import { useStore } from '../../store/useStore';
import { MemoryStore } from './memory-store';

export async function executeTask(intentResult: IntentResult): Promise<any> {
  const { intent, data } = intentResult;
  const store = useStore.getState();
  const currentUser = store.currentUser?.id || 'system';

  try {
    switch (intent) {
      case 'create_lead':
        if (!data?.name) return { success: false, message: 'Need a name to create a lead.' };
        
        store.addLead({
          name: data.name,
          email: '',
          phone: '',
          status: 'new',
          source: 'other',
          propertyAddress: data.name, // Fallback if it's an address
          propertyType: 'single-family',
          estimatedValue: 0,
          offerAmount: 0,
          lat: 0,
          lng: 0,
          sqft: 0,
          bedrooms: 0,
          bathrooms: 0,
          documents: [],
          notes: 'Created via Local AI',
          assignedTo: currentUser,
          probability: 50,
          engagementLevel: 1,
          timelineUrgency: 1,
          competitionLevel: 1,
        });
        
        MemoryStore.updateMemory({ lastTargetName: data.name, lastIntent: 'create_lead' });
        return { success: true };

      case 'create_task':
        if (!data?.title) return { success: false, message: 'Need a task description.' };
        
        store.addTask({
          title: data.title,
          description: '',
          assignedTo: currentUser,
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          status: 'todo',
          createdBy: currentUser,
        });
        
        MemoryStore.updateMemory({ lastIntent: 'create_task' });
        return { success: true };

      case 'update_status':
        if (!data?.targetName || !data?.newStatus) return { success: false, message: 'Missing lead name or new status.' };
        
        const q = data.targetName.toLowerCase();
        const lead = store.leads.find(l => 
          (l.name && l.name.toLowerCase().includes(q)) || 
          (l.propertyAddress && l.propertyAddress.toLowerCase().includes(q))
        );
        
        if (!lead) return { success: false, message: `Could not find a lead matching "${data.targetName}".` };
        
        store.updateLeadStatus(lead.id, data.newStatus as any, currentUser);
        MemoryStore.updateMemory({ lastTargetName: lead.name, lastIntent: 'update_status' });
        return { success: true, leadName: lead.name };

      case 'navigate':
        // Navigation is handled externally (e.g. returning the mock bot message with data)
        // We just return success.
        return { success: true, path: data?.path };

      case 'show_hot_leads':
      case 'get_analytics':
        // Handled by generator/intent engine directly for now
        return { success: true };
        
      default:
        return { success: false, message: 'Action not supported in offline mode.' };
    }
  } catch (err: any) {
    console.error('Local AI Execution Error:', err);
    return { success: false, message: err?.message || 'Execution failed.' };
  }
}
