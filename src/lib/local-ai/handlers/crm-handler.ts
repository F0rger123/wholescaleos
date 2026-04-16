import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { useStore, calculateDealScore } from '../../../store/useStore';
import { trackLead, getMemory } from '../memory-store';

/**
 * Handles all CRM-related AI actions: Lead creation, status updates, and lookups.
 */
export class CRMHandler extends BaseHandler {
  intent = 'crm_action';

  async execute(params: any): Promise<TaskResponse> {
    const { action, leadId, name, status, text, leadName } = params;
    console.log(`[🤖 CRM HANDLER] Executing action: ${action}`, params);

    switch (action) {
      case 'get_lead':
      case 'lead_details':
      case 'lead_context_query':
      case 'get_lead_info':
        return this.getLead(leadId || name || leadName || text || params.address);
      case 'list_leads':
      case 'list_all_leads':
      case 'lead_query':
        return this.filterLeads({ ...params, status: params.status || 'all' });
      case 'hot_leads':
        return this.filterLeads({ ...params, minScore: 80 });
      case 'update_status':
        return this.updateStatus(leadId || name || leadName, status || params.newStatus);
      case 'create_lead':
        return this.createLead(params);
      case 'filter_leads':
      case 'filter_leads_source':
      case 'filter_leads_time':
      case 'filter_leads_location':
        return this.filterLeads(params);
      case 'compare_leads':
        return this.compareLeads(params.targets || [name, params.secondLead]);
      case 'update_lead':
        return this.updateLead(leadId || name || leadName, params);
      case 'delete_lead':
        return this.deleteLead(leadId || name || leadName, params.confirmed);
      default:
        console.warn(`[🤖 CRM HANDLER] Unhandled action: ${action}`);
        return this.wrapError(`Unknown CRM action: ${action}`);
    }
  }

  private async getLead(identifier: string | undefined): Promise<TaskResponse> {
    try {
      if (!identifier || identifier === 'this') {
        // Try to resolve from context if 'this' or missing
        const memory = getMemory();
        const lastLead = memory.entityStack.find(e => e.type === 'lead');
        if (lastLead) {
          identifier = lastLead.id;
        } else {
          return this.wrapError("I need a name or address to look up the lead.");
        }
      }
      
      const store = useStore.getState();
      const query = identifier.toLowerCase().trim();
      
      console.log('[🤖 CRM HANDLER] Searching for lead with query:', query);
      
      // Support matching by ID, Name, or Property Address
      const lead = store.leads.find(l => {
        if (!l) return false;
        const nameMatch = l.name && l.name.toLowerCase().includes(query);
        const addressMatch = l.propertyAddress && l.propertyAddress.toLowerCase().includes(query);
        const idMatch = l.id === identifier;
        return !!(idMatch || nameMatch || addressMatch);
      });
      
      if (!lead) {
        console.warn('[🤖 CRM HANDLER] Lead not found for query:', query);
        return this.wrapError(`Couldn't find record for: ${String(identifier)}`);
      }
      
      console.log('[🤖 CRM HANDLER] Found lead:', lead.name);
      if (typeof trackLead === 'function') {
        trackLead(lead.id, lead.name);
      }
      
      return this.wrapSuccess(`Found lead: **${lead.name}** at ${lead.propertyAddress || 'No Address'}.`, { lead });
    } catch (error) {
      console.error('[🤖 CRM HANDLER] Crash in getLead:', error);
      return this.wrapError(`Technical glitch while searching for "${String(identifier)}". My team has been notified.`);
    }
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
    try {
      console.log('[🤖 CRM HANDLER] Filtering leads with params:', params);
      const store = useStore.getState();
      let leads = [...store.leads];

      if (params.status && params.status !== 'all') {
        leads = leads.filter(l => l.status === params.status);
      }

      if (params.minScore) {
        const min = Number(params.minScore);
        leads = leads.filter(l => {
          // Force recalculation for real-time accuracy and to bypass stale '0' scores
          const score = calculateDealScore(l);
          if (score >= min) {
             console.log(`[🤖 CRM HANDLER] Lead "${l.name}" SCORE: ${score} (PASS >= ${min})`);
          }
          return score >= min;
        });
      }

      if (params.maxScore) {
        const max = Number(params.maxScore);
        leads = leads.filter(l => {
          const score = calculateDealScore(l);
          return score <= max;
        });
      }

      console.log(`[🤖 CRM HANDLER] Filter complete. Found ${leads.length} leads.`);
      return this.wrapSuccess(`Found ${leads.length} matching leads.`, { count: leads.length, leads: leads.slice(0, 5) });
    } catch (error) {
      console.error('[🤖 CRM HANDLER] Crash in filterLeads:', error);
      return this.wrapError("I encountered a problem while filtering your leads.");
    }
  }

  private async updateLead(leadId: string, data: any): Promise<TaskResponse> {
    const store = useStore.getState();
    const lead = store.leads.find(l => l.id === leadId);
    if (!lead) return this.wrapError("Lead not found.");

    store.updateLead(leadId, data);
    return this.wrapSuccess(`Got it. I've updated the info for **${lead.name}**.`);
  }

  private async deleteLead(leadId: string, confirmed: boolean = false): Promise<TaskResponse> {
    const store = useStore.getState();
    const lead = store.leads.find(l => l.id === leadId);
    if (!lead) return this.wrapError("Lead not found.");

    if (!confirmed) {
      return {
        success: true,
        message: `Are you sure you want to permanently remove **${lead.name}**? This action cannot be undone.`,
        needsConfirmation: true,
        data: { leadId, action: 'delete_lead' }
      };
    }

    store.deleteLead(leadId);
    return this.wrapSuccess(`Permanently removed **${lead.name}** from your pipeline.`);
  }
}
