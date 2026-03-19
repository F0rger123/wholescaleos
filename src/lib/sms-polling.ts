import { supabase, isSupabaseConfigured } from './supabase';
import { useStore } from '../store/useStore';

const SMS_GATEWAYS = [
  '@vtext.com', 
  '@txt.att.net', 
  '@tmomail.net', 
  '@messaging.sprintpcs.com',
  '@myboostmobile.com',
  '@sms.cricketwireless.net',
  '@msg.fi.google.com',
  '@text.republicwireless.com',
  '@email.uscc.net',
  '@vmobl.com'
];

const CLIENT_ID = "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com";
const CLIENT_SECRET = "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";

let pollingInterval: any = null;

/**
 * Refreshes the Google OAuth access token using the stored refresh token.
 */
async function getAccessToken(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data } = await supabase
    .from('user_connections')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle();

  const refreshToken = data?.refresh_token;
  if (!refreshToken) return null;

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) return null;
    const { access_token } = await response.json();
    return access_token;
  } catch (err) {
    console.error('Failed to refresh Google token for polling:', err);
    return null;
  }
}

/**
 * Polls Gmail for new messages from SMS gateways.
 */
export async function pollSMSMessages() {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return;

  const accessToken = await getAccessToken(userId);
  if (!accessToken) return;

  try {
    // 1. Search for messages from SMS gateways
    // query: from:(@vtext.com OR @txt.att.net ...)
    const query = `from:(${SMS_GATEWAYS.join(' OR ')})`;
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!listResponse.ok) return;
    const { messages } = await listResponse.json();
    if (!messages || messages.length === 0) return;

    // 2. Process each message
    for (const msg of messages) {
      if (!supabase) continue;
      // Check if we already have this message
      const { data: existing } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle();

      if (existing) continue;

      // Fetch full message details
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!detailResponse.ok) continue;
      const detail = await detailResponse.json();

      // Parse headers
      const headers = detail.payload.headers;
      const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

      // Extract phone number from From (e.g. "1234567890@vtext.com")
      const phoneMatch = fromHeader.match(/(\d+)@/);
      const phoneNumber = phoneMatch ? phoneMatch[1] : fromHeader;

      // Extract content
      let content = '';
      if (detail.payload.parts) {
        const textPart = detail.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart && textPart.body?.data) {
          content = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      } else if (detail.payload.body?.data) {
        content = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }

      if (!content && subject) content = subject; // Fallback to subject if body is empty (common in some gateways)

      if (!supabase) continue;
      // 3. Store in Supabase
      const { error: insertError } = await supabase.from('sms_messages').insert({
        user_id: userId,
        phone_number: phoneNumber,
        content: content.trim(),
        direction: 'inbound',
        gmail_message_id: msg.id,
        created_at: new Date(dateHeader).toISOString(),
        is_read: false
      });

      if (insertError) {
        console.error('Error storing inbound SMS:', insertError);
      } else {
        if (!supabase) continue;
        // Find lead linkage if exists
        const leads = useStore.getState().leads;
        const matchingLead = leads.find(l => l.phone?.replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''));
        if (matchingLead) {
          await supabase.from('sms_messages').update({ lead_id: matchingLead.id }).eq('gmail_message_id', msg.id);
        }
      }
    }
  } catch (err) {
    console.error('Error polling Gmail for SMS:', err);
  }
}

/**
 * Starts the background polling interval.
 */
export function startSMSPolling(intervalMs = 60000) {
  if (pollingInterval) return;
  
  // Initial poll
  pollSMSMessages();
  
  pollingInterval = setInterval(pollSMSMessages, intervalMs);
  console.log('SMS Polling started.');
}

/**
 * Stops the background polling interval.
 */
export function stopSMSPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('SMS Polling stopped.');
  }
}
