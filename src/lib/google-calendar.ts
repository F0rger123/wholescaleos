// @ts-nocheck
import { supabase } from './supabase';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: { email: string }[];
  location?: string;
  status?: string;
  htmlLink?: string;
  organizer?: {
    email?: string;
  };
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  
  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  getAuthUrl(state?: string): string {
    const clientId = "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com";
    const redirectUri = typeof window !== 'undefined' 
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5173/auth/callback'
          : 'https://wholescaleos.com/auth/callback')
      : "https://wholescaleos.com/auth/callback";
    
    const params = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/drive.file'
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
      state: state || 'calendar-sync',
    };
    
    let url = 'https://accounts.google.com/o/oauth2/v2/auth?';
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}&`;
      }
    }
    url = url.slice(0, -1);
    
    return url;
  }

  getTasksAuthUrl(returnTo?: string): string {
    const clientId = "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com";
    const redirectUri = typeof window !== 'undefined' 
      ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5173/auth/callback'
          : 'https://wholescaleos.com/auth/callback')
      : "https://wholescaleos.com/auth/callback";
    
    const params = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/calendar', // Keep calendar to ensure we don't lose it
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: `tasks-reconnect:${returnTo || '/settings'}`,
    };
    
    let url = 'https://accounts.google.com/o/oauth2/v2/auth?';
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}&`;
      }
    }
    url = url.slice(0, -1);
    
    return url;
  }

  async getAccessToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('refresh_token')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();

      if (error) {
        console.error('[GoogleService] Supabase error fetching refresh token:', error);
        return null;
      }
      if (!data?.refresh_token) {
        console.warn('[GoogleService] No refresh token found for user:', userId);
        return null;
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: data.refresh_token,
          client_id: "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com",
          client_secret: "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",
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const errText = await refreshResponse.text();
        console.error('[GoogleService] Token refresh failed:', refreshResponse.status, errText);
        return null;
      }

      const tokens = await refreshResponse.json();
      if (!tokens.access_token) {
        console.error('[GoogleService] Refresh response missing access_token:', tokens);
        return null;
      }

      return tokens.access_token;
    } catch (err) {
      console.error('[GoogleService] Error getting access token:', err);
      return null;
    }
  }

  async getDetailedPermissions(userId: string): Promise<Record<string, boolean>> {
    const token = await this.getAccessToken(userId);
    if (!token) return {
      calendar: false,
      gmail: false,
      contacts: false,
      tasks: false,
      drive: false
    };

    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      if (!response.ok) throw new Error('Token verification failed');
      const info = await response.json();
      const scopes = info.scope || '';
      
      return {
        calendar: scopes.includes('https://www.googleapis.com/auth/calendar'),
        gmail: scopes.includes('https://www.googleapis.com/auth/gmail.send') && scopes.includes('https://www.googleapis.com/auth/gmail.readonly'),
        contacts: scopes.includes('https://www.googleapis.com/auth/contacts.readonly'),
        tasks: scopes.includes('https://www.googleapis.com/auth/tasks'),
        drive: scopes.includes('https://www.googleapis.com/auth/drive.file')
      };
    } catch (err) {
      console.error('Error fetching detailed Workspace permissions:', err);
      return { calendar: false, gmail: false, contacts: false, tasks: false, drive: false };
    }
  }

  async hasRequiredPermissions(userId: string): Promise<boolean> {
    const perms = await this.getDetailedPermissions(userId);
    return perms.calendar && perms.gmail && perms.contacts && perms.tasks;
  }

  async storeUserTokens(userId: string, code: string): Promise<boolean> {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code,
          client_id: "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com",
          client_secret: "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",
          redirect_uri: typeof window !== 'undefined' 
            ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:5173/auth/callback'
                : 'https://wholescaleos.com/auth/callback')
            : "https://wholescaleos.com/auth/callback",
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      if (tokens.error || !tokens.access_token) {
        console.error('Google token error:', tokens.error, tokens.error_description);
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from('user_connections')
        .upsert(
          {
            user_id: userId,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' }
        );

      if (error) throw error;
      
      // Also update profiles settings for immediate UI feedback across the app
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();
      
      const newSettings = {
        ...(profile?.settings || {}),
        google_connected: true,
        google_connected_at: new Date().toISOString()
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ settings: newSettings })
        .eq('id', userId);

      if (profileError) console.error('Failed to update profile settings:', profileError);

      return true;
      
    } catch (err) {
      console.error('Failed to store tokens:', err);
      return false;
    }
  }

  async isConnected(userId: string): Promise<boolean> {
    try {
      // Check profile settings first for rapid UI response
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .maybeSingle();
      
      if (profile?.settings?.google_connected) return true;
      
      // Fallback to direct check if flag is missing
      const { data } = await supabase
        .from('user_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();
      
      return !!data;
    } catch (err) {
      console.error('[GoogleService] Error checking connection:', err);
      return false;
    }
  }

  async disconnect(userId: string): Promise<boolean> {
    try {
      // Clear token
      await supabase
        .from('user_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google');
      
      // Update profile status flag
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();
      
      const newSettings = { ...(profile?.settings || {}) };
      delete newSettings.google_connected;
      delete newSettings.google_connected_at;
      
      await supabase
        .from('profiles')
        .update({ settings: newSettings })
        .eq('id', userId);
        
      return true;
    } catch (err) {
      console.error('Failed to disconnect:', err);
      return false;
    }
  }

  async fetchCalendars(userId: string): Promise<any[]> {
    const token = await this.getAccessToken(userId);
    if (!token) return [];

    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary,
      backgroundColor: cal.backgroundColor,
      primary: cal.primary || false,
    }));
  }

  async fetchEvents(userId: string, calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> {
    const token = await this.getAccessToken(userId);
    if (!token) return [];

    const timeMinStr = (timeMin || new Date()).toISOString();
    const timeMaxStr = (timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `timeMin=${encodeURIComponent(timeMinStr)}&` +
      `timeMax=${encodeURIComponent(timeMaxStr)}&` +
      `singleEvents=true&orderBy=startTime`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) return [];
    const events = await response.json();
    return events.items || [];
  }

  async createEvent(userId: string, calendarId: string = 'primary', event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    const token = await this.getAccessToken(userId);
    if (!token) throw new Error('No access token');

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const googleEvent = {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start?.dateTime, timeZone },
      end: { dateTime: event.end?.dateTime, timeZone },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  }

  async updateEvent(userId: string, calendarId: string = 'primary', eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    const token = await this.getAccessToken(userId);
    if (!token) throw new Error('No access token');

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const googleEvent = {
      summary: event.summary,
      description: event.description,
      start: event.start ? { dateTime: event.start.dateTime, timeZone } : undefined,
      end: event.end ? { dateTime: event.end.dateTime, timeZone } : undefined,
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  }

  async deleteEvent(userId: string, calendarId: string = 'primary', eventId: string): Promise<void> {
    const token = await this.getAccessToken(userId);
    if (!token) throw new Error('No access token');

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('user_connections').select('id').limit(1);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Service connection test failed:', err);
      return false;
    }
  }
}