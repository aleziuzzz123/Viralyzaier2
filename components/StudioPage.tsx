import React, { useEffect, useRef, useState } from 'react';

// --- put near your other imports
type SDK = typeof import("@shotstack/shotstack-studio");

declare global {
  interface Window { SHOTSTACK_SDK?: Promise<typeof import('@shotstack/shotstack-studio')>; }
}

async function loadSDK() {
  if (!window.SHOTSTACK_SDK) {
    window.SHOTSTACK_SDK = import('@shotstack/shotstack-studio'); // 1.5.0 in package.json
  }
  return window.SHOTSTACK_SDK;
}

// Sanitizer from prompt
function sanitizeTemplate(t: any) {
  const copy = structuredClone(t);
  for (const track of copy.timeline?.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip.asset?.type === "title") clip.asset.type = "text";
      if (clip.transition && "duration" in (clip.transition as any)) {
        delete (clip.transition as any).duration;
      }
      if ("fit" in clip) delete (clip as any).fit;
    }
  }
  return copy;
}


export default function StudioPage() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const timelineHost = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs to hold the SDK instances for cleanup
  const editRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  // --- inside StudioPage component:
  const [sdk, setSdk] = useState<SDK | null>(null);
  const [assets, setAssets] = useState<Array<{url:string; type:"image"|"video"|"audio"; name:string}>>([]);

  useEffect(() => {
    (async () => {
      const mod = await loadSDK();
      setSdk(mod);
    })();
  }, []);

  function inferType(file: File): "image"|"video"|"audio" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "audio";
  }

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const next = files.map(f => ({
      url: URL.createObjectURL(f),
      type: inferType(f),
      name: f.name
    }));
    setAssets(prev => [...prev, ...next]);
  };

  const addClipAtPlayhead = (asset:{url:string;type:"image"|"video"|"audio"; name:string}) => {
    if (!editRef.current || !sdk) return;
    const edit = editRef.current as InstanceType<SDK["Edit"]>;
    const ms = edit.playbackTime ?? 0;
    const startSec = Math.max(0, Math.floor(ms / 1000));
    const defaultLen = asset.type === "audio" ? 5 : 3; // seconds

    // Decide a track index by type
    const trackIndex =
      asset.type === "audio" ? 4 : 0; // 0 = A-Roll, 4 = Music/VO in your template style

    edit.addClip(trackIndex, {
      asset: { type: asset.type, src: asset.url },
      start: startSec,
      length: defaultLen,
      transition: { in: "fade", out: "fade" }
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Wait for hosts
        for (let i = 0; i < 120; i++) {
          if (canvasHost.current && timelineHost.current) break;
          await new Promise(r => requestAnimationFrame(r));
        }

        const { Edit, Canvas, Controls, Timeline } = await loadSDK();

        const res = await fetch('https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json');
        if (!res.ok) throw new Error(`template ${res.status}`);
        const rawTemplate = await res.json();
        const template = sanitizeTemplate(rawTemplate);


        const size = template.output.size;
        const bg = template.timeline.background ?? '#000';

        const edit = new Edit(size, bg);
        await edit.load();

        const canvas = new Canvas(size, edit, canvasHost.current!);
        await canvas.load();

        await edit.loadEdit(template);

        const controls = new Controls(edit);
        await controls.load();

        const timeline = new Timeline(edit, { width: size.width, height: 300 }, timelineHost.current!);
        await timeline.load();

        edit.events.on('clip:selected', () => {});
        edit.events.on('clip:updated', () => {});

        if (!cancelled) {
          // Store instances for cleanup
          editRef.current = edit;
          canvasRef.current = canvas;
          timelineRef.current = timeline;
          controlsRef.current = controls;
          setLoading(false);
        }
      } catch (e: any) {
        console.error('[Shotstack] boot failed:', e);
        if (!cancelled) {
          setErr(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();
    
    // CRITICAL cleanup function
    return () => {
      cancelled = true;
      try { timelineRef.current?.dispose?.(); } catch (e) { console.error('Error disposing timeline:', e); }
      try { canvasRef.current?.dispose?.(); } catch (e) { console.error('Error disposing canvas:', e); }
      
      // Clear refs to prevent stale references
      timelineRef.current = null;
      canvasRef.current = null;
      controlsRef.current = null;
      editRef.current = null;
    };
  }, []);

  if (err) {
    return (
      <div style={{padding:16,color:'#b91c1c',background:'#fee2e2',borderRadius:8}}>
        <strong>Creative Studio failed:</strong> {err}
      </div>
    );
  }

  return (
    <div style={{padding:16}}>
      {loading && <div style={{color:"#666", textAlign: 'center', padding: '50px'}}>Starting Editor…</div>}
      
      {/* ASSET PANEL */}
      <div style={{margin:"12px 0 16px", display:"flex", gap:12, alignItems:"center"}}>
        <label style={{display:"inline-block"}}>
          <span style={{padding:"8px 12px", background:"#111827", color:"#fff", borderRadius:8, cursor:"pointer"}}>Add Files</span>
          <input type="file" multiple style={{display:"none"}} onChange={onPickFiles}/>
        </label>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          {assets.map((a, i) => (
            <button key={i}
              onClick={() => addClipAtPlayhead(a)}
              title="Insert at playhead"
              style={{border:"1px solid #334155", borderRadius:8, padding:8, background:"#0b1220", color:"#fff"}}
            >
              {a.type.toUpperCase()}: {a.name}
            </button>
          ))}
        </div>
      </div>

      <div ref={canvasHost} data-shotstack-studio style={{minHeight:420, background:'#000', borderRadius:8, display: loading ? 'none' : 'block'}} />
      <div ref={timelineHost} data-shotstack-timeline style={{minHeight:300, background:'#111827', borderRadius:8, marginTop:16, display: loading ? 'none' : 'block'}} />
    </div>
  );
}
