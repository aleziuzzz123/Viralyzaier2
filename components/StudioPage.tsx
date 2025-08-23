import React, { useEffect, useRef, useState } from 'react';
import { getShotstackSDK } from '../lib/shotstackSdk';

// Get the type definition of the SDK module without importing it directly
type SDK = typeof import("@shotstack/shotstack-studio");

export default function StudioPage() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sdk, setSdk] = useState<SDK | null>(null);
  const [assets, setAssets] = useState<Array<{url:string; type:"image"|"video"|"audio"; name:string}>>([]);

  // --- Asset Management Functions ---

  function inferType(file: File): "image"|"video"|"audio" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "audio";
  }

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAssets = files.map(f => ({
      url: URL.createObjectURL(f),
      type: inferType(f),
      name: f.name
    }));
    setAssets(prev => [...prev, ...newAssets]);
  };

  const addClipAtPlayhead = (asset:{url:string;type:"image"|"video"|"audio"; name:string}) => {
    if (!editRef.current || !sdk) return;
    const edit = editRef.current as InstanceType<SDK["Edit"]>;
    const ms = edit.playbackTime ?? 0;
    const startSec = Math.max(0, ms / 1000);
    const defaultLen = asset.type === "audio" ? 10 : 5; // seconds

    // Place audio on track 2, and visuals on track 0
    const trackIndex = asset.type === "audio" ? 2 : 0; 

    edit.addClip(trackIndex, {
      asset: { type: asset.type, src: asset.url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    });
  };

  // --- Editor Initialization ---

  useEffect(() => {
    let disposed = false;
    let canvas: any, timeline: any;

    (async () => {
      try {
        for (let i = 0; i < 120; i++) {
          const c = canvasHostRef.current;
          const t = timelineHostRef.current;
          if (c && t && c.clientWidth >= 1) break;
          await new Promise(r => requestAnimationFrame(r));
        }
        if (disposed) return;

        const SDK_MODULE = await getShotstackSDK();
        if (disposed) return;
        setSdk(SDK_MODULE);
        const { Edit, Canvas, Controls, Timeline } = SDK_MODULE;

        const res = await fetch("https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json");
        if (!res.ok) throw new Error(`Template fetch failed: ${res.status}`);
        const template = await res.json();
        const size = template.output?.size ?? { width: 1280, height: 720 };

        const edit = new Edit(size);
        await edit.load();
        editRef.current = edit;
        if (disposed) return;

        canvas = new Canvas(size, edit);
        await canvas.load(canvasHostRef.current!);
        if (disposed) return;

        await edit.loadEdit(template);

        const controls = new Controls(edit);
        await controls.load();
        if (disposed) return;

        const tlWidth = timelineHostRef.current?.clientWidth || size.width;
        timeline = new Timeline(edit, { width: tlWidth, height: 300 });
        await timeline.load(timelineHostRef.current!);
        if (disposed) return;

        if (edit?.events?.on) {
          edit.events.on("clip:selected", () => {});
          edit.events.on("clip:updated", () => {});
        }

        if (!disposed) setLoading(false);
      } catch (e: any) {
        console.error("[Shotstack] boot failed:", e);
        if (!disposed) { setErr(e?.message ?? String(e)); setLoading(false); }
      }
    })();

    return () => {
      disposed = true;
      try { timeline?.dispose?.(); } catch {}
      try { canvas?.dispose?.(); } catch {}
    };
  }, []);

  if (err) {
    return (
      <div style={{padding:16,color:"#7f1d1d",background:"#fee2e2",borderRadius:8}}>
        <strong>Creative Studio failed:</strong> {err}
      </div>
    );
  }

  return (
    <div style={{padding:16, fontFamily: "system-ui, sans-serif"}}>
      {/* --- Asset Panel --- */}
       <div style={{marginBottom:"16px", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
        <label style={{display:"inline-block"}}>
          <span style={{padding:"8px 12px", background:"#374151", color:"#fff", borderRadius:8, cursor:"pointer", fontWeight: 600}}>Add Files</span>
          <input type="file" multiple style={{display:"none"}} onChange={onPickFiles} accept="image/*,video/*,audio/*"/>
        </label>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems: 'center'}}>
          {assets.map((a, i) => (
            <button key={i}
              onClick={() => addClipAtPlayhead(a)}
              title="Click to insert at playhead"
              style={{border:"1px solid #4B5563", borderRadius:8, padding:"6px 10px", background:"#1F2937", color:"#fff", cursor: "pointer", fontSize: '0.875rem'}}
            >
              <span style={{fontWeight: 'bold', color: '#a78bfa', marginRight: '6px'}}>{a.type.toUpperCase()}</span>: {a.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* --- Editor --- */}
      {loading && <div style={{color: 'white', opacity:.8, textAlign: 'center', padding: '50px'}}>Starting Editor…</div>}
      <div ref={canvasHostRef} data-shotstack-studio style={{minHeight:420, background:"#000", borderRadius:8, display: loading ? 'none' : 'block'}} />
      <div ref={timelineHostRef} data-shotstack-timeline style={{minHeight:300, background:"#111827", borderRadius:8, marginTop:16, display: loading ? 'none' : 'block'}} />
    </div>
  );
}
