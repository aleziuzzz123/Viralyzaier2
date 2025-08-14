// Updated: Production-ready version with robust error handling and configuration checks.
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

// Standard CORS headers are essential for browser communication.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');


serve(async (req: Request) => {
  // Handle CORS preflight request immediately. This is a common cause of errors.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Fail-fast if the function is not configured correctly in Supabase.
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
        throw new Error("Function is not configured. Go to Supabase project -> Edge Functions -> consume-credits -> Secrets, and set: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.");
    }

    // Use the Service Role Key for admin-level access from the backend.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Authenticate the user securely from the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header.');
    }

    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in consume-credits:', authError?.message);
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // For the demo user, simulate credit consumption without actually deducting.
    if (user.email === 'demo@viralyzer.app') {
      return new Response(JSON.stringify({ success: true, newCredits: 999 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // 2. Process the request body robustly using req.json().
    let body;
    try {
        body = await req.json();
    } catch (e) {
        // This will catch empty body, malformed JSON, etc.
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    const { amount_to_consume } = body;

    if (typeof amount_to_consume !== 'number' || amount_to_consume <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid or missing consumption amount.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    // 3. Perform the database operation using the secure admin client.
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('ai_credits')
        .eq('id', user.id)
        .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Database error fetching profile: ${profileError.message}`);
    }

    let currentCredits: number;

    if (!profile) {
        // Profile not found, create it as a fallback to prevent app failure.
        console.warn(`Profile not found for user ${user.id}. Creating a fallback profile.`);
        const freePlanCreditLimit = 10; // Default value from paymentService.ts
        const { data: newProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email || `user_${user.id.split('-')[0]}@viralyzaier.app`, // Use a fallback email to prevent crash
                subscription: { planId: 'free', status: 'active', endDate: null },
                ai_credits: freePlanCreditLimit,
            })
            .select('ai_credits')
            .single();
        
        if (createError || !newProfile) {
            throw new Error(createError?.message || `Failed to create fallback profile for user ${user.id}.`);
        }
        currentCredits = newProfile.ai_credits;
    } else {
        currentCredits = profile.ai_credits;
    }


    if (currentCredits < amount_to_consume) {
        return new Response(JSON.stringify({ success: false, message: 'insufficient_credits', newCredits: currentCredits }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Success, but with a specific payload for the client
        });
    }

    const newCredits = currentCredits - amount_to_consume;

    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ ai_credits: newCredits })
        .eq('id', user.id);
    
    if (updateError) {
        throw new Error(`Failed to update credits: ${updateError.message}`);
    }
    
    return new Response(JSON.stringify({ success: true, newCredits: newCredits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('Consume Credits Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
