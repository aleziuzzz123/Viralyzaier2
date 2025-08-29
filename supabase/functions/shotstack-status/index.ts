// supabase/functions/shotstack-status/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

declare const Deno: any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey, range",
  "Timing-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
const API_BASE = "https://api.shotstack.io/v1";


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const payload = req.method === "GET" ? {} : await req.json().catch(() => ({}));
  const id = (payload?.id ?? url.searchParams.get("id")) as string | null;

  if (!API_KEY) return new Response(JSON.stringify({ error: "Missing SHOTSTACK_API_KEY secret" }), { status: 500, headers: CORS });
  if (!id)     return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: CORS });

  const res = await fetch(`${API_BASE}/render/${id}`, {
    headers: { "x-api-key": API_KEY, "accept": "application/json" },
  });

  const json = await res.json().catch(() => ({}));
  const status =
    json?.response?.status ??
    json?.status ??
    "failed";

  const outUrl =
    json?.response?.url ??
    json?.response?.output?.[0]?.url ??
    json?.response?.data?.[0]?.url ??
    undefined;

  return new Response(JSON.stringify({ status, url: outUrl }), { status: 200, headers: CORS });
});