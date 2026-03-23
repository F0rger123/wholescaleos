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
    if (!token) throw new Error('Not connected to Google Account');

    const res = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=1000', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Contacts API Error:', txt);
      throw new Error(`Failed to fetch contacts: ${res.status}`);
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
    if (!res.ok) throw new Error('Failed to fetch task lists');
    return res.json();
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
