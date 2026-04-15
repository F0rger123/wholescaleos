/**
 * Enhanced Memory Store for OS Bot
 * v12.0: Vector-based memory, user profile learning, and conversation state management
 */

export interface Entity {
  id: string;
  name: string;
  type: 'lead' | 'contact' | 'task' | 'deal';
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: Record<string, any>;
}

export interface UserPerspective {
  style: 'aggressive' | 'conservative' | 'balanced';
  favStrategies: string[];
  focusNiches: string[];
}

export type Sentiment = 'happy' | 'neutral' | 'frustrated' | 'urgent' | 'curious';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
  entities?: Record<string, any>;
}

export interface Memory {
  messages: any[];
  history: ConversationTurn[];
  entityStack: Entity[];
  learnedFacts: Record<string, string>;
  lastTopic?: string;
  activeTopic?: string;
  activeState?: { type: string; data: any };
  sessionId: string;
  perspective?: UserPerspective;
  sentiment: Sentiment;
  outcomes?: any[];
  conversationState?: {
    currentWorkflow?: string;
    step?: number;
    context?: Record<string, any>;
    interruptedWorkflow?: string;
    interruptedStep?: number;
    interruptedContext?: Record<string, any>;
  };
  userPreferences?: {
    communicationStyle?: string;
    investmentGoals?: string[];
    preferredStrategies?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
    marketFocus?: string[];
  };
}

const MEMORY_KEY = 'wholescale-os-memory';
const SESSION_PREFIX = 'os_session_';

export function getMemory(): Memory {
  const stored = localStorage.getItem(MEMORY_KEY);
  if (stored) return JSON.parse(stored);
  return {
    messages: [],
    history: [],
    entityStack: [],
    learnedFacts: {},
    sessionId: SESSION_PREFIX + Date.now(),
    sentiment: 'neutral'
  };
}

export function saveMemory(memory: Memory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function pushToEntityStack(entity: Entity) {
  const memory = getMemory();
  const updatedStack = [entity, ...memory.entityStack.filter(e => e.id !== entity.id)].slice(0, 50);
  saveMemory({ ...memory, entityStack: updatedStack });
}

export function detectSentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  if (/urgent|asap|now|immediately|fast/i.test(t)) return 'urgent';
  if (/fail|error|broken|wrong|cannot|not|bad|frustrated/i.test(t)) return 'frustrated';
  if (/great|good|awesome|thanks|perfect|happy|love/i.test(t)) return 'happy';
  if (/\?/.test(t)) return 'curious';
  return 'neutral';
}

export function getLeadStrategistBrief(leadId: string): string {
  const memory = getMemory();
  const lead = memory.entityStack.find(e => e.id === leadId);
  if (!lead) return "No data found for this lead.";

  const interactions = memory.history?.filter(m => m.content?.toLowerCase().includes(lead.name.toLowerCase())) || [];
  const factKeys = Object.keys(memory.learnedFacts || {}).filter(k => k.includes(lead.name.toLowerCase()));

  let brief = `### Strategist Brief: ${lead.name}\n`;
  brief += `**Context:** This lead is currently high priority in the stack.\n`;

  if (factKeys.length > 0) {
    brief += `**Key Facts:**\n`;
    factKeys.forEach(k => brief += `- ${k.replace(lead.name.toLowerCase(), '').replace('_', ' ')}: ${memory.learnedFacts[k]}\n`);
  }

  if (interactions.length > 0) {
    brief += `**Last Interaction:** "${interactions[interactions.length - 1]?.content?.substring(0, 50)}..."\n`;
  }

  return brief;
}

// ALIAS for backward compatibility
export function resolveEntityFromContext(type: string): Entity | null {
  const memory = getMemory();
  return memory.entityStack.find(e => e.type === type) || null;
}

export function resolveEntitiesFromContext(text: string): Entity[] {
  const memory = getMemory();
  const lower = text.toLowerCase();

  // Specific entity type references
  if (/the lead|that lead|this lead|him|her/i.test(lower)) {
    const lead = memory.entityStack.find(e => e.type === 'lead');
    return lead ? [lead] : [];
  }

  if (/the task|that task|this task/i.test(lower)) {
    const task = memory.entityStack.find(e => e.type === 'task');
    return task ? [task] : [];
  }

  // Generic pronouns
  if (/\bit|this|that\b/i.test(lower)) {
    const last = memory.entityStack[0];
    return last ? [last] : [];
  }

  // Plural references
  if (/them|both|all|those|these/i.test(lower)) {
    // Return unique entities in the stack, prioritizing the most recent
    const seen = new Set();
    return memory.entityStack.filter(e => {
      const duplicate = seen.has(e.id);
      seen.add(e.id);
      return !duplicate;
    }).slice(0, 5);
  }

  return [];
}

/**
 * Checks if a name is ambiguous and returns options if so.
 */
export function resolveAmbiguity(input: string, leads: any[]): { resolved: any | null, options: any[] | null } {
  const lower = input.toLowerCase().trim();
  const matches = leads.filter(l => l.name.toLowerCase().includes(lower));

  if (matches.length === 1) return { resolved: matches[0], options: null };
  if (matches.length > 1) return { resolved: null, options: matches };

  return { resolved: null, options: null };
}

export function getLearnedFact(key: string): string | null {
  const memory = getMemory();
  return memory.learnedFacts[key.toLowerCase()] || null;
}

