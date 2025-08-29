import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "Origin, Range, Accept, Content-Type",
  "Timing-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
} as const;

const MIME: Record<string,string> = {
  // images
  jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", gif:"image/gif", svg:"image/svg+xml",
  // audio
  mp3:"audio/mpeg", m4a:"audio/mp4", wav:"audio/wav", ogg:"audio/ogg",
  // video
  mp4:"video/mp4", mov:"video/quicktime", webm:"video/webm",
};

const ALLOW_HOSTS = [
  "wpgrfukcnpcoyruymxdd.supabase.co", // Your Supabase storage
  "sb.scorebook.live",
  // Stock media CDNs
  "images.pexels.com",
  "videos.pexels.com",
  "storage.jamendo.com",
  "i.giphy.com",
  "media.giphy.com",
];

const extFrom = (u:string) => {
  const clean = u.split("?")[0];
  const last = clean.split("/").pop() || "";
  return last.includes(".") ? last.split(".").pop()!.toLowerCase() : "";
};
const isLoop = (u:string) => /\/functions\/v1\/asset-proxy/i.test(u);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const reqUrl = new URL(req.url);

    // Support BOTH shapes for backward compatibility
    // New QUERY form: ?url=<encoded_target>&filename=<filename>
    const encQ = reqUrl.searchParams.get("url") || "";
    const nameQ = reqUrl.searchParams.get("filename") || "";
    
    // Legacy PATH form: /asset-proxy/<encoded_target>/<filename>
    const parts = reqUrl.pathname.split("/").filter(Boolean);
    const ix = parts.lastIndexOf("asset-proxy");
    const encP = ix !== -1 ? (parts[ix+1] || "") : "";
    const nameP = ix !== -1 ? decodeURIComponent(parts[ix+2] || "") : "";

    const encoded = encQ || encP;
    const name = nameQ || nameP;

    if (!encoded) return new Response("Missing target URL", { status: 400, headers: CORS });

    const target = decodeURIComponent(encoded);
    if (!/^https?:\/\//i.test(target) || isLoop(target)) {
      return new Response("Invalid target", { status: 400, headers: CORS });
    }

    let host = "";
    try { host = new URL(target).host; } catch { return new Response("Bad target URL", { status: 400, headers: CORS }); }
    if (!ALLOW_HOSTS.includes(host)) return new Response("Host not allowed", { status: 403, headers: CORS });

    const isHead = req.method === "HEAD";
    const range  = req.headers.get("Range") ?? "";

    const upstream = await fetch(target, {
      method: range ? "GET" : (isHead ? "HEAD" : "GET"),
      headers: range ? { Range: range } : {},
      redirect: "follow",
    });

    if (!(upstream.ok || upstream.status === 206)) {
      const txt = await upstream.text().catch(()=> "");
      console.error(`Upstream ${upstream.status} for ${target} :: ${txt.slice(0,300)}`);
      return new Response(`Failed to fetch asset: ${upstream.status}`, {
        status: upstream.status,
        headers: { ...CORS, "Content-Type": "text/plain" },
      });
    }

    const headers = new Headers(CORS);
    const ext = extFrom(name || target);
    if (ext && MIME[ext]) headers.set("Content-Type", MIME[ext]);
    else if (upstream.headers.get("Content-Type")) headers.set("Content-Type", upstream.headers.get("Content-Type")!);

    headers.set("Accept-Ranges", upstream.headers.get("Accept-Ranges") || "bytes");
    ["Content-Length","ETag","Last-Modified"].forEach(h => {
      const v = upstream.headers.get(h); if (v) headers.set(h, v);
    });
    if (!headers.has("Cache-Control")) headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (name) headers.set("Content-Disposition", `inline; filename="${name}"`);

    if (isHead) return new Response(null, { status: upstream.status === 206 ? 206 : upstream.status, headers });
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e:any) {
    console.error("Asset Proxy Error:", e?.stack || e?.message || e);
    return new Response("Proxy error", { status: 502, headers: CORS });
  }
});