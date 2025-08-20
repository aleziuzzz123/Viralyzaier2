import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured with necessary Supabase secrets.");
    }
    
    // Authenticate the user to prevent abuse of the proxy.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed.');

    const { url } = await req.json();
    if (!url || !url.startsWith('http')) {
      throw new Error("A valid 'url' parameter is required in the request body.");
    }

    // Server-side fetch has no CORS restrictions.
    const imageResponse = await fetch(url);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch the image from the source URL: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    // Get the image data as a blob.
    const blob = await imageResponse.blob();
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', imageResponse.headers.get('Content-Type') || 'application/octet-stream');
    responseHeaders.set('Content-Length', blob.size.toString());

    // Stream the blob back to the client.
    return new Response(blob, { headers: responseHeaders });

  } catch (error) {
    console.error('Image Proxy Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
