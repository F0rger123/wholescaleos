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

  const base64EncodedEmail = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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
 * Polls Gmail for new messages from SMS gateways.
 */
export async function pollSMSMessages() {
  const store = useStore.getState();
  const userId = store.currentUser?.id;
  if (!userId) return;

  const accessToken = await getAccessToken(userId);
  if (!accessToken) return;

  // Also check reminders while we're at it
  checkScheduledReminders();

  try {
    const query = `from:(${SMS_GATEWAYS.join(' OR ')})`;
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!listResponse.ok) return;
    const { messages } = await listResponse.json();
    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      if (!supabase) continue;
      const { data: existing } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle();

      if (existing) continue;

      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!detailResponse.ok) continue;
      const detail = await detailResponse.json();

      const headers = detail.payload.headers;
      const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

      const phoneMatch = fromHeader.match(/(\d+)@/);
      const phoneNumber = phoneMatch ? phoneMatch[1] : fromHeader;

      let content = '';
      if (detail.payload.parts) {
        const textPart = detail.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart && textPart.body?.data) {
          content = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      } else if (detail.payload.body?.data) {
        content = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }

      if (!content && subject) content = subject;

      if (!supabase) continue;
      const { error: insertError } = await supabase.from('sms_messages').insert({
        agent_id: userId,
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
        const { smsAutoReplyEnabled, smsAutoReplyMessage, addNotification, notificationSettings } = useStore.getState();
        
        // Trigger In-app notification
        if (notificationSettings?.smsReceived) {
          addNotification({
            type: 'message',
            title: 'New SMS Received',
            message: `From ${phoneNumber}: ${content.trim().substring(0, 50)}...`,
            link: '/sms'
          });
        }

        // Trigger Auto-reply
        if (smsAutoReplyEnabled && fromHeader.includes('@')) {
          await sendGmail(accessToken, fromHeader, 'Auto-Reply', smsAutoReplyMessage);
          
          await supabase.from('sms_messages').insert({
            agent_id: userId,
            phone_number: phoneNumber,
            content: smsAutoReplyMessage,
            direction: 'outbound',
            created_at: new Date().toISOString(),
            is_read: true
          });
        }

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
  pollSMSMessages();
  pollingInterval = setInterval(pollSMSMessages, intervalMs);
  console.log('SMS Polling & Reminder service started.');
}

/**
 * Stops the background polling interval.
 */
export function stopSMSPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('SMS Polling & Reminder service stopped.');
  }
}

