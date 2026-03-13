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

  async testConnection(): Promise<void> {
    console.log('🧪 Testing Supabase connection...');
    try {
      if (!supabase) {
        console.error('❌ Supabase is null - check your initialization');
        return;
      }
      
      const { data, error } = await supabase
        .from('user_connections')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase query failed:', error);
      } else {
        console.log('✅ Supabase connection successful!', data);
      }
    } catch (err) {
      console.error('❌ Supabase test threw exception:', err);
    }
  }

  getAuthUrl(): string {
    const clientId = "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com";
    const redirectUri = "https://wholescaleos.pages.dev/auth/callback";
    
    const params = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: 'calendar-sync',
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
        .select('refresh_token, provider_data')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single();

      if (error || !data) {
        console.error('❌ No stored connection found:', error);
        return null;
      }

      const code = data.refresh_token || data.provider_data?.code;
      
      if (!code) {
        console.error('❌ No auth code found');
        return null;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com",
          client_secret: "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",
          redirect_uri: "https://wholescaleos.pages.dev/auth/callback",
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        console.error('❌ Token exchange error:', tokens);
        return null;
      }

      return tokens.access_token;
      
    } catch (err) {
      console.error('❌ Error getting access token:', err);
      return null;
    }
  }

  async storeUserTokens(userId: string, code: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client is null');
        return false;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.id !== userId) {
        console.error('❌ User authentication failed');
        return false;
      }
      
      const { error } = await supabase
        .from('user_connections')
        .upsert({
          user_id: userId,
          provider: 'google',
          access_token: 'connected',
          refresh_token: code,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          provider_data: { 
            code: code,
            connected: true, 
            created_at: new Date().toISOString(),
            email: user.email
          }
        });

      if (error) {
        console.error('❌ Supabase error:', error);
        return false;
      }
      
      return true;
      
    } catch (err) {
      console.error('❌ Exception in storeUserTokens:', err);
      return false;
    }
  }

  async isConnected(userId: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      
      const { data, error } = await supabase
        .from('user_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();

      if (error) return false;
      
      return !!(data && data.access_token === 'connected');
    } catch (err) {
      return false;
    }
  }

  async disconnect(userId: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google');

      return !error;
    } catch (err) {
      return false;
    }
  }

  async fetchCalendars(userId: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken(userId);
      if (!accessToken) return [];

      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.items || []).map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description || '',
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        primary: cal.primary || false,
      }));
      
    } catch (err) {
      console.error('❌ Error fetching calendars:', err);
      return [];
    }
  }

  async fetchEvents(userId: string, calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> {
    try {
      const accessToken = await this.getAccessToken(userId);
      if (!accessToken) return [];

      const timeMinStr = (timeMin || new Date()).toISOString();
      const timeMaxStr = (timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${encodeURIComponent(timeMinStr)}&` +
        `timeMax=${encodeURIComponent(timeMaxStr)}&` +
        `singleEvents=true&orderBy=startTime`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) return [];

      const events = await response.json();
      return events.items || [];
      
    } catch (err) {
      console.error('❌ Error fetching events:', err);
      return [];
    }
  }

  async createEvent(userId: string, calendarId: string = 'primary', event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    try {
      const accessToken = await this.getAccessToken(userId);
      if (!accessToken) throw new Error('No access token');

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Create event error:', errorText);
        throw new Error('Failed to create event');
      }

      return await response.json();
      
    } catch (err) {
      console.error('❌ Failed to create event:', err);
      throw err;
    }
  }

  // ✅ FIX 1: Add updateEvent method
  async updateEvent(userId: string, calendarId: string = 'primary', eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    try {
      const accessToken = await this.getAccessToken(userId);
      if (!accessToken) throw new Error('No access token');

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update event error:', errorText);
        throw new Error('Failed to update event');
      }

      return await response.json();
      
    } catch (err) {
      console.error('❌ Failed to update event:', err);
      throw err;
    }
  }

  // ✅ FIX 2: Add deleteEvent method
  async deleteEvent(userId: string, calendarId: string = 'primary', eventId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(userId);
      if (!accessToken) throw new Error('No access token');

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        console.error('❌ Delete event error:', errorText);
        throw new Error('Failed to delete event');
      }
      
    } catch (err) {
      console.error('❌ Failed to delete event:', err);
      throw err;
    }
  }
}
