import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { useStore } from '../../../store/useStore';
import { trackLead } from '../memory-store';

/**
 * Handles all CRM-related AI actions: Lead creation, status updates, and lookups.
 */
export class CRMHandler extends BaseHandler {
  intent = 'crm_action';

  async execute(params: any): Promise<TaskResponse> {
    const { action, leadId, name, status } = params;

    switch (action) {
      case 'get_lead':
        return this.getLead(leadId || name || params.address);
      case 'update_status':
        return this.updateStatus(leadId, status);
      case 'create_lead':
        return this.createLead(params);
      case 'filter_leads':
        return this.filterLeads(params);
      case 'compare_leads':
        return this.compareLeads(params.targets || [name, params.secondLead]);
      default:
        return this.wrapError(`Unknown CRM action: ${action}`);
    }
  }

  private async getLead(identifier: string | undefined): Promise<TaskResponse> {
    if (!identifier) return this.wrapError("I need a name or address to look up the lead.");
    
    const store = useStore.getState();
    const query = identifier.toLowerCase();
    
    // Support matching by ID, Name, or Property Address
    const lead = store.leads.find(l => 
      l.id === identifier || 
      l.name.toLowerCase().includes(query) ||
      (l.propertyAddress && l.propertyAddress.toLowerCase().includes(query))
    );
    
    if (!lead) return this.wrapError(`Couldn't find record for: ${identifier}`);
    
    trackLead(lead.id, lead.name);
    return this.wrapSuccess(`Found lead: **${lead.name}** at ${lead.propertyAddress || 'No Address'}.`, { lead });
  }

  private async compareLeads(targets: string[]): Promise<TaskResponse> {
    const store = useStore.getState();
    const leads = targets.map(t => 
      store.leads.find(l => l.name.toLowerCase().includes(t.toLowerCase()))
    ).filter(Boolean);

    if (leads.length < 2) return this.wrapError("I need at least two leads to compare. Try 'Compare Luke and Jane'.");

    const [leadA, leadB] = leads;
    const msg = `### Comparison: ${leadA?.name} vs ${leadB?.name}
- **Score:** ${leadA?.dealScore || 0} vs ${leadB?.dealScore || 0}
- **Status:** ${leadA?.status} vs ${leadB?.status}
- **Value:** $${(leadA?.estimatedValue || 0).toLocaleString()} vs $${(leadB?.estimatedValue || 0).toLocaleString()}
- **Address:** ${leadA?.propertyAddress || 'N/A'} vs ${leadB?.propertyAddress || 'N/A'}`;

    return this.wrapSuccess(msg, { leads: [leadA, leadB] });
  }

  private async updateStatus(leadId: string, status: string): Promise<TaskResponse> {
    const store = useStore.getState();
    const lead = store.leads.find(l => l.id === leadId);
    if (!lead) return this.wrapError("Lead not found.");

    // Implementation of status update logic
    store.updateLeadStatus(leadId, status as any, store.currentUser?.id || 'system');
    
    return {
      success: true,
      message: `Updated ${lead.name}'s status to ${status}.`,
      data: { leadId, status }
    };
  }

  private async createLead(data: any): Promise<TaskResponse> {
    const store = useStore.getState();
    store.addLead({
      name: data.name || 'New Lead',
      status: 'new',
      propertyAddress: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      source: 'ai',
      notes: data.notes || 'Created via AI Assistant',
      assignedTo: store.currentUser?.id || 'system',
      estimatedValue: data.value || 0
    } as any);

    return this.wrapSuccess(`Added ${data.name} to the pipeline.`);
  }

  private async filterLeads(params: any): Promise<TaskResponse> {
    const store = useStore.getState();
    let leads = store.leads;

    if (params.status) leads = leads.filter(l => l.status === params.status);
    if (params.minScore) leads = leads.filter(l => (l.dealScore || 0) >= params.minScore);

    return this.wrapSuccess(`Found ${leads.length} matching leads.`, { count: leads.length, leads: leads.slice(0, 5) });
  }
}
