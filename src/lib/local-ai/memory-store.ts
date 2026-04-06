/**
 * OS Bot Memory Store (v4.0)
 * Manages conversation history, professional context, and CRM entities locally.
 */

import { useStore } from '../../store/useStore';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ConversationContext {
  userId?: string;
  userName?: string;
  lastLeadId?: string;
  lastLeadName?: string;
  recentLeads: Array<{ id: string; name: string }>;
  history: Message[];
}

const MEMORY_KEY = 'os_bot_permanent_memory';

export function getMemory(): ConversationContext {
  const data = localStorage.getItem(MEMORY_KEY);
  return data ? JSON.parse(data) : { 
    recentLeads: [],
    history: [] 
  };
}

/**
 * Saves a message to history and caps it at last 10 turns (5 full conversations)
 */
export function saveMessage(role: 'user' | 'assistant', content: string) {
  const memory = getMemory();
  const newMessage: Message = {
    role,
    content,
    timestamp: new Date().toISOString()
  };
  
  // Keep last 10 messages (5 user + 5 assistant)
  const updatedHistory = [...memory.history, newMessage].slice(-10);
  
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    history: updatedHistory
  }));
}

/**
 * Updates the context with the most recent lead created/viewed
 */
export function trackLead(id: string, name: string) {
  const memory = getMemory();
  const recentLeads = [{ id, name }, ...memory.recentLeads.filter(l => l.id !== id)].slice(0, 5);
  
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    ...memory,
    lastLeadId: id,
    lastLeadName: name,
    recentLeads
  }));
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
    recentLeads: memory.recentLeads,
    history: memory.history
  };
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
}

