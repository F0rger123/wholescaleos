import { useStore } from '../../store/useStore';

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

export interface Memory {
  messages: any[];
  history: any[];
  entityStack: Entity[];
  learnedFacts: Record<string, string>;
  lastTopic?: string;
  activeTopic?: string;
  activeState?: { type: string; data: any };
  sessionId: string;
  perspective?: UserPerspective;
  sentiment: Sentiment;
  outcomes?: any[];
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

  const interactions = memory.messages?.filter(m => m.content?.toLowerCase().includes(lead.name.toLowerCase())) || [];
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
  // Simple check for "this", "it", "them" or matching lead name in text
  if (/this|it|that/i.test(text)) {
    const last = memory.entityStack[0];
    return last ? [last] : [];
  }
  if (/them|both|all/i.test(text)) {
    return memory.entityStack.slice(0, 3);
  }
  return [];
}

export function getLearnedFact(key: string): string | null {
  const memory = getMemory();
  return memory.learnedFacts[key.toLowerCase()] || null;
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
