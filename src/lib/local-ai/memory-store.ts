/**
 * OS Bot Memory Store (v7.0)
 * Manages conversation history, professional context, and CRM entities.
 * Enhanced with Supabase persistence and Session-Awareness.
 */

import { conversationService, episodicMemoryService } from '../supabase-service';
import { retrieveMemory } from '../memory/retrieveMemory';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: string;
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
  sessionId: string;
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

/**
 * Generates or retrieves a unique session ID
 */
function getSessionId(): string {
  let sid = localStorage.getItem('os_bot_session_id');
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('os_bot_session_id', sid);
  }
  return sid;
}

export function getMemory(): ConversationContext {
  const data = localStorage.getItem(MEMORY_KEY);
  const parsed = data ? JSON.parse(data) : { 
    recentLeads: [],
    history: [],
    entityStack: [],
    learnedFacts: {},
    sentiment: 'neutral',
    sessionId: getSessionId()
  };

  // Ensure fields exist
  if (!parsed.entityStack) parsed.entityStack = [];
  if (!parsed.learnedFacts) parsed.learnedFacts = {};
  if (!parsed.sentiment) parsed.sentiment = 'neutral';
  if (!parsed.sessionId) parsed.sessionId = getSessionId();
  
  return parsed;
}

/**
 * Loads history from Supabase and syncs local memory
 */
export async function loadHistory(userId: string) {
  if (!userId) return;
  // Use the robust retrieveMemory helper (last 7 days, up to 20 messages)
  const history = await retrieveMemory(userId, 20);
  const memory = getMemory();
  
  const mappedHistory: Message[] = history.map((h: any) => ({
    role: h.role,
    content: h.content,
    timestamp: h.created_at,
    intent: h.intent
  }));

  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    userId,
    history: mappedHistory
  }));
}

/**
 * Logs a professional outcome to episodic memory (e.g. "created lead", "sent sms")
 */
export async function logOutcome(type: string, summary: string, details: any = {}) {
  const memory = getMemory();
  if (!memory.userId) return;

  try {
    await episodicMemoryService.logEpisode(memory.userId, type, summary, details);
  } catch (err) {
    console.error('Failed to log episode context:', err);
  }
}

/**
 * Saves a message to history and syncs with Supabase if connected
 */
export function saveMessage(role: 'user' | 'assistant', content: string, intent?: string) {
  const memory = getMemory();
  const newMessage: Message = {
    role,
    content,
    timestamp: new Date().toISOString(),
    intent
  };
  
  // Keep last 20 messages for better context
  const updatedHistory = [...memory.history, newMessage].slice(-20);
  
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    history: updatedHistory
  }));

  // Sync to Supabase in background
  if (memory.userId) {
    conversationService.saveMessage(
      memory.userId,
      memory.sessionId,
      role,
      content,
      intent
    ).catch(err => console.error('Failed to sync message to Supabase:', err));
  }

  // Auto-detect sentiment and topic if user message
  if (role === 'user') {
    trackSentiment(content);
    detectAndSetTopic(content);
    
    // Remember personal facts
    detectLearnedFacts(content);
  }
}

/**
 * Detects facts like name, address, phone from user input
 */
function detectLearnedFacts(input: string) {
  
  // Name
  const nameMatch = input.match(/(?:my name is|im|i am|call me)\s+([a-zA-Z\s]+)/i);
  if (nameMatch && nameMatch[1]) {
    setLearnedFact('name', nameMatch[1].trim());
  }

  // Address
  const addressMatch = input.match(/(?:at|property is at|address is)\s+(\d+\s+[a-zA-Z0-9\s,]+(?:st|ave|rd|blvd|lane|drive|loop|ct|way|court|street|avenue))/i);
  if (addressMatch && addressMatch[1]) {
    setLearnedFact('last_address', addressMatch[1].trim());
  }

  // Phone
  const phoneMatch = input.match(/(?:call me at|phone number is|text me at)\s+([\d\-\(\)\s]{7,})/i);
  if (phoneMatch && phoneMatch[1]) {
    setLearnedFact('phone', phoneMatch[1].trim());
  }
}

export function trackSentiment(input: string) {
  const memory = getMemory();
  const lower = input.toLowerCase();
  
  let newSentiment: Sentiment = 'neutral';
  
  if (lower.includes('thanks') || lower.includes('great') || lower.includes('awesome') || lower.includes('love it') || lower.includes('rockstar')) {
    newSentiment = 'happy';
  } else if (lower.includes('error') || lower.includes('broken') || lower.includes('help') || lower.includes('not working') || lower.includes('bad') || lower.includes('confused')) {
    newSentiment = 'frustrated';
  } else if (lower.includes('urgent') || lower.includes('asap') || lower.includes('now') || lower.includes('immediately')) {
    newSentiment = 'urgent';
  } else if (lower.includes('how') || lower.includes('why') || lower.includes('what') || lower.includes('?') || lower.includes('show me') || lower.includes('details')) {
    newSentiment = 'curious';
  }

  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    sentiment: newSentiment
  }));
}

export function setTopic(topic: string) {
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    lastTopic: topic
  }));
}

export function detectAndSetTopic(input: string) {
  const lower = input.toLowerCase();
  
  if (lower.includes('lead') || lower.includes('deal') || lower.includes('pipeline') || lower.includes('prospect')) {
    setTopic('leads');
  } else if (lower.includes('task') || lower.includes('todo') || lower.includes('reminder') || lower.includes('to do')) {
    setTopic('tasks');
  } else if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('appointment') || lower.includes('meeting')) {
    setTopic('calendar');
  } else if (lower.includes('sms') || lower.includes('text') || lower.includes('message')) {
    setTopic('sms');
  } else if (lower.includes('automation') || lower.includes('workflow') || lower.includes('hub')) {
    setTopic('automations');
  }
}

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

export function setLearnedFact(key: string, value: string) {
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    learnedFacts: { ...memory.learnedFacts, [key.toLowerCase()]: value }
  }));
}

export function getLearnedFact(key: string): string | null {
  const memory = getMemory();
  return memory.learnedFacts[key.toLowerCase()] || null;
}

export function setActiveState(type: string | null, data: any = {}) {
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    activeState: type ? { type, data } : undefined
  }));
}

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

export function syncUserProfile(profile: any) {
  if (!profile) return;
  const memory = getMemory();
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    userId: profile.id,
    userName: profile.name || 'Agent'
  }));
  // Also load history if available
  loadHistory(profile.id);
}

export function getAIContext(currentUser?: any) {
  const memory = getMemory();
  return {
    user: currentUser?.name || memory.userName || 'Agent',
    lastLead: memory.lastLeadName || 'none',
    activeEntity: memory.activeEntity,
    entityStack: memory.entityStack,
    learnedFacts: memory.learnedFacts,
    recentLeads: memory.recentLeads,
    history: memory.history,
    sentiment: memory.sentiment,
    topic: memory.lastTopic,
    sessionId: memory.sessionId
  };
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
  localStorage.removeItem('os_bot_session_id');
}
