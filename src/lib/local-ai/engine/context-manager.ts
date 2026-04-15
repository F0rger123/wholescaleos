import { getMemory, addConversationTurn, setConversationState, getConversationState, setTopic } from '../memory-store';
import { addMentionedLead, getConversationContext } from '../learning-service';

/**
 * Enhanced Context Manager for OS Bot
 * v12.0: Supports conversation continuity, pronoun resolution, implicit entity linking,
 * and multi-turn workflow management.
 */
export class ContextManager {

  /**
   * Retrieves the current conversation context including history and active entities.
   */
  static async getContext(userId: string, sessionId: string) {
    const memory = getMemory();
    const history = await getConversationContext(userId, sessionId);

    return {
      userId,
      sessionId,
      history,
      lastEntity: memory.entityStack[0] || null,
      currentTime: new Date().toISOString(),
      activeTopic: memory.activeTopic,
      conversationState: memory.conversationState,
      userPreferences: memory.userPreferences
    };
  }

  /**
   * Resolves implicit entities (Pronouns like "him", "it", "that lead").
   * v12.0: Supports merged entity resolution for corrections and multi-turn context.
   */
  static resolveEntities(text: string, currentEntities: Record<string, any>, previousTurn?: any): Record<string, any> {
    const memory = getMemory();
    const lower = text.toLowerCase();
    const isCorrection = this.isCorrection(text);

    // If it's a correction, we merge with previous turn entities but let current ones override
    let updated = isCorrection && previousTurn?.entities
      ? { ...previousTurn.entities, ...currentEntities }
      : { ...currentEntities };

    // 1. Resolve Lead References
    if (/\b(him|her|his|hers|that lead|this lead|the guy|the owner|the seller)\b/i.test(lower)) {
      const lastLead = memory.entityStack.find(e => e.type === 'lead');
      if (lastLead) {
        updated.leadId = updated.leadId || lastLead.id;
        if (!updated.name && !updated.target && !updated.address) {
          updated.name = lastLead.name;
          updated.target = lastLead.name;
        }
      }
    }

    // 2. Resolve Task References
    if (/\b(it|that task|this task)\b/i.test(lower)) {
      const lastTask = memory.entityStack.find(e => e.type === 'task');
      if (lastTask) {
        updated.taskId = updated.taskId || lastTask.id;
        if (!updated.title) updated.title = lastTask.name;
      }
    }

    // 3. Temporal Resolution
    if (lower.includes('yesterday')) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      updated.dueDate = date.toISOString().split('T')[0];
    } else if (lower.includes('tomorrow')) {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      updated.dueDate = date.toISOString().split('T')[0];
    } else if (lower.includes('next week')) {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      updated.dueDate = date.toISOString().split('T')[0];
    } else if (lower.includes('today')) {
      updated.dueDate = new Date().toISOString().split('T')[0];
    }

    // 4. Plural References (them, both, all)
    if (/\b(them|both|all|those|these)\b/i.test(lower)) {
      const recentEntities = memory.entityStack.slice(0, 5);
      updated.targets = recentEntities.map(e => e.name);
    }

