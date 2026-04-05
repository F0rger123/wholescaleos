/**
 * Local AI Memory Store
 * Manages conversation history and user preferences locally.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface UserPreferences {
  name: string;
  role: string;
  commonTasks: string[];
  theme?: string;
}

const MEMORY_KEY = 'wholescale_ai_memory';
const PREFS_KEY = 'wholescale_ai_prefs';

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
  
  // Keep last 10
  const updatedMemory = [...memory, newMessage].slice(-10);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemory));
}

export function getUserPreferences(): UserPreferences {
  const data = localStorage.getItem(PREFS_KEY);
  return data ? JSON.parse(data) : {
    name: 'User',
    role: 'Agent',
    commonTasks: []
  };
}

export function setUserPreference(key: keyof UserPreferences, value: any) {
  const prefs = getUserPreferences();
  (prefs as any)[key] = value;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function syncToSupabase() {
  // Mock sync - in a real app, this would push to a profile table
  console.log('Syncing AI memory to Supabase...');
}
