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
    const { plan, seats, successUrl, cancelUrl, customerEmail, userId } = await req.json()
    
    console.log(`[Stripe] 📥 Received checkout request:
      - Plan: ${plan}
      - UserID: ${userId}
      - Customer Email: ${customerEmail}
      - Seats: ${seats}
      - Environment: ${isLiveMode ? '🚀 LIVE MODE' : '🛠️ TEST MODE'}
    `)

    // Map internal names to Stripe Price IDs (Verify these match your dashboard)
    const priceMap: Record<string, string> = {
      'solo': 'price_1PThelI0QxY7hIfL7sWqzvYI',
      'pro': 'price_1PThelI0QxY7hIfL9QWqzvYI',
      'team': 'price_1PThelI0QxY7hIfL1JWqzvYI',
      'agency': 'price_1PThelI0QxY7hIfL3NWqzvYI',
    };

    const requestedPlan = (plan || 'solo').toString().toLowerCase();
    const resolvedPriceId = priceMap[requestedPlan] || priceMap['solo'];
    
    console.log(`[Stripe] Resolved PriceID: ${resolvedPriceId}`);

    // Determine quantity - if it's the 'pro' or 'team' plan, we might want to scale by seats
    const quantity = Math.max(1, parseInt(seats?.toString() || '1'));
    
    let lineItems = [{ price: resolvedPriceId, quantity }];

    const publicUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173';
    const success_url_final = successUrl || `${publicUrl}/dashboard/billing?tab=billing&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url_final = cancelUrl || `${publicUrl}/dashboard/billing?tab=billing`;

    console.log(`[Stripe] Creating session for ${customerEmail} with ${quantity} x ${resolvedPriceId}`);
    
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      line_items: lineItems,
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: success_url_final,
      cancel_url: cancel_url_final,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        plan: requestedPlan,
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
    console.error('[Stripe] Checkout creation failed:', stripeError.message);
    
    let friendlyMessage = stripeError.message;
    let statusCode = 400;
    
    if (stripeError.type === 'StripeAuthenticationError') {
      friendlyMessage = 'Stripe API key is invalid. Check STRIPE_SECRET_KEY in Supabase secrets.';
      statusCode = 401;
    }

    return new Response(
      JSON.stringify({ 
        error: friendlyMessage, 
        code: stripeError.code || 'stripe_error',
        detail: `Verify Price IDs in Stripe Dashboard match the priceMap. [Mode: ${isLiveMode ? 'LIVE' : 'TEST'}]`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  } catch (error: any) {
    console.error('[Stripe] Unexpected function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        detail: 'Internal Server Error in Edge Function'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
