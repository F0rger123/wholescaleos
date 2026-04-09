import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Twilio sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const to = formData.get('To')?.toString() || '';
    const sid = formData.get('SmsSid')?.toString() || '';

    console.log(`[SMS Webhook] Received message from ${from} to ${to}: ${body}`);

    if (!from || !body) {
      return new Response(JSON.stringify({ error: 'Missing From or Body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Normalize numbers (remove + or +1)
    const normalize = (p: string) => {
      const raw = p.replace(/\D/g, '');
      return raw.length === 11 && raw.startsWith('1') ? raw.slice(1) : raw;
    };

    const cleanFrom = normalize(from);
    const cleanTo = normalize(to);

    // 1. Find the user associated with the "To" number
    const { data: pref } = await supabase
      .from('agent_preferences')
      .select('user_id, sms_auto_reply_enabled, sms_auto_reply_message')
      .filter('phone_number', 'ilike', `%${cleanTo}%`)
      .maybeSingle();

    const userId = pref?.user_id || null;

    // 2. Insert the message
    const { data: msg, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        user_id: userId,
        agent_id: userId,
        phone_number: cleanFrom,
        content: body,
        direction: 'inbound',
        is_read: false,
        metadata: { twilio_sid: sid, to_number: to }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Handle Auto-Reply
    if (pref?.sms_auto_reply_enabled && pref?.sms_auto_reply_message) {
      // In a real scenario, you'd call Twilio API here to send the reply
      // For this system, we'll log it and possibly insert an outbound message
      console.log(`[SMS Webhook] Auto-replying to ${cleanFrom} for user ${userId}`);
      
      await supabase.from('sms_messages').insert({
        user_id: userId,
        agent_id: userId,
        phone_number: cleanFrom,
        content: pref.sms_auto_reply_message,
        direction: 'outbound',
        is_read: true
      });
      
      // Note: Actual Twilio SMS sending would happen via a separate background job or direct API call
    }

    return new Response(JSON.stringify({ success: true, id: msg.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[SMS Webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
