import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore: Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Supabase standard import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore: Stripe Deno import
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno"

// @ts-ignore: Deno global
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const stripe = new Stripe(STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore: Deno global
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno global
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { plan, cancel_url, success_url } = await req.json()

    // Map plan types to Price IDs (Users should update these with their actual Stripe Price IDs)
    const priceMap: Record<string, string> = {
      'solo': 'price_placeholder_solo',
      'pro': 'price_placeholder_pro',
      'team': 'price_placeholder_team',
      'agency': 'price_placeholder_agency',
    }

    const priceId = priceMap[plan] || priceMap['pro']

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // @ts-ignore: Deno global
      success_url: success_url || `${Deno.env.get('PUBLIC_SITE_URL')}/settings?tab=billing`,
      // @ts-ignore: Deno global
      cancel_url: cancel_url || `${Deno.env.get('PUBLIC_SITE_URL')}/pricing`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
