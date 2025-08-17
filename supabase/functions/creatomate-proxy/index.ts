// This function is deprecated as the interactive editor has been replaced with a direct-to-render flow.
// It was responsible for creating editor sources by calling the Creatomate /sources endpoint.
// It is kept to avoid breaking existing deployment configurations but is no longer used by the application.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "This function (/creatomate-proxy) is deprecated and should not be used. Use /creatomate-render-proxy instead." }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 410, // Gone
  });
});
