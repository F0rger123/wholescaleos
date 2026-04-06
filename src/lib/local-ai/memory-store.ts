/**
 * OS Bot Memory Store
 * Manages conversation history, context, and user preferences locally.
 */

import { useStore } from '../../store/useStore';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ConversationContext {
  lastLeadId?: string;
  lastLeadName?: string;
  lastIntent?: string;
  recentEntities: Record<string, any>;
}

const MEMORY_KEY = 'wholescale_os_bot_memory';
const CONTEXT_KEY = 'wholescale_os_bot_context';

export function getMemory(): Message[] {
  const data = localStorage.getItem(MEMORY_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveConversation(content: string, role: 'user' | 'assistant') {
  const memory = getMemory();
  const newMessage: Message = {
    role,
    content,
    timestamp: new Date().toISOString()
  };
  
  // Keep last 20 for better context
  const updatedMemory = [...memory, newMessage].slice(-20);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemory));
}

export function getContext(): ConversationContext {
  const data = localStorage.getItem(CONTEXT_KEY);
  return data ? JSON.parse(data) : { recentEntities: {} };
}

export function updateContext(updates: Partial<ConversationContext>) {
  const current = getContext();
  const updated = {
    ...current,
    ...updates,
    recentEntities: { ...current.recentEntities, ...(updates.recentEntities || {}) }
  };
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(updated));
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
  localStorage.removeItem(CONTEXT_KEY);
}

/**
 * Syncs memory and context to Supabase profile settings if needed.
 */
export async function syncMemoryToCloud() {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return;

  const memory = getMemory();
  const context = getContext();

  console.log('[OS Bot] Syncing memory to cloud...', { messages: memory.length });
  
  // In a real implementation, we would update the 'profiles' table 'settings' column
  // with this memory to allow cross-device continuity.
}

