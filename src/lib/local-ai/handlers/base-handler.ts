import { TaskResponse } from '../task-executor';

/**
 * Base class for all AI capability handlers.
 * Decouples domain-specific logic from the main task-executor monolith.
 */
export abstract class BaseHandler {
  abstract intent: string;

  /**
   * Main execution entry point for the handler.
   */
  abstract execute(params: any, context?: any): Promise<TaskResponse>;

  /**
   * Reasoning trace for the LLM to explain the logic.
   */
  protected createReasoning(steps: string[]): string[] {
    return steps;
  }

  /**
   * Helper to format human-readable messages.
   */
  protected wrapSuccess(message: string, data?: any): TaskResponse {
    return { success: true, message, data };
  }

  protected wrapError(message: string): TaskResponse {
    return { success: false, message };
  }
}
