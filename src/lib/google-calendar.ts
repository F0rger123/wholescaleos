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

  // NEW: Test Supabase connection
  async testConnection(): Promise<void> {
    console.log('🧪 Testing Supabase connection...');
    try {
      if (!supabase) {
        console.error('❌ Supabase is null - check your initialization');
        return;
      }
      
      console.log('📊 Attempting to query user_connections table...');
      
      const { data, error } = await supabase
        .from('user_connections')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase query failed:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
      } else {
        console.log('✅ Supabase connection successful!', data);
      }
    } catch (err) {
      console.error('❌ Supabase test threw exception:', err);
    }
  }

  getAuthUrl(): string {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_APP_URL}/auth/callback`;
    
    // Debug logging
    console.log('🔍 Environment Variables:');
    console.log('VITE_GOOGLE_CLIENT_ID:', clientId);
    console.log('VITE_APP_URL:', import.meta.env.VITE_APP_URL);
    console.log('Redirect URI:', redirectUri);
    
    // Check if variables exist
    if (!clientId) {
      console.error('❌ VITE_GOOGLE_CLIENT_ID is missing!');
    }
    if (!import.meta.env.VITE_APP_URL) {
      console.error('❌ VITE_APP_URL is missing!');
    }
    
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
    
    // Build URL manually to avoid any URLSearchParams issues
    let url = 'https://accounts.google.com/o/oauth2/v2/auth?';
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}&`;
      }
    }
    // Remove trailing &
    url = url.slice(0, -1);
    
    console.log('🔗 Generated Auth URL:', url);
    
    return url;
  }

  async storeUserTokens(userId: string, code: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client is null');
        return false;
      }
      
      console.log('📝 Storing tokens for user:', userId);
      console.log('📝 Code received:', code.substring(0, 20) + '...');
      
      const { error } = await supabase
        .from('user_connections')
        .upsert({
          user_id: userId,
          provider: 'google',
          access_token: 'connected',
          refresh_token: code,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          provider_data: { code, connected: true }
        });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Tokens stored successfully!');
      return true;
    } catch (err) {
      console.error('❌ Failed to store tokens:', err);
      return false;
    }
  }

  async isConnected(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client is null');
        return false;
      }
      
      const { data, error } = await supabase
        .from('user_connections')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking connection:', error);
        return false;
      }
      
      const isConnected = !!(data && data.access_token === 'connected');
      console.log('🔍 Connection check for user', userId, ':', isConnected);
      
      return isConnected;
    } catch (err) {
      console.error('❌ Error in isConnected:', err);
      return false;
    }
  }

  async disconnect(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client is null');
        return false;
      }
      
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google');

      if (error) throw error;
      console.log('✅ Disconnected successfully for user:', userId);
      return true;
    } catch (err) {
      console.error('❌ Failed to disconnect:', err);
      return false;
    }
  }

  async fetchCalendars(userId: string): Promise<any[]> {
    console.log('📅 Fetching calendars for user:', userId);
    return [
      { id: 'primary', summary: 'Primary Calendar', description: 'Your main Google Calendar' },
      { id: 'work', summary: 'Work Calendar', description: 'Work events' },
    ];
  }

  async fetchEvents(userId: string, calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> {
    console.log('📅 Fetching events for user:', userId, 'calendar:', calendarId);
    return [
      {
        id: '1',
        summary: 'Sample Google Event',
        description: 'This is a sample event from Google Calendar',
        start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
        end: { dateTime: new Date(Date.now() + 90000000).toISOString() },
      }
    ];
  }

  async createEvent(userId: string, calendarId: string = 'primary', event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    console.log('📅 Creating event for user:', userId, 'calendar:', calendarId, event);
    return {
      id: Date.now().toString(),
      ...event,
    } as GoogleCalendarEvent;
  }
}