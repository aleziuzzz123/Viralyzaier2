// supabase/functions/jamendo-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const JAMENDO_CLIENT_ID = Deno.env.get('JAMENDO_CLIENT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!JAMENDO_CLIENT_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured. Missing JAMENDO_CLIENT_ID, SUPABASE_URL, or SUPABASE_ANON_KEY.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');
    
    const { query } = await req.json();
    if (!query) {
      throw new Error("Missing 'query' in request body.");
    }
    
    const apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=20&search=${encodeURIComponent(query)}&audioformat=mp32`;
    
    const jamendoResponse = await fetch(apiUrl);

    if (!jamendoResponse.ok) {
      const errorBody = await jamendoResponse.text();
      throw new Error(`Jamendo API Error: ${jamendoResponse.status} ${errorBody}`);
    }

    const data = await jamendoResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Jamendo Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
