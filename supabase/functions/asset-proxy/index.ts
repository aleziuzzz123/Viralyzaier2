import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Origin, Range, Accept, Content-Type",
  "Timing-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=31536000, immutable",
};

const MIME: Record<string, string> = {
  // images
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml",
  // audio
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
  // video
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  // scripts
  js: "text/javascript",
  mjs: "text/javascript",
};

const extFrom = (u: string) => {
  const clean = u.split("?")[0];
  const last = clean.split("/").pop() || "";
  return last.includes(".") ? last.split(".").pop()!.toLowerCase() : "";
};

const isLoop = (u: string) => /\/functions\/v1\/asset-proxy/i.test(u);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const ix = parts.lastIndexOf("asset-proxy");
    const encoded = parts[ix + 1];
    const name = parts[ix + 2] ? decodeURIComponent(parts[ix + 2]) : "";

    if (!encoded) return new Response("Missing target", { status: 400, headers: CORS });

    const target = decodeURIComponent(encoded);
    if (!/^https?:\/\//i.test(target) || isLoop(target)) {
      return new Response("Invalid target", { status: 400, headers: CORS });
    }

    const range = req.headers.get("Range") ?? "";
    const upstream = await fetch(target, {
      headers: range ? { Range: range } : {},
      redirect: "follow",
    });

    // Build headers
    const headers = new Headers(upstream.headers);
    const ext = extFrom(name || target);
    if (ext && MIME[ext]) headers.set("Content-Type", MIME[ext]);
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
    if (name) headers.set("Content-Disposition", `inline; filename="${name}"`);

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("Proxy error", { status: 502, headers: CORS });
  }
});