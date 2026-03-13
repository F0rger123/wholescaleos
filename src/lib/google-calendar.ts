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
      
      console.log('📊 Attempting to query user_connections table...');
      console.log('🔑 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
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
    
    console.log('🔍 Environment Variables:');
    console.log('VITE_GOOGLE_CLIENT_ID:', clientId);
    console.log('VITE_APP_URL:', import.meta.env.VITE_APP_URL);
    console.log('Redirect URI:', redirectUri);
    
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
    
    let url = 'https://accounts.google.com/o/oauth2/v2/auth?';
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url += `${encodeURIComponent(key)}=${encodeURIComponent(value)}&`;
      }
    }
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
      
      console.log('📝 Starting token storage for user:', userId);
      console.log('📝 Code length:', code.length);
      console.log('📝 Code preview:', code.substring(0, 30) + '...');
      
      // Check if user is authenticated with Supabase
      console.log('🔐 Checking Supabase auth status...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('👤 Auth user result:', { 
        user: user ? { id: user.id, email: user.email } : 'none',
        error: userError || 'none'
      });
      
      if (userError) {
        console.error('❌ Auth error details:', {
          message: userError.message,
          status: userError.status,
          name: userError.name
        });
        return false;
      }
      
      if (!user) {
        console.error('❌ No authenticated Supabase user found - user is null');
        console.log('🔍 Attempting to get session...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('📊 Session check:', { 
          session: sessionData?.session ? 'exists' : 'none',
          error: sessionError || 'none'
        });
        
        return false;
      }
      
      console.log('✅ User authenticated successfully:', user.id);
      console.log('📝 User email:', user.email);
      
      // Verify user ID matches
      if (user.id !== userId) {
        console.error('❌ User ID mismatch:', {
          tokenUserId: userId,
          authUserId: user.id
        });
        return false;
      }
      
      console.log('✅ User ID matches, proceeding with upsert');
      
      // Prepare the insert data
      const insertData = {
        user_id: userId,
        provider: 'google',
        access_token: 'connected',
        refresh_token: code,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        provider_data: { 
          code: code.substring(0, 50) + '...',
          connected: true, 
          created_at: new Date().toISOString(),
          email: user.email
        }
      };
      
      console.log('📦 Insert data prepared:', {
        user_id: insertData.user_id,
        provider: insertData.provider,
        expires_at: insertData.expires_at,
        provider_data_keys: Object.keys(insertData.provider_data)
      });
      
      // Perform the upsert
      console.log('💾 Executing upsert...');
      const { data, error } = await supabase
        .from('user_connections')
        .upsert(insertData, { onConflict: 'user_id,provider' })
        .select();

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Check if it's an RLS error
        if (error.code === '42501') {
          console.error('🚫 RLS policy is blocking the insert');
        }
        
        return false;
      }
      
      console.log('✅ Tokens stored successfully!', data ? `Inserted ${data.length} row(s)` : 'No data returned');
      return true;
      
    } catch (err) {
      console.error('❌ Exception in storeUserTokens:', err);
      if (err instanceof Error) {
        console.error('❌ Error name:', err.name);
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);
      }
      return false;
    }
  }

  async isConnected(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client is null');
        return false;
      }
      
      console.log('🔍 Checking connection for user:', userId);
      
      const { data, error } = await supabase
        .from('user_connections')
        .select('access_token, provider_data')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking connection:', error);
        return false;
      }
      
      const isConnected = !!(data && data.access_token === 'connected');
      console.log('🔍 Connection check result:', { 
        userId, 
        isConnected, 
        hasData: !!data,
        providerData: data?.provider_data ? 'exists' : 'none'
      });
      
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
      
      console.log('🗑️ Disconnecting user:', userId);
      
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google');

      if (error) {
        console.error('❌ Disconnect error:', error);
        throw error;
      }
      
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