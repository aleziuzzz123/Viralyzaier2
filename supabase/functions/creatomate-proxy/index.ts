// supabase/functions/creatomate-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These keys are the ONLY secrets read from the Supabase Function environment.
const CREATOMATE_API_KEY = Deno.env.get('CREATOMATE_API_KEY');
const CREATOMATE_BASE_TEMPLATE_ID = Deno.env.get('CREATOMATE_BASE_TEMPLATE_ID');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ** IMPROVED SECRET CHECKING **
  const missingSecrets = [];
  if (!CREATOMATE_API_KEY) missingSecrets.push('CREATOMATE_API_KEY');
  if (!CREATOMATE_BASE_TEMPLATE_ID) missingSecrets.push('CREATOMATE_BASE_TEMPLATE_ID');

  if (missingSecrets.length > 0) {
    const errorMessage = `Function is not configured. Missing one or more secrets: ${missingSecrets.join(', ')}. Please follow the README.md setup instructions and redeploy the function.`;
    console.error('Creatomate Proxy Function Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 409, 
    });
  }

  try {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: `Invalid JSON body: ${e.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }

    const { script, videoSize, supabaseUrl, supabaseAnonKey } = body;
    if (!script || !script.scenes) {
      throw new Error("Invalid or missing 'script' in request body.");
    }
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing supabaseUrl or supabaseAnonKey in request body.");
    }
    
    // Authenticate the user using the keys passed from the client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header.');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');
    
    // Transform the script into Creatomate modifications
    const modifications: { [key: string]: string } = {};
    script.scenes.forEach((scene: any, i: number) => {
      modifications[`Scene-${i + 1}-Visual`] = scene.visual;
      modifications[`Scene-${i + 1}-Voiceover`] = scene.voiceover;
      if (scene.onScreenText) {
        modifications[`Scene-${i + 1}-OnScreenText`] = scene.onScreenText;
      }
    });

    // ** FIX: Correctly select the template variant ID **
    let templateIdToUse = CREATOMATE_BASE_TEMPLATE_ID;
    if (videoSize === '9:16') {
        templateIdToUse += '/Vertical';
    } else if (videoSize === '1:1') {
        templateIdToUse += '/Square';
    }

    // Create a new dynamic "source".
    // ** FIX: Using the correct '/v1/sources' endpoint and a valid payload **
    const creatomateResponse = await fetch('https://api.creatomate.com/v1/sources', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_id: templateIdToUse,
        modifications: modifications,
      }),
    });

    if (!creatomateResponse.ok) {
        const errorBody = await creatomateResponse.text();
        console.error("Creatomate API Error:", errorBody);

        let detailedError = `Creatomate API failed with status ${creatomateResponse.status}.`;
        if (creatomateResponse.status === 401) {
            detailedError += ' This is likely due to an invalid CREATOMATE_API_KEY in your Supabase secrets.';
        } else if (creatomateResponse.status === 404) {
            detailedError += ' This is likely due to an invalid CREATOMATE_BASE_TEMPLATE_ID or a missing/misnamed variant. Please verify your Supabase secrets and template setup.';
        }
        
        throw new Error(detailedError);
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