import React, { useEffect, useRef, useState } from 'react';
import { getShotstackSDK } from '../lib/shotstackSdk';

export default function StudioPage() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const timelineHostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let canvas: any, timeline: any;

    (async () => {
      try {
        // 1) Ensure hosts exist & have size
        for (let i = 0; i < 120; i++) {
          const c = canvasHostRef.current;
          const t = timelineHostRef.current;
          if (c && t && c.clientWidth >= 1) break;
          await new Promise(r => requestAnimationFrame(r));
        }
        if (disposed) return;

        const { Edit, Canvas, Controls, Timeline } = await getShotstackSDK();
        if (disposed) return;

        // 2) Fetch a known-good template
        const res = await fetch("https://shotstack-assets.s3.amazonaws.com/templates/hello-world/hello.json");
        if (!res.ok) throw new Error(`Template ${res.status}`);
        const template = await res.json();

        // 3) Boot sequence
        const edit = new Edit({ width: template.output.size.width, height: template.output.size.height, background: template.timeline.background });
        await edit.load();
        if (disposed) return;

        canvas = new Canvas(edit, { size: template.output.size, responsive: true, host: canvasHostRef.current! });
        await canvas.load();
        if (disposed) return;

        await edit.loadEdit(template);

        const controls = new Controls(edit);
        await controls.load();
        if (disposed) return;

        const tlWidth = timelineHostRef.current?.clientWidth || template.output.size.width;
        timeline = new Timeline(edit, { width: tlWidth, height: 300, host: timelineHostRef.current! });
        await timeline.load();
        if (disposed) return;

        // 4) Events (guard to avoid undefined.on)
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
    <div style={{padding:16}}>
      {loading && <div style={{color: 'white', opacity:.8, textAlign: 'center', padding: '50px'}}>Starting Editor…</div>}
      <div ref={canvasHostRef} data-shotstack-studio style={{minHeight:420, background:"#000", borderRadius:8, display: loading ? 'none' : 'block'}} />
      <div ref={timelineHostRef} data-shotstack-timeline style={{minHeight:300, background:"#111827", borderRadius:8, marginTop:16, display: loading ? 'none' : 'block'}} />
    </div>
  );
}