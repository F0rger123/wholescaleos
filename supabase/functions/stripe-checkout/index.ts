import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.23.0";
import { createClient } from "npm:@supabase/supabase-js@2.42.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON payload');
    }

    const { plan, cancel_url, success_url, seats = 1 } = body;

    // Use test prices dynamically based on plan
    const priceMap: Record<string, string> = {
      'solo': 'price_1PThelI0QxY7hIfL7sWqzvYI', // Replace with real 
      'pro': 'price_1PThelI0QxY7hIfL9QWqzvYI',
      'team': 'price_1PThelI0QxY7hIfL1JWqzvYI',
      'agency': 'price_1PThelI0QxY7hIfL3NWqzvYI',
    };

    const priceId = priceMap[plan] || priceMap['pro'];

    let lineItems = [{ price: priceId, quantity: 1 }];

    // Handle add-on scats pricing
    if (seats > 1) {
      const extraSeatsPriceMap: Record<string, string> = {
        'solo': 'price_1PThelI0QxY7hIfLEXTRA10', // Placeholders
        'pro': 'price_1PThelI0QxY7hIfLEXTRA10',
        'team': 'price_1PThelI0QxY7hIfLEXTRA5',
      };
      const extraSeatsPrice = extraSeatsPriceMap[plan];
      if (extraSeatsPrice) {
        lineItems.push({
          price: extraSeatsPrice,
          quantity: seats - 1, // Only charge for extra seats
        });
      }
    }

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

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error.message);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
