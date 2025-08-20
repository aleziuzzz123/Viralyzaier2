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
    const editData = await req.json();  // the JSON body containing the Shotstack edit
    if (!editData || !editData.timeline) {
      throw new Error("Invalid edit data provided");
    }

    // Prepare the request to Shotstack Render API
    const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
    let apiBase = Deno.env.get("SHOTSTACK_API_BASE"); // Read the base URL from secrets

    // **ROBUSTNESS FIX**: Validate the base URL and fallback to the stage environment if it's missing or invalid.
    if (!apiBase || !apiBase.startsWith('http')) {
        console.warn(`Invalid SHOTSTACK_API_BASE found. Falling back to default stage URL. Please set this secret to 'https://api.shotstack.io/stage' in your Supabase project settings.`);
        apiBase = "https://api.shotstack.io/stage";
    }

    if (!apiKey) {
      throw new Error("Shotstack API key not configured in secrets.");
    }

    const renderUrl = `${apiBase}/render`; // Construct the correct, full URL

    const response = await fetch(renderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(editData)
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