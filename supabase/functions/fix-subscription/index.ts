// supabase/functions/fix-subscription/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Function is not configured with necessary Supabase secrets.");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header.');
    }

    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`);
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription, ai_credits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Database error: ${profileError.message}`);
    }

    console.log(`Current subscription for user ${user.id}:`, profile.subscription);

    // Fix subscription status if it's not active but user has credits
    if (profile.subscription && profile.subscription.status !== 'active' && profile.ai_credits > 0) {
      console.log(`Fixing subscription status for user ${user.id}`);
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription: { 
            planId: profile.subscription.planId || 'viralyzaier', 
            status: 'active', 
            endDate: null 
          } 
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Subscription status fixed',
        subscription: { 
          planId: profile.subscription.planId || 'viralyzaier', 
          status: 'active', 
          endDate: null 
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Subscription status is already correct',
      subscription: profile.subscription
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Fix Subscription Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
