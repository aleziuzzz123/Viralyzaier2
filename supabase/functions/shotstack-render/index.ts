// supabase/functions/shotstack-render/index.ts
// Secure proxy to initiate a Shotstack video render
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: any;

// Define CORS headers to allow our app's requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // allow all origins (or specify your domain in production)
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    // Handle CORS preflight
    return new Response("OK", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    // Only allow POST for initiating renders
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
    const apiBase = "https://api.shotstack.io/v1";

    if (!apiKey) {
      throw new Error("Function is not configured. Please set SHOTSTACK_API_KEY in your Supabase secrets.");
    }
    
    const { edit, projectId } = await req.json();
    if (!edit || !edit.timeline) {
      throw new Error("Invalid edit data provided");
    }
    if (!projectId) {
      throw new Error("Project ID is missing from the request");
    }

    // Prepare the request to Shotstack Render API
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl) {
      throw new Error("Function is not configured. Go to Supabase project -> Edge Functions -> shotstack-render -> Secrets, and set SUPABASE_URL.");
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/shotstack-webhook?projectId=${projectId}`;
    
    const renderPayload = {
      ...edit,
      callback: callbackUrl,
    };

    const renderUrl = `${apiBase}/render`; // Construct the correct, full URL

    const response = await fetch(renderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(renderPayload)
    });

    if (!response.ok) {
      // Shotstack API returned an error
      const errorBody = await response.text();
      console.error("Shotstack render error:", response.status, errorBody);
      return new Response(JSON.stringify({ error: "Shotstack API error", details: errorBody }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const result = await response.json();
    // The successful response contains an ID for the queued render
    const renderId = result?.response?.id;
    if (!renderId) {
      // Unexpected format – handle gracefully
      return new Response(JSON.stringify({ error: "No render ID returned", result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Return the render ID to the client
    return new Response(JSON.stringify({ renderId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});