export function deleteLearnedFact(key: string) {
  const memory = getMemory();
  const newFacts = { ...memory.learnedFacts };
  delete newFacts[key.toLowerCase()];
  saveMemory({ ...memory, learnedFacts: newFacts });
}

export function setLearnedFact(key: string, value: string) {
  const memory = getMemory();
  saveMemory({
    ...memory,
    learnedFacts: { ...memory.learnedFacts, [key.toLowerCase()]: value }
  });
}

export function setTopic(topic: string | undefined) {
  const memory = getMemory();
  saveMemory({ ...memory, activeTopic: topic });
}

export function setActiveState(type: string | null, data: any = {}) {
  const memory = getMemory();
  saveMemory({
    ...memory,
    activeState: type ? { type, data } : undefined
  });
}

export function setLastSuggestion(action: string, params: any, summary: string) {
  localStorage.setItem('os_bot_last_suggestion', JSON.stringify({ action, params, summary, timestamp: Date.now() }));
}

export function getLastSuggestion() {
  const stored = localStorage.getItem('os_bot_last_suggestion');
  return stored ? JSON.parse(stored) : null;
}

export function clearLastSuggestion() {
  localStorage.removeItem('os_bot_last_suggestion');
}

export function trackLead(id: string, name: string) {
  pushToEntityStack({ id, name, type: 'lead' });
}

export function logOutcome(type: string, summary: string, metadata: any = {}) {
  const memory = getMemory();
  const outcomes = memory.outcomes || [];
  saveMemory({
    ...memory,
    outcomes: [{ type, summary, metadata, timestamp: Date.now() }, ...outcomes].slice(0, 50)
  });
}

// Enhanced conversation management
export function addConversationTurn(turn: ConversationTurn) {
  const memory = getMemory();
  const updatedHistory = [...memory.history, turn].slice(-100); // Keep last 100 turns
  saveMemory({ ...memory, history: updatedHistory });
}

export function getRecentConversation(limit: number = 10): ConversationTurn[] {
  const memory = getMemory();
  return memory.history.slice(-limit);
}

export function findConversationByTopic(topic: string): ConversationTurn[] {
  const memory = getMemory();
  return memory.history.filter(turn =>
    turn.content.toLowerCase().includes(topic.toLowerCase())
  );
}

export function setConversationState(state: Memory['conversationState']) {
  const memory = getMemory();
  saveMemory({ ...memory, conversationState: state });
}

export function getConversationState(): Memory['conversationState'] {
  const memory = getMemory();
  return memory.conversationState;
}

export function interruptWorkflow() {
  const memory = getMemory();
  const state = memory.conversationState;
  if (state && state.currentWorkflow) {
    saveMemory({
      ...memory,
      conversationState: {
        ...state,
        interruptedWorkflow: state.currentWorkflow,
        interruptedStep: state.step,
        interruptedContext: state.context,
        currentWorkflow: undefined,
        step: undefined,
        context: undefined
      }
    });
  }
}

export function resumeInterruptedWorkflow(): Memory['conversationState'] | null {
  const memory = getMemory();
  const state = memory.conversationState;
  if (state && state.interruptedWorkflow) {
    const interrupted = {
      currentWorkflow: state.interruptedWorkflow,
      step: state.interruptedStep,
      context: state.interruptedContext,
      interruptedWorkflow: undefined,
      interruptedStep: undefined,
      interruptedContext: undefined
    };
    saveMemory({ ...memory, conversationState: interrupted });
    return interrupted;
  }
  return null;
}

export function setUserPreferences(prefs: Partial<Memory['userPreferences']>) {
  const memory = getMemory();
  saveMemory({
    ...memory,
    userPreferences: { ...memory.userPreferences, ...prefs }
  });
}

export function getUserPreferences(): Memory['userPreferences'] {
  const memory = getMemory();
  return memory.userPreferences || {};
}

export function learnUserPreference(key: string, value: any) {
  const memory = getMemory();
  const prefs: Record<string, any> = memory.userPreferences || {};
  prefs[key] = value;
  saveMemory({ ...memory, userPreferences: prefs });
}

// RESTORED COMPATIBILITY EXPORTS
export async function syncUserProfile(userId: string) {
  const prefs = await import('./learning-service').then(m => m.getUserPreferences(userId));
  if (prefs) {
    saveMemory({ ...getMemory(), learnedFacts: { ...getMemory().learnedFacts, ...prefs.remembered_facts } });
  }
}

export async function loadHistory(userId: string, sessionId: string) {
  return await import('./learning-service').then(m => m.getConversationContext(userId, sessionId, 20));
}

export function saveMessage(userId: string, sessionId: string, role: string, content: string) {
  import('./learning-service').then(m => m.saveConversationTurn(userId, sessionId, role as any, content));
}

// Enhanced memory retrieval
export function getMemorySummary(): string {
  const memory = getMemory();
  const recentTurns = memory.history.slice(-5);
  const topics = [...new Set(recentTurns.map(t => t.content.split(' ').slice(0, 3).join(' ')))];

  let summary = `**Active Topic:** ${memory.activeTopic || 'None'}\n`;
  if (topics.length > 0) {
    summary += `**Recent Topics:** ${topics.join(', ')}\n`;
  }
  if (memory.entityStack.length > 0) {
    summary += `**Active Entities:** ${memory.entityStack.slice(0, 3).map(e => e.name).join(', ')}\n`;
  }
  return summary;
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
}

export function exportMemory(): string {
  return JSON.stringify(getMemory(), null, 2);
}