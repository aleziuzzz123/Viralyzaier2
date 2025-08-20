// supabase/functions/asset-proxy/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Expose-Headers":
    "Accept-Ranges, Content-Range, Content-Length, Content-Type, ETag, Last-Modified",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Accept TWO formats:
    // A) Path-based (preferred, NO query):  /asset-proxy/https/<host>/<...>/file.mp3
    // B) Legacy query:                       /asset-proxy/f/file.mp3?u=<encoded-url>
    //
    // We reconstruct the upstream URL and also pull the extension from the path
    // so the proxy URL itself ends with .mp3/.wav (what Studio expects).
    let targetUrl = "";
    let filenameFromPath = "";

    const path = decodeURIComponent(url.pathname); // e.g. /asset-proxy/https/shotstack-assets.../motions.mp3
    const parts = path.split("/").filter(Boolean); // ["asset-proxy","https","shotstack-assets...","music","freepd","motions.mp3"]

    if (parts.length >= 3 && parts[0] === "asset-proxy" && (parts[1] === "http" || parts[1] === "https")) {
      const scheme = parts[1];
      const rest = parts.slice(2).join("/");       // host + path
      targetUrl = `${scheme}://${rest}`;
      filenameFromPath = parts[parts.length - 1] || "asset";
    } else {
      // Legacy query format support (still allowed, but Studio may reject the query)
      const q = url.searchParams.get("u") || url.searchParams.get("url") || "";
      if (q) {
        targetUrl = q;
        // Try to pick a filename from the path if present
        const f = path.split("/").pop() || "";
        filenameFromPath = f || "asset";
      }
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      return new Response(
        JSON.stringify({ error: "Provide upstream URL via path: /asset-proxy/https/<host>/<...>/file.mp3 (preferred) or query ?u=" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = (filenameFromPath.split(".").pop() || "").toLowerCase();
    if (!["mp3", "wav"].includes(ext)) {
      return new Response(
        JSON.stringify({ error: "Path must end with .mp3 or .wav so the client accepts it." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward Range (for seeking)
    const fwd = new Headers();
    const range = req.headers.get("range");
    if (range) fwd.set("range", range);

    // Fetch upstream (follow redirects)
    const upstream = await fetch(targetUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: fwd,
      redirect: "follow",
    });

    // Accept 200 and 206
    if (!upstream.ok && upstream.status !== 206) {
      const body = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Upstream asset source returned an error.", status: upstream.status, body }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build headers: preserve upstream, then layer on CORS & media hints
    const resHeaders = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(corsHeaders)) resHeaders.set(k, v);

    // Force correct Content-Type from extension
    if (ext === "mp3") resHeaders.set("Content-Type", "audio/mpeg");
    if (ext === "wav") resHeaders.set("Content-Type", "audio/wav");

    // Encourage inline playback and keep filename
    resHeaders.set("Content-Disposition", `inline; filename="${filenameFromPath}"`);

    // Make sure seeking works
    if (upstream.status === 206 || !resHeaders.has("Accept-Ranges")) {
      resHeaders.set("Accept-Ranges", "bytes");
    }

    // Cross-origin safe
    resHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Asset proxy failed.", details: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
