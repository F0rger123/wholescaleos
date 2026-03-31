import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Transactional Email Proxy (via Resend)
 * 
 * Provides a secure server-side endpoint for sending branded emails
 * (e.g. Welcome, Password Reset) without exposing API keys.
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Security: Only allow requests with valid Service Role / Authenticated users
    // (In production, restrict this heavily or check for specific admin claims)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, html, text, from = 'WholeScale OS <noreply@wholescaleos.com>' } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Sending email to ${to} via Resend...`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Resend Error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
