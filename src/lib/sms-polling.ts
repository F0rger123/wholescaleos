import { supabase, isSupabaseConfigured } from './supabase';
import { useStore } from '../store/useStore';
import { notificationsService } from './supabase-service';

import { ALL_GATEWAY_DOMAINS } from './sms-gateways';


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
    
    // Save the new access_token to user_connections
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('user_connections')
        .update({ access_token, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', 'google');
    }
    
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
async function generateAutoReply(_incomingMessage: string, _senderPhone: string): Promise<string> {
  let fallback = "I'm sorry, I'm currently with a client or away from my desk. I'll get back to you as soon as possible!";
  try {
    const store = useStore.getState();
    const userId = store.currentUser?.id;
    if (userId && isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('agent_preferences').select('sms_auto_reply_message').eq('user_id', userId).maybeSingle();
      if (data?.sms_auto_reply_message) fallback = data.sms_auto_reply_message;
    } else {
      const localMsg = localStorage.getItem('user_sms_auto_reply_message');
      if (localMsg) fallback = localMsg;
    }
  } catch (err) {
    console.error('[SMS Auto-Reply] Failed to load custom message:', err);
  }
  return fallback;
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
  
  // 1. Direct body data
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }
  
  // 2. Recursive search in parts
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractTextContent(part);
      if (text.trim()) return text;
    }
  }
  
  // 3. Last resort: check if there's any data at the top level body
  if (payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }
  
  return '';
}

// ── Determine the gateway email to reply-to from the From header ───────────
function getReplyGateway(fromHeader: string, phoneNumber: string): string | null {
  // Try to reconstruct the reply-to email from the carrier domain in From
  const domainMatch = fromHeader.match(/@([\w.-]+)/);
  if (domainMatch) return `${phoneNumber}@${domainMatch[1]}`;
  return null;
}

// ── Auto-reply Loop Prevention ─────────────────────────────────────────────
const lastAutoReplyTime = new Map<string, number>();
const AUTO_REPLY_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const STALE_MESSAGE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

