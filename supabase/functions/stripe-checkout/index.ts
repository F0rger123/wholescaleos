import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.23.0";
import { createClient } from "npm:@supabase/supabase-js@2.42.0";

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const isLiveMode = stripeKey.startsWith('sk_live_');
const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia',
});

console.log(`[Stripe] Initialized. Mode: ${isLiveMode ? 'LIVE' : 'TEST'}, Key prefix: ${stripeKey.slice(0, 12)}...`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - please log in again' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id, user.email);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { plan, cancel_url, success_url, seats = 1 } = body;
    const userId = user.id;
    const userEmail = user.email;
    const origin = req.headers.get('origin') || '';

    if (!stripeKey || stripeKey.length < 10) {
      console.error('[Stripe] STRIPE_SECRET_KEY is missing or invalid');
      return new Response(
        JSON.stringify({ error: 'Payment service is not configured. Please set STRIPE_SECRET_KEY in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IMPORTANT: These Price IDs MUST match your Stripe Dashboard.
    // TEST mode IDs start with price_test_ / price_ (test mode prefix varies)
    // LIVE mode IDs start with price_ (but correspond to live products)
    // Verify at: https://dashboard.stripe.com/products
    const priceMap: Record<string, string> = {
      'solo': 'price_1PThelI0QxY7hIfL7sWqzvYI',
      'pro': 'price_1PThelI0QxY7hIfL9QWqzvYI',
      'team': 'price_1PThelI0QxY7hIfL1JWqzvYI',
      'agency': 'price_1PThelI0QxY7hIfL3NWqzvYI',
    };

    const priceId = priceMap[plan] || priceMap['solo'];
    console.log(`[Stripe] ===== CHECKOUT REQUEST =====`);
    console.log(`[Stripe] Plan: ${plan}, Resolved PriceID: ${priceId}`);
    console.log(`[Stripe] Seats: ${seats}, Email: ${user.email}`);
    console.log(`[Stripe] Mode: ${isLiveMode ? 'LIVE' : 'TEST'}`);
    console.log(`[Stripe] Available plans: ${Object.keys(priceMap).join(', ')}`);
    console.log(`[Stripe] ==============================`);

    // Determine quantity - if it's the 'pro' or 'team' plan, we might want to scale by seats
    const quantity = Math.max(1, parseInt(seats?.toString() || '1'));
    
    let lineItems = [{ price: priceId, quantity }];

    const publicUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173';
    const success_url_final = success_url || `${publicUrl}/dashboard/billing?tab=billing&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url_final = cancel_url || `${publicUrl}/dashboard/billing?tab=billing`;

    console.log(`[Stripe] Redirecting to: Success=${success_url_final}, Cancel=${cancel_url_final}`);

    try {
      console.log(`[Stripe] Creating session for ${user.email} with ${quantity} x ${priceId}`);
      
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: lineItems,
        mode: 'subscription',
        allow_promotion_codes: true,
        success_url: success_url_final,
        cancel_url: cancel_url_final,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          plan: plan || 'solo',
          seats: quantity.toString()
        },
      });

      console.log('[Stripe] Session created successfully:', session.id);
      return new Response(
        JSON.stringify({ url: session.url, sessionId: session.id }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (stripeError: any) {
      console.error('[Stripe] Checkout session creation failed:', stripeError.type, stripeError.code, stripeError.message);
      console.error('[Stripe] Full error:', JSON.stringify({
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        param: stripeError.param,
        priceIdUsed: priceId,
        stripeMode: isLiveMode ? 'live' : 'test',
      }, null, 2));
      
      let friendlyMessage = stripeError.message;
      let statusCode = 400;
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        friendlyMessage = `Invalid Stripe request: ${stripeError.message}. Price ID "${priceId}" may be incorrect or inactive in ${isLiveMode ? 'live' : 'test'} mode.`;
      } else if (stripeError.type === 'StripeAuthenticationError') {
        friendlyMessage = 'Stripe API key is invalid. Check STRIPE_SECRET_KEY in Supabase secrets.';
        statusCode = 401;
      } else if (stripeError.type === 'StripeAPIError') {
        friendlyMessage = 'Stripe API is temporarily unavailable. Please try again.';
        statusCode = 502;
      }

      return new Response(
        JSON.stringify({ 
          error: friendlyMessage, 
          code: stripeError.code || 'stripe_error',
          type: stripeError.type || 'api_error',
          priceId: priceId,
          stripeMode: isLiveMode ? 'live' : 'test',
          detail: `Verify Price IDs at https://dashboard.stripe.com/products match the priceMap in the Edge Function.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: statusCode,
        }
      );
    }
  } catch (error: any) {
    console.error('[Stripe] Unexpected function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        detail: 'Internal Server Error in Edge Function',
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

