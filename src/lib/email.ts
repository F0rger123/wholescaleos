// ═══════════════════════════════════════════════════════════════════════════════
// WholeScale OS — Email Service (via Resend + Supabase Edge Function)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Architecture:
//   Browser → Supabase Edge Function → Resend API → Email delivered
//
// WHY NOT call Resend directly from the browser?
//   → The Resend API key is a SECRET. Putting it in frontend code exposes it
//     to anyone who opens DevTools. We use a Supabase Edge Function as a
//     secure proxy so the key stays server-side.
//
// For AUTH emails (verification, password reset):
//   → Configured via Supabase Dashboard SMTP settings pointing to Resend.
//     No code needed — Supabase sends them automatically.
//
// For CUSTOM emails (welcome, deal alerts, task notifications):
//   → This file generates the HTML template and calls the Edge Function.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase, isSupabaseConfigured } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailType =
  | 'welcome'
  | 'verification'
  | 'password-reset'
  | 'deal-alert'
  | 'task-assigned'
  | 'lead-assigned'
  | 'weekly-digest'
  | 'team-invite'
  | 'mention'
  | 'custom';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Brand Constants ──────────────────────────────────────────────────────────

const BRAND = {
  name: 'WholeScale OS',
  color: '#3b82f6',
  colorDark: '#1e40af',
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  textLight: '#94a3b8',
  textWhite: '#f8fafc',
  logo: '🏗️',
  year: new Date().getFullYear(),
};

// ─── Base Email Layout ────────────────────────────────────────────────────────

function emailLayout(body: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.name}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    a { color: ${BRAND.color}; text-decoration: none; }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body style="background-color: ${BRAND.bgDark}; margin: 0; padding: 0; width: 100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
  
  <!-- Container -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.bgDark};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${BRAND.color}, ${BRAND.colorDark}); border-radius: 16px; padding: 14px 16px; vertical-align: middle;">
                    <span style="font-size: 24px; line-height: 1;">${BRAND.logo}</span>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <span style="font-size: 22px; font-weight: 700; color: ${BRAND.textWhite}; letter-spacing: -0.5px;">WholeScale</span>
                    <br/>
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: ${BRAND.color}; font-weight: 600;">OS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body Card -->
          <tr>
            <td style="background-color: ${BRAND.bgCard}; border-radius: 20px; border: 1px solid #334155; padding: 40px 36px;">
              ${body}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="font-size: 12px; color: #475569; line-height: 1.6;">
                © ${BRAND.year} ${BRAND.name}. All rights reserved.<br/>
                <a href="#" style="color: #64748b; text-decoration: underline;">Unsubscribe</a> · 
                <a href="#" style="color: #64748b; text-decoration: underline;">Preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Button Helper ────────────────────────────────────────────────────────────

