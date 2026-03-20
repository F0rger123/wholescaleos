import { supabase, isSupabaseConfigured } from './supabase';
import { useStore } from '../store/useStore';

// ── Gateway domains we might receive INBOUND replies FROM ──────────────────
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
  // MMS gateways (iPhone-compatible)
  'vzwpix.com',
  'mms.att.net',
  'pm.sprint.com',
  'mmst5.tracfone.com',
];

// Gmail API query — use broad carrier domain matching
// Gmail query syntax: OR-join each domain. Use `from:(@domain)` for partial match.
const GMAIL_FROM_QUERY = ALL_GATEWAY_DOMAINS.map(d => `from:(${d})`).join(' OR ');

const CLIENT_ID = "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com";
const CLIENT_SECRET = "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";

let pollingInterval: any = null;

// ── Token Refresh ──────────────────────────────────────────────────────────
async function getAccessToken(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data } = await supabase
    .from('user_connections')
    .select('refresh_token, access_token')
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

    if (!response.ok) {
      console.error('[SMS Polling] Token refresh failed:', await response.text());
      return null;
    }
    const { access_token } = await response.json();
    return access_token;
  } catch (err) {
    console.error('Failed to refresh Google token for polling:', err);
    return null;
  }
}

// ── Send Gmail (for auto-reply) ────────────────────────────────────────────
async function sendGmail(accessToken: string, to: string, body: string) {
  // Encode with proper MIME for carrier gateways
  const raw = [
    `To: ${to}`,
    'Subject: ',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body
  ].join('\r\n');

  const base64 = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: base64 }),
    });
    if (!res.ok) console.error('[SMS Auto-reply] Send failed:', await res.text());
  } catch (err) {
    console.error('[SMS Auto-reply] Failed to send:', err);
  }
}

