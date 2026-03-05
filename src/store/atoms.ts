import { atom } from 'jotai';

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