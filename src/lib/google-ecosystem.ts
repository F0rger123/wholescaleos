// @ts-nocheck
import { supabase } from './supabase';
import { GoogleCalendarService } from './google-calendar';

export class GoogleEcosystemService {
  private static instance: GoogleEcosystemService;

  private constructor() {}

  static getInstance(): GoogleEcosystemService {
    if (!GoogleEcosystemService.instance) {
      GoogleEcosystemService.instance = new GoogleEcosystemService();
    }
    return GoogleEcosystemService.instance;
  }

  private async getToken(userId: string): Promise<string | null> {
    return await GoogleCalendarService.getInstance().getAccessToken(userId);
  }

  // --- CONTACTS API (googleapis.com/people/v1/connections) ---
  async getContacts(userId: string) {
    const token = await this.getToken(userId);
    if (!token) throw new Error('Google account not connected. Please reconnect in Settings.');

    // The contacts.readonly scope must have been granted during OAuth.
    // If you get a 403, disconnect and reconnect Google to re-grant all scopes.
    const res = await fetch(
      'https://people.googleapis.com/v1/people/me/connections' +
      '?personFields=names,emailAddresses,phoneNumbers&pageSize=1000&sortOrder=LAST_NAME_ASCENDING',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      let errBody = '';
      try { errBody = await res.text(); } catch (_) {}
      console.error(`[Contacts API] ${res.status} error:`, errBody);
      if (res.status === 403) {
        console.error('[Contacts API] 403 Permission Denied. Scopes might be missing or revoked.');
        throw new Error(
          'Google Contacts permission denied (403). ' +
          'This usually means you haven\'t granted the "See and download your contacts" permission. ' +
          'Please go to Settings > Connections, disconnect and then reconnect your Google account, making sure to check ALL permission boxes.'
        );
      }
      if (res.status === 401) {
        throw new Error('Google authentication session expired. Please refresh the page or reconnect in Settings.');
      }
      throw new Error(`Google API Error (${res.status}): ${res.statusText}`);
    }
    return res.json();
  }

  // --- TASKS API (googleapis.com/tasks/v1/lists) ---
  async getTasksLists(userId: string) {
    const token = await this.getToken(userId);
    if (!token) throw new Error('Not connected to Google Account');

    const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[GoogleTasks] Fetch lists failed:', res.status, err);
      if (res.status === 403) {
        throw new Error('Google Tasks Permission Denied (403). This usually means you haven\'t granted the "Manage your tasks" permission. Please go to Settings > Connections and click "Reconnect with Tasks".');
      }
      throw new Error(`Failed to fetch task lists (${res.status})`);
    }
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return { items: [{ id: '@default', title: 'My Tasks' }] };
    }
    return data;
  }

  async getTasks(userId: string, tasklist: string = '@default') {
    const token = await this.getToken(userId);
    if (!token) throw new Error('Not connected to Google Account');

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  }

  // --- DRIVE API (googleapis.com/drive/v3/files) ---
  async getFiles(userId: string, query: string = '') {
    const token = await this.getToken(userId);
    if (!token) throw new Error('Not connected to Google Account');

    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`https://www.googleapis.com/drive/v3/files${q}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch drive files');
    return res.json();
  }

  // --- KEEP API (keep API) ---
  async getNotes(userId: string) {
    const token = await this.getToken(userId);
    if (!token) throw new Error('Not connected to Google Account');

    const res = await fetch('https://keep.googleapis.com/v1/notes', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch Keep notes');
    return res.json();
  }
}

export const googleEcosystem = GoogleEcosystemService.getInstance();
