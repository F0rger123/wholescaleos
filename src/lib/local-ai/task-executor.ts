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

/**
 * Registry of modular AI handlers (v11.0).
 */
const HANDLERS: Record<string, BaseHandler> = {
  'crm_action': new CRMHandler(),
  'comms_action': new CommunicationHandler(),
  'task_action': new TaskHandler(),
  'system_action': new SystemHandler(),
  'navigate': new SystemHandler(),
  'small_talk': new SystemHandler(),
  'help': new SystemHandler(),
  'memory_recall': new SystemHandler(),
  'real_estate_action': new RealEstateHandler(),
  'proactive_trigger': new SystemHandler() 
};

/**
 * Internal task execution logic.
 * Routes requests to specialized domain handlers.
 */
async function executeTaskInternal(action: string, entities: any): Promise<TaskResponse> {
  const memory = getMemory();
  
  // v13.0: Implicit Context Bonding
  // If we're creating a task/sms and no leadId is provided, bind to the last mentioned lead
  if ((action === 'task_action' || action === 'comms_action') && !entities.leadId && !entities.target) {
    const lastLead = memory.entityStack.find(e => e.type === 'lead');
    if (lastLead) {
      console.log(`[🤖 OS BOT] Bonding ${action} to lead: ${lastLead.name}`);
      entities.leadId = lastLead.id;
      entities.target = lastLead.name;
    }
  }

  // 1. Delegate to Modular Handlers if available
  if (HANDLERS[action]) {
    try {
      const handlerResult = await HANDLERS[action].execute(entities);
      return {
        ...handlerResult,
        reasoning: [
          `Delegated execution to ${HANDLERS[action].constructor.name}.`,
          ...(handlerResult.reasoning || [])
        ]
      };
    } catch (e) {
      console.error(`[Modular Handler Error] ${action}:`, e);
      return { success: false, message: `The ${action} handler encountered an error.` };
    }
  }

  // 2. Fallback for unrecognized actions
  return { 
    success: false, 
    message: `I recognized the intent "${action}" but don't have a specific handler for it yet.`,
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
