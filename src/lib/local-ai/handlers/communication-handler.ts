import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { sendSMS } from '../../sms-service';
import { useStore } from '../../../store/useStore';
import { trackLead } from '../memory-store';

/**
 * Handles all AI communication: SMS and Carrier resolution.
 */
export class CommunicationHandler extends BaseHandler {
  intent = 'comms_action';

  async execute(params: any): Promise<TaskResponse> {
    const { action, target, message, carrier } = params;

    switch (action) {
      case 'send_sms':
        return this.handleSendSMS(target, message, carrier);
      case 'draft_sms':
        return this.wrapSuccess(`Draft: "${message}" for ${target}. Shall I send it?`, { draft: true });
      default:
        return this.wrapError(`Unknown communication action: ${action}`);
    }
  }

  private async handleSendSMS(target: string, message: string, carrierOverride?: string): Promise<TaskResponse> {
    const store = useStore.getState();
    const lead = store.leads.find(l => 
      l.id === target || l.name.toLowerCase().includes(target.toLowerCase()) || l.phone?.includes(target)
    );

    const phone = lead?.phone || target;
    const carrier = carrierOverride || lead?.carrier || 'Verizon MMS';

    if (lead) trackLead(lead.id, lead.name);

    if (!message) return this.wrapError("I need a message to send.");

    try {
      const result = await sendSMS(phone, message, carrier);
      if (result.success) {
        return this.wrapSuccess(`Successfully sent SMS to ${lead?.name || phone}.`, { phone, carrier });
      }
      return this.wrapError(`SMS check failed: ${result.message}`);
    } catch (e) {
      return this.wrapError(`System error during SMS send: ${e}`);
    }
  }
}
