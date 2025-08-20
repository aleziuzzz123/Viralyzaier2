// supabase/functions/asset-proxy/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Expose-Headers":
    "Accept-Ranges, Content-Range, Content-Length, Content-Type, ETag, Last-Modified",
};

const mimeTypes: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  mov: "video/quicktime",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    let targetUrl = "";
    let filenameFromPath = "";

    const path = decodeURIComponent(url.pathname); 
    const parts = path.split("/").filter(Boolean); 

    if (parts.length >= 3 && parts[0] === "asset-proxy" && (parts[1] === "http" || parts[1] === "https")) {
      const scheme = parts[1];
      const rest = parts.slice(2).join("/");
      targetUrl = `${scheme}://${rest}`;
      filenameFromPath = parts[parts.length - 1] || "asset";
    } else {
      const q = url.searchParams.get("u") || url.searchParams.get("url") || "";
      if (q) {
        targetUrl = q;
        const f = path.split("/").pop() || "";
        filenameFromPath = f || "asset";
      }
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      return new Response(
        JSON.stringify({ error: "Provide upstream URL via path: /asset-proxy/https/<host>/<...>/file.ext or ?url=..." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fwd = new Headers();
    const range = req.headers.get("range");
    if (range) fwd.set("range", range);

    const upstream = await fetch(targetUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: fwd,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      const body = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Upstream asset source returned an error.", status: upstream.status, body }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ** FIX **: The restrictive check that only allowed audio files has been removed.
    // The proxy can now serve images, videos, and any other required asset type.

    const resHeaders = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(corsHeaders)) resHeaders.set(k, v);

    const ext = (filenameFromPath.split(".").pop() || "").toLowerCase();
    const contentType = mimeTypes[ext];
    if (contentType) {
      resHeaders.set("Content-Type", contentType);
    }

    resHeaders.set("Content-Disposition", `inline; filename="${filenameFromPath}"`);
    if (upstream.status === 206 || !resHeaders.has("Accept-Ranges")) {
      resHeaders.set("Accept-Ranges", "bytes");
    }
    resHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Asset proxy failed.", details: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
