import { wrapResponse } from './personality-engine';

// Handlers and Types
import { TaskResponse, Entity } from './types';
export type { TaskResponse, Entity };
import { BaseHandler } from './handlers/base-handler';
import { CRMHandler } from './handlers/crm-handler';
import { CommunicationHandler } from './handlers/communication-handler';
import { TaskHandler } from './handlers/task-handler';
import { SystemHandler } from './handlers/system-handler';
import { RealEstateHandler } from './handlers/real-estate-handler';
import { getMemory } from './memory-store';

/**
 * Registry of modular AI handlers (v13.0).
 * Maps standardized intent names to their domain-specific handlers.
 */
const HANDLERS: Record<string, BaseHandler> = {
  // CRM Domain
  'crm_action': new CRMHandler(),
  'list_leads': new CRMHandler(),
  'list_all_leads': new CRMHandler(),
  'hot_leads': new CRMHandler(),
  'create_lead': new CRMHandler(),
  'update_status': new CRMHandler(),
  'get_lead': new CRMHandler(),
  'lead_details': new CRMHandler(),
  'lead_query': new CRMHandler(),
  'lead_context_query': new CRMHandler(),
  'filter_leads': new CRMHandler(),
  'filter_leads_source': new CRMHandler(),
  'filter_leads_time': new CRMHandler(),
  'filter_leads_location': new CRMHandler(),
  'compare_leads': new CRMHandler(),
  'update_lead': new CRMHandler(),
  'delete_lead': new CRMHandler(),
  'get_lead_info': new CRMHandler(),

  // Communication Domain
  'comms_action': new CommunicationHandler(),
  'send_sms': new CommunicationHandler(),
  'send_sms_partial': new CommunicationHandler(),
  'draft_sms': new CommunicationHandler(),
  'send_email': new CommunicationHandler(),
  'email_campaign': new CommunicationHandler(),

  // Task Domain
  'task_action': new TaskHandler(),
  'add_task': new TaskHandler(),
  'create_task': new TaskHandler(),
  'show_tasks': new TaskHandler(),
  'list_tasks': new TaskHandler(),
  'tasks_due': new TaskHandler(),
  'task_query': new TaskHandler(),
  'complete_task': new TaskHandler(),
  'delete_task': new TaskHandler(),

  // System & Personal Domain
  'system_action': new SystemHandler(),
  'navigate': new SystemHandler(),
  'small_talk': new SystemHandler(),
  'greeting': new SystemHandler(),
  'help': new SystemHandler(),
  'help_commands': new SystemHandler(),
  'capabilities': new SystemHandler(),
  'memory_recall': new SystemHandler(),
  'time_query': new SystemHandler(),
  'joke': new SystemHandler(),
  'user_fact': new SystemHandler(),
  'remember_fact': new SystemHandler(),
  'mood_check': new SystemHandler(),
  'motivation': new SystemHandler(),
  'test_query': new SystemHandler(),
  'system_status': new SystemHandler(),
  'cancel_confirmation': new SystemHandler(),
  'repeat_last': new SystemHandler(),
  'change_personality': new SystemHandler(),
  'personality_query': new SystemHandler(),
  'list_learned': new SystemHandler(),
  'forget_learned': new SystemHandler(),

  // Real Estate Domain
  'real_estate_action': new RealEstateHandler(),
  'real_estate_knowledge': new RealEstateHandler(),
  'real_estate_strategy': new RealEstateHandler(),
  'property_analysis': new RealEstateHandler(),
  'deal_calculator': new RealEstateHandler(),
  'financing_question': new RealEstateHandler(),
  'agent_script': new RealEstateHandler(),
  'investment_strategy': new RealEstateHandler(),
  'legal_question': new RealEstateHandler(),
  'market_analysis': new RealEstateHandler(),
  'explain_logic': new RealEstateHandler(),
  'marketing_tips': new RealEstateHandler(),
  'business_advice': new RealEstateHandler(),
  'cap_rate_calculation': new RealEstateHandler(),
  'subject_to_analysis': new RealEstateHandler(),

  // Advisor & Misc
  'proactive_trigger': new SystemHandler(),
  'proactive_suggestion': new SystemHandler()
};

/**
 * Internal task execution logic.
 * Routes requests to specialized domain handlers.
 */
async function executeTaskInternal(action: string, entities: any): Promise<TaskResponse> {
  const memory = getMemory();
  console.log(`[🤖 OS EXECUTOR] Routing action: "${action}"`, entities);
  
  // v13.0: Implicit Context Bonding
  // If we're creating a task/sms and no leadId is provided, bind to the last mentioned lead
  if ((action.includes('task') || action.includes('sms') || action.includes('comms')) && !entities.leadId && !entities.target) {
    const lastLead = memory.entityStack.find(e => e.type === 'lead');
    if (lastLead) {
      console.log(`[🤖 OS BOT] Bonding "${action}" to lead: ${lastLead.name}`);
      entities.leadId = lastLead.id;
      entities.target = lastLead.name;
    }
  }

  // 1. Delegate to Modular Handlers if available
  const handler = HANDLERS[action];
  if (handler) {
    try {
      console.log(`[🤖 OS EXECUTOR] Calling ${handler.constructor.name} for "${action}"`);
      const handlerResult = await handler.execute(entities);
      return {
        ...handlerResult,
        reasoning: [
          `Delegated execution to ${handler.constructor.name}.`,
          ...(handlerResult.reasoning || [])
        ]
      };
    } catch (e) {
      console.error(`[❌ Modular Handler Error] ${action}:`, e);
      return { 
        success: false, 
        message: `The ${action} handler encountered a technical glitch. I've logged the error for my team.`,
        reasoning: [`Execution crash in ${handler.constructor.name}`]
      };
    }
  }

  // 2. Fallback for unrecognized actions
  console.warn(`[⚠️ OS EXECUTOR] No registered handler for action: "${action}"`);
  return { 
    success: false, 
    message: `I recognized the intent "${action}" but don't have a specific local handler for it yet.`,
    reasoning: [`No registered handler for ${action}`]
  };
}


/**
 * Main entry point for task execution.
 * Wraps the internal logic with personality and error handling.
 */
export async function executeTask(action: string, entities: any): Promise<TaskResponse> {
  try {
    const result = await executeTaskInternal(action, entities);
    
    // Apply personality wrapping if not already "clean" or small talk
    if (!result.clean && action !== 'small_talk' && action !== 'greeting') {
      const type = result.success ? (result.data?.lastSuggestion ? 'confirm' : 'success') : 'error';
      result.message = wrapResponse(result.message, type, action);
    }

    return result;
  } catch (error) {
    console.error(`[❌ OS Bot] executeTask Error [Action: ${action}]`, error);
    
    return {
      success: false,
      message: wrapResponse(`I encountered a problem: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', action)
    };
  }
}

/**
 * TaskExecutor Namespace (v11.0)
 */
export const TaskExecutor = {
  execute: executeTask,
  handlers: HANDLERS
};
