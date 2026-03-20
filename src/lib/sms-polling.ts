import { supabase, isSupabaseConfigured } from './supabase';
import { useStore } from '../store/useStore';

// All gateways we might receive replies FROM (both SMS and MMS)
const ALL_GATEWAY_DOMAINS = [
  // Standard SMS gateways
  'vtext.com',
  'txt.att.net',
  'tmomail.net',
  'messaging.sprintpcs.com',
  'myboostmobile.com',
  'sms.cricketwireless.net',
  'msg.fi.google.com',
  'text.republicwireless.com',
  'email.uscc.net',
  'vmobl.com',
  // MMS gateways (better for iPhones)
  'vzwpix.com',
  'mms.att.net',
  'pm.sprint.com',
];

// Gmail query: match any email FROM these domains
const GMAIL_FROM_QUERY = ALL_GATEWAY_DOMAINS.map(d => `from:@${d}`).join(' OR ');

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
 * Sends an email (or SMS via email gateway) using Gmail API.
 */
async function sendGmail(accessToken: string, to: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body
  ].join('\n');

  const base64EncodedEmail = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64EncodedEmail }),
    });
  } catch (err) {
    console.error('Failed to send auto-reply via Gmail:', err);
  }
}

/**
 * Checks for tasks/appointments due within the next 30 minutes.
 */
let notifiedTasks = new Set<string>();
function checkScheduledReminders() {
  const store = useStore.getState();
  const { tasks, notificationSettings, addNotification } = store;
  if (!notificationSettings) return;
  if (!notificationSettings.appointmentReminder && !notificationSettings.taskDue) return;

  const now = new Date();
  const upcomingThreshold = new Date(now.getTime() + 30 * 60 * 1000);

  tasks.forEach(task => {
    if (task.status === 'done' || !task.dueDate || notifiedTasks.has(task.id)) return;
    const dueDate = new Date(task.dueDate);
    
    if (dueDate > now && dueDate <= upcomingThreshold) {
      addNotification({
        type: 'task-due',
        title: 'Task Due Soon',
        message: `"${task.title}" is due at ${dueDate.toLocaleTimeString()}`,
        link: '/tasks'
      });
      notifiedTasks.add(task.id);
    }
  });
}

/**
 * Decodes a base64url string (Gmail API format) to UTF-8 text.
 */
function decodeGmailBody(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    try {
      return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
}

/**
 * Recursively extracts text/plain content from a Gmail message part.
 */
function extractTextContent(payload: any): string {
  if (!payload) return '';

  // Direct body data (simple single-part message)
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }

  // Multi-part: recurse through parts
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractTextContent(part);
      if (text.trim()) return text;
    }
  }

  // Fallback: inline body data
  if (payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }

  return '';
}

/**
 * Polls Gmail for new inbound SMS/MMS messages from carrier gateways.
 * Stores them in `sms_messages` with `user_id` column (NOT agent_id).
 */
export async function pollSMSMessages() {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return;

  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    console.warn('[SMS Polling] No access token — Google not connected?');
    return;
  }

  // Run reminders check concurrently
  checkScheduledReminders();

  try {
    // Fetch messages matching any gateway domain
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(GMAIL_FROM_QUERY)}&maxResults=30`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!listResponse.ok) {
      console.error('[SMS Polling] Gmail list failed:', listResponse.status, await listResponse.text());
      return;
    }

    const listData = await listResponse.json();
    const messages = listData.messages;
    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      if (!supabase) continue;

      // ── Dedup: skip if already stored ──────────────────────────────────
      const { data: existing } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle();

      if (existing) continue;

      // ── Fetch full message detail ───────────────────────────────────────
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!detailResponse.ok) continue;
      const detail = await detailResponse.json();

      const headers = detail.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

      // Extract the phone number from the From address (e.g. 7175551234@vtext.com)
      const phoneMatch = fromHeader.match(/(\d{10,})/);
      const phoneNumber = phoneMatch ? phoneMatch[1] : fromHeader;

      // Extract message body
      let content = extractTextContent(detail.payload);
      // Fallback to subject if body is empty (some carriers send SMS as subject)
      if (!content.trim() && subject) content = subject;
      content = content.trim();

      if (!content) {
        console.log('[SMS Polling] Skipping empty message', msg.id);
        continue;
      }

      // ── Insert into sms_messages using `user_id` column ─────────────────
      // NOTE: Use `user_id` (NOT `agent_id`) to match what SMSInbox.tsx queries.
      const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

      const { error: insertError } = await supabase.from('sms_messages').insert({
        user_id: userId,          // ← CRITICAL: must match what SMSInbox reads
        phone_number: phoneNumber,
        content,
        direction: 'inbound',
        gmail_message_id: msg.id,
        created_at: receivedAt,
        is_read: false
      });

      if (insertError) {
        console.error('[SMS Polling] Error storing inbound SMS:', insertError);
        // If user_id column doesn't exist, try agent_id as fallback
        if (insertError.code === '42703' || insertError.message?.includes('user_id')) {
          await supabase.from('sms_messages').insert({
            agent_id: userId,
            phone_number: phoneNumber,
            content,
            direction: 'inbound',
            gmail_message_id: msg.id,
            created_at: receivedAt,
            is_read: false
          });
        }
      } else {
        const { smsAutoReplyEnabled, smsAutoReplyMessage, addNotification, notificationSettings } = useStore.getState();
        
        // In-app notification
        if (notificationSettings?.smsReceived) {
          addNotification({
            type: 'message',
            title: 'New SMS Received',
            message: `From ${phoneNumber}: ${content.substring(0, 60)}${content.length > 60 ? '...' : ''}`,
            link: '/sms'
          });
        }

        // Auto-reply
        if (smsAutoReplyEnabled && smsAutoReplyMessage && fromHeader.includes('@')) {
          await sendGmail(accessToken, fromHeader, '', smsAutoReplyMessage);
          await supabase.from('sms_messages').insert({
            user_id: userId,
            phone_number: phoneNumber,
            content: smsAutoReplyMessage,
            direction: 'outbound',
            created_at: new Date().toISOString(),
            is_read: true
          });
        }

        // Link to lead if phone matches
        const leads = useStore.getState().leads;
        const matchingLead = leads.find(l => l.phone?.replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''));
        if (matchingLead) {
          await supabase.from('sms_messages')
            .update({ lead_id: matchingLead.id })
            .eq('gmail_message_id', msg.id);
        }
      }
    }
  } catch (err) {
    console.error('[SMS Polling] Unexpected error:', err);
  }
}

/**
 * Starts the background polling interval.
 */
export function startSMSPolling(intervalMs = 30000) {
  if (pollingInterval) return;
  // Run immediately on start
  pollSMSMessages();
  // Then poll every 30 seconds (was 60s — reduced for better responsiveness)
  pollingInterval = setInterval(pollSMSMessages, intervalMs);
  console.log('[SMS Polling] Started. Polling every', intervalMs / 1000, 'seconds.');
}

/**
 * Stops the background polling interval.
 */
export function stopSMSPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[SMS Polling] Stopped.');
  }
}
