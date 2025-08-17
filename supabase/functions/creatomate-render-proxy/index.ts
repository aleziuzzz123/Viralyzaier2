// This Supabase function has been deprecated and replaced by `shotstack-render`.
// It is no longer used by the application and its content has been removed to prevent accidental execution.
// This file can be deleted in a future cleanup.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "This function is deprecated." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 410, // Gone
    });
});
