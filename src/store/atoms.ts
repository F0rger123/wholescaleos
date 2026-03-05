import { atom } from 'jotai';
import { supabase } from '../lib/supabase';

// Basic atoms (pieces of state)
export const userAtom = atom<any | null>(null);
export const sessionAtom = atom<any | null>(null);
export const isLoadingAtom = atom(false);
export const isAuthenticatedAtom = atom(false);
export const teamIdAtom = atom<string | null>(null);

// Layout and UI atoms
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

// Import atoms
export const importTemplatesAtom = atom<any[]>([]);
export const importHistoryAtom = atom<any[]>([]);
export const duplicateSettingsAtom = atom({
  enabled: true,
  matchFields: ['email', 'phone'],
  action: 'skip',
});

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

// Set sidebar state
export const setSidebarOpenAtom = atom(
  null,
  (get, set, open: boolean) => {
    set(sidebarOpenAtom, open);
  }
);

// Toggle sidebar
export const toggleSidebarAtom = atom(
  null,
  (get, set) => {
    set(sidebarOpenAtom, !get(sidebarOpenAtom));
  }
);

// Set team data
export const setTeamAtom = atom(
  null,
  (get, set, team: any[]) => {
    set(teamAtom, team);
  }
);

// Set tasks
export const setTasksAtom = atom(
  null,
  (get, set, tasks: any[]) => {
    set(tasksAtom, tasks);
  }
);

// Set unread counts
export const setUnreadCountsAtom = atom(
  null,
  (get, set, counts: Record<string, number>) => {
    set(unreadCountsAtom, counts);
  }
);

// Set team config
export const setTeamConfigAtom = atom(
  null,
  (get, set, config: Partial<typeof teamConfigAtom>) => {
    set(teamConfigAtom, { ...get(teamConfigAtom), ...config });
  }
);