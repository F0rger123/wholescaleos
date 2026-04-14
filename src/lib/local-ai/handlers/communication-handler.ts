import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { sendSMS } from '../../sms-service';
import { useStore } from '../../../store/useStore';
import { trackLead, pushToEntityStack, resolveEntitiesFromContext } from '../memory-store';

/**
 * Handles all AI communication: SMS and Carrier resolution.
 * Supports individual and bulk SMS flows with robust lead matching.
 */
export class CommunicationHandler extends BaseHandler {
  intent = 'comms_action';

  async execute(params: any): Promise<TaskResponse> {
    const { action, target, message, carrier, text } = params;

    switch (action) {
      case 'send_sms':
        return this.handleSendSMS(target || text, message, carrier);
      case 'draft_sms':
        return this.wrapSuccess(`Draft: "${message}" for ${target}. Shall I send it?`, { draft: true });
      default:
        return this.wrapError(`Unknown communication action: ${action}`);
    }
  }

  private async handleSendSMS(target: string, message: string, carrierOverride?: string): Promise<TaskResponse> {
    const store = useStore.getState();
    const lowerTarget = target?.toLowerCase() || '';
    
    // 1. Resolve Targets (Support bulk like "both", "all", "them")
    let targets: any[] = [];
    const isBulk = ['both', 'them', 'all'].some(p => lowerTarget.includes(p));
    
    if (isBulk || !target) {
      targets = resolveEntitiesFromContext(lowerTarget);
    } else {
      // Direct lead lookup (Name, ID, Phone, or Address)
      const lead = store.leads.find(l => 
        l.id === target || 
        l.name.toLowerCase().includes(lowerTarget) || 
        l.phone?.includes(target) ||
        (l.propertyAddress && l.propertyAddress.toLowerCase().includes(lowerTarget))
      );
      if (lead) {
        targets = [{ id: lead.id, name: lead.name, type: 'lead' }];
      } else if (target.match(/\d{5,}/)) {
        // Raw phone number
        targets = [{ id: 'raw', name: target, type: 'lead' }];
      }
    }

    if (targets.length === 0) {
      return this.wrapError("I couldn't identify who to text. Please provide a name, address, or phone number.");
    }

    // 2. Requires Message Check
    if (!message) {
      const names = targets.map(t => t.name).join(' and ');
      return this.wrapSuccess(`I've set up a message for **${names}**. What would you like to say?`, { 
        targets, 
        action: 'open_sms_modal' 
      });
    }

    // 3. Execution
    let successCount = 0;
    const errors: string[] = [];

    for (const t of targets) {
      const lead = store.leads.find(l => l.id === t.id);
      const phone = lead?.phone || (t.id === 'raw' ? t.name : null);
      const carrier = carrierOverride || lead?.carrier || 'Verizon MMS';

      if (!phone) {
        errors.push(`No phone number for ${t.name}`);
        continue;
      }

      try {
        const result = await sendSMS(phone, message, carrier);
        if (result.success) {
          successCount++;
          if (lead) {
            trackLead(lead.id, lead.name);
            pushToEntityStack({ id: lead.id, name: lead.name, type: 'lead' });
          }
        } else {
          errors.push(`${t.name}: ${result.message}`);
        }
      } catch (e) {
        errors.push(`${t.name}: System error`);
      }
    }

    if (successCount === targets.length) {
      return this.wrapSuccess(`✅ Successfully sent SMS to ${targets.map(t => t.name).join(', ')}.`);
    }

    return {
      success: successCount > 0,
      message: `Sent ${successCount}/${targets.length} messages. Errors: ${errors.join('; ')}`,
      data: { successCount, errors }
    };
  }
}
