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

// FIXED: Added global headers to help with CORS
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'wholescale-auth',
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-web',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// ─── Helper Exports ───────────────────────────────────────────────────────────

/** Check if Supabase is ready */
export function getConnectionStatus(): { connected: boolean; mode: 'supabase' | 'demo' } {
  return {
    connected: isSupabaseConfigured,
    mode: isSupabaseConfigured ? 'supabase' : 'demo',
  };
}