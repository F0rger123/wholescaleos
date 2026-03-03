# WholeScale OS — Resend Email Setup

## Why Resend?
- **Free tier:** 3,000 emails/month (vs Supabase's 4/hour limit)
- **Better deliverability:** Custom domain, DKIM signing
- **Beautiful emails:** Already built-in to WholeScale OS
- **Two integration paths:** SMTP for auth emails + API for custom emails

---

## Option A: Resend SMTP in Supabase (Easiest — 5 minutes)

This replaces Supabase's built-in email sender with Resend for ALL auth emails
(verification, password reset, magic links). **No code changes needed.**

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com) → Sign up (free)
2. Verify your email

### Step 2: Add a Domain (Optional but Recommended)
1. Resend Dashboard → **Domains** → **Add Domain**
2. Add your domain (e.g., `wholescale.io`)
3. Add the DNS records Resend gives you (MX, TXT, CNAME)
4. Wait for verification (usually 5-30 minutes)

> Without a custom domain, emails send from `onboarding@resend.dev` (fine for testing).

### Step 3: Get SMTP Credentials
1. Resend Dashboard → **SMTP** (left sidebar)
2. You'll see:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL)
   - **Username:** `resend`
   - **Password:** Your API key (starts with `re_`)

### Step 4: Configure in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your project
2. **Authentication** → **SMTP Settings** → **Enable Custom SMTP**
3. Fill in:
   | Field | Value |
   |---|---|
   | **Sender email** | `noreply@yourdomain.com` (or `onboarding@resend.dev`) |
   | **Sender name** | `WholeScale OS` |
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` |
   | **Username** | `resend` |
   | **Password** | Your Resend API key (`re_xxxx...`) |
4. Click **Save**

### Step 5: Customize Email Templates (Optional)
1. Supabase → **Authentication** → **Email Templates**
2. Customize the **Confirm signup**, **Reset password**, **Magic link** templates
3. Use `{{ .ConfirmationURL }}` for the verification link
4. Use `{{ .SiteURL }}` for your site URL

**Done!** All auth emails now go through Resend with 3,000/month free limit.

---

## Option B: Resend API via Edge Function (For Custom Emails)

For emails beyond auth (welcome, deal alerts, task notifications, weekly digest),
we use a Supabase Edge Function as a secure proxy to Resend's API.

### Step 1: Get Resend API Key
1. Resend Dashboard → **API Keys** → **Create API Key**
2. Name it `wholescale-os`
3. Permission: **Full access** (or Sending access)
4. Copy the key (starts with `re_`)

### Step 2: Install Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (any OS)
npx supabase --version
```

### Step 3: Initialize Supabase in Your Project
```bash
cd wholescale-os
npx supabase init
npx supabase login
npx supabase link --project-ref jdneeubmkgefhrfcurji
```

### Step 4: Create the Edge Function
```bash
npx supabase functions new send-email
```

Then replace `supabase/functions/send-email/index.ts` with:

```typescript
// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const DEFAULT_FROM = Deno.env.get('EMAIL_FROM') || 'WholeScale OS <noreply@yourdomain.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const { to, subject, html, from, replyTo } = await req.json();

    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(JSON.stringify({ error: data.message || 'Send failed' }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ id: data.id, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 5: Set the Secret
```bash
npx supabase secrets set RESEND_API_KEY=re_YOUR_API_KEY_HERE
npx supabase secrets set EMAIL_FROM="WholeScale OS <noreply@yourdomain.com>"
```

### Step 6: Deploy
```bash
npx supabase functions deploy send-email --no-verify-jwt
```

> `--no-verify-jwt` allows the function to be called from the browser via `supabase.functions.invoke()`.

### Step 7: Test
```bash
curl -X POST \
  'https://jdneeubmkgefhrfcurji.supabase.co/functions/v1/send-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"to":"your@email.com","subject":"Test from WholeScale OS","html":"<h1>It works!</h1>"}'
```

---

## How It Works in the App

### Auth Emails (automatic via Supabase + Resend SMTP)
```
User signs up → Supabase Auth → Resend SMTP → Email delivered
User resets password → Supabase Auth → Resend SMTP → Email delivered
```

### Custom Emails (via Edge Function)
```
App calls sendWelcomeEmail() → supabase.functions.invoke('send-email') 
  → Edge Function → Resend API → Email delivered
```

### Code Usage
```typescript
import { sendWelcomeEmail, sendDealAlert, sendTeamInvite } from '../lib/email';

// After signup
await sendWelcomeEmail('user@email.com', 'John Doe');

// When deal score is high
await sendDealAlert('user@email.com', 'John', 'Marcus Johnson', '123 Oak St', 285000, 85);

// When inviting someone
await sendTeamInvite('newuser@email.com', 'John Doe', "John's Team", 'WS-ABC123');
```

### Dev Mode (no Edge Function deployed)
When the Edge Function isn't deployed, `sendEmail()` gracefully:
1. Logs the email payload to the browser console
2. Returns `{ success: true }` so the app flow isn't blocked
3. No errors, no crashes — the email just doesn't actually send

---

## Email Templates Included

| Template | Function | Trigger |
|---|---|---|
| **Welcome** | `sendWelcomeEmail()` | After signup |
| **Verification** | `verificationEmailTemplate()` | Email verify (SMTP handles this) |
| **Password Reset** | `passwordResetTemplate()` | Forgot password (SMTP handles this) |
| **Deal Alert** | `sendDealAlert()` | High deal score detected |
| **Task Assigned** | `sendTaskAssigned()` | Task created for team member |
| **Team Invite** | `sendTeamInvite()` | Invite code shared |
| **Weekly Digest** | `weeklyDigestTemplate()` | Scheduled (future cron) |
| **@Mention** | `sendMentionNotification()` | Chat mention |

All templates use:
- Dark theme matching WholeScale OS branding
- Responsive tables (works in all email clients including Outlook)
- Preheader text for inbox previews
- Accessible contrast ratios
- Unsubscribe links (placeholder)
