import { supabase } from './supabase';
import { leadsService, tasksService, notificationsService, chatService } from './supabase-service';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import * as emailSummaryService from './email-summary-service';
import { processPrompt } from './gemini';

export type AutomationEventType = 
  | 'LEAD_CREATED' 
  | 'TASK_STATUS_CHANGED' 
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_SCORE_HIGH' 
  | 'EMAIL_OPENED' 
  | 'SMS_RECEIVED' 
  | 'DEAL_WON' 
  | 'LEAD_INACTIVITY' 
  | 'CALENDAR_EVENT_CREATED' 
  | 'DOCUMENT_SIGNED' 
  | 'OFFER_SUBMITTED'
  | 'OFFER_ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'SCHEDULED_MONTHLY'
  | 'UNSUBSCRIBED'
  | 'FACEBOOK_LEAD'
  | 'CLIENT_BIRTHDAY'
  | 'REFERRAL_REQUESTED';

class AutomationEngine {
  private static instance: AutomationEngine;

  private constructor() {}

  public static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  /**
   * Trigger an automation event
   */
  public async trigger(eventType: AutomationEventType, data: any) {
    console.log(`[AutomationEngine] Triggering ${eventType}`, data);
    
    try {
      if (!supabase) return;

      // 1. Handle OS Preference-based direct alerts (Hardcoded system alerts)
      await this.handlePreferenceAlerts(eventType, data);

      // 2. Fetch active workflows
      const { data: workflows, error } = await supabase
        .from('user_automations')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!workflows || workflows.length === 0) return;

      // 3. Process each matching workflow
      for (const workflow of workflows) {
        const nodes = workflow.nodes as Node[];
        const edges = workflow.edges as Edge[];

        // Find trigger node
        const triggerNode = nodes.find(n => n.data?.type === 'trigger' && this.matchesTrigger(n, eventType, data));
        
        if (triggerNode) {
          // Update stats (Async, don't block execution)
          this.recordExecution(workflow.id, true).catch(console.error);

          // Set running state
          useStore.getState().setIsAutomationRunning(true);
          
          console.log(`[AutomationEngine] Executing workflow: ${workflow.name}`);
          toast.success(`Automation: ${workflow.name} triggered`, {
            icon: '⚡',
            style: {
              borderRadius: '10px',
              background: 'var(--t-surface)',
              color: 'var(--t-primary)',
              border: '1px solid var(--t-primary)'
            },
          });
          
          await this.executeFromNode(triggerNode, nodes, edges, data);
          
          // Small delay for visual feedback of "Running"
          setTimeout(() => {
            useStore.getState().setIsAutomationRunning(false);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('[AutomationEngine] Error processing triggers:', err);
      useStore.getState().setIsAutomationRunning(false);
    }
  }

  /**
   * Records execution stats back to Supabase
   */
  private async recordExecution(workflowId: string, success: boolean) {
    try {
      if (!supabase) return;

      const { data: current } = await supabase
        .from('user_automations')
        .select('run_count, success_count')
        .eq('id', workflowId)
        .single();

      if (current) {
        const run_count = (current.run_count || 0) + 1;
        const success_count = (current.success_count || 0) + (success ? 1 : 0);
        const success_rate = Math.round((success_count / run_count) * 100);

        await supabase
          .from('user_automations')
          .update({
            run_count,
            success_count,
            success_rate,
            last_triggered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', workflowId);
      }
    } catch (err) {
      console.error('[AutomationEngine] Failed to record execution:', err);
    }
  }

  /**
   * Dispatches OS Message alerts based on user preferences table
   */
  private async handlePreferenceAlerts(eventType: AutomationEventType, data: any) {
    const store = useStore.getState();
    const currentUser = store.currentUser;
    const userId = (data.user_id as string) || (data.assigned_to as string) || currentUser?.id;
    const leadId = data.id || data.leadId || data.lead_id;

    if (!userId) return;

    try {
      // Fetch user preferences
      const { data: prefs, error } = await supabase
        .from('user_os_messages_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"


      switch (eventType) {
        case 'LEAD_CREATED':
          if (prefs?.new_lead_alerts_enabled) {
            await emailSummaryService.sendLeadAlert(userId, leadId, 'new');
          }
          break;
        case 'LEAD_SCORE_HIGH':
          if (prefs?.lead_score_high_alert_enabled) {
            await emailSummaryService.sendLeadAlert(userId, leadId, 'high-score');
          }
          break;
        case 'LEAD_STATUS_CHANGED':
          if (data.status === 'closed-won' && prefs?.deal_closed_alerts_enabled) {
            await emailSummaryService.sendDealAlert(userId, leadId, 'closed');
          }
          break;
        case 'OFFER_SUBMITTED':
          if (prefs?.offer_made_alert_enabled) {
            await emailSummaryService.sendOfferAlert(userId, leadId, 'made');
          }
          break;
        case 'OFFER_ACCEPTED':
          if (prefs?.offer_accepted_alert_enabled) {
            await emailSummaryService.sendOfferAlert(userId, leadId, 'accepted');
          }
          break;
        case 'CONTRACT_SIGNED':
          if (prefs?.contract_signed_alert_enabled) {
            await emailSummaryService.sendContractAlert(userId, leadId);
          }
          break;
        case 'TASK_STATUS_CHANGED':
          if (data.status === 'overdue' && prefs?.task_overdue_alert_enabled) {
            const taskId = data.id || data.taskId;
            if (taskId) await emailSummaryService.sendTaskAlert(userId, taskId, 'overdue');
          }
          break;
        case 'LEAD_INACTIVITY':
          if (prefs?.lead_inactivity_alert_enabled) {
            await emailSummaryService.checkLeadInactivity(userId);
          }
          break;
        case 'CALENDAR_EVENT_CREATED':
          // Optional: handle calendar preferences if needed
          break;
      }
    } catch (err) {
      console.error('[AutomationEngine] Preference alert failed:', err);
    }
  }

  private matchesTrigger(node: Node, eventType: AutomationEventType, data: any): boolean {
    const config = node.data;
    if (!config) return false;
    
    switch (eventType) {
      case 'LEAD_CREATED': 
        return config.triggerType === 'new_lead';
      case 'TASK_STATUS_CHANGED': 
        return config.triggerType === 'task_overdue' && data.status === 'overdue' ||
               config.triggerType === 'status_change' && data.status === config.status;
      case 'LEAD_STATUS_CHANGED': 
        return config.triggerType === 'status_change' && data.status === config.status;
      case 'LEAD_SCORE_HIGH': 
        return config.triggerType === 'high_score' && Number(data.deal_score || data.dealScore || 0) >= Number(config.threshold || 80);
      case 'EMAIL_OPENED': 
        return config.triggerType === 'email_opened';
      case 'SMS_RECEIVED': 
        return config.triggerType === 'sms_received';
      case 'DEAL_WON': 
        return config.triggerType === 'status_change' && data.status === 'closed-won';
      case 'LEAD_INACTIVITY': 
        return config.triggerType === 'inactivity';
      case 'CALENDAR_EVENT_CREATED': 
        return config.triggerType === 'new_event';
      case 'DOCUMENT_SIGNED': 
        return config.triggerType === 'doc_signed';
      case 'OFFER_SUBMITTED':
        return config.triggerType === 'offer_submitted';
      case 'OFFER_ACCEPTED':
        return config.triggerType === 'offer_accepted';
      case 'CONTRACT_SIGNED':
        return config.triggerType === 'contract_signed';
      case 'SCHEDULED_MONTHLY': 
        return config.triggerType === 'monthly_run';
      case 'UNSUBSCRIBED': 
        return config.triggerType === 'unsubscribed';
      case 'FACEBOOK_LEAD': 
        return config.triggerType === 'facebook_lead';
      case 'CLIENT_BIRTHDAY':
        return config.triggerType === 'birthday';
      case 'REFERRAL_REQUESTED':
        return config.triggerType === 'referral_request';
      default: return false;
    }
  }

  private async executeFromNode(currentNode: Node, allNodes: Node[], allEdges: Edge[], context: any) {
    const childEdges = allEdges.filter(e => e.source === currentNode.id);
    
    for (const edge of childEdges) {
      const targetNode = allNodes.find(n => n.id === edge.target);
      if (targetNode) {
        const result = await this.runNodeAction(targetNode, context);
        await this.executeFromNode(targetNode, allNodes, allEdges, { ...context, ...result });
      }
    }
  }

  private async runNodeAction(node: Node, context: any) {
    const config = node.data;
    if (!config) return;

    console.log(`[AutomationEngine] Running action: ${config.actionType || config.type} (${config.label})`);

    try {
      const { sendAutomationSms, sendAutomationEmail, currentUser } = useStore.getState();

      const targetId = context.id || context.leadId || context.lead_id;

      switch (config.actionType) {
        case 'send_sms':
          if (targetId) {
            const msg = this.parseTemplate(config.message as string, { ...context, agent_name: currentUser?.name || 'Your Agent' });
            await sendAutomationSms(targetId as string, msg);
          }
          break;

        case 'send_email':
          if (targetId) {
            const subject = this.parseTemplate(config.subject as string, { ...context, agent_name: currentUser?.name || 'Your Agent' });
            const content = this.parseTemplate(config.message as string, { ...context, agent_name: currentUser?.name || 'Your Agent' });
            await sendAutomationEmail(targetId as string, subject, content);
          }
          break;

        case 'notify': {
          const userId = (context.user_id as string) || (context.assigned_to as string) || currentUser?.id;
          if (userId) {
            await notificationsService.create({
              user_id: userId,
              type: 'system',
              title: (config.label as string) || 'Automation Alert',
              message: this.parseTemplate(config.message as string, context),
              link: targetId ? `/leads/${targetId}` : undefined
            });
          }
          break;
        }

        case 'assign_lead':
          if (targetId && config.agentId) {
            await leadsService.update(targetId as string, { assigned_to: config.agentId });
          }
          break;

        case 'update_status':
          if (targetId && config.status) {
            await leadsService.update(targetId as string, { status: config.status });
          }
          break;

        case 'send_chat':
          if (config.channelId) {
            await chatService.sendMessage({
              channel_id: config.channelId as string,
              content: this.parseTemplate(config.message as string, context),
              sender_name: 'Automation Bot'
            });
          }
          break;

        case 'add_task':
          if (targetId) {
            await tasksService.create({
              title: this.parseTemplate(config.taskTitle as string, context),
              description: this.parseTemplate(config.description as string, context),
              priority: (config.priority as any) || 'medium',
              assigned_to: (config.agentId as string) || (context.assigned_to as string) || currentUser?.id,
              lead_id: targetId as string,
              due_date: new Date(Date.now() + 86400000).toISOString()
            });
          }
          break;

        case 'delay': {
          const seconds = Number(config.duration || config.delaySeconds || 0);
          console.log(`[AutomationEngine] Delaying for ${seconds} seconds...`);
          if (seconds > 0) {
            await new Promise(resolve => setTimeout(resolve, seconds * 1000));
          }
          break;
        }
        case 'ai': {
          const promptTemplate = config.prompt as string || 'Analyze this data: {{name}}';
          const model = config.model as string || 'gemini-1.5-flash';
          console.log(`[AutomationEngine] Running AI processing with ${model}...`);
          
          const fullPrompt = this.parseTemplate(promptTemplate, context);
          const aiResponse = await processPrompt(fullPrompt, context, model);
          
          return { ai_output: aiResponse.response };
        }
      }
    } catch (err) {
      console.error(`[AutomationEngine] Action failed for node ${node.id}:`, err);
    }
    return {};
  }

  private parseTemplate(template: string = '', context: any): string {
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const trimmedKey = key.trim();
      
      // Handle nested paths like lead.name
      const parts = trimmedKey.split('.');
      let value = context;
      for (const part of parts) {
        value = value?.[part];
      }

      // Fallback to top-level if nested not found
      if (value === undefined) {
        value = context[trimmedKey];
      }

      return value !== undefined ? String(value) : `{{${trimmedKey}}}`;
    });
  }
}

export const automationEngine = AutomationEngine.getInstance();
;
