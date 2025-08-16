// supabase/functions/creatomate-proxy/index.ts
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ** CRITICAL **: These secrets MUST be set in your Supabase project.
const CREATOMATE_API_KEY = Deno.env.get('CREATOMATE_API_KEY')?.trim();
const T169_ID = Deno.env.get('CREATOMATE_TEMPLATE_169_ID')?.trim();
const T916_ID = Deno.env.get('CREATOMATE_TEMPLATE_916_ID')?.trim();
const T11_ID = Deno.env.get('CREATOMATE_TEMPLATE_11_ID')?.trim();
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim();
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')?.trim();

const CREATOMATE_API_BASE = 'https://api.creatomate.com/v1';


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let templateIdToUse: string | undefined;
  let templateSecretName: string | undefined;

  try {
    const missingSecrets = [];
    if (!CREATOMATE_API_KEY) missingSecrets.push('CREATOMATE_API_KEY');
    if (!T169_ID) missingSecrets.push('CREATOMATE_TEMPLATE_169_ID');
    if (!T916_ID) missingSecrets.push('CREATOMATE_TEMPLATE_916_ID');
    if (!T11_ID) missingSecrets.push('CREATOMATE_TEMPLATE_11_ID');
    if (!SUPABASE_URL) missingSecrets.push('SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) missingSecrets.push('SUPABASE_ANON_KEY');

    if (missingSecrets.length > 0) {
      const errorMessage = `Function Configuration Error: Missing secrets: ${missingSecrets.join(', ')}. Please set these in your Supabase project dashboard and redeploy the function.`;
      throw new Error(errorMessage);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication Error: Missing authorization header.');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error(authError?.message || 'Authentication failed.');

    const body = await req.json();
    const { script, videoSize } = body;
    if (!script || !script.scenes) {
      throw new Error("Invalid Request: Missing 'script' data in the request body.");
    }
    
    if (videoSize === '16:9') {
        templateIdToUse = T169_ID;
        templateSecretName = 'CREATOMATE_TEMPLATE_169_ID';
    } else if (videoSize === '1:1') {
        templateIdToUse = T11_ID;
        templateSecretName = 'CREATOMATE_TEMPLATE_11_ID';
    } else {
        templateIdToUse = T916_ID;
        templateSecretName = 'CREATOMATE_TEMPLATE_916_ID';
    }

    // --- Sanity Probe & Element Discovery ---
    const probeResponse = await fetch(`${CREATOMATE_API_BASE}/templates/${templateIdToUse}`, {
      headers: { 'Authorization': `Bearer ${CREATOMATE_API_KEY}` }
    });

    console.log(`[Creatomate Probe] Sanity check for Template ID ${templateIdToUse} returned status: ${probeResponse.status}`);

    if (!probeResponse.ok) {
        throw new Error(
            `Sanity Probe Failed (${probeResponse.status}): Could not find Template ID '${templateIdToUse}'. ` +
            `This definitively confirms your API Key and/or Template ID (from secret: ${templateSecretName}) is incorrect or from a different project. ` +
            `Please double-check your Supabase secrets and redeploy this function.`
        );
    }
    
    // ** THE FIX **: Get the template data to find out which dynamic elements are available.
    // This prevents sending modifications for elements that don't exist in the user's template (e.g., Scene 2, 3).
    const templateData = await probeResponse.json();
    const availableElements = templateData.modifications ? Object.keys(templateData.modifications) : [];
    const availableElementsSet = new Set(availableElements);
    console.log('[Creatomate Proxy] Found available dynamic elements in template:', availableElements);

    // --- Main Request ---
    const modifications: { [key:string]: string | null } = {};
    script.scenes.forEach((scene: any, i: number) => {
        const sceneIndex = i + 1;
        
        // Check if the Voiceover element for this scene exists in the template before adding it
        const voiceoverKey = `Scene-${sceneIndex}-Voiceover`;
        if (availableElementsSet.has(voiceoverKey)) {
            const voiceoverText = (typeof scene.voiceover === 'string' && scene.voiceover.trim() !== '') ? scene.voiceover : ' ';
            modifications[`${voiceoverKey}.source`] = voiceoverText;
        }

        // Check if the On-Screen Text element exists
        const onScreenTextKey = `Scene-${sceneIndex}-OnScreenText`;
        if (availableElementsSet.has(onScreenTextKey)) {
             if (typeof scene.onScreenText === 'string' && scene.onScreenText.trim() !== '') {
                modifications[`${onScreenTextKey}.text`] = scene.onScreenText;
            }
        }

        // To use the template's default visual, we explicitly set the source to null if the element exists
        const visualKey = `Scene-${sceneIndex}-Visual`;
        if (availableElementsSet.has(visualKey)) {
            modifications[`${visualKey}.source`] = null;
        }
    });
    
    console.log('[Creatomate Proxy] Sending modifications:', modifications);

    const creatomateResponse = await fetch(`${CREATOMATE_API_BASE}/sources`, {
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
        let detailedError = `Creatomate API Error (${creatomateResponse.status}) after a successful sanity probe. This means your secrets are CORRECT, but the API rejected the video creation request.`;
        detailedError += `\n\n[DEBUG INFO]\n- Sanity Probe Status: 200 (Success!)\n- Request Method: POST\n- Request URL: ${CREATOMATE_API_BASE}/sources`;
        detailedError += `\n- Common Causes: Often an incorrect value in the 'modifications' data (e.g., trying to put text in a video element) or an internal Creatomate API issue.`;
        detailedError += `\n- API Response: ${errorBody.substring(0, 500)}`;
        throw new Error(detailedError);
    }
    
    const sourceDataArray = await creatomateResponse.json();
    if (!Array.isArray(sourceDataArray) || sourceDataArray.length === 0 || !sourceDataArray[0].id) {
        throw new Error("Creatomate API returned an unexpected response format. Expected an array with a source object containing an ID.");
    }
    
    return new Response(JSON.stringify({ sourceId: sourceDataArray[0].id }), {
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