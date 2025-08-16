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
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const CREATOMATE_API_URL = 'https://api.creatomate.com/v1/sources';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const missingSecrets = [];
  if (!CREATOMATE_API_KEY) missingSecrets.push('CREATOMATE_API_KEY');
  if (!T169_ID) missingSecrets.push('CREATOMATE_TEMPLATE_169_ID');
  if (!T916_ID) missingSecrets.push('CREATOMATE_TEMPLATE_916_ID');
  if (!T11_ID) missingSecrets.push('CREATOMATE_TEMPLATE_11_ID');
  if (!SUPABASE_URL) missingSecrets.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missingSecrets.push('SUPABASE_ANON_KEY');

  if (missingSecrets.length > 0) {
    const errorMessage = `Function is not configured. Missing secrets: ${missingSecrets.join(', ')}. Follow README.md and redeploy.`;
    console.error('Creatomate Proxy Function Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 409, 
    });
  }

  let templateIdToUse;
  let templateSecretName;
  
  try {
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

    const { script, videoSize } = body;
    if (!script || !script.scenes) {
      throw new Error("Invalid or missing 'script' in request body.");
    }
    
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

    const modifications: { [key: string]: string } = {};
    script.scenes.forEach((scene: any, i: number) => {
      modifications[`Scene-${i + 1}-Visual`] = scene.visual;
      modifications[`Scene-${i + 1}-Voiceover`] = scene.voiceover;
      if (scene.onScreenText) {
        modifications[`Scene-${i + 1}-OnScreenText`] = scene.onScreenText;
      }
    });

    console.log(`[Creatomate Proxy] User: ${user.id}, Attempting to create source with Template ID: ${templateIdToUse}`);

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
        
        const maskedApiKey = `${CREATOMATE_API_KEY?.substring(0, 4)}...${CREATOMATE_API_KEY?.slice(-4)}`;

        if (creatomateResponse.status === 401) {
            detailedError = `Creatomate API Error (401 Unauthorized): The API key is invalid.\n\n[DEBUG INFO]\n- API Key Used (masked): ${maskedApiKey}\n\nPlease double-check that the 'CREATOMATE_API_KEY' secret in Supabase is correct.`;
        } else if (creatomateResponse.status === 404) {
            let verificationMessage = "";
            try {
                const templatesResponse = await fetch('https://api.creatomate.com/v1/templates', {
                    headers: { 'Authorization': `Bearer ${CREATOMATE_API_KEY}` },
                });
                if (templatesResponse.ok) {
                    const availableTemplates = await templatesResponse.json();
                    const templateIds = availableTemplates.map((t: any) => t.id);
                    const found = templateIds.includes(templateIdToUse);
                    verificationMessage = `\n- Verification Result: Your API key has access to ${templateIds.length} templates. The required ID was **${found ? 'FOUND' : 'NOT FOUND'}** in the list.`;
                    if (templateIds.length > 0) {
                         verificationMessage += `\n- Available Template IDs: [${templateIds.slice(0, 5).join(', ')}${templateIds.length > 5 ? ', ...' : ''}]`;
                    } else {
                         verificationMessage += `\n- This API key has access to ZERO templates. This strongly suggests you are using an API key from a different Creatomate project.`;
                    }
                } else {
                    verificationMessage = "\n- Verification Failed: Could not fetch a list of available templates to help debug.";
                }
            } catch (e) {
                verificationMessage = `\n- Verification Error: ${e.message}`;
            }
            detailedError = `Creatomate API Error (404 Not Found): The template with ID '${templateIdToUse}' was not found.\n\n[DEBUG INFO]\n- Template ID Used: ${templateIdToUse}\n- From Secret: ${templateSecretName}\n- API Key Used (masked): ${maskedApiKey}${verificationMessage}\n\n[SOLUTION]\nThis error confirms the function IS reading your secrets, but the values are incorrect. Please double-check that your Template ID and API Key are from the EXACT same Creatomate project and have no typos. Then, redeploy this function.`;
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