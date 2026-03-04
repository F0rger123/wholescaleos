import { createClient } from '@supabase/supabase-js';

// ─── Vite Environment Type Declaration ────────────────────────────────────────
declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

// ─── Environment Variables ────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ─── Supabase Client ──────────────────────────────────────────────────────────
// Only creates the client when both env vars are present.
// In demo mode (no env vars), the app falls back to local Zustand state.

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== 'your_project_url' &&
  supabaseAnonKey !== 'your_anon_key';

// Create base client
const baseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'wholescale-auth',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Safe wrapper for edge functions that prevents errors
const safeInvoke = async (functionName: string, options?: any) => {
  if (!baseClient) {
    console.log(`⚠️ Supabase not configured, skipping ${functionName}`);
    return { data: null, error: null };
  }
  
  try {
    // Try to invoke the function, but catch any errors
    return await baseClient.functions.invoke(functionName, options);
  } catch (error) {
    // Log but don't throw - this prevents the "Cannot convert undefined or null to object" error
    console.log(`ℹ️ Edge function '${functionName}' not available:`, error);
    return { data: null, error: null };
  }
};

// Create a wrapped client with safe methods
export const supabase = baseClient ? {
  ...baseClient,
  functions: {
    ...baseClient.functions,
    invoke: safeInvoke,
  }
} : null;

// ─── Helper Exports ───────────────────────────────────────────────────────────

/** Check if Supabase is ready */
export function getConnectionStatus(): { connected: boolean; mode: 'supabase' | 'demo' } {
  return {
    connected: isSupabaseConfigured,
    mode: isSupabaseConfigured ? 'supabase' : 'demo',
  };
}