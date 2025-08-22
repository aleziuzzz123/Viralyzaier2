// supabase/functions/get-initial-data/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const isValidSubscription = (sub: any) => {
    return sub && typeof sub === 'object' &&
           typeof sub.planId === 'string' &&
           ['free', 'pro', 'viralyzaier'].includes(sub.planId) &&
           typeof sub.status === 'string' &&
           ['active', 'canceled'].includes(sub.status);
};

// --- Replicating mappers from the frontend for consistency ---
const profileRowToUser = (row: any, youtubeConnected: boolean) => {
    const isDemoUser = row.email === 'demo@viralyzer.app' || row.email === 'jegooalex@gmail.com';
    
    const subscription = isValidSubscription(row.subscription) 
        ? row.subscription 
        : { planId: 'free', status: 'active', endDate: null };

    return {
        id: row.id,
        email: row.email,
        subscription: isDemoUser
            ? { planId: 'viralyzaier', status: 'active', endDate: null }
            : subscription,
        aiCredits: isDemoUser ? 999 : row.ai_credits,
        channelAudit: row.channel_audit,
        youtubeConnected,
        content_pillars: row.content_pillars || [],
        cloned_voices: row.cloned_voices || [],
    };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error("Function is not configured with necessary Supabase secrets.");
    }
    
    // Authenticate the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

    // Use the admin client for efficient, server-side data fetching
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Fetch only essential data in parallel
    const [profileResult, youtubeTokenResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', user.id).single(),
      supabaseAdmin.from('user_youtube_tokens').select('user_id').eq('user_id', user.id).maybeSingle()
    ]);

    // Error handling for each query
    if (profileResult.error && profileResult.error.code !== 'PGRST116') throw profileResult.error;
    if (youtubeTokenResult.error) throw youtubeTokenResult.error;

    let userProfile = profileResult.data;
    
    // Create profile on-the-fly if it doesn't exist
    if (!userProfile) {
        const { data: newProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email,
                subscription: { planId: 'free', status: 'active', endDate: null },
                ai_credits: 10,
            })
            .select('*')
            .single();
        if (createError) throw createError;
        userProfile = newProfile;
    }
    
    const youtubeConnected = !!youtubeTokenResult.data;
    const finalUser = profileRowToUser(userProfile, youtubeConnected);
    
    return new Response(JSON.stringify({ user: finalUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Get Initial Data Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});