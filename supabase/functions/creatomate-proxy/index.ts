// supabase/functions/creatomate-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These secrets MUST be set in your Supabase project.
const CREATOMATE_API_KEY = Deno.env.get('CREATOMATE_API_KEY');
const T169_ID = Deno.env.get('CREATOMATE_TEMPLATE_169_ID');
const T916_ID = Deno.env.get('CREATOMATE_TEMPLATE_916_ID');
const T11_ID = Deno.env.get('CREATOMATE_TEMPLATE_11_ID');

const CREATOMATE_API_URL = 'https://api.creatomate.com/v1/sources';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ** IMPROVED SECRET CHECKING **
  const missingSecrets = [];
  if (!CREATOMATE_API_KEY) missingSecrets.push('CREATOMATE_API_KEY');
  if (!T169_ID) missingSecrets.push('CREATOMATE_TEMPLATE_169_ID');
  if (!T916_ID) missingSecrets.push('CREATOMATE_TEMPLATE_916_ID');
  if (!T11_ID) missingSecrets.push('CREATOMATE_TEMPLATE_11_ID');

  if (missingSecrets.length > 0) {
    const errorMessage = `Function is not configured. Missing secrets: ${missingSecrets.join(', ')}. Follow README.md and redeploy.`;
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
    
    // ** NEW LOGIC: Select the correct template ID based on videoSize **
    let templateIdToUse;
    let templateSecretName;
    switch (videoSize) {
        case '9:16':
            templateIdToUse = T916_ID;
            templateSecretName = 'CREATOMATE_TEMPLATE_916_ID';
            break;
        case '1:1':
            templateIdToUse = T11_ID;
            templateSecretName = 'CREATOMATE_TEMPLATE_11_ID';
            break;
        case '16:9':
        default:
            templateIdToUse = T169_ID;
            templateSecretName = 'CREATOMATE_TEMPLATE_169_ID';
            break;
    }

    // Transform the script into Creatomate modifications
    const modifications: { [key: string]: string } = {};
    script.scenes.forEach((scene: any, i: number) => {
      modifications[`Scene-${i + 1}-Visual`] = scene.visual;
      modifications[`Scene-${i + 1}-Voiceover`] = scene.voiceover;
      if (scene.onScreenText) {
        modifications[`Scene-${i + 1}-OnScreenText`] = scene.onScreenText;
      }
    });

    console.log(`[Creatomate Proxy] Attempting to create source with Template ID: ${templateIdToUse} for size: ${videoSize}`);

    // Create a new dynamic "source".
    const creatomateResponse = await fetch(CREATOMATE_API_URL, {
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
        let detailedError = `Creatomate API request failed with status ${creatomateResponse.status}.`;
        
        if (creatomateResponse.status === 401) {
            detailedError += ' HINT: This is likely due to an invalid CREATOMATE_API_KEY secret.';
        } else if (creatomateResponse.status === 404) {
            const maskedApiKey = `${CREATOMATE_API_KEY?.substring(0, 4)}...${CREATOMATE_API_KEY?.slice(-4)}`;
            detailedError = `Creatomate API Error (404 Not Found): The template with ID '${templateIdToUse}' was not found.
            
DEBUG INFO:
- Template ID Used: ${templateIdToUse}
- From Secret: ${templateSecretName}
- API Key Used (masked): ${maskedApiKey}

This confirms the function IS reading your secrets. The values are incorrect in Creatomate. Please CAREFULLY check:
1. The Template ID in Supabase exactly matches the one in Creatomate.
2. The API Key and Template ID belong to the same Creatomate project.`;
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