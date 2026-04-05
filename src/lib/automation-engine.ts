import { supabase } from './supabase';
import { leadsService, tasksService, notificationsService, chatService } from './supabase-service';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';

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
  | 'SCHEDULED_MONTHLY'
  | 'UNSUBSCRIBED'
  | 'FACEBOOK_LEAD';

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

      // 1. Fetch active workflows
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!workflows || workflows.length === 0) return;

      // 2. Process each matching workflow
      for (const workflow of workflows) {
        const nodes = workflow.nodes as Node[];
        const edges = workflow.edges as Edge[];

        // Find trigger node
        const triggerNode = nodes.find(n => n.data?.type === 'trigger' && this.matchesTrigger(n, eventType, data));
        
        if (triggerNode) {
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
      case 'SCHEDULED_MONTHLY': 
        return config.triggerType === 'monthly_run';
      case 'UNSUBSCRIBED': 
        return config.triggerType === 'unsubscribed';
      case 'FACEBOOK_LEAD': 
        return config.triggerType === 'facebook_lead';
      default: return false;
    }
  }

  private async executeFromNode(currentNode: Node, allNodes: Node[], allEdges: Edge[], context: any) {
    const childEdges = allEdges.filter(e => e.source === currentNode.id);
    
    for (const edge of childEdges) {
      const targetNode = allNodes.find(n => n.id === edge.target);
      if (targetNode) {
        await this.runNodeAction(targetNode, context);
        await this.executeFromNode(targetNode, allNodes, allEdges, context);
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
      }
    } catch (err) {
      console.error(`[AutomationEngine] Action failed for node ${node.id}:`, err);
    }
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
