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

  getAuthUrl(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${import.meta.env.VITE_APP_URL}/auth/callback`;
  
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
  
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    urlParams.append(key, value);
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${urlParams.toString()}`;
}

  async storeUserTokens(userId: string, code: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_connections')
        .upsert({
          user_id: userId,
          provider: 'google',
          access_token: 'pending',
          refresh_token: 'pending',
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          provider_data: { code }
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to store tokens:', err);
      return false;
    }
  }

  async isConnected(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    return !error && !!data;
  }

  async disconnect(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_connections')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google');

    return !error;
  }

  async fetchCalendars(userId: string): Promise<any[]> {
    return [
      { id: 'primary', summary: 'Primary Calendar', description: 'Your main Google Calendar' },
      { id: 'work', summary: 'Work Calendar', description: 'Work events' },
    ];
  }

  async fetchEvents(userId: string, calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> {
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
    return {
      id: Date.now().toString(),
      ...event,
    } as GoogleCalendarEvent;
  }
}