// ── Main Poll Function ─────────────────────────────────────────────────────
export async function pollSMSMessages() {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) {
    console.log('[SMS Polling] No user ID, skipping poll.');
    return;
  }

  console.log('[SMS Polling] Starting poll for user:', userId);

  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    console.warn('[SMS Polling] No access token — Google not connected?');
    return;
  }

  checkScheduledReminders();

  try {
    // Strategy: query Gmail inbox for emails from carrier domains
    const queries = [
      GMAIL_FROM_QUERY,                                               // Primary: from:(domain)
      `newer_than:1d`,                                                // Fallback: any fresh mail (will be filtered by domain below)
    ];

    let messages: any[] = [];

    for (const query of queries) {
      console.log(`[SMS Polling] Fetching Gmail with query: ${query}`);
      const listResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!listResponse.ok) {
        if (listResponse.status === 403) {
          notificationsService.create({
            user_id: userId,
            type: 'error',
            title: 'SMS Error',
            message: 'Gmail connection expired or missing permissions. Please reconnect in Settings.',
          }).catch(console.error);
        }
        console.error(`[SMS Polling] Gmail list failed for query "${query}":`, listResponse.status);
        continue;
      }

      const listData = await listResponse.json();
      if (listData.messages?.length > 0) {
        messages = listData.messages;
        console.log(`[SMS Polling] Found ${messages.length} messages for query: ${query}`);
        break;
      }
    }

    if (!messages || messages.length === 0) {
      console.log('[SMS Polling] No messages found in Gmail matching carrier criteria.');
      return;
    }

    for (const msg of messages) {
      if (!supabase) continue;

      // Dedup: skip already stored messages
      const { data: existing } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle();

      if (existing) {
        // console.log(`[SMS Polling] Message ${msg.id} already exists, skipping.`);
        continue;
      }

      console.log(`[SMS Polling] Processing new message: ${msg.id}`);

      // Fetch full message
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) {
        console.error(`[SMS Polling] Failed to fetch details for ${msg.id}`);
        continue;
      }
      const detail = await detailRes.json();

      const headers = detail.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

      // ── Filter: Only process emails that actually come from carrier gateways ──
      const isFromCarrier = ALL_GATEWAY_DOMAINS.some(d => fromHeader.toLowerCase().includes(d.toLowerCase()));
      if (!isFromCarrier) {
        console.log(`[SMS Polling] Skipping message ${msg.id} - sender ${fromHeader} is not a carrier.`);
        continue;
      }

      // ── Safeguard: Ignore bounce/error notifications from carriers ──
      const lowerSubject = subject.toLowerCase();
      const lowerSnippet = detail.snippet?.toLowerCase() || '';
      if (
        lowerSubject.includes('delivery failure') || 
        lowerSubject.includes('undelivered') || 
        lowerSubject.includes('returned mail') ||
        lowerSnippet.includes('message not delivered') ||
        lowerSnippet.includes('failure notice')
      ) {
        console.log(`[SMS Polling] Ignoring bounce/error notification ${msg.id}`);
        // Optionally store as an error message but don't auto-reply
        continue;
      }

      console.log(`[SMS Polling] Carrier message detected from: ${fromHeader}`);

      // Extract phone number from sender address
      const phoneMatch = fromHeader.match(/(\d{10,})/);
      let phoneNumber = phoneMatch ? phoneMatch[1] : '';
      if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
        phoneNumber = phoneNumber.substring(1);
      }
      if (!phoneNumber || phoneNumber.length < 10) {
        console.warn(`[SMS Polling] Could not extract valid phone number from ${fromHeader}`);
        continue;
      }

      // Extract message content
      let content = extractTextContent(detail.payload);
      
      // Fallback 1: Use subject if content is empty (common for some gateways)
      if (!content.trim() && subject && !subject.toLowerCase().includes('(no subject)')) {
        content = subject;
      }
      
      // Fallback 2: Use snippet (Gmail's pre-rendered text preview)
      if (!content.trim() && detail.snippet) {
        content = detail.snippet;
      }
      
      content = content.trim();
      
      if (!content) {
        console.log(`[SMS Polling] Skipping empty message content from ${phoneNumber} for message ${msg.id}`);
        continue;
      }

      const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

      console.log(`[SMS Polling] Inserting inbound SMS from ${phoneNumber}: "${content.substring(0, 30)}..."`);

      // ── Insert inbound SMS ──
      const { error: insertError } = await supabase.from('sms_messages').insert({
        user_id: userId,
        agent_id: userId,
        phone_number: phoneNumber,
        content,
        direction: 'inbound',
        gmail_message_id: msg.id,
        created_at: receivedAt,
        is_read: false
      });

      if (insertError) {
        console.error(`[SMS Polling] Insert error for message ${msg.id}:`, insertError);
        continue;
      }

      console.log(`[SMS Polling] Successfully stored message ${msg.id} from ${phoneNumber}`);

      // ── Safety Guard: Ignore stale messages (older than 10 mins) ──
      const msgTime = new Date(receivedAt).getTime();
      const now = Date.now();
      if (now - msgTime > STALE_MESSAGE_THRESHOLD) {
        console.log(`[SMS Polling] Message ${msg.id} is stale (${Math.round((now - msgTime) / 60000)}m old), skipping auto-reply.`);
        continue;
      }

      const { notificationSettings, addNotification } = useStore.getState();

      // Fetch auto-reply preferences dynamically
      let isAutoReplyEnabled = false;
      try {
        if (userId && isSupabaseConfigured && supabase) {
          const { data } = await supabase.from('agent_preferences').select('sms_auto_reply_enabled').eq('user_id', userId).maybeSingle();
          isAutoReplyEnabled = !!data?.sms_auto_reply_enabled;
        } else {
          isAutoReplyEnabled = localStorage.getItem('user_sms_auto_reply') === 'true';
        }
      } catch (err) {}

      // ── Safety Guard: Only auto-reply if sender is a known Lead ──
      let isKnownLead = false;
      let userPhoneNumber = '';

      if (isAutoReplyEnabled) {
        // Fetch user's own phone number to avoid auto-replying to self
        try {
          if (userId && isSupabaseConfigured && supabase) {
            const { data: prefs } = await supabase
              .from('agent_preferences')
              .select('phone_number')
              .eq('user_id', userId)
              .maybeSingle();
            userPhoneNumber = prefs?.phone_number || '';
          } else {
            userPhoneNumber = localStorage.getItem('user_sms_phone') || '';
          }
          // Normalize user phone number
          userPhoneNumber = userPhoneNumber.replace(/\D/g, '');
          if (userPhoneNumber.length === 11 && userPhoneNumber.startsWith('1')) {
            userPhoneNumber = userPhoneNumber.substring(1);
          }
        } catch (err) {
          console.error('[SMS Auto-Reply] Failed to fetch user phone number:', err);
        }

        // HARD BLOCK: NEVER auto-reply to the user's own number
        if (userPhoneNumber && phoneNumber === userPhoneNumber) {
          console.log(`[SMS Auto-Reply] Sender ${phoneNumber} is the user's own number. Hard block triggered.`);
          isAutoReplyEnabled = false;
        }

        if (isAutoReplyEnabled) {
          const { data: lead } = await supabase
            .from('leads')
            .select('id')
            .eq('phone', phoneNumber)
            .maybeSingle();
          
          if (lead) {
            isKnownLead = true;
          } else {
            console.log(`[SMS Auto-Reply] Sender ${phoneNumber} is not a known lead. Skipping auto-reply.`);
          }
        }
      }

      // ── In-app notification ──
      if (notificationSettings?.smsReceived) {
        addNotification({
          type: 'message',
          title: 'New SMS Received',
          message: `From ${phoneNumber}: ${content.substring(0, 60)}${content.length > 60 ? '...' : ''}`,
          link: '/sms'
        });
      }

      // ── Auto-reply Logic with Loop Prevention ──
      if (isAutoReplyEnabled && isKnownLead) {
        const lastReply = lastAutoReplyTime.get(phoneNumber) || 0;
        const now = Date.now();

        if (now - lastReply < AUTO_REPLY_COOLDOWN) {
          console.log(`[SMS Auto-Reply] Skipping for ${phoneNumber} - cooldown active.`);
        } else {
          const replyGateway = getReplyGateway(fromHeader, phoneNumber);
          if (replyGateway) {
            // Update cooldown timestamp
            lastAutoReplyTime.set(phoneNumber, now);

            // Generate AI response based on message content
            const autoReplyText = await generateAutoReply(content, phoneNumber);

            await sendGmail(accessToken, replyGateway, autoReplyText);

            // Log the auto-reply as outbound
            await supabase.from('sms_messages').insert({
              user_id: userId,
              agent_id: userId,
              phone_number: phoneNumber,
              content: autoReplyText,
              direction: 'outbound',
              created_at: new Date().toISOString(),
              is_read: true
            });
          }
        }
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
