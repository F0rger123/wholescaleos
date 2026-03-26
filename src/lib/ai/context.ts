/**
 * Manages the conversation context for the AI assistant.
 * Tracks the last discussed lead, task, or team member to allow follow-up questions.
 */
export interface ConversationContext {
  lastLeadId?: string;
  lastLeadName?: string;
  lastTaskId?: string;
  lastTaskTitle?: string;
  sessionStartTime: string;
  interactionCount: number;
}

let currentContext: ConversationContext = {
  sessionStartTime: new Date().toISOString(),
  interactionCount: 0
};

export const AIContextManager = {
  getContext(): ConversationContext {
    return currentContext;
  },

  updateContext(updates: Partial<ConversationContext>) {
    currentContext = { 
      ...currentContext, 
      ...updates,
      interactionCount: currentContext.interactionCount + 1
    };
  },

  setLastLead(id: string, name: string) {
    this.updateContext({ lastLeadId: id, lastLeadName: name });
  },

  setLastTask(id: string, title: string) {
    this.updateContext({ lastTaskId: id, lastTaskTitle: title });
  },

  reset() {
    currentContext = {
      sessionStartTime: new Date().toISOString(),
      interactionCount: 0
    };
  }
};