// ── AI Auto-reply generation (calls Gemini API directly) ──────────────────
async function generateAutoReply(incomingMessage: string, senderPhone: string): Promise<string> {
  const store = useStore.getState();
  const fallback = store.smsAutoReplyMessage || "Thanks for reaching out! We'll be in touch soon.";
  try {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return fallback;

    const lead = store.leads.find((l: any) => l.phone?.replace(/\D/g, '') === senderPhone.replace(/\D/g, ''));
    const context = lead ? `The sender is a lead named ${lead.name} (status: ${lead.status}).` : 'The sender is unknown.';

    const prompt = `You are a real estate professional's AI assistant. ${context}

An incoming SMS was received: "${incomingMessage}"

Write a SHORT, professional, friendly SMS auto-reply (1-2 sentences max, no emojis). 
Don't promise immediate response — the agent will follow up soon. Sign off naturally.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
      })
    });

    if (!res.ok) throw new Error('API call failed');
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || fallback;
  } catch {
    return fallback;
  }
}

// ── Task Reminders ─────────────────────────────────────────────────────────
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

// ── Body Decoding ──────────────────────────────────────────────────────────
function decodeGmailBody(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    // Pad to multiple of 4
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    try { return atob(data.replace(/-/g, '+').replace(/_/g, '/')); } catch { return ''; }
  }
}

function extractTextContent(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) return decodeGmailBody(payload.body.data);
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractTextContent(part);
      if (text.trim()) return text;
    }
  }
  if (payload.body?.data) return decodeGmailBody(payload.body.data);
  return '';
}

// ── Determine the gateway email to reply-to from the From header ───────────
function getReplyGateway(fromHeader: string, phoneNumber: string): string | null {
  // Try to reconstruct the reply-to email from the carrier domain in From
  const domainMatch = fromHeader.match(/@([\w.-]+)/);
  if (domainMatch) return `${phoneNumber}@${domainMatch[1]}`;
  return null;
}

// ── Main Poll Function ─────────────────────────────────────────────────────
export async function pollSMSMessages() {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return;

  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    console.warn('[SMS Polling] No access token — Google not connected?');
    return;
  }

  checkScheduledReminders();

  try {
    // Strategy: query Gmail inbox for emails from carrier domains
    // Use a simple recent-inbox scan since carrier query syntax varies
    const queries = [
      GMAIL_FROM_QUERY,                                               // Primary: from:(domain)
      `in:inbox newer_than:2d`,                                       // Fallback: recent inbox items
    ];

    let messages: any[] = [];

    for (const query of queries) {
      const listResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!listResponse.ok) continue;
      const listData = await listResponse.json();
      if (listData.messages?.length > 0) {
        messages = listData.messages;
        break;
      }
    }

    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      if (!supabase) continue;

      // Dedup: skip already stored messages
      const { data: existing } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle();
      if (existing) continue;

      // Fetch full message
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) continue;
      const detail = await detailRes.json();

      const headers = detail.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

      // ── Filter: Only process emails that actually come from carrier gateways ──
      const isFromCarrier = ALL_GATEWAY_DOMAINS.some(d => fromHeader.includes(d));
      if (!isFromCarrier) continue;

      // Extract phone number from sender address
      const phoneMatch = fromHeader.match(/(\d{10,})/);
      const phoneNumber = phoneMatch ? phoneMatch[1] : '';
      if (!phoneNumber) continue; // Skip non-phone senders

      // Extract message content
      let content = extractTextContent(detail.payload);
      if (!content.trim() && subject) content = subject;
      content = content.trim();
      if (!content) continue;

      const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

      // ── Insert inbound SMS ──
      const { error: insertError } = await supabase.from('sms_messages').insert({
        user_id: userId,
        phone_number: phoneNumber,
        content,
        direction: 'inbound',
        gmail_message_id: msg.id,
        created_at: receivedAt,
        is_read: false
      });

      if (insertError) {
        // Fallback to agent_id if user_id column doesn't exist
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
        } else {
          console.error('[SMS Polling] Insert error:', insertError);
          continue;
        }
      }

      const { smsAutoReplyEnabled, notificationSettings, addNotification } = useStore.getState();

      // ── In-app notification ──
      if (notificationSettings?.smsReceived) {
        addNotification({
          type: 'message',
          title: 'New SMS Received',
          message: `From ${phoneNumber}: ${content.substring(0, 60)}${content.length > 60 ? '...' : ''}`,
          link: '/sms'
        });
      }

      // ── AI-powered auto-reply ──
      if (smsAutoReplyEnabled) {
        const replyGateway = getReplyGateway(fromHeader, phoneNumber);
        if (replyGateway) {
          // Generate AI response based on message content
          const autoReplyText = await generateAutoReply(content, phoneNumber);

          await sendGmail(accessToken, replyGateway, autoReplyText);

          // Log the auto-reply as outbound
          await supabase.from('sms_messages').insert({
            user_id: userId,
            phone_number: phoneNumber,
            content: autoReplyText,
            direction: 'outbound',
            created_at: new Date().toISOString(),
            is_read: true
          });
        }
      }

      // ── Link to lead if phone matches ──
      const leads = useStore.getState().leads;
      const matchingLead = leads.find(l => l.phone?.replace(/\D/g, '') === phoneNumber);
      if (matchingLead) {
        await supabase.from('sms_messages')
          .update({ lead_id: matchingLead.id })
          .eq('gmail_message_id', msg.id);
      }
    }
  } catch (err) {
    console.error('[SMS Polling] Unexpected error:', err);
  }
}

// ── Start / Stop ──────────────────────────────────────────────────────────
export function startSMSPolling(intervalMs = 30000) {
  if (pollingInterval) return;
  pollSMSMessages(); // Run immediately
  pollingInterval = setInterval(pollSMSMessages, intervalMs);
  console.log('[SMS Polling] Started. Interval:', intervalMs / 1000, 'seconds.');
}

export function stopSMSPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[SMS Polling] Stopped.');
  }
}
