// supabase/functions/fix-user-subscription/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Function is not configured with necessary Supabase secrets.");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the user ID from the request body
    const { userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Fixing subscription for user: ${userId}`);

    // Update the user's subscription status to active
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription: { 
          planId: 'viralyzaier', 
          status: 'active', 
          endDate: null 
        } 
      })
      .eq('id', userId)
      .select('subscription, ai_credits');

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    console.log(`Successfully updated subscription for user ${userId}:`, data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Subscription status fixed',
      data: data[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Fix User Subscription Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