function emailButton(text: string, url: string, color = BRAND.color): string {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
    <tr>
      <td align="center">
        <a href="${url}" class="btn" style="
          display: inline-block;
          padding: 14px 36px;
          background: linear-gradient(135deg, ${color}, ${color}dd);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 4px 14px ${color}40;
        ">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ─── Info Row Helper ──────────────────────────────────────────────────────────

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding: 8px 12px; font-size: 13px; color: ${BRAND.textLight}; border-bottom: 1px solid #334155;">${label}</td>
    <td style="padding: 8px 12px; font-size: 13px; color: ${BRAND.textWhite}; font-weight: 500; border-bottom: 1px solid #334155; text-align: right;">${value}</td>
  </tr>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Welcome Email ────────────────────────────────────────────────────────────

export function welcomeEmailTemplate(userName: string, dashboardUrl: string): EmailPayload {
  const firstName = userName.split(' ')[0];
  const body = `
    <h1 style="font-size: 26px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      Welcome aboard, ${firstName}! 🎉
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      Your WholeScale OS account is set up and ready to go. Here's everything you need to start closing deals faster.
    </p>

    <!-- Quick Start Steps -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px;">
      <tr>
        <td style="padding: 14px 16px; background-color: #0f172a; border-radius: 12px; margin-bottom: 8px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="40" style="vertical-align: top;">
                <span style="display: inline-block; width: 28px; height: 28px; border-radius: 8px; background: ${BRAND.color}20; color: ${BRAND.color}; font-size: 13px; font-weight: 700; text-align: center; line-height: 28px;">1</span>
              </td>
              <td>
                <p style="font-size: 14px; color: ${BRAND.textWhite}; font-weight: 600; margin-bottom: 2px;">Add your first lead</p>
                <p style="font-size: 12px; color: ${BRAND.textLight};">Import from Google Sheets, paste data, or add manually</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 14px 16px; background-color: #0f172a; border-radius: 12px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="40" style="vertical-align: top;">
                <span style="display: inline-block; width: 28px; height: 28px; border-radius: 8px; background: #8b5cf620; color: #a78bfa; font-size: 13px; font-weight: 700; text-align: center; line-height: 28px;">2</span>
              </td>
              <td>
                <p style="font-size: 14px; color: ${BRAND.textWhite}; font-weight: 600; margin-bottom: 2px;">Set up your coverage area</p>
                <p style="font-size: 12px; color: ${BRAND.textLight};">Draw zones on the map to track your farm areas</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 14px 16px; background-color: #0f172a; border-radius: 12px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="40" style="vertical-align: top;">
                <span style="display: inline-block; width: 28px; height: 28px; border-radius: 8px; background: #10b98120; color: #34d399; font-size: 13px; font-weight: 700; text-align: center; line-height: 28px;">3</span>
              </td>
              <td>
                <p style="font-size: 14px; color: ${BRAND.textWhite}; font-weight: 600; margin-bottom: 2px;">Invite your team</p>
                <p style="font-size: 12px; color: ${BRAND.textLight};">Share your team invite code and start collaborating</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailButton('Open Your Dashboard →', dashboardUrl)}

    <p style="font-size: 12px; color: #475569; text-align: center;">
      Questions? Reply to this email — we're here to help.
    </p>
  `;

  return {
    to: '', // filled by caller
    subject: `Welcome to WholeScale OS, ${firstName}! 🏗️`,
    html: emailLayout(body, `${firstName}, your real estate CRM is ready to go!`),
  };
}

// ─── Email Verification Template ──────────────────────────────────────────────

export function verificationEmailTemplate(userName: string, verifyUrl: string): EmailPayload {
  const firstName = userName.split(' ')[0];
  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      Verify your email ✉️
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 8px;">
      Hey ${firstName}, thanks for signing up for WholeScale OS!
    </p>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      Click the button below to confirm your email address and activate your account.
    </p>

    ${emailButton('Verify Email Address', verifyUrl, '#10b981')}

    <div style="padding: 16px; background-color: #0f172a; border-radius: 12px; margin-top: 24px;">
      <p style="font-size: 12px; color: #64748b; line-height: 1.6;">
        🔒 This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
  `;

  return {
    to: '',
    subject: 'Verify your WholeScale OS email',
    html: emailLayout(body, `${firstName}, verify your email to get started`),
  };
}

// ─── Password Reset Template ──────────────────────────────────────────────────

export function passwordResetTemplate(resetUrl: string): EmailPayload {
  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      Reset your password 🔐
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      We received a request to reset your WholeScale OS password. Click the button below to choose a new one.
    </p>

    ${emailButton('Reset Password', resetUrl, '#f59e0b')}

    <div style="padding: 16px; background-color: #0f172a; border-radius: 12px; margin-top: 24px;">
      <p style="font-size: 12px; color: #64748b; line-height: 1.6;">
        ⏰ This link expires in 1 hour.<br/>
        🔒 If you didn't request a password reset, no action is needed — your account is safe.
      </p>
    </div>
  `;

  return {
    to: '',
    subject: 'Reset your WholeScale OS password',
    html: emailLayout(body, 'Password reset requested for your account'),
  };
}

// ─── Deal Alert Template ──────────────────────────────────────────────────────

export function dealAlertTemplate(
  userName: string,
  leadName: string,
  address: string,
  propertyValue: number,
  dealScore: number,
  dashboardUrl: string,
): EmailPayload {
  const firstName = userName.split(' ')[0];
  const scoreColor = dealScore >= 70 ? '#10b981' : dealScore >= 40 ? '#f59e0b' : '#ef4444';
  const scoreLabel = dealScore >= 70 ? 'Hot' : dealScore >= 40 ? 'Warm' : 'Cold';

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      New Deal Alert 🔥
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      Hey ${firstName}, a lead has been flagged as high priority!
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0f172a; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
      <!-- Deal Score Header -->
      <tr>
        <td colspan="2" style="padding: 20px 20px 16px; border-bottom: 1px solid #1e293b;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td>
                <p style="font-size: 18px; font-weight: 700; color: ${BRAND.textWhite};">${leadName}</p>
                <p style="font-size: 13px; color: ${BRAND.textLight};">${address}</p>
              </td>
              <td align="right">
                <span style="display: inline-block; padding: 6px 14px; background: ${scoreColor}20; color: ${scoreColor}; font-size: 13px; font-weight: 700; border-radius: 20px;">
                  ⚡ ${dealScore} · ${scoreLabel}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${infoRow('Property Value', `$${propertyValue.toLocaleString()}`)}
      ${infoRow('Deal Score', `${dealScore}/100`)}
      ${infoRow('Status', scoreLabel)}
    </table>

    ${emailButton('View Deal Details →', dashboardUrl)}
  `;

  return {
    to: '',
    subject: `🔥 Hot Deal: ${leadName} — Score ${dealScore}/100`,
    html: emailLayout(body, `${firstName}, ${leadName} scored ${dealScore}/100!`),
  };
}

// ─── Task Assigned Template ───────────────────────────────────────────────────

export function taskAssignedTemplate(
  userName: string,
  taskTitle: string,
  priority: string,
  dueDate: string,
  assignedBy: string,
  dashboardUrl: string,
): EmailPayload {
  const firstName = userName.split(' ')[0];
  const priorityColors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  };
  const pColor = priorityColors[priority] || BRAND.color;

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      New Task Assigned 📋
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      Hey ${firstName}, <strong style="color: ${BRAND.textWhite};">${assignedBy}</strong> assigned you a new task.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0f172a; border-radius: 16px; overflow: hidden; margin-bottom: 24px; border-left: 4px solid ${pColor};">
      <tr>
        <td style="padding: 20px;">
          <p style="font-size: 16px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">${taskTitle}</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right: 16px;">
                <span style="display: inline-block; padding: 4px 10px; background: ${pColor}20; color: ${pColor}; font-size: 11px; font-weight: 600; border-radius: 6px; text-transform: uppercase;">${priority}</span>
              </td>
              <td>
                <span style="font-size: 13px; color: ${BRAND.textLight};">📅 Due: ${dueDate}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailButton('View Task →', dashboardUrl)}
  `;

  return {
    to: '',
    subject: `📋 Task assigned: ${taskTitle}`,
    html: emailLayout(body, `${assignedBy} assigned you: ${taskTitle}`),
  };
}

// ─── Team Invite Template ─────────────────────────────────────────────────────

export function teamInviteTemplate(
  inviterName: string,
  teamName: string,
  inviteCode: string,
  joinUrl: string,
): EmailPayload {
  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      You're invited! 🤝
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      <strong style="color: ${BRAND.textWhite};">${inviterName}</strong> has invited you to join 
      <strong style="color: ${BRAND.textWhite};">${teamName}</strong> on WholeScale OS.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0f172a; border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 28px;">
          <p style="font-size: 12px; color: ${BRAND.textLight}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px;">Your invite code</p>
          <p style="font-size: 28px; font-weight: 800; color: ${BRAND.color}; letter-spacing: 4px; font-family: 'Courier New', monospace;">${inviteCode}</p>
        </td>
      </tr>
    </table>

    ${emailButton('Join the Team →', joinUrl, '#10b981')}

    <p style="font-size: 12px; color: #475569; text-align: center;">
      Enter the invite code during sign-up, or click the button above.
    </p>
  `;

  return {
    to: '',
    subject: `${inviterName} invited you to ${teamName} on WholeScale OS`,
    html: emailLayout(body, `Join ${teamName} on WholeScale OS`),
  };
}

// ─── Weekly Digest Template ───────────────────────────────────────────────────

export function weeklyDigestTemplate(
  userName: string,
  stats: {
    newLeads: number;
    dealsClosed: number;
    revenue: number;
    tasksCompleted: number;
    topDealName: string;
    topDealScore: number;
  },
  dashboardUrl: string,
): EmailPayload {
  const firstName = userName.split(' ')[0];

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      Your Weekly Recap 📊
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 28px;">
      Hey ${firstName}, here's how your week went!
    </p>

    <!-- Stats Grid -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px;">
      <tr>
        <td width="50%" style="padding: 4px;">
          <div style="background: #0f172a; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="font-size: 28px; font-weight: 800; color: ${BRAND.color};">${stats.newLeads}</p>
            <p style="font-size: 11px; color: ${BRAND.textLight}; text-transform: uppercase; letter-spacing: 1px;">New Leads</p>
          </div>
        </td>
        <td width="50%" style="padding: 4px;">
          <div style="background: #0f172a; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="font-size: 28px; font-weight: 800; color: #10b981;">${stats.dealsClosed}</p>
            <p style="font-size: 11px; color: ${BRAND.textLight}; text-transform: uppercase; letter-spacing: 1px;">Deals Closed</p>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 4px;">
          <div style="background: #0f172a; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="font-size: 28px; font-weight: 800; color: #f59e0b;">$${(stats.revenue / 1000).toFixed(0)}k</p>
            <p style="font-size: 11px; color: ${BRAND.textLight}; text-transform: uppercase; letter-spacing: 1px;">Revenue</p>
          </div>
        </td>
        <td width="50%" style="padding: 4px;">
          <div style="background: #0f172a; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="font-size: 28px; font-weight: 800; color: #a78bfa;">${stats.tasksCompleted}</p>
            <p style="font-size: 11px; color: ${BRAND.textLight}; text-transform: uppercase; letter-spacing: 1px;">Tasks Done</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top Deal -->
    ${stats.topDealName ? `
    <div style="background: linear-gradient(135deg, ${BRAND.color}15, #10b98115); border: 1px solid ${BRAND.color}30; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 11px; color: ${BRAND.color}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">🏆 Top Deal This Week</p>
      <p style="font-size: 16px; font-weight: 700; color: ${BRAND.textWhite};">${stats.topDealName}</p>
      <p style="font-size: 13px; color: ${BRAND.textLight};">Deal Score: ⚡ ${stats.topDealScore}/100</p>
    </div>
    ` : ''}

    ${emailButton('View Full Dashboard →', dashboardUrl)}
  `;

  return {
    to: '',
    subject: `📊 Your weekly recap: ${stats.dealsClosed} deals closed, $${(stats.revenue / 1000).toFixed(0)}k revenue`,
    html: emailLayout(body, `${firstName}, ${stats.dealsClosed} deals closed this week!`),
  };
}

// ─── Mention Notification Template ────────────────────────────────────────────

export function mentionTemplate(
  userName: string,
  mentionedBy: string,
  channelName: string,
  messagePreview: string,
  chatUrl: string,
): EmailPayload {
  const firstName = userName.split(' ')[0];

  const body = `
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.textWhite}; margin-bottom: 8px;">
      You were mentioned 💬
    </h1>
    <p style="font-size: 15px; color: ${BRAND.textLight}; line-height: 1.7; margin-bottom: 24px;">
      Hey ${firstName}, <strong style="color: ${BRAND.textWhite};">${mentionedBy}</strong> mentioned you in 
      <strong style="color: ${BRAND.color};">#${channelName}</strong>
    </p>

    <div style="background: #0f172a; border-radius: 12px; border-left: 4px solid ${BRAND.color}; padding: 16px 20px; margin-bottom: 24px;">
      <p style="font-size: 14px; color: ${BRAND.textWhite}; line-height: 1.6; font-style: italic;">"${messagePreview}"</p>
    </div>

    ${emailButton('View Message →', chatUrl)}
  `;

  return {
    to: '',
    subject: `💬 ${mentionedBy} mentioned you in #${channelName}`,
    html: emailLayout(body, `${mentionedBy}: "${messagePreview.slice(0, 60)}..."`),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SENDING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

import { useStore } from '../store/useStore';

/**
 * Send an email via the Gmail API directly.
 * 
 * Bypasses the need for a server-side Edge Function proxy by using the
 * user's own Google OAuth token from the user_connections table.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const store = useStore.getState();
  const userId = store.currentUser?.id;

  // Dev mode — log to console if no user or no Supabase
  if (!isSupabaseConfigured || !supabase || !userId) {
    console.log('📧 [DEV] Email would be sent:', {
      to: payload.to,
      subject: payload.subject,
      userId: userId,
      supabase: !!supabase,
      config: isSupabaseConfigured
    });
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  console.log(`📧 [EmailService] Attempting to send to: ${payload.to}`);

  try {
    // 1. Get Google OAuth tokens for Gmail
    let refreshToken = '';
    const { data } = await supabase
      .from('user_connections')
      .select('refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle();
    
    refreshToken = data?.refresh_token || '';

    if (!refreshToken) {
      console.warn('Google account not connected — email suppressed.');
      return { success: false, error: 'Google account not connected. Please connect your Gmail in Settings.' };
    }

    // 2. Refresh Access Token
    const CLIENT_ID = "497223138488-fkvh9a1p58rdmjvnmn23v9hvdl2r7jab.apps.googleusercontent.com";
    const CLIENT_SECRET = "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";

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errData = await refreshResponse.json();
      throw new Error(`Failed to refresh Google token: ${errData.error_description || refreshResponse.statusText}`);
    }

    const { access_token } = await refreshResponse.json();

    const contentType = payload.html ? 'text/html' : 'text/plain';
    const bodyContent = payload.html || payload.text || '';

    const fromHeader = payload.from || store.currentUser?.email || 'me';
    const headers = [
      `From: ${fromHeader}`,
      `To: ${payload.to}`
    ];
    
    // Include Subject header (even if empty) for carrier gateway compatibility
    headers.push(`Subject: ${payload.subject || ''}`);
    
    headers.push(`Content-Type: ${contentType}; charset="UTF-8"`);
    headers.push(`MIME-Version: 1.0`);
    headers.push(`Content-Transfer-Encoding: 7bit`);
    
    const strMessage = headers.join('\r\n') + '\r\n\r\n' + bodyContent;

    console.log('📧 [EmailService] Full Message Payload:', strMessage);

    const encodedMessage = btoa(new TextEncoder().encode(strMessage).reduce((data, byte) => data + String.fromCharCode(byte), ''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 4. Send via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      }),
    });

    if (!gmailResponse.ok) {
      const errData = await gmailResponse.json();
      console.error('❌ Gmail API Error Detail:', errData);
      throw new Error(`Gmail API Error: ${errData.error?.message || gmailResponse.statusText}`);
    }

    const result = await gmailResponse.json();
    console.log(`✅ [EmailService] Gmail API Success! Message ID: ${result.id}`);
    
    return {
      success: true,
      messageId: result.id || `msg-${Date.now()}`,
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Email send error (Gmail API):', msg);
    return { success: false, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Send welcome email after signup */
export async function sendWelcomeEmail(email: string, userName: string): Promise<EmailResult> {
  const dashboardUrl = window.location.origin + window.location.pathname + '#/';
  const template = welcomeEmailTemplate(userName, dashboardUrl);
  return sendEmail({ ...template, to: email });
}

/** Send deal alert email */
export async function sendDealAlert(
  email: string,
  userName: string,
  leadName: string,
  address: string,
  propertyValue: number,
  dealScore: number,
): Promise<EmailResult> {
  const dashboardUrl = window.location.origin + window.location.pathname + '#/leads';
  const template = dealAlertTemplate(userName, leadName, address, propertyValue, dealScore, dashboardUrl);
  return sendEmail({ ...template, to: email });
}

/** Send task assigned email */
export async function sendTaskAssigned(
  email: string,
  userName: string,
  taskTitle: string,
  priority: string,
  dueDate: string,
  assignedBy: string,
): Promise<EmailResult> {
  const dashboardUrl = window.location.origin + window.location.pathname + '#/tasks';
  const template = taskAssignedTemplate(userName, taskTitle, priority, dueDate, assignedBy, dashboardUrl);
  return sendEmail({ ...template, to: email });
}

/** Send team invite email */
export async function sendTeamInvite(
  email: string,
  inviterName: string,
  teamName: string,
  inviteCode: string,
): Promise<EmailResult> {
  const joinUrl = window.location.origin + window.location.pathname + '#/login';
  const template = teamInviteTemplate(inviterName, teamName, inviteCode, joinUrl);
  return sendEmail({ ...template, to: email });
}

/** Send @mention notification email */
export async function sendMentionNotification(
  email: string,
  userName: string,
  mentionedBy: string,
  channelName: string,
  messagePreview: string,
): Promise<EmailResult> {
  const chatUrl = window.location.origin + window.location.pathname + '#/chat';
  const template = mentionTemplate(userName, mentionedBy, channelName, messagePreview, chatUrl);
  return sendEmail({ ...template, to: email });
}
