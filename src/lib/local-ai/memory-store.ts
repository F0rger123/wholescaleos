import { supabase, isSupabaseConfigured } from '../supabase';

export interface MemoryContext {
  lastIntent: string | null;
  lastTargetName: string | null;
  lastPhone: string | null;
  sessionStartTime: number;
}

// In-memory cache for ultra-fast sync
let contextCache: MemoryContext = {
  lastIntent: null,
  lastTargetName: null,
  lastPhone: null,
  sessionStartTime: Date.now()
};

export const MemoryStore = {
  getMemory(): MemoryContext {
    try {
      const saved = localStorage.getItem('local_ai_memory');
      if (saved) {
        contextCache = { ...contextCache, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to read Local AI memory', e);
    }
    return contextCache;
  },

  updateMemory(updates: Partial<MemoryContext>) {
    contextCache = { ...contextCache, ...updates };
    try {
      localStorage.setItem('local_ai_memory', JSON.stringify(contextCache));
      this.syncToCloud();
    } catch (e) {
      console.error('Failed to write Local AI memory', e);
    }
  },

  clearSession() {
    contextCache = {
      lastIntent: null,
      lastTargetName: null,
      lastPhone: null,
      sessionStartTime: Date.now()
    };
    try {
      localStorage.removeItem('local_ai_memory');
    } catch(e) {}
  },

  async syncToCloud() {
    if (!isSupabaseConfigured || !supabase) return;
    
    // Attempt to sync context asynchronously so it doesn't block local execution
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      
      // Save minimal memory map to profiles table or user settings
      // This is a simple fire-and-forget sync
      const { data: profile } = await supabase.from('profiles').select('settings').eq('id', session.user.id).single();
      if (profile) {
        await supabase.from('profiles').update({
          settings: {
            ...(profile.settings || {}),
            local_ai_memory: contextCache
          }
        }).eq('id', session.user.id);
      }
    } catch (e) {
      console.warn('Failed to sync Local AI memory to cloud', e);
    }
  }
};
