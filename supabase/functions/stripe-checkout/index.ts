import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.23.0";
import { createClient } from "npm:@supabase/supabase-js@2.42.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

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
    console.log('Checkout request:', { plan, seats, email: user.email });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey || stripeKey.length < 10) {
      console.error('STRIPE_SECRET_KEY is missing or invalid');
      return new Response(
        JSON.stringify({ error: 'Payment service is not configured. Please set STRIPE_SECRET_KEY in Supabase Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceMap: Record<string, string> = {
      'solo': 'price_1PThelI0QxY7hIfL7sWqzvYI',
      'pro': 'price_1PThelI0QxY7hIfL9QWqzvYI',
      'team': 'price_1PThelI0QxY7hIfL1JWqzvYI',
      'agency': 'price_1PThelI0QxY7hIfL3NWqzvYI',
    };

    const priceId = priceMap[plan] || priceMap['solo'];
    console.log(`[Stripe] Using price ID: ${priceId} for plan: ${plan}`);

    // Determine quantity - if it's the 'pro' or 'team' plan, we might want to scale by seats
    const quantity = Math.max(1, parseInt(seats?.toString() || '1'));
    
    let lineItems = [{ price: priceId, quantity }];

    console.log(`[Stripe] Creating session for ${user.email} with ${quantity} x ${priceId}`);

    try {
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: lineItems,
        mode: 'subscription',
        allow_promotion_codes: true, // Enable promo codes in Stripe Checkout
        success_url: success_url || `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'}/dashboard/billing?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'}/dashboard/billing?tab=billing`,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          plan: plan,
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
      console.error('[Stripe] Checkout session creation failed:', stripeError);
      return new Response(
        JSON.stringify({ 
          error: stripeError.message, 
          code: stripeError.code,
          type: stripeError.type,
          detail: 'Failed to create Stripe checkout session. Please verify your Price IDs.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  } catch (error: any) {
    console.error('[Stripe] Unexpected function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