    return updated;
  }

  /**
   * Tracks mentioned entities in the persistence layer.
   */
  static async trackMentions(userId: string, sessionId: string, entities: Record<string, any>) {
    if (entities.name || entities.target) {
      const name = entities.name || entities.target;
      if (typeof name === 'string') {
        await addMentionedLead(userId, sessionId, name);
      }
    }
  }

  /**
   * Detects if the user is correcting previous input.
   */
  static isCorrection(text: string): boolean {
    const correctionKeywords = ['no wait', 'actually', 'instead', 'correction', 'i meant', 'no, ', 'change it to', 'rather'];
    const lower = text.toLowerCase();
    return correctionKeywords.some(k => lower.startsWith(k) || lower.includes(` ${k} `) || lower.includes(`${k},`));
  }

  /**
   * Updates the active topic based on conversation content.
   */
  static updateTopic(text: string): string {
    const memory = getMemory();
    const lower = text.toLowerCase();

    // Detect topic keywords
    const topicKeywords: Record<string, string[]> = {
      'leads': ['lead', 'seller', 'buyer', 'prospect', 'client'],
      'tasks': ['task', 'todo', 'reminder', 'schedule', 'appointment', 'call'],
      'deals': ['deal', 'property', 'analysis', 'numbers', 'calculate', 'flip', 'rental'],
      'marketing': ['marketing', 'campaign', 'mail', 'call', 'lead generation'],
      'financing': ['financing', 'loan', 'mortgage', 'lender', 'hard money']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        if (memory.activeTopic !== topic) {
          setTopic(topic);
        }
        return topic;
      }
    }

    return memory.activeTopic || 'general';
  }

  /**
   * Manages conversation state for multi-turn workflows.
   */
  static startWorkflow(workflowName: string, initialContext: Record<string, any> = {}) {
    const state = getConversationState();

    // If there's an active workflow, interrupt it
    if (state?.currentWorkflow) {
      this.interruptWorkflow();
    }

    setConversationState({
      currentWorkflow: workflowName,
      step: 0,
      context: initialContext
    });
  }

  /**
   * Advances the current workflow to the next step.
   */
  static advanceWorkflow(newContext: Record<string, any> = {}) {
    const state = getConversationState();
    if (!state) return;

    setConversationState({
      ...state,
      step: (state.step || 0) + 1,
      context: { ...state.context, ...newContext }
    });
  }

  /**
   * Completes the current workflow.
   */
  static completeWorkflow() {
    setConversationState(undefined);
  }

  /**
   * Interrupts the current workflow to handle a new topic.
   */
  static interruptWorkflow() {
    const state = getConversationState();
    if (!state?.currentWorkflow) return;

    // Save the interrupted state
    setConversationState({
      ...state,
      interruptedWorkflow: state.currentWorkflow,
      interruptedStep: state.step,
      interruptedContext: state.context,
      currentWorkflow: undefined,
      step: undefined,
      context: undefined
    });
  }

  /**
   * Resumes an interrupted workflow.
   */
  static resumeWorkflow(): { workflow: string; step: number; context: Record<string, any> } | null {
    const state = getConversationState();
    if (!state?.interruptedWorkflow) return null;

    const resumed = {
      workflow: state.interruptedWorkflow,
      step: state.interruptedStep || 0,
      context: state.interruptedContext || {}
    };

    setConversationState({
      currentWorkflow: state.interruptedWorkflow,
      step: state.interruptedStep,
      context: state.interruptedContext,
      interruptedWorkflow: undefined,
      interruptedStep: undefined,
      interruptedContext: undefined
    });

    return resumed;
  }

  /**
   * Gets the current workflow step and context.
   */
  static getWorkflowState(): { workflow?: string; step?: number; context?: Record<string, any> } | null {
    const state = getConversationState();
    if (!state || !state.currentWorkflow) return null;
    return {
      workflow: state.currentWorkflow,
      step: state.step,
      context: state.context
    };
  }

  /**
   * Adds a conversation turn to memory with full context.
   */
  static async addTurn(_userId: string, _sessionId: string, role: 'user' | 'assistant', content: string, intent?: string, entities?: Record<string, any>) {
    const turn = {
      role,
      content,
      timestamp: new Date().toISOString(),
      intent,
      entities
    };

    addConversationTurn(turn);

    // Update topic based on content
    if (role === 'user') {
      this.updateTopic(content);
    }
  }

  /**
   * Gets a summary of the recent conversation context.
   */
  static async getConversationSummary(limit: number = 5): Promise<string> {
    const memory = getMemory();
    const recentTurns = memory.history.slice(-limit);

    if (recentTurns.length === 0) {
      return "No recent conversation history.";
    }

    const summary = recentTurns.map(turn => {
      const role = turn.role === 'user' ? 'User' : 'Bot';
      return `${role}: ${turn.content.substring(0, 100)}...`;
    }).join('\n');

    return `Recent Conversation:\n${summary}`;
  }

  /**
   * Checks if the current input is a continuation of the previous topic.
   */
  static isContinuation(currentInput: string, previousInput: string): boolean {
    const currentWords = new Set(currentInput.toLowerCase().split(/\s+/));
    const previousWords = new Set(previousInput.toLowerCase().split(/\s+/));

    // Check for word overlap
    const overlap = [...currentWords].filter(w => previousWords.has(w));
    const overlapRatio = overlap.length / Math.max(currentWords.size, previousWords.size);

    return overlapRatio > 0.3;
  }

  /**
   * Extracts key entities from the conversation for context preservation.
   */
  static extractKeyEntities(turns: Array<{ content: string; role: string }>): Record<string, any> {
    const entities: Record<string, any> = {};

    for (const turn of turns) {
      if (turn.role === 'user') {
        const content = turn.content.toLowerCase();

        // Extract potential names (capitalized words)
        const nameMatches = turn.content.match(/\b[A-Z][a-z]+\b/g);
        if (nameMatches) {
          entities.names = entities.names || [];
          entities.names.push(...nameMatches.filter(n => n.length > 2));
        }

        // Extract potential addresses
        const addressPatterns = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl|way|boulevard|blvd)/i;
        const addressMatch = content.match(addressPatterns);
        if (addressMatch) {
          entities.addresses = entities.addresses || [];
          entities.addresses.push(addressMatch[0]);
        }

        // Extract potential prices
        const pricePatterns = /\$[\d,]+(?:k|m)?/gi;
        const priceMatches = content.match(pricePatterns);
        if (priceMatches) {
          entities.prices = priceMatches;
        }
      }
    }

    return entities;
  }
}