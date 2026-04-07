/**
 * OS Bot Memory Store (v6.0)
 * Manages conversation history, professional context, and CRM entities locally.
 * Enhanced with Sentiment Tracking and Topic Context.
 */

import { useStore } from '../../store/useStore';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Entity {
  id: string;
  name: string;
  type: 'lead' | 'contact' | 'task';
}

export type Sentiment = 'happy' | 'neutral' | 'frustrated' | 'urgent' | 'curious';

export interface ConversationContext {
  userId?: string;
  userName?: string;
  lastLeadId?: string;
  lastLeadName?: string;
  activeEntity?: Entity;
  entityStack: Entity[]; 
  learnedFacts: Record<string, string>; 
  sentiment: Sentiment;
  lastTopic?: string;
  activeState?: { type: string; data: any };
  recentLeads: Array<{ id: string; name: string }>;
  history: Message[];
}

const MEMORY_KEY = 'os_bot_permanent_memory';

export function getMemory(): ConversationContext {
  const data = localStorage.getItem(MEMORY_KEY);
  const parsed = data ? JSON.parse(data) : { 
    recentLeads: [],
    history: [],
    entityStack: [],
    learnedFacts: {},
    sentiment: 'neutral',
    activeEntity: undefined
  };

  // Ensure new fields exist for legacy migrations
  if (!parsed.entityStack) parsed.entityStack = [];
  if (!parsed.learnedFacts) parsed.learnedFacts = {};
  if (!parsed.sentiment) parsed.sentiment = 'neutral';
  
  return parsed;
}

/**
 * Saves a message to history and caps it at last 20 messages
 */
export function saveMessage(role: 'user' | 'assistant', content: string) {
  const memory = getMemory();
  const newMessage: Message = {
    role,
    content,
    timestamp: new Date().toISOString()
  };
  
  // Keep last 20 messages for better long-term context
  const updatedHistory = [...memory.history, newMessage].slice(-20);
  
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    history: updatedHistory
  }));

  // Auto-detect sentiment if user message
  if (role === 'user') {
    trackSentiment(content);
  }
}

/**
 * Basic sentiment tracking based on keywords
 */
export function trackSentiment(input: string) {
  const memory = getMemory();
  const lower = input.toLowerCase();
  
  let newSentiment: Sentiment = 'neutral';
  
  if (lower.includes('thanks') || lower.includes('great') || lower.includes('awesome') || lower.includes('love it')) {
    newSentiment = 'happy';
  } else if (lower.includes('error') || lower.includes('broken') || lower.includes('help') || lower.includes('not working') || lower.includes('bad')) {
    newSentiment = 'frustrated';
  } else if (lower.includes('urgent') || lower.includes('asap') || lower.includes('now') || lower.includes('immediately')) {
    newSentiment = 'urgent';
  } else if (lower.includes('how') || lower.includes('why') || lower.includes('what') || lower.includes('?') || lower.includes('show me')) {
    newSentiment = 'curious';
  }

  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    sentiment: newSentiment
  }));
}

/**
 * Sets the current conversation topic
 */
export function setTopic(topic: string) {
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    lastTopic: topic
  }));
}

/**
 * Pushes an entity to the stack (LIFO) and keeps last 3
 */
export function pushToEntityStack(entity: Entity) {
  const memory = getMemory();
  const updatedStack = [
    entity, 
    ...memory.entityStack.filter(e => e.id !== entity.id)
  ].slice(0, 3);

  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    entityStack: updatedStack,
    activeEntity: entity,
    // Legacy support
    lastLeadId: entity.type === 'lead' ? entity.id : memory.lastLeadId,
    lastLeadName: entity.type === 'lead' ? entity.name : memory.lastLeadName
  }));
}

/**
 * Updates the context with the most recent lead created/viewed
 */
export function trackLead(id: string, name: string) {
  const memory = getMemory();
  const recentLeads = [{ id, name }, ...memory.recentLeads.filter(l => l.id !== id)].slice(0, 5);
  
  pushToEntityStack({ id, name, type: 'lead' });

  const updatedMemory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...updatedMemory,
    recentLeads
  }));
}

/**
 * Sets a learned fact or user preference
 */
export function setLearnedFact(key: string, value: string) {
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    learnedFacts: { ...memory.learnedFacts, [key.toLowerCase()]: value }
  }));
}

/**
 * Gets a learned fact
 */
export function getLearnedFact(key: string): string | null {
  const memory = getMemory();
  return memory.learnedFacts[key.toLowerCase()] || null;
}

/**
 * Sets the currently active conversation state (for multi-turn)
 */
export function setActiveState(type: string | null, data: any = {}) {
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    activeState: type ? { type, data } : undefined
  }));
}

/**
 * Resolves pronouns like "him", "her", "them" or "it" using the entity stack
 */
export function resolveEntityFromContext(input: string): Entity | null {
  const memory = getMemory();
  const lower = input.toLowerCase();
  const pronouns = ['him', 'her', 'them', 'it', 'his', 'hers', 'their', 'the lead', 'the contact', 'the task'];
  
  const hasPronoun = pronouns.some(p => lower.includes(` ${p} `) || lower.endsWith(` ${p}`) || lower === p);
  
  if (hasPronoun) {
    if (memory.entityStack.length > 0) {
      if (lower.includes('task') || lower.includes('it')) {
        return memory.entityStack.find(e => e.type === 'task') || memory.entityStack[0];
      }
      return memory.entityStack.find(e => e.type === 'lead' || e.type === 'contact') || memory.entityStack[0];
    }
    if (memory.activeEntity) return memory.activeEntity;
  }
  
  return null;
}

/**
 * Injects user profile info into memory
 */
export function syncUserProfile() {
  const store = useStore.getState();
  const profile = store.currentUser;
  if (!profile) return;

  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    userId: profile.id,
    userName: profile.name || 'Agent'
  }));
}

/**
 * Get current context for the AI engine
 */
export function getAIContext() {
  const memory = getMemory();
  const store = useStore.getState();
  
  return {
    user: store.currentUser?.name || memory.userName || 'Agent',
    lastLead: memory.lastLeadName || 'none',
    activeEntity: memory.activeEntity,
    entityStack: memory.entityStack,
    learnedFacts: memory.learnedFacts,
    recentLeads: memory.recentLeads,
    history: memory.history,
    sentiment: memory.sentiment,
    topic: memory.lastTopic
  };
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
}
