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
    console.log('Using price ID:', priceId, 'for plan:', plan);

    let lineItems = [{ price: priceId, quantity: 1 }];

    if (seats > 1) {
      const extraSeatsPriceMap: Record<string, string> = {
        'solo': 'price_1PThelI0QxY7hIfLEXTRA10',
        'pro': 'price_1PThelI0QxY7hIfLEXTRA10',
        'team': 'price_1PThelI0QxY7hIfLEXTRA5',
      };
      const extraSeatsPrice = extraSeatsPriceMap[plan];
      if (extraSeatsPrice) {
        lineItems.push({
          price: extraSeatsPrice,
          quantity: seats - 1,
        });
      }
    }

    console.log('Creating Stripe session with line items:', JSON.stringify(lineItems));

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: lineItems,
      mode: 'subscription',
      success_url: success_url || `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'}/settings?tab=billing`,
      cancel_url: cancel_url || `${Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'}/pricing`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan: plan,
        seats: seats.toString()
      },
    });

    console.log('Stripe session created:', session.id, session.url);

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error.message, error.stack);
    
    let userMessage = error?.message || 'Unknown error';
    if (userMessage.includes('No such price')) {
      userMessage = 'This plan is not yet configured in Stripe. Please contact support.';
    } else if (userMessage.includes('api_key')) {
      userMessage = 'Payment service configuration error. Please contact support.';
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
