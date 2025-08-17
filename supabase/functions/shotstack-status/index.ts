// supabase/functions/shotstack-status/index.ts
// Secure proxy to check the status of a Shotstack render by ID
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  // We allow POST (with JSON body containing id) or GET with ?id= query
  let renderId: string | null = null;
  if (req.method === "POST") {
    try {
      const { id } = await req.json();
      renderId = id;
    } catch {
      // If body parse fails
      renderId = null;
    }
  } else if (req.method === "GET") {
    const url = new URL(req.url);
    renderId = url.searchParams.get("id");
  }

  if (!renderId) {
    return new Response(JSON.stringify({ error: "No render ID provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!apiKey) throw new Error("Shotstack API key not configured");

    const statusUrl = `https://api.shotstack.io/edit/stage/render/${renderId}`;
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Shotstack status error:", response.status, errorBody);
      return new Response(JSON.stringify({ error: "Shotstack API error", details: errorBody }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const result = await response.json();
    // The response contains status and possibly url when done
    const statusData = result.response;
    // We will forward the important parts to the client
    const { status, url } = statusData;
    return new Response(JSON.stringify({ status, url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
