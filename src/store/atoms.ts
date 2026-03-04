import { atom } from 'jotai';
import { supabase } from '../lib/supabase';

// Basic atoms (pieces of state)
export const userAtom = atom<any | null>(null);
export const sessionAtom = atom<any | null>(null);
export const isLoadingAtom = atom(false);
export const isAuthenticatedAtom = atom(false);
export const teamIdAtom = atom<string | null>(null);

// Action atoms (functions that modify state)
export const loginAtom = atom(
  null,
  async (get, set, { email, password }: { email: string; password: string }) => {
    set(isLoadingAtom, true);
    try {
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

export const logoutAtom = atom(
  null,
  async (get, set) => {
    set(isLoadingAtom, true);
    try {
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