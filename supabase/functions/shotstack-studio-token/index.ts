// supabase/functions/shotstack-studio-token/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = (Deno.env.get("SHOTSTACK_API_KEY") || "").trim();
    if (!apiKey) {
      throw new Error("Missing SHOTSTACK_API_KEY secret. Please ensure this is set in your Supabase project's Edge Function secrets.");
    }

    // **FIX**: Dynamically determine the environment based on the API key provided.
    // Production keys start with `v1_`, sandbox keys start with `sandbox_`.
    // This makes the function robust and prevents authentication mismatches.
    const environment = apiKey.startsWith("sandbox_") ? "stage" : "v1";

    const signUrl = `https://api.shotstack.io/${environment}/studio/sign`;

    const res = await fetch(signUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({}), // Empty body as required by the sign endpoint
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`[studio-sign failed] ${res.status} ${text}`);
      
      let errorType = "upstream_sign_failed";
      let errorDetail = text;
      
      if (res.status === 401 || res.status === 403) {
          errorType = "upstream_auth_failed";
          errorDetail = "The Shotstack API rejected the request. Please verify that your SHOTSTACK_API_KEY secret is correct for the environment and has been redeployed.";
      }

      return new Response(
        JSON.stringify({
          error: errorType,
          status: res.status,
          detail: errorDetail,
        }),
        {
          status: res.status,
          headers: corsHeaders,
        }
      );
    }
    
    const { token } = JSON.parse(text);

    return new Response(JSON.stringify({ token }), {
        headers: corsHeaders,
        status: 200
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders },
    });
  }
});