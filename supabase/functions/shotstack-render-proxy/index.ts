// This Supabase function is deprecated. It was part of a previous Shotstack implementation
// and has been replaced by the new `shotstack-render` function which works with the
// Shotstack Studio SDK.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
    return new Response(JSON.stringify({ error: "This function is deprecated." }), {
        headers: { "Content-Type": "application/json" },
        status: 410, // Gone
    });
});