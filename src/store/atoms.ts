import { atom } from 'jotai';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Basic atoms
export const userAtom = atom<any | null>(null);
export const sessionAtom = atom<any | null>(null);
export const isLoadingAtom = atom(false);
export const isAuthenticatedAtom = atom(false);
export const teamIdAtom = atom<string | null>(null);

// Layout atoms
export const sidebarOpenAtom = atom(true);
export const teamAtom = atom<any[]>([]);
export const tasksAtom = atom<any[]>([]);
export const unreadCountsAtom = atom<Record<string, number>>({});
export const teamConfigAtom = atom({
  name: 'My Team',
  inviteCode: '',
  settings: {},
});

// Data atoms
export const leadsAtom = atom<any[]>([]);
export const buyersAtom = atom<any[]>([]);
export const coverageAreasAtom = atom<any[]>([]);
export const callRecordingsAtom = atom<any[]>([]);
export const importTemplatesAtom = atom<any[]>([]);
export const importHistoryAtom = atom<any[]>([]);
export const duplicateSettingsAtom = atom({
  enabled: true,
  matchFields: ['email', 'phone'],
  action: 'skip',
});

// Action atoms with null checks
export const loginAtom = atom(
  null,
  async (get, set, { email, password }: { email: string; password: string }) => {
    set(isLoadingAtom, true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured');
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set(userAtom, data.user);
      set(sessionAtom, data.session);
      set(isAuthenticatedAtom, true);
      set(isLoadingAtom, false);
      return data;
    } catch (error) {
      set(isLoadingAtom, false);
      throw error;
    }
  }
);

export const signupAtom = atom(
  null,
  async (get, set, { email, password, name }: { email: string; password: string; name?: string }) => {
    set(isLoadingAtom, true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured');
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name || '' }
        }
      });
      if (error) throw error;
      set(isLoadingAtom, false);
      return data;
    } catch (error) {
      set(isLoadingAtom, false);
      throw error;
    }
  }
);

export const logoutAtom = atom(
  null,
  async (get, set) => {
    set(isLoadingAtom, true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured');
      }
      await supabase.auth.signOut();
      set(userAtom, null);
      set(sessionAtom, null);
      set(teamIdAtom, null);
      set(isAuthenticatedAtom, false);
      set(isLoadingAtom, false);
    } catch (error) {
      set(isLoadingAtom, false);
      throw error;
    }
  }
);

export const setTeamIdAtom = atom(
  null,
  (get, set, teamId: string) => {
    set(teamIdAtom, teamId);
  }
);