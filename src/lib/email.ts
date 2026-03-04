// ═══════════════════════════════════════════════════════════════════════════════
// WholeScale OS — Email Service (Currently in Dev Mode)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Email functionality is currently disabled. All emails are logged to console
// instead of being sent. This prevents errors when the Supabase Edge Function
// isn't deployed.
//
// To enable emails:
// 1. Deploy the send-email Edge Function to Supabase
// 2. Remove the early return in sendEmail()
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SENDING SERVICE (DISABLED - LOGS ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send an email - Currently in dev mode, only logs to console.
 * No actual emails are sent, and no errors are thrown.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  // Log the email that would be sent
  console.log('📧 [DEV MODE] Email would be sent:', {
    to: payload.to,
    subject: payload.subject,
    from: payload.from || 'default@wholescaleos.com',
    replyTo: payload.replyTo,
    htmlLength: payload.html.length,
    preview: payload.html.substring(0, 100) + '...',
  });
  
  // Always return success so the app flow isn't blocked
  return { 
    success: true, 
    messageId: `dev-${Date.now()}` 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS (ALL DISABLED - LOGS ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

/** Send welcome email after signup (DISABLED - logs only) */
export async function sendWelcomeEmail(email: string, userName: string): Promise<EmailResult> {
  console.log(`📧 [DEV] Welcome email for ${userName} to ${email}`);
  return sendEmail({
    to: email,
    subject: `Welcome to WholeScale OS, ${userName.split(' ')[0]}! 🏗️`,
    html: `<p>Welcome email for ${userName}</p>`,
  });
}

/** Send deal alert email (DISABLED - logs only) */
export async function sendDealAlert(
  email: string,
  userName: string,
  leadName: string,
  address: string,
  propertyValue: number,
  dealScore: number,
): Promise<EmailResult> {
  console.log(`📧 [DEV] Deal alert for ${userName} - ${leadName} (Score: ${dealScore})`);
  return sendEmail({
    to: email,
    subject: `🔥 Hot Deal: ${leadName} — Score ${dealScore}/100`,
    html: `<p>Deal alert for ${leadName}</p>`,
  });
}

/** Send task assigned email (DISABLED - logs only) */
export async function sendTaskAssigned(
  email: string,
  userName: string,
  taskTitle: string,
  priority: string,
  dueDate: string,
  assignedBy: string,
): Promise<EmailResult> {
  console.log(`📧 [DEV] Task assigned to ${userName}: ${taskTitle}`);
  return sendEmail({
    to: email,
    subject: `📋 Task assigned: ${taskTitle}`,
    html: `<p>Task assigned: ${taskTitle}</p>`,
  });
}

/** Send team invite email (DISABLED - logs only) */
export async function sendTeamInvite(
  email: string,
  inviterName: string,
  teamName: string,
  inviteCode: string,
): Promise<EmailResult> {
  console.log(`📧 [DEV] Team invite for ${email} from ${inviterName} to join ${teamName}`);
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${teamName} on WholeScale OS`,
    html: `<p>Invite code: ${inviteCode}</p>`,
  });
}

/** Send @mention notification email (DISABLED - logs only) */
export async function sendMentionNotification(
  email: string,
  userName: string,
  mentionedBy: string,
  channelName: string,
  messagePreview: string,
): Promise<EmailResult> {
  console.log(`📧 [DEV] Mention for ${userName} by ${mentionedBy} in #${channelName}`);
  return sendEmail({
    to: email,
    subject: `💬 ${mentionedBy} mentioned you in #${channelName}`,
    html: `<p>${messagePreview}</p>`,
  });
}