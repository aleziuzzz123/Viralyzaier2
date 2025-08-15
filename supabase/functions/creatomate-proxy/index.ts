// supabase/functions/creatomate-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are read from the Supabase Function secrets.
const CREATOMATE_API_KEY = Deno.env.get('CREATOMATE_API_KEY');
const CREATOMATE_BASE_TEMPLATE_ID = Deno.env.get('CREATOMATE_BASE_TEMPLATE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!CREATOMATE_API_KEY || !CREATOMATE_BASE_TEMPLATE_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Function is not configured. Missing one or more secrets: CREATOMATE_API_KEY, CREATOMATE_BASE_TEMPLATE_ID, SUPABASE_URL, SUPABASE_ANON_KEY. Please follow the README.md setup instructions.");
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }

    const { script } = body;
    if (!script || !script.scenes) {
      throw new Error("Invalid or missing 'script' in request body.");
    }
    
    // Transform the script into Creatomate modifications
    const modifications: { [key: string]: string } = {};
    script.scenes.forEach((scene: any, i: number) => {
      // These keys must match the dynamic element names in your Creatomate base template
      modifications[`Scene-${i + 1}-Visual`] = scene.visual;
      modifications[`Scene-${i + 1}-Voiceover`] = scene.voiceover;
      if (scene.onScreenText) {
        modifications[`Scene-${i + 1}-OnScreenText`] = scene.onScreenText;
      }
    });

    // Create a new dynamic "source". This is a shareable, editable instance of a template
    // without cluttering your Creatomate account with permanent new templates for each project.
    const creatomateResponse = await fetch('https://api.creatomate.com/v1/sources', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_id: CREATOMATE_BASE_TEMPLATE_ID,
        modifications: modifications,
      }),
    });

    if (!creatomateResponse.ok) {
      const errorBody = await creatomateResponse.text();
      console.error("Creatomate API Error:", errorBody);
      throw new Error(`Creatomate API failed with status ${creatomateResponse.status}. This could be due to an invalid Base Template ID. Please verify your Supabase secrets.`);
    }

    const newSource = await creatomateResponse.json();

    return new Response(JSON.stringify({ sourceId: newSource.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Creatomate Proxy Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});