// supabase/functions/shotstack-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Function is not configured with necessary Supabase secrets.");
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      throw new Error("Project ID is missing from the callback URL.");
    }

    const { id, status, url: videoUrl, data, error: shotstackError } = await req.json();

    if (status === 'done') {
      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({
          status: 'Rendered',
          final_video_url: videoUrl
        })
        .eq('id', projectId);

      if (updateError) {
        throw new Error(`Failed to update project ${projectId} to 'Rendered': ${updateError.message}`);
      }
      
      // Create a success notification
      const { data: projectData } = await supabaseAdmin.from('projects').select('name, user_id').eq('id', projectId).single();
      if (projectData) {
          await supabaseAdmin.from('notifications').insert({
              user_id: projectData.user_id,
              project_id: projectId,
              message: `Your video "${projectData.name}" has finished rendering and is ready for analysis!`
          });
      }

    } else if (status === 'failed') {
      const errorMessage = shotstackError?.message || 'Unknown render error';
      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ status: 'Failed' })
        .eq('id', projectId);

      if (updateError) {
        throw new Error(`Failed to update project ${projectId} to 'Failed': ${updateError.message}`);
      }
      
      // Create a failure notification
      const { data: projectData } = await supabaseAdmin.from('projects').select('name, user_id').eq('id', projectId).single();
       if (projectData) {
          await supabaseAdmin.from('notifications').insert({
              user_id: projectData.user_id,
              project_id: projectId,
              message: `Rendering failed for your video "${projectData.name}". Reason: ${errorMessage}`
          });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Shotstack Